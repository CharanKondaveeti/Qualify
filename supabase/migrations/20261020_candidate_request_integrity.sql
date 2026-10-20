-- Request-integrity hardening (candidate APIs).
-- Changes only validation and per-attempt activity throttling.
-- Preserve existing callable signatures, SECURITY DEFINER and explicit search path.
-- Apply to the live database only after review and passing CI.
CREATE OR REPLACE FUNCTION public.qualify_save(
  p_attempt uuid, p_token text, p_session text, p_answers jsonb,
  p_review jsonb DEFAULT '{}'::jsonb, p_final boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  a public."studentReport"%ROWTYPE;
  entry record;
  q public.questions%ROWTYPE;
BEGIN
  -- Browser inputs may be freely edited. Reject malformed bearer values before
  -- doing any lifecycle work or expensive digest calculations.
  IF coalesce(p_token, '') !~ '^[0-9a-f]{64}$' OR
     coalesce(p_session, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid private exam token or session';
  END IF;

  PERFORM public.qualify_sync_exam(
    (SELECT exam_id FROM public."studentReport" WHERE student_report_id = p_attempt)
  );
  IF NOT public.qualify_exam_in_active_institution(
    (SELECT exam_id FROM public."studentReport" WHERE student_report_id = p_attempt)
  ) THEN
    RAISE EXCEPTION 'This institution is suspended';
  END IF;

  SELECT * INTO a
  FROM public."studentReport"
  WHERE student_report_id = p_attempt FOR UPDATE;

  IF NOT FOUND OR a.access_hash IS NULL OR
     a.access_hash <> encode(extensions.digest(p_token, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'Invalid private exam link';
  END IF;

  -- Keep the existing idempotent submitted and timeout behavior.
  IF a.student_status = 'submitted' THEN
    RETURN jsonb_build_object('saved', false, 'expired', true, 'student_status', 'submitted');
  END IF;

  IF a.session_hash IS NULL OR
     a.session_hash <> encode(extensions.digest(p_session, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'Session expired or used on another device';
  END IF;
  IF a.student_status <> 'in progress' THEN
    RAISE EXCEPTION 'This attempt is already closed';
  END IF;

  IF now() >= a.deadline THEN
    PERFORM public.qualify_grade_internal(p_attempt, 'timeout');
    RETURN jsonb_build_object('saved', false, 'expired', true, 'student_status', 'submitted');
  END IF;

  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_review) IS DISTINCT FROM 'object'
    OR length(p_answers::text) > 100000
    OR length(p_review::text) > 30000 THEN
    RAISE EXCEPTION 'Invalid answer data';
  END IF;

  FOR entry IN SELECT key, value FROM jsonb_each(p_answers) LOOP
    SELECT * INTO q
    FROM public.questions
    WHERE question_id::text = entry.key AND exam_id = a.exam_id;
    IF NOT FOUND OR jsonb_typeof(entry.value) <> 'number'
       OR entry.value::text !~ '^[0-9]+$'
       OR (entry.value::text)::integer >= jsonb_array_length(q.options) THEN
      RAISE EXCEPTION 'Invalid answer index or question';
    END IF;
  END LOOP;

  -- Review flags are untrusted client input too; never permit arbitrary JSON,
  -- unrelated question IDs, strings, objects or numbers into student records.
  FOR entry IN SELECT key, value FROM jsonb_each(p_review) LOOP
    IF jsonb_typeof(entry.value) <> 'boolean'
       OR NOT EXISTS (
         SELECT 1 FROM public.questions
         WHERE question_id::text = entry.key AND exam_id = a.exam_id
       ) THEN
      RAISE EXCEPTION 'Invalid question review flag';
    END IF;
  END LOOP;

  UPDATE public."studentReport"
  SET answers = p_answers, review_flags = p_review, last_seen_at = now()
  WHERE student_report_id = p_attempt;

  IF p_final THEN
    PERFORM public.qualify_grade_internal(p_attempt, 'submit');
  END IF;

  RETURN jsonb_build_object(
    'saved', true, 'expired', false,
    'student_status', CASE WHEN p_final THEN 'submitted' ELSE 'in progress' END,
    'server_now', now(), 'deadline', a.deadline
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.qualify_log_event(
  p_attempt uuid, p_token text, p_session text, p_kind text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  a public."studentReport"%ROWTYPE;
BEGIN
  IF coalesce(p_token, '') !~ '^[0-9a-f]{64}$' OR
     coalesce(p_session, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid event session';
  END IF;

  IF p_kind IS NULL OR p_kind NOT IN (
    'tab_hidden', 'fullscreen_exit', 'copy_attempt',
    'paste_attempt', 'offline', 'online'
  ) THEN
    RAISE EXCEPTION 'Invalid event';
  END IF;

  -- Serialize events per student. A flood of parallel requests cannot bypass
  -- the event caps by racing concurrent COUNTs.
  SELECT * INTO a
  FROM public."studentReport"
  WHERE student_report_id = p_attempt FOR UPDATE;

  IF NOT FOUND OR a.student_status <> 'in progress'
    OR a.session_hash IS NULL
    OR a.access_hash <> encode(extensions.digest(p_token, 'sha256'), 'hex')
    OR a.session_hash <> encode(extensions.digest(p_session, 'sha256'), 'hex')
    OR NOT EXISTS (
      SELECT 1 FROM public.exams e
      WHERE e.exam_id = a.exam_id AND e.exam_status = 'active'
    ) THEN
    RAISE EXCEPTION 'Invalid or closed session';
  END IF;

  IF NOT public.qualify_exam_in_active_institution(a.exam_id) THEN
    RAISE EXCEPTION 'This institution is suspended';
  END IF;

  -- Monitoring is best-effort. Keep representative events without allowing
  -- one compromised browser to create unlimited rows or overwhelm the UI.
  IF (SELECT COUNT(*) FROM public.qualify_events
      WHERE student_report_id = p_attempt) >= 500 THEN
    RETURN;
  END IF;
  IF (SELECT COUNT(*) FROM public.qualify_events
      WHERE student_report_id = p_attempt
        AND created_at >= now() - INTERVAL '1 minute') >= 30 THEN
    RETURN;
  END IF;

  INSERT INTO public.qualify_events(student_report_id, kind)
  VALUES (p_attempt, p_kind);
END;
$function$;
