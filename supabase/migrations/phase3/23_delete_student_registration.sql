-- Phase 3 / 23: allow deleting only unstarted, upcoming registrations.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_admin_delete_registration(p_attempt uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $func$
DECLARE a public."studentReport"%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR NOT public.qualify_exam_can_manage(a.exam_id)
   OR NOT EXISTS(SELECT 1 FROM public.exams WHERE exam_id=a.exam_id AND exam_status='upcoming')
   OR a.started_at IS NOT NULL THEN
   RAISE EXCEPTION 'Only an unstarted upcoming registration can be deleted'; END IF;
 DELETE FROM public."studentReport" WHERE student_report_id=p_attempt;
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_admin_delete_registration(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_admin_delete_registration(uuid) TO authenticated;
COMMIT;
