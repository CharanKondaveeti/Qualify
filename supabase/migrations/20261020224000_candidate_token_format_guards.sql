-- Defensive boundary checks for anonymous candidate RPCs.
-- Browser tokens and sessions are generated as 32 random bytes (64 hex chars).
-- For state polling, p_session is intentionally optional before the exam begins.
-- Existing authorization, grading, session-binding and timing logic is preserved.
CREATE OR REPLACE FUNCTION public.qualify_begin(p_attempt uuid, p_token text, p_session text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a public."studentReport"%ROWTYPE; e public.exams%ROWTYPE; q record;
  ord uuid[]; opt jsonb := '{}'::jsonb; indexes jsonb;
BEGIN
  IF coalesce(p_token, '') !~ '^[0-9a-f]{64}$'
    OR coalesce(p_session, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid private token format';
  END IF;
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
END; $function$;


CREATE OR REPLACE FUNCTION public.qualify_student_state(p_attempt uuid, p_token text, p_session text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a public."studentReport"%ROWTYPE; ready boolean;
BEGIN
  IF coalesce(p_token, '') !~ '^[0-9a-f]{64}$'
    OR (p_session IS NOT NULL AND p_session !~ '^[0-9a-f]{64}$') THEN
    RAISE EXCEPTION 'Invalid private token format';
  END IF;
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
END; $function$;


CREATE OR REPLACE FUNCTION public.qualify_results(p_attempt uuid, p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a public."studentReport"%ROWTYPE; e public.exams%ROWTYPE;
BEGIN
  IF coalesce(p_token, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid private token format';
  END IF;
 IF NOT public.qualify_exam_in_active_institution((SELECT exam_id FROM public."studentReport" WHERE student_report_id=p_attempt)) THEN RAISE EXCEPTION 'This institution is suspended'; END IF;
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
END; $function$;

