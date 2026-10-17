-- Apply after Phase 3 / 25. Existing exams retain duration-based timing.
BEGIN;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS timing_mode text NOT NULL DEFAULT 'duration';
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS entry_window_minutes integer NOT NULL DEFAULT 30;
ALTER TABLE public.exams ADD CONSTRAINT qualify_exam_timing_valid CHECK (
  timing_mode IN ('time','duration') AND duration_minutes IS NOT NULL AND duration_minutes > 0
  AND entry_window_minutes IS NOT NULL AND entry_window_minutes BETWEEN 1 AND 180
  AND ((timing_mode='time' AND ends_at IS NOT NULL AND scheduled_date IS NOT NULL AND ends_at > scheduled_date)
    OR (timing_mode='duration' AND ends_at IS NULL))
);
GRANT UPDATE(timing_mode,ends_at,entry_window_minutes) ON public.exams TO authenticated;

CREATE OR REPLACE FUNCTION public.qualify_exam_update_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $func$
BEGIN
 IF OLD.exam_status='completed' AND NEW.exam_status IS DISTINCT FROM OLD.exam_status THEN
   RAISE EXCEPTION 'A completed exam cannot be reopened';
 END IF;
 IF OLD.exam_status='active' AND NEW.exam_status='upcoming' THEN
   RAISE EXCEPTION 'An active exam cannot return to upcoming';
 END IF;
 IF (OLD.exam_status <> 'upcoming' OR OLD.scheduled_date <= now() OR EXISTS (
   SELECT 1 FROM public."studentReport" WHERE exam_id=OLD.exam_id AND started_at IS NOT NULL
 )) AND (NEW.timing_mode IS DISTINCT FROM OLD.timing_mode OR
   NEW.ends_at IS DISTINCT FROM OLD.ends_at OR
   NEW.entry_window_minutes IS DISTINCT FROM OLD.entry_window_minutes OR
   NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date OR
   NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes) THEN
   RAISE EXCEPTION 'Timing can only be changed before an exam starts';
 END IF;
 IF OLD.exam_status IN ('active','completed') AND (
   NEW.title IS DISTINCT FROM OLD.title OR
   NEW.course IS DISTINCT FROM OLD.course OR
   NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date OR
   NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes OR
   NEW.shuffle_questions IS DISTINCT FROM OLD.shuffle_questions OR
   NEW.shuffle_options IS DISTINCT FROM OLD.shuffle_options OR
   NEW.instructions IS DISTINCT FROM OLD.instructions OR
   (OLD.exam_status='active' AND NEW.pass_mark IS DISTINCT FROM OLD.pass_mark)
 ) THEN
   RAISE EXCEPTION 'Exam instructions and scoring settings are frozen after opening';
 END IF;
 IF NEW.pass_mark < 0 OR NEW.pass_mark > NEW.total_marks THEN
   RAISE EXCEPTION 'Pass mark must be between 0 and total marks';
 END IF;
 IF NEW.results_published AND NEW.exam_status<>'completed' THEN
   RAISE EXCEPTION 'Close the exam before publishing results';
 END IF;
 RETURN NEW;
END;
$func$;

REVOKE ALL ON FUNCTION public.qualify_exam_update_guard() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.qualify_sync_exam(p_exam uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.exams%ROWTYPE; a record;
BEGIN
 SELECT * INTO e FROM public.exams WHERE exam_id=p_exam FOR UPDATE;
 IF NOT FOUND OR e.exam_status='completed' OR e.scheduled_date > now() THEN RETURN; END IF;
 IF e.exam_status='upcoming' THEN
   UPDATE public.exams SET exam_status='active' WHERE exam_id=p_exam;
 END IF;
 FOR a IN SELECT student_report_id FROM public."studentReport"
   WHERE exam_id=p_exam AND student_status='in progress'
     AND (deadline <= now() OR (e.timing_mode='time' AND e.ends_at <= now()))
   ORDER BY student_report_id FOR UPDATE LOOP
   PERFORM public.qualify_grade_internal(a.student_report_id,'timeout');
 END LOOP;
 IF (e.timing_mode='time' AND now() >= e.ends_at) OR
    (e.timing_mode='duration' AND now() >= e.scheduled_date + e.entry_window_minutes * interval '1 minute'
     AND NOT EXISTS (SELECT 1 FROM public."studentReport" WHERE exam_id=p_exam AND student_status='in progress')) THEN
   UPDATE public.exams SET exam_status='completed' WHERE exam_id=p_exam;
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.qualify_sync_exam(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.qualify_finalize_expired()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e record; counter integer:=0;
BEGIN
 FOR e IN SELECT exam_id FROM public.exams
   WHERE exam_status IN ('upcoming','active') AND scheduled_date <= now()
   ORDER BY scheduled_date,exam_id LOOP
   PERFORM public.qualify_sync_exam(e.exam_id);
   counter:=counter+1;
 END LOOP;
 RETURN counter;
END; $$;
REVOKE ALL ON FUNCTION public.qualify_finalize_expired() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_finalize_expired() TO service_role;
CREATE OR REPLACE FUNCTION public.qualify_create_exam(p_exam jsonb,p_questions jsonb)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE eid uuid; q jsonb; total integer:=0; n integer; data_options jsonb;
 v_institution uuid; v_count integer;
BEGIN
 v_institution:=nullif(p_exam->>'institution_id','')::uuid;
 IF v_institution IS NULL THEN
   SELECT i.id INTO v_institution FROM public.institutions i
   JOIN public.institution_members m ON m.institution_id=i.id
   WHERE m.user_id=(SELECT auth.uid()) AND i.is_legacy=true
      AND i.status='active' AND m.status='active' LIMIT 1;
   IF v_institution IS NULL THEN
     SELECT count(*),min(m.institution_id) INTO v_count,v_institution
     FROM public.institution_members m JOIN public.institutions i ON i.id=m.institution_id
     WHERE m.user_id=(SELECT auth.uid()) AND m.status='active' AND i.status='active';
     IF v_count<>1 THEN RAISE EXCEPTION 'Choose an institution before creating an exam'; END IF;
   END IF;
 END IF;
 IF NOT public.qualify_can_create_institution_exam(v_institution) THEN
   RAISE EXCEPTION 'You cannot create exams in this institution'; END IF;
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
 -- Generate exam UUID before the insert. This avoids INSERT...RETURNING...INTO.
 eid := gen_random_uuid();
 INSERT INTO public.exams(exam_id,title,course,exam_status,scheduled_date,duration_minutes,total_marks,total_questions,
   pass_mark,created_by,shuffle_questions,shuffle_options,instructions,institution_id,timing_mode,ends_at,entry_window_minutes)
 VALUES(eid,btrim(p_exam->>'title'),btrim(p_exam->>'course'),'upcoming',
  (p_exam->>'scheduled_date')::timestamptz,(p_exam->>'duration_minutes')::integer,total,
  jsonb_array_length(p_questions),0,auth.uid(),
  coalesce((p_exam->>'shuffle_questions')::boolean,true),coalesce((p_exam->>'shuffle_options')::boolean,true),
  coalesce(p_exam->>'instructions','Answer all questions carefully'),v_institution,
  coalesce(p_exam->>'timing_mode','duration'),nullif(p_exam->>'ends_at','')::timestamptz,
  coalesce((p_exam->>'entry_window_minutes')::integer,30));
 FOR q IN SELECT value FROM jsonb_array_elements(p_questions) LOOP
   INSERT INTO public.questions(exam_id,question_text,options,correct_option,marks)
   VALUES(eid,q->>'question_text',q->'options',(q->>'correct_option')::integer,(q->>'marks')::integer);
 END LOOP;
 UPDATE public.exams SET pass_mark=coalesce((p_exam->>'pass_mark')::integer,0) WHERE exam_id=eid;
 RETURN eid;
END; $$;
REVOKE ALL ON FUNCTION public.qualify_create_exam(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_create_exam(jsonb,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.qualify_begin(p_attempt uuid,p_token text,p_session text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE; e public.exams%ROWTYPE; q record;
  ord uuid[]; opt jsonb := '{}'::jsonb; indexes jsonb;
BEGIN
 PERFORM public.qualify_sync_exam((SELECT exam_id FROM public."studentReport" WHERE student_report_id=p_attempt));
 IF NOT public.qualify_exam_in_active_institution((SELECT exam_id FROM public."studentReport" WHERE student_report_id=p_attempt)) THEN RAISE EXCEPTION 'This institution is suspended'; END IF;
 IF length(coalesce(p_session,'')) < 32 THEN RAISE EXCEPTION 'Invalid session'; END IF;
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR a.access_hash IS NULL OR
   a.access_hash <> encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') THEN
   RAISE EXCEPTION 'Invalid private exam link';
 END IF;
 SELECT * INTO e FROM public.exams WHERE exam_id=a.exam_id;
 IF a.student_status='submitted' THEN RETURN public.qualify_attempt_payload_internal(p_attempt,false); END IF;
 IF a.student_status='in progress' AND now() >= a.deadline THEN
   PERFORM public.qualify_grade_internal(p_attempt,'timeout');
   RETURN public.qualify_attempt_payload_internal(p_attempt,false);
 ELSIF a.student_status='in progress' THEN
   IF a.session_hash IS NULL THEN
     UPDATE public."studentReport" SET session_hash=encode(extensions.digest(p_session,'sha256'),'hex'),last_seen_at=now()
       WHERE student_report_id=p_attempt;
   ELSIF a.session_hash <> encode(extensions.digest(p_session,'sha256'),'hex') THEN
     RAISE EXCEPTION 'Another device is already using this exam attempt';
   END IF;
 ELSIF a.student_status='not started' AND e.exam_status='active' AND e.scheduled_date <= now() THEN
   IF (e.timing_mode='time' AND now() >= e.ends_at) OR
      (e.timing_mode='duration' AND now() >= e.scheduled_date + e.entry_window_minutes * interval '1 minute') THEN
     RAISE EXCEPTION 'The time to start this exam has ended';
   END IF;
   SELECT array_agg(question_id ORDER BY CASE WHEN e.shuffle_questions THEN random() ELSE 0 END, question_id)
   INTO ord FROM public.questions WHERE exam_id=e.exam_id;
   IF ord IS NULL THEN RAISE EXCEPTION 'This exam has no questions'; END IF;
   FOR q IN SELECT question_id,options FROM public.questions WHERE exam_id=e.exam_id LOOP
      SELECT jsonb_agg(i ORDER BY CASE WHEN e.shuffle_options THEN random() ELSE 0 END,i)
      INTO indexes FROM generate_series(0,jsonb_array_length(q.options)-1) i;
      opt := opt || jsonb_build_object(q.question_id::text,indexes);
   END LOOP;
   UPDATE public."studentReport" SET student_status='in progress',started_at=now(),
     deadline=CASE WHEN e.timing_mode='time' THEN e.ends_at
       ELSE now() + ((e.duration_minutes+a.time_bonus_minutes) * interval '1 minute') END,
     session_hash=encode(extensions.digest(p_session,'sha256'),'hex'),last_seen_at=now(),
     question_order=ord,option_orders=opt WHERE student_report_id=p_attempt;
   INSERT INTO public.qualify_events(student_report_id,kind) VALUES(p_attempt,'start');
 ELSE
   RAISE EXCEPTION 'Exam is not open or attempt already completed';
 END IF;
 RETURN public.qualify_attempt_payload_internal(p_attempt,true);
END; $$;
REVOKE ALL ON FUNCTION public.qualify_begin(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qualify_begin(uuid,text,text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.qualify_student_state(p_attempt uuid,p_token text,p_session text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE; ready boolean;
BEGIN
 PERFORM public.qualify_sync_exam((SELECT exam_id FROM public."studentReport" WHERE student_report_id=p_attempt));
 IF NOT public.qualify_exam_in_active_institution((SELECT exam_id FROM public."studentReport" WHERE student_report_id=p_attempt)) THEN RAISE EXCEPTION 'This institution is suspended'; END IF;
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
REVOKE ALL ON FUNCTION public.qualify_student_state(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qualify_student_state(uuid,text,text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.qualify_save(p_attempt uuid,p_token text,p_session text,
 p_answers jsonb,p_review jsonb DEFAULT '{}'::jsonb,p_final boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE; entry record; q public.questions%ROWTYPE;
BEGIN
 PERFORM public.qualify_sync_exam((SELECT exam_id FROM public."studentReport" WHERE student_report_id=p_attempt));
 IF NOT public.qualify_exam_in_active_institution((SELECT exam_id FROM public."studentReport" WHERE student_report_id=p_attempt)) THEN RAISE EXCEPTION 'This institution is suspended'; END IF;
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR a.access_hash IS NULL OR a.access_hash <> encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') THEN
   RAISE EXCEPTION 'Invalid private exam link';
 END IF;
 -- Grading clears session_hash. Return the completed state to the token holder
 -- before checking the live session, so expiration commits instead of rolling back.
 IF a.student_status='submitted' THEN RETURN jsonb_build_object('saved',false,'expired',true,'student_status','submitted'); END IF;
 IF a.session_hash IS NULL OR a.session_hash <> encode(extensions.digest(coalesce(p_session,''),'sha256'),'hex') THEN
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
REVOKE ALL ON FUNCTION public.qualify_save(uuid,text,text,jsonb,jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qualify_save(uuid,text,text,jsonb,jsonb,boolean) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.qualify_public_exam(p_exam uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.exams%ROWTYPE;
BEGIN
 PERFORM public.qualify_sync_exam(p_exam);
 IF NOT public.qualify_exam_in_active_institution(p_exam) THEN RAISE EXCEPTION 'This institution is suspended'; END IF;
 SELECT * INTO e FROM public.exams WHERE exam_id = p_exam AND exam_status IN ('upcoming','active');
 IF NOT FOUND THEN RAISE EXCEPTION 'This exam is unavailable'; END IF;
 RETURN jsonb_build_object('exam_id',e.exam_id,'title',e.title,'course',e.course,
    'exam_status',e.exam_status,'scheduled_date',e.scheduled_date,
    'timing_mode',e.timing_mode,'ends_at',e.ends_at,'entry_window_minutes',e.entry_window_minutes,
  'last_entry_at',CASE WHEN e.timing_mode='time' THEN e.ends_at ELSE e.scheduled_date + e.entry_window_minutes * interval '1 minute' END,
  'duration_minutes',e.duration_minutes,'total_marks',e.total_marks,
    'total_questions',e.total_questions,'instructions',e.instructions);
END; $$;
REVOKE ALL ON FUNCTION public.qualify_public_exam(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qualify_public_exam(uuid) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.qualify_register(p_exam uuid, p_name text, p_email text, p_roll text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a uuid; t text;
BEGIN
 PERFORM public.qualify_sync_exam(p_exam);
 IF NOT public.qualify_exam_in_active_institution(p_exam) THEN RAISE EXCEPTION 'This institution is suspended'; END IF;
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
REVOKE ALL ON FUNCTION public.qualify_register(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qualify_register(uuid,text,text,text) TO anon,authenticated;
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
  'exam_status',e.exam_status,'scheduled_date',e.scheduled_date,'timing_mode',e.timing_mode,'ends_at',e.ends_at,'entry_window_minutes',e.entry_window_minutes,
  'last_entry_at',CASE WHEN e.timing_mode='time' THEN e.ends_at ELSE e.scheduled_date + e.entry_window_minutes * interval '1 minute' END,
  'duration_minutes',e.duration_minutes,
  'student_name',a.student_name,'roll_no',a.roll_no,'email',a.email,
  'student_status',a.student_status,'started_at',a.started_at,'deadline',a.deadline,
  'server_now',now(),'answers',CASE WHEN p_include_questions THEN a.answers ELSE '{}'::jsonb END,
  'review_flags', CASE WHEN p_include_questions THEN a.review_flags ELSE '{}'::jsonb END,
  'questions',qs,'results_published',e.results_published,
  'marks_scored',CASE WHEN a.student_status='submitted' AND e.results_published THEN a.marks_scored ELSE NULL END,
  'total_marks',e.total_marks,'pass_mark',e.pass_mark,'instructions',e.instructions);
END; $$;


REVOKE ALL ON FUNCTION public.qualify_attempt_payload_internal(uuid,boolean) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.qualify_admin_control(p_attempt uuid,p_action text,p_minutes integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE;
BEGIN
 PERFORM public.qualify_sync_exam((SELECT exam_id FROM public."studentReport" WHERE student_report_id=p_attempt));
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR NOT public.qualify_exam_can_manage(a.exam_id) THEN
    RAISE EXCEPTION 'Administrator access required';
 END IF;
 IF p_action='reset_session' AND a.student_status='in progress' THEN
   UPDATE public."studentReport" SET session_hash=NULL WHERE student_report_id=p_attempt;
   INSERT INTO public.qualify_events(student_report_id,kind) VALUES(p_attempt,'session_reset');
 ELSIF p_action='extend_time' AND a.student_status='in progress' AND p_minutes BETWEEN 1 AND 120 THEN
   IF EXISTS (SELECT 1 FROM public.exams WHERE exam_id=a.exam_id AND timing_mode='time') THEN
     RAISE EXCEPTION 'Time-based exams have one fixed closing time; extensions are unavailable';
   END IF;
   IF a.deadline <= now() THEN RAISE EXCEPTION 'This attempt has already ended'; END IF;
   UPDATE public."studentReport" SET deadline=deadline+p_minutes*interval '1 minute' WHERE student_report_id=p_attempt;
 ELSIF p_action='revoke' AND a.student_status <> 'submitted' THEN
   UPDATE public."studentReport" SET student_status='revoked',session_hash=NULL WHERE student_report_id=p_attempt;
 ELSE
   RAISE EXCEPTION 'Invalid action for attempt';
 END IF;
 RETURN jsonb_build_object('ok',true);
END; $$;
REVOKE ALL ON FUNCTION public.qualify_admin_control(uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_admin_control(uuid,text,integer) TO authenticated;
COMMIT;
