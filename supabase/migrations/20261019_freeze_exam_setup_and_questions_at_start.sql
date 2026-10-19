-- Preserve exam and result history, while enforcing no setup/question changes after
-- scheduled opening or an actual student start. Staff-in-charge permissions remain
-- scoped by qualify_exam_can_manage and institutional RLS.
CREATE OR REPLACE FUNCTION public.qualify_exam_update_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF OLD.exam_status='completed' AND NEW.exam_status IS DISTINCT FROM OLD.exam_status THEN
   RAISE EXCEPTION 'A completed exam cannot be reopened';
 END IF;
 IF OLD.exam_status='active' AND NEW.exam_status='upcoming' THEN
   RAISE EXCEPTION 'An active exam cannot return to upcoming';
 END IF;
 IF (OLD.exam_status <> 'upcoming'
    OR OLD.scheduled_date <= now()
    OR EXISTS (SELECT 1 FROM public."studentReport"
       WHERE exam_id=OLD.exam_id AND started_at IS NOT NULL))
    AND (
      NEW.title IS DISTINCT FROM OLD.title OR
      NEW.course IS DISTINCT FROM OLD.course OR
      NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date OR
      NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes OR
      NEW.timing_mode IS DISTINCT FROM OLD.timing_mode OR
      NEW.ends_at IS DISTINCT FROM OLD.ends_at OR
      NEW.entry_window_minutes IS DISTINCT FROM OLD.entry_window_minutes OR
      NEW.shuffle_questions IS DISTINCT FROM OLD.shuffle_questions OR
      NEW.shuffle_options IS DISTINCT FROM OLD.shuffle_options OR
      NEW.instructions IS DISTINCT FROM OLD.instructions OR
      (OLD.exam_status = 'upcoming' AND NEW.pass_mark IS DISTINCT FROM OLD.pass_mark)
    ) THEN
    RAISE EXCEPTION 'Exam setup is locked once the exam begins';
 END IF;
 IF NEW.title IS NULL OR length(btrim(NEW.title)) < 2
    OR NEW.course IS NULL OR length(btrim(NEW.course)) < 2 THEN
    RAISE EXCEPTION 'Exam title and course must have at least 2 characters';
 END IF;
 IF OLD.exam_status = 'upcoming' AND NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
    AND NEW.scheduled_date <= now() THEN
    RAISE EXCEPTION 'Exam start must be in the future';
 END IF;
 IF NEW.pass_mark < 0 OR NEW.pass_mark > NEW.total_marks THEN
   RAISE EXCEPTION 'Pass mark must be between 0 and total marks';
 END IF;
 IF NEW.results_published AND NEW.exam_status<>'completed' THEN
   RAISE EXCEPTION 'Close the exam before publishing results';
 END IF;
 RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.qualify_protect_questions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.exams e
   WHERE e.exam_id=OLD.exam_id AND e.exam_status='upcoming' AND e.scheduled_date > now())
   OR EXISTS (SELECT 1 FROM public."studentReport" a
       WHERE a.exam_id=OLD.exam_id AND a.started_at IS NOT NULL) THEN
   RAISE EXCEPTION 'Questions cannot be edited after the exam starts';
 END IF;
 IF TG_OP='UPDATE' THEN RETURN NEW; END IF;
 RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.qualify_question_insert_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.exams e
   WHERE e.exam_id=NEW.exam_id AND e.exam_status='upcoming' AND e.scheduled_date > now())
   OR EXISTS (SELECT 1 FROM public."studentReport" a
       WHERE a.exam_id=NEW.exam_id AND a.started_at IS NOT NULL) THEN
   RAISE EXCEPTION 'Questions cannot be added after the exam starts';
 END IF;
 RETURN NEW;
END;
$function$;
