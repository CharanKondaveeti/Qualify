-- Exact function definitions before admin action guards.
-- Emergency rollback ONLY.

CREATE OR REPLACE FUNCTION public.qualify_admin_control(p_attempt uuid, p_action text, p_minutes integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a public."studentReport"%ROWTYPE;
BEGIN
 PERFORM public.qualify_sync_exam((SELECT exam_id FROM public."studentReport" WHERE student_report_id=p_attempt));
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt FOR UPDATE;
 IF NOT FOUND OR NOT public.qualify_exam_can_manage(a.exam_id) THEN
    RAISE EXCEPTION 'Administrator access required';
 END IF;
 IF p_action='reset_session' AND a.student_status='in progress' THEN
   UPDATE public."studentReport" SET session_hash=NULL WHERE student_report_id=p_attempt;
   INSERT INTO public.qualify_events(student_report_id,kind) VALUES(p_attempt,'session_reset');
 ELSIF p_action='extend_time' AND a.student_status='in progress' AND p_minutes BETWEEN 1 AND 120 THEN
   IF EXISTS (SELECT 1 FROM public.exams WHERE exam_id=a.exam_id AND timing_mode='time') THEN
     RAISE EXCEPTION 'Time-based exams have one fixed closing time; extensions are unavailable';
   END IF;
   IF a.deadline <= now() THEN RAISE EXCEPTION 'This attempt has already ended'; END IF;
   UPDATE public."studentReport" SET deadline=deadline+p_minutes*interval '1 minute' WHERE student_report_id=p_attempt;
 ELSIF p_action='revoke' AND a.student_status <> 'submitted' THEN
   UPDATE public."studentReport" SET student_status='revoked',session_hash=NULL WHERE student_report_id=p_attempt;
 ELSE
   RAISE EXCEPTION 'Invalid action for attempt';
 END IF;
 RETURN jsonb_build_object('ok',true);
END; $function$;

CREATE OR REPLACE FUNCTION public.qualify_emergency_stop(p_exam uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  e public.exams%ROWTYPE;
  attempt record;
  processed integer := 0;
BEGIN
  SELECT * INTO e
  FROM public.exams
  WHERE exam_id = p_exam
  FOR UPDATE;

  IF NOT FOUND OR
     NOT public.qualify_is_institution_super(
       e.institution_id
     ) THEN
    RAISE EXCEPTION
      'Only an active institution Super Admin can stop this exam';
  END IF;

  IF e.exam_status = 'completed' THEN
    RAISE EXCEPTION 'This exam is already completed';
  END IF;

  FOR attempt IN
    SELECT student_report_id
    FROM public."studentReport"
    WHERE exam_id = p_exam
      AND student_status = 'in progress'
  LOOP
    PERFORM public.qualify_grade_internal(
      attempt.student_report_id,
      'submit'
    );

    processed := processed + 1;
  END LOOP;

  UPDATE public.exams
  SET exam_status = 'completed',
      emergency_stopped_at = now(),
      results_published = false
  WHERE exam_id = p_exam;

  INSERT INTO public.institution_audit(
    institution_id,
    actor_id,
    action,
    details
  )
  VALUES (
    e.institution_id,
    auth.uid(),
    'exam_emergency_stopped',
    jsonb_build_object(
      'exam_id', p_exam,
      'finalized_attempts', processed
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'finalized_attempts', processed
  );
END;
$function$;
