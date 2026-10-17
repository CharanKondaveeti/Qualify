-- Phase 3 / 06: guarded qualify_admin_issue_link for institutional exam roles.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_admin_issue_link(p_attempt uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $func$
DECLARE
  a public."studentReport"%ROWTYPE;
  t text;
BEGIN
  SELECT * INTO a FROM public."studentReport"
  WHERE student_report_id = p_attempt FOR UPDATE;
  IF NOT FOUND OR NOT public.qualify_exam_can_manage(a.exam_id) OR NOT EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.exam_id = a.exam_id AND e.exam_status IN ('upcoming', 'active')
  ) THEN
    RAISE EXCEPTION 'Private links are available only to the owner of an upcoming or active exam';
  END IF;

  t := encode(extensions.gen_random_bytes(32), 'hex');
  UPDATE public."studentReport"
  SET access_hash = encode(extensions.digest(t, 'sha256'), 'hex'),
      session_hash = NULL
  WHERE student_report_id = p_attempt;

  RETURN jsonb_build_object(
    'exam_id', a.exam_id,
    'student_report_id', a.student_report_id,
    'access_token', t,
    'email', a.email,
    'name', a.student_name
  );
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_admin_issue_link(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_admin_issue_link(uuid) TO authenticated;
COMMIT;
