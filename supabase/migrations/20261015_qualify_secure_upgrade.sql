-- Qualify Portal secure upgrade. Compatible with the EXISTING public.admins,
-- public.exams, public.questions and public."studentReport" tables.
-- Run as database owner in Supabase SQL Editor after taking a database backup.
-- Does not delete previous records. Old student links without secret tokens need
-- re-issue by administrator; see SETUP.md.
BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS shuffle_questions boolean NOT NULL DEFAULT true;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS shuffle_options boolean NOT NULL DEFAULT true;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS results_published boolean NOT NULL DEFAULT false;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS instructions text NOT NULL DEFAULT 'Answer every question carefully. Your attempt is timed and your answers are saved periodically.';
ALTER TABLE public."studentReport" ADD COLUMN IF NOT EXISTS access_hash text;
ALTER TABLE public."studentReport" ADD COLUMN IF NOT EXISTS session_hash text;
ALTER TABLE public."studentReport" ADD COLUMN IF NOT EXISTS deadline timestamptz;
ALTER TABLE public."studentReport" ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE public."studentReport" ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE public."studentReport" ADD COLUMN IF NOT EXISTS question_order uuid[];
ALTER TABLE public."studentReport" ADD COLUMN IF NOT EXISTS option_orders jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public."studentReport" ADD COLUMN IF NOT EXISTS review_flags jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public."studentReport" ADD COLUMN IF NOT EXISTS time_bonus_minutes integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.qualify_events (
  id bigint generated always as identity primary key,
  student_report_id uuid NOT NULL REFERENCES public."studentReport"(student_report_id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('tab_hidden','fullscreen_exit','copy_attempt','paste_attempt','offline','online','start','submit','timeout','session_reset')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qualify_events_attempt_idx ON public.qualify_events(student_report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS qualify_report_live_idx ON public."studentReport"(exam_id, student_status, last_seen_at);
ALTER TABLE public.qualify_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qualify_events FROM anon, authenticated;
GRANT SELECT ON public.qualify_events TO authenticated;
DROP POLICY IF EXISTS "Exam owners can read events" ON public.qualify_events;
CREATE POLICY "Exam owners can read events" ON public.qualify_events FOR SELECT TO authenticated
USING (public.is_admin() AND EXISTS (
  SELECT 1 FROM public."studentReport" a JOIN public.exams e ON e.exam_id = a.exam_id
  WHERE a.student_report_id = qualify_events.student_report_id AND e.created_by = (select auth.uid())
));

-- Deliberately NO direct anonymous access to exams, questions, reports or events.
REVOKE ALL ON public.exams, public.questions, public."studentReport", public.admins FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.admins FROM authenticated;
GRANT SELECT ON public.admins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams, public.questions, public."studentReport" TO authenticated;

-- Own profile and owner-only policies from the existing setup remain in effect.
DROP POLICY IF EXISTS "Approved admin signup" ON public.admins;

-- Reusable private question bank, owned by each approved administrator.
CREATE TABLE IF NOT EXISTS public.qualify_question_bank (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 course text NOT NULL DEFAULT '', topic text NOT NULL DEFAULT '',
 difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
 question_text text NOT NULL,
 options jsonb NOT NULL CHECK (jsonb_typeof(options)='array' AND jsonb_array_length(options) BETWEEN 2 AND 6),
 correct_option smallint NOT NULL CHECK (correct_option >= 0 AND correct_option < jsonb_array_length(options)),
 marks integer NOT NULL DEFAULT 1 CHECK (marks > 0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qualify_bank_owner_idx ON public.qualify_question_bank(owner_id,course,topic);
ALTER TABLE public.qualify_question_bank ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qualify_question_bank FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.qualify_question_bank TO authenticated;
DROP POLICY IF EXISTS "Admins manage own question bank" ON public.qualify_question_bank;
CREATE POLICY "Admins manage own question bank" ON public.qualify_question_bank FOR ALL TO authenticated
 USING (public.is_admin() AND owner_id=(select auth.uid()))
 WITH CHECK (public.is_admin() AND owner_id=(select auth.uid()));

-- A public exam description containing NO answers, question text or private student data.
CREATE OR REPLACE FUNCTION public.qualify_public_exam(p_exam uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.exams%ROWTYPE;
BEGIN
 SELECT * INTO e FROM public.exams WHERE exam_id = p_exam AND exam_status IN ('upcoming','active');
 IF NOT FOUND THEN RAISE EXCEPTION 'This exam is unavailable'; END IF;
 RETURN jsonb_build_object('exam_id',e.exam_id,'title',e.title,'course',e.course,
    'exam_status',e.exam_status,'scheduled_date',e.scheduled_date,
    'duration_minutes',e.duration_minutes,'total_marks',e.total_marks,
    'total_questions',e.total_questions,'instructions',e.instructions);
END; $$;

-- Public self-registration issues a secret ONCE. It is stored as SHA-256 hash,
-- not plain text. Email/roll number alone are NOT verified identities.
CREATE OR REPLACE FUNCTION public.qualify_register(p_exam uuid, p_name text, p_email text, p_roll text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a uuid; t text;
BEGIN
 IF length(btrim(coalesce(p_name,''))) NOT BETWEEN 2 AND 120 OR
    length(btrim(coalesce(p_roll,''))) NOT BETWEEN 1 AND 80 OR
    length(btrim(coalesce(p_email,''))) NOT BETWEEN 5 AND 254 OR
    btrim(p_email) NOT LIKE '%@%.%' THEN
   RAISE EXCEPTION 'Enter a valid name, email and roll number';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.exams WHERE exam_id = p_exam AND exam_status = 'upcoming') THEN
   RAISE EXCEPTION 'Registration is closed for this exam';
 END IF;
 t := encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO public."studentReport" (exam_id,student_name,email,roll_no,access_hash)
 VALUES (p_exam,btrim(p_name),lower(btrim(p_email)),btrim(p_roll),encode(extensions.digest(t,'sha256'),'hex'))
 RETURNING student_report_id INTO a;
 RETURN jsonb_build_object('student_report_id',a,'access_token',t);
EXCEPTION WHEN unique_violation THEN
 RAISE EXCEPTION 'This email or roll number is already registered';
END; $$;

-- Helper is deliberately not granted to API roles; callable only through authorized wrappers.
CREATE OR REPLACE FUNCTION public.qualify_grade_internal(p_attempt uuid, p_reason text)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE; q record; selected integer; actual integer; earned integer := 0;
BEGIN
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id = p_attempt FOR UPDATE;
 IF NOT FOUND OR a.student_status <> 'in progress' THEN RETURN; END IF;
 FOR q IN SELECT question_id, correct_option, marks FROM public.questions WHERE exam_id=a.exam_id LOOP
   IF a.answers ? q.question_id::text AND (a.answers->>q.question_id::text) ~ '^[0-9]+$' THEN
     selected := (a.answers->>q.question_id::text)::integer;
     IF a.option_orders ? q.question_id::text AND
        selected < jsonb_array_length(a.option_orders->q.question_id::text) THEN
       actual := (a.option_orders->q.question_id::text->>selected)::integer;
       IF actual = q.correct_option THEN earned := earned + q.marks; END IF;
     END IF;
   END IF;
 END LOOP;
 UPDATE public."studentReport" SET marks_scored=earned, student_status='submitted', submitted_at=now(),
   session_hash=NULL WHERE student_report_id = p_attempt;
 INSERT INTO public.qualify_events(student_report_id,kind) VALUES
 (p_attempt, CASE WHEN p_reason='timeout' THEN 'timeout' ELSE 'submit' END);
END; $$;

-- Called ONLY after checking the private token/session, never as a standalone API.
CREATE OR REPLACE FUNCTION public.qualify_attempt_payload_internal(p_attempt uuid, p_include_questions boolean)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE; e public.exams%ROWTYPE; qs jsonb := '[]'::jsonb;
BEGIN
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt;
 SELECT * INTO e FROM public.exams WHERE exam_id=a.exam_id;
 IF p_include_questions THEN
   SELECT coalesce(jsonb_agg(jsonb_build_object('question_id',q.question_id,'question_text',q.question_text,
     'marks',q.marks,'options',(
       SELECT coalesce(jsonb_agg(q.options->(o.idx::integer) ORDER BY o.pos),'[]'::jsonb)
       FROM jsonb_array_elements_text(a.option_orders->q.question_id::text) WITH ORDINALITY o(idx,pos)
     )) ORDER BY x.ord),'[]'::jsonb)
   INTO qs FROM unnest(a.question_order) WITH ORDINALITY x(id,ord)
   JOIN public.questions q ON q.question_id=x.id;
 END IF;
 RETURN jsonb_build_object('exam_id',e.exam_id,'title',e.title,'course',e.course,
  'exam_status',e.exam_status,'scheduled_date',e.scheduled_date,'duration_minutes',e.duration_minutes,
  'student_name',a.student_name,'roll_no',a.roll_no,'email',a.email,
  'student_status',a.student_status,'started_at',a.started_at,'deadline',a.deadline,
  'server_now',now(),'answers',CASE WHEN p_include_questions THEN a.answers ELSE '{}'::jsonb END,
  'review_flags', CASE WHEN p_include_questions THEN a.review_flags ELSE '{}'::jsonb END,
  'questions',qs,'results_published',e.results_published,
  'marks_scored',CASE WHEN a.student_status='submitted' AND e.results_published THEN a.marks_scored ELSE NULL END,
  'total_marks',e.total_marks,'pass_mark',e.pass_mark,'instructions',e.instructions);
END; $$;

CREATE OR REPLACE FUNCTION public.qualify_student_state(p_attempt uuid,p_token text,p_session text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE; ready boolean;
BEGIN
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR a.access_hash IS NULL OR
    a.access_hash <> encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') THEN
   RAISE EXCEPTION 'Invalid or expired private exam link';
 END IF;
 IF a.student_status='in progress' AND now() >= a.deadline THEN
    PERFORM public.qualify_grade_internal(p_attempt,'timeout');
    SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt;
 END IF;
 ready := a.student_status='in progress' AND a.session_hash IS NOT NULL AND
          a.session_hash=encode(extensions.digest(coalesce(p_session,''),'sha256'),'hex');
 IF a.student_status='in progress' AND NOT ready THEN
    RETURN jsonb_build_object('student_status','locked','message',CASE WHEN a.session_hash IS NULL THEN 'Session reset by administrator. Reload your private exam link to rejoin.' ELSE 'This exam is active in another session. Ask the administrator to reset your session.' END);
 END IF;
 IF ready THEN
   UPDATE public."studentReport" SET last_seen_at=now() WHERE student_report_id=p_attempt;
 END IF;
 RETURN public.qualify_attempt_payload_internal(p_attempt,ready);
END; $$;

CREATE OR REPLACE FUNCTION public.qualify_begin(p_attempt uuid,p_token text,p_session text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE; e public.exams%ROWTYPE; q record;
  ord uuid[]; opt jsonb := '{}'::jsonb; indexes jsonb;
BEGIN
 IF length(coalesce(p_session,'')) < 32 THEN RAISE EXCEPTION 'Invalid session'; END IF;
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR a.access_hash IS NULL OR
   a.access_hash <> encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') THEN
   RAISE EXCEPTION 'Invalid private exam link';
 END IF;
 SELECT * INTO e FROM public.exams WHERE exam_id=a.exam_id;
 IF a.student_status='in progress' AND now() >= a.deadline THEN
   PERFORM public.qualify_grade_internal(p_attempt,'timeout');
   RAISE EXCEPTION 'Exam time has ended';
 ELSIF a.student_status='in progress' THEN
   IF a.session_hash IS NULL THEN
     UPDATE public."studentReport" SET session_hash=encode(extensions.digest(p_session,'sha256'),'hex'),last_seen_at=now()
       WHERE student_report_id=p_attempt;
   ELSIF a.session_hash <> encode(extensions.digest(p_session,'sha256'),'hex') THEN
     RAISE EXCEPTION 'Another device is already using this exam attempt';
   END IF;
 ELSIF a.student_status='not started' AND e.exam_status='active' AND e.scheduled_date <= now() THEN
   SELECT array_agg(question_id ORDER BY CASE WHEN e.shuffle_questions THEN random() ELSE 0 END, question_id)
   INTO ord FROM public.questions WHERE exam_id=e.exam_id;
   IF ord IS NULL THEN RAISE EXCEPTION 'This exam has no questions'; END IF;
   FOR q IN SELECT question_id,options FROM public.questions WHERE exam_id=e.exam_id LOOP
      SELECT jsonb_agg(i ORDER BY CASE WHEN e.shuffle_options THEN random() ELSE 0 END,i)
      INTO indexes FROM generate_series(0,jsonb_array_length(q.options)-1) i;
      opt := opt || jsonb_build_object(q.question_id::text,indexes);
   END LOOP;
   UPDATE public."studentReport" SET student_status='in progress',started_at=now(),
     deadline=now() + ((e.duration_minutes+a.time_bonus_minutes) * interval '1 minute'),
     session_hash=encode(extensions.digest(p_session,'sha256'),'hex'),last_seen_at=now(),
     question_order=ord,option_orders=opt WHERE student_report_id=p_attempt;
   INSERT INTO public.qualify_events(student_report_id,kind) VALUES(p_attempt,'start');
 ELSE
   RAISE EXCEPTION 'Exam is not open or attempt already completed';
 END IF;
 RETURN public.qualify_attempt_payload_internal(p_attempt,true);
END; $$;

CREATE OR REPLACE FUNCTION public.qualify_save(p_attempt uuid,p_token text,p_session text,
 p_answers jsonb,p_review jsonb DEFAULT '{}'::jsonb,p_final boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE; entry record; q public.questions%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR a.access_hash IS NULL OR a.access_hash <> encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex')
   OR a.session_hash IS NULL OR a.session_hash <> encode(extensions.digest(coalesce(p_session,''),'sha256'),'hex') THEN
   RAISE EXCEPTION 'Session expired or used on another device';
 END IF;
 IF a.student_status <> 'in progress' THEN RAISE EXCEPTION 'This attempt is already closed'; END IF;
 IF now() >= a.deadline THEN
   PERFORM public.qualify_grade_internal(p_attempt,'timeout');
   RETURN jsonb_build_object('saved',false,'expired',true,'student_status','submitted');
 END IF;
 IF jsonb_typeof(p_answers) <> 'object' OR jsonb_typeof(p_review) <> 'object' OR
   length(p_answers::text) > 100000 OR length(p_review::text) > 30000 THEN
   RAISE EXCEPTION 'Invalid answer data';
 END IF;
 FOR entry IN SELECT key,value FROM jsonb_each(p_answers) LOOP
    SELECT * INTO q FROM public.questions WHERE question_id::text=entry.key AND exam_id=a.exam_id;
    IF NOT FOUND OR jsonb_typeof(entry.value) <> 'number' OR
        entry.value::text !~ '^[0-9]+$' OR
        (entry.value::text)::integer >= jsonb_array_length(q.options) THEN
      RAISE EXCEPTION 'Invalid answer index or question';
    END IF;
 END LOOP;
 UPDATE public."studentReport" SET answers=p_answers,review_flags=p_review,last_seen_at=now()
 WHERE student_report_id=p_attempt;
 IF p_final THEN PERFORM public.qualify_grade_internal(p_attempt,'submit'); END IF;
 RETURN jsonb_build_object('saved',true,'expired',false,
   'student_status',CASE WHEN p_final THEN 'submitted' ELSE 'in progress' END,
   'server_now',now(),'deadline',a.deadline);
END; $$;

CREATE OR REPLACE FUNCTION public.qualify_log_event(p_attempt uuid,p_token text,p_session text,p_kind text)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE;
BEGIN
 IF p_kind NOT IN ('tab_hidden','fullscreen_exit','copy_attempt','paste_attempt','offline','online') THEN
   RAISE EXCEPTION 'Invalid event';
 END IF;
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt;
 IF NOT FOUND OR a.student_status <> 'in progress' OR a.session_hash IS NULL OR
    a.access_hash <> encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') OR
    a.session_hash <> encode(extensions.digest(coalesce(p_session,''),'sha256'),'hex') THEN
   RAISE EXCEPTION 'Invalid session';
 END IF;
 INSERT INTO public.qualify_events(student_report_id,kind) VALUES(p_attempt,p_kind);
END; $$;

-- Admin-only controls for support, bonus time, result publication and auditing.
CREATE OR REPLACE FUNCTION public.qualify_admin_control(p_attempt uuid,p_action text,p_minutes integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR NOT public.is_admin() OR NOT EXISTS (
   SELECT 1 FROM public.exams WHERE exam_id=a.exam_id AND created_by=auth.uid()) THEN
    RAISE EXCEPTION 'Administrator access required';
 END IF;
 IF p_action='reset_session' AND a.student_status='in progress' THEN
   UPDATE public."studentReport" SET session_hash=NULL WHERE student_report_id=p_attempt;
   INSERT INTO public.qualify_events(student_report_id,kind) VALUES(p_attempt,'session_reset');
 ELSIF p_action='extend_time' AND a.student_status='in progress' AND p_minutes BETWEEN 1 AND 120 THEN
   UPDATE public."studentReport" SET deadline=deadline+p_minutes*interval '1 minute' WHERE student_report_id=p_attempt;
 ELSIF p_action='revoke' AND a.student_status <> 'submitted' THEN
   UPDATE public."studentReport" SET student_status='revoked',session_hash=NULL WHERE student_report_id=p_attempt;
 ELSE
   RAISE EXCEPTION 'Invalid action for attempt';
 END IF;
 RETURN jsonb_build_object('ok',true);
END; $$;

-- Admin batch importer returns secrets once, to be distributed PRIVATELY.
CREATE OR REPLACE FUNCTION public.qualify_admin_bulk_register(p_exam uuid,p_students jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE r jsonb; out_rows jsonb := '[]'::jsonb; t text; aid uuid;
BEGIN
 IF NOT public.is_admin() OR NOT EXISTS (
   SELECT 1 FROM public.exams WHERE exam_id=p_exam AND created_by=auth.uid() AND exam_status='upcoming') THEN
   RAISE EXCEPTION 'Only the owner can import registrations into upcoming exams';
 END IF;
 IF jsonb_typeof(p_students)<>'array' OR jsonb_array_length(p_students) NOT BETWEEN 1 AND 500 THEN
   RAISE EXCEPTION 'Please supply 1 to 500 students';
 END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_students) LOOP
   IF length(btrim(coalesce(r->>'name',''))) NOT BETWEEN 2 AND 120 OR
      length(btrim(coalesce(r->>'email',''))) NOT BETWEEN 5 AND 254 OR
      length(btrim(coalesce(r->>'roll_no',''))) NOT BETWEEN 1 AND 80 THEN
      RAISE EXCEPTION 'Invalid student name, email or roll number';
   END IF;
   t:=encode(extensions.gen_random_bytes(32),'hex');
   INSERT INTO public."studentReport"(exam_id,student_name,email,roll_no,access_hash)
   VALUES(p_exam,btrim(r->>'name'),lower(btrim(r->>'email')),btrim(r->>'roll_no'),encode(extensions.digest(t,'sha256'),'hex'))
   RETURNING student_report_id INTO aid;
   out_rows:=out_rows || jsonb_build_array(jsonb_build_object('student_report_id',aid,
     'name',r->>'name','email',r->>'email','roll_no',r->>'roll_no','access_token',t));
 END LOOP;
 RETURN out_rows;
END; $$;

-- Re-issue private links for legacy registrations or lost secrets.
-- The prior link becomes invalid immediately. This is admin-only.
CREATE OR REPLACE FUNCTION public.qualify_admin_issue_link(p_attempt uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE; t text;
BEGIN
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR NOT public.is_admin() OR NOT EXISTS(
   SELECT 1 FROM public.exams WHERE exam_id=a.exam_id AND created_by=auth.uid()) THEN
   RAISE EXCEPTION 'Administrator access required';
 END IF;
 t:=encode(extensions.gen_random_bytes(32),'hex');
 UPDATE public."studentReport" SET access_hash=encode(extensions.digest(t,'sha256'),'hex'),
  session_hash=NULL WHERE student_report_id=p_attempt;
 RETURN jsonb_build_object('exam_id',a.exam_id,'student_report_id',a.student_report_id,
  'access_token',t,'email',a.email,'name',a.student_name);
END; $$;

CREATE OR REPLACE FUNCTION public.qualify_admin_events(p_exam uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE events jsonb;
BEGIN
 IF NOT public.is_admin() OR NOT EXISTS(SELECT 1 FROM public.exams WHERE exam_id=p_exam AND created_by=auth.uid()) THEN
   RAISE EXCEPTION 'Administrator access required';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('student_name',a.student_name,'roll_no',a.roll_no,
   'kind',v.kind,'created_at',v.created_at) ORDER BY v.created_at DESC),'[]'::jsonb)
 INTO events FROM (SELECT * FROM public.qualify_events WHERE student_report_id IN
   (SELECT student_report_id FROM public."studentReport" WHERE exam_id=p_exam)
   ORDER BY created_at DESC LIMIT 300) v
 JOIN public."studentReport" a ON a.student_report_id=v.student_report_id;
 RETURN events;
END; $$;

-- Atomic creation: exam and questions succeed or fail in a single transaction.
CREATE OR REPLACE FUNCTION public.qualify_create_exam(p_exam jsonb,p_questions jsonb)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE eid uuid; q jsonb; total integer:=0; n integer; data_options jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF jsonb_typeof(p_questions)<>'array' OR jsonb_array_length(p_questions) NOT BETWEEN 1 AND 200 THEN
   RAISE EXCEPTION 'Please add 1 to 200 questions';
 END IF;
 FOR q IN SELECT value FROM jsonb_array_elements(p_questions) LOOP
    data_options:=q->'options';
    IF length(btrim(coalesce(q->>'question_text','')))=0 OR jsonb_typeof(data_options)<>'array'
       OR jsonb_array_length(data_options) NOT BETWEEN 2 AND 6 OR (q->>'correct_option')::integer
         NOT BETWEEN 0 AND jsonb_array_length(data_options)-1
       OR (q->>'marks')::integer < 1 THEN
      RAISE EXCEPTION 'A question has invalid text, options, correct index, or marks';
    END IF;
    total:=total+(q->>'marks')::integer;
 END LOOP;
 IF total <> (p_exam->>'total_marks')::integer THEN
   RAISE EXCEPTION 'Total marks must equal the sum of question marks (%)',total;
 END IF;
 IF coalesce((p_exam->>'pass_mark')::integer,0)>total THEN RAISE EXCEPTION 'Pass mark exceeds total marks'; END IF;
 INSERT INTO public.exams(title,course,exam_status,scheduled_date,duration_minutes,total_marks,total_questions,
   pass_mark,created_by,shuffle_questions,shuffle_options,instructions)
 VALUES(btrim(p_exam->>'title'),btrim(p_exam->>'course'),'upcoming',
  (p_exam->>'scheduled_date')::timestamptz,(p_exam->>'duration_minutes')::integer,total,
  jsonb_array_length(p_questions),0,auth.uid(),
  coalesce((p_exam->>'shuffle_questions')::boolean,true),coalesce((p_exam->>'shuffle_options')::boolean,true),
  coalesce(p_exam->>'instructions','Answer all questions carefully')) RETURNING exam_id INTO eid;
 FOR q IN SELECT value FROM jsonb_array_elements(p_questions) LOOP
   INSERT INTO public.questions(exam_id,question_text,options,correct_option,marks)
   VALUES(eid,q->>'question_text',q->'options',(q->>'correct_option')::integer,(q->>'marks')::integer);
 END LOOP;
 UPDATE public.exams SET pass_mark=coalesce((p_exam->>'pass_mark')::integer,0) WHERE exam_id=eid;
 RETURN eid;
END; $$;

CREATE OR REPLACE FUNCTION public.qualify_results(p_attempt uuid,p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE; e public.exams%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt;
 IF NOT FOUND OR a.access_hash IS NULL OR
   a.access_hash <> encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') THEN
   RAISE EXCEPTION 'Invalid private result link';
 END IF;
 SELECT * INTO e FROM public.exams WHERE exam_id=a.exam_id;
 IF a.student_status <> 'submitted' THEN RETURN jsonb_build_object('status','pending'); END IF;
 IF NOT e.results_published THEN RETURN jsonb_build_object('status','unpublished'); END IF;
 RETURN jsonb_build_object('status','published','title',e.title,'student_name',a.student_name,
   'roll_no',a.roll_no,'score',a.marks_scored,'total_marks',e.total_marks,
   'pass_mark',e.pass_mark,'passed',a.marks_scored>=e.pass_mark,'submitted_at',a.submitted_at);
END; $$;

-- Never grant execute on internal helpers to any API role.
REVOKE ALL ON FUNCTION public.qualify_grade_internal(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.qualify_attempt_payload_internal(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_public_exam(uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_register(uuid,text,text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_student_state(uuid,text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_begin(uuid,text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_save(uuid,text,text,jsonb,jsonb,boolean) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_log_event(uuid,text,text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_results(uuid,text) TO anon,authenticated;
REVOKE ALL ON FUNCTION public.qualify_admin_control(uuid,text,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.qualify_admin_bulk_register(uuid,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.qualify_admin_issue_link(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.qualify_admin_events(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.qualify_create_exam(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_admin_control(uuid,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_admin_bulk_register(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_admin_issue_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_admin_events(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_create_exam(jsonb,jsonb) TO authenticated;
-- Prevent edits to questions once anyone has begun, preserving scoring integrity.
CREATE OR REPLACE FUNCTION public.qualify_protect_questions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public."studentReport" a WHERE a.exam_id=OLD.exam_id
           AND a.started_at IS NOT NULL) THEN
   RAISE EXCEPTION 'Questions cannot be changed after an attempt has started';
 END IF;
 IF TG_OP = 'UPDATE' THEN RETURN NEW; END IF;
 RETURN OLD;
END; $$;
DROP TRIGGER IF EXISTS qualify_questions_immutable ON public.questions;
CREATE TRIGGER qualify_questions_immutable BEFORE UPDATE OR DELETE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.qualify_protect_questions();
REVOKE ALL ON FUNCTION public.qualify_protect_questions() FROM PUBLIC,anon,authenticated;

-- Keep exam totals consistent when the owner edits an upcoming paper.
-- Initial transactional exam creation restores pass mark after every insert.
CREATE OR REPLACE FUNCTION public.qualify_recalculate_exam()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE eid uuid; subtotal integer; qcount integer;
BEGIN
 IF TG_OP='DELETE' THEN eid:=OLD.exam_id; ELSE eid:=NEW.exam_id; END IF;
 SELECT coalesce(sum(marks),0),count(*) INTO subtotal,qcount FROM public.questions WHERE exam_id=eid;
 IF qcount=0 THEN
   -- Existing exams may be deleted through their FK cascade.
   UPDATE public.exams SET total_questions=0 WHERE exam_id=eid;
 ELSE
   UPDATE public.exams SET total_marks=subtotal,total_questions=qcount,
     pass_mark=least(pass_mark,subtotal) WHERE exam_id=eid;
 END IF;
 RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS qualify_question_totals ON public.questions;
CREATE TRIGGER qualify_question_totals AFTER INSERT OR UPDATE OR DELETE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.qualify_recalculate_exam();
REVOKE ALL ON FUNCTION public.qualify_recalculate_exam() FROM PUBLIC,anon,authenticated;

-- Server-side expiration sweep. Schedule with pg_cron separately if available.
CREATE OR REPLACE FUNCTION public.qualify_finalize_expired()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE a record; counter integer:=0;
BEGIN
 FOR a IN SELECT student_report_id FROM public."studentReport"
   WHERE student_status='in progress' AND deadline <= now() LIMIT 500 LOOP
   PERFORM public.qualify_grade_internal(a.student_report_id,'timeout');
   counter:=counter+1;
 END LOOP;
 RETURN counter;
END; $$;
REVOKE ALL ON FUNCTION public.qualify_finalize_expired() FROM PUBLIC,anon,authenticated;

COMMIT;
