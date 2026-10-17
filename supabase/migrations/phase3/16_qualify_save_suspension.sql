-- Phase 3 / 16: deny exam traffic when its institution is suspended.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_save(p_attempt uuid,p_token text,p_session text,
 p_answers jsonb,p_review jsonb DEFAULT '{}'::jsonb,p_final boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE; entry record; q public.questions%ROWTYPE;
BEGIN
 IF NOT public.qualify_exam_in_active_institution((SELECT exam_id FROM public."studentReport" WHERE student_report_id=p_attempt)) THEN RAISE EXCEPTION 'This institution is suspended'; END IF;
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
REVOKE ALL ON FUNCTION public.qualify_save(uuid,text,text,jsonb,jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qualify_save(uuid,text,text,jsonb,jsonb,boolean) TO anon,authenticated;
COMMIT;
