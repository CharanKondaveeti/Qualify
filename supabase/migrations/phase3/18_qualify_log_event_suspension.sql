-- Phase 3 / 18: suspension affects activity logging.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_log_event(
  p_attempt uuid, p_token text, p_session text, p_kind text
)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $func$
DECLARE
  a public."studentReport"%ROWTYPE;
BEGIN
 IF NOT public.qualify_exam_in_active_institution((SELECT exam_id FROM public."studentReport" WHERE student_report_id=p_attempt)) THEN RAISE EXCEPTION 'This institution is suspended'; END IF;
  IF p_kind NOT IN ('tab_hidden', 'fullscreen_exit', 'copy_attempt',
     'paste_attempt', 'offline', 'online') THEN
    RAISE EXCEPTION 'Invalid event';
  END IF;
  SELECT * INTO a FROM public."studentReport"
  WHERE student_report_id = p_attempt;
  IF NOT FOUND OR a.student_status <> 'in progress'
    OR a.session_hash IS NULL
    OR a.access_hash <> encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    OR a.session_hash <> encode(extensions.digest(coalesce(p_session, ''), 'sha256'), 'hex')
    OR NOT EXISTS (SELECT 1 FROM public.exams e
      WHERE e.exam_id = a.exam_id AND e.exam_status = 'active') THEN
    RAISE EXCEPTION 'Invalid or closed session';
  END IF;
  INSERT INTO public.qualify_events(student_report_id, kind)
  VALUES (p_attempt, p_kind);
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_log_event(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qualify_log_event(uuid,text,text,text) TO anon,authenticated;
COMMIT;
