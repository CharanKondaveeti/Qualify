-- Phase 3 / 09: guarded qualify_admin_events for institutional exam roles.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_admin_events(p_exam uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE events jsonb;
BEGIN
 IF NOT public.qualify_exam_can_manage(p_exam) THEN
   RAISE EXCEPTION 'Administrator access required';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('student_name',a.student_name,'roll_no',a.roll_no,
   'kind',v.kind,'created_at',v.created_at) ORDER BY v.created_at DESC),'[]'::jsonb)
 INTO events FROM (SELECT * FROM public.qualify_events WHERE student_report_id IN
   (SELECT student_report_id FROM public."studentReport" WHERE exam_id=p_exam)
   ORDER BY created_at DESC LIMIT 300) v
 JOIN public."studentReport" a ON a.student_report_id=v.student_report_id;
 RETURN events;
END; $$;
REVOKE ALL ON FUNCTION public.qualify_admin_events(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_admin_events(uuid) TO authenticated;
COMMIT;
