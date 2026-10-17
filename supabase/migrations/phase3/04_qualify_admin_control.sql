-- Phase 3 / 04: guarded qualify_admin_control for institutional exam roles.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_admin_control(p_attempt uuid,p_action text,p_minutes integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR NOT public.qualify_exam_can_manage(a.exam_id) THEN
    RAISE EXCEPTION 'Administrator access required';
 END IF;
 IF p_action='reset_session' AND a.student_status='in progress' THEN
   UPDATE public."studentReport" SET session_hash=NULL WHERE student_report_id=p_attempt;
   INSERT INTO public.qualify_events(student_report_id,kind) VALUES(p_attempt,'session_reset');
 ELSIF p_action='extend_time' AND a.student_status='in progress' AND p_minutes BETWEEN 1 AND 120 THEN
   UPDATE public."studentReport" SET deadline=deadline+p_minutes*interval '1 minute' WHERE student_report_id=p_attempt;
 ELSIF p_action='revoke' AND a.student_status <> 'submitted' THEN
   UPDATE public."studentReport" SET student_status='revoked',session_hash=NULL WHERE student_report_id=p_attempt;
 ELSE
   RAISE EXCEPTION 'Invalid action for attempt';
 END IF;
 RETURN jsonb_build_object('ok',true);
END; $$;
REVOKE ALL ON FUNCTION public.qualify_admin_control(uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_admin_control(uuid,text,integer) TO authenticated;
COMMIT;
