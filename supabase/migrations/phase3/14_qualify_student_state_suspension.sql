-- Phase 3 / 14: deny exam traffic when its institution is suspended.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_student_state(p_attempt uuid,p_token text,p_session text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE; ready boolean;
BEGIN
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
COMMIT;
