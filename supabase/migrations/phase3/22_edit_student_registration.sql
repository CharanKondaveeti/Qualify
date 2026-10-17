-- Phase 3 / 22: maintain legacy admin registration editing without allowing marks changes.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_admin_edit_registration(
 p_attempt uuid,p_name text,p_email text,p_roll text
) RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $func$
DECLARE a public."studentReport"%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR NOT public.qualify_exam_can_manage(a.exam_id)
   OR NOT EXISTS(SELECT 1 FROM public.exams WHERE exam_id=a.exam_id AND exam_status='upcoming')
   OR a.started_at IS NOT NULL THEN RAISE EXCEPTION 'Only an unstarted upcoming registration can be edited'; END IF;
 IF length(btrim(coalesce(p_name,''))) NOT BETWEEN 2 AND 120
   OR length(btrim(coalesce(p_email,''))) NOT BETWEEN 5 AND 254
   OR btrim(p_email) NOT LIKE '%@%.%'
   OR length(btrim(coalesce(p_roll,''))) NOT BETWEEN 1 AND 80 THEN
   RAISE EXCEPTION 'Invalid registration details'; END IF;
 UPDATE public."studentReport"
 SET student_name=btrim(p_name), email=lower(btrim(p_email)), roll_no=btrim(p_roll)
 WHERE student_report_id=p_attempt;
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_admin_edit_registration(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_admin_edit_registration(uuid,text,text,text) TO authenticated;
COMMIT;
