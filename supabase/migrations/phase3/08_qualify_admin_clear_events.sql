-- Phase 3 / 08: guarded qualify_admin_clear_events for institutional exam roles.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_admin_clear_events(p_exam uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $func$
DECLARE
  deleted_count integer := 0;
BEGIN
  IF NOT public.qualify_exam_can_manage(p_exam) OR NOT EXISTS (
    SELECT 1 FROM public.exams e WHERE e.exam_id=p_exam AND e.exam_status='completed'
  ) THEN
    RAISE EXCEPTION 'Only the exam owner can delete activity after the exam is closed';
  END IF;

  DELETE FROM public.qualify_events AS ev
  USING public."studentReport" AS student
  WHERE ev.student_report_id = student.student_report_id
    AND student.exam_id = p_exam;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN jsonb_build_object('deleted_count', deleted_count);
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_admin_clear_events(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_admin_clear_events(uuid) TO authenticated;
COMMIT;
