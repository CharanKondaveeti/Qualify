-- Phase 3 / 15: deny exam traffic when its institution is suspended.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_begin(p_attempt uuid,p_token text,p_session text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE; e public.exams%ROWTYPE; q record;
  ord uuid[]; opt jsonb := '{}'::jsonb; indexes jsonb;
BEGIN
 IF NOT public.qualify_exam_in_active_institution((SELECT exam_id FROM public."studentReport" WHERE student_report_id=p_attempt)) THEN RAISE EXCEPTION 'This institution is suspended'; END IF;
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
REVOKE ALL ON FUNCTION public.qualify_begin(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qualify_begin(uuid,text,text) TO anon,authenticated;
COMMIT;
