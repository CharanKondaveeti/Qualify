-- Allow authorized exam managers to revise the pass mark after an exam closes.
-- Scores remain fixed; reports and published result pages use the revised threshold.
-- Apply after Phase 3 / 21. No exam records are rewritten by this migration.
BEGIN;

CREATE OR REPLACE FUNCTION public.qualify_exam_update_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $func$
BEGIN
 IF OLD.exam_status='completed' AND NEW.exam_status IS DISTINCT FROM OLD.exam_status THEN
   RAISE EXCEPTION 'A completed exam cannot be reopened';
 END IF;
 IF OLD.exam_status='active' AND NEW.exam_status='upcoming' THEN
   RAISE EXCEPTION 'An active exam cannot return to upcoming';
 END IF;
 IF OLD.exam_status IN ('active','completed') AND (
   NEW.title IS DISTINCT FROM OLD.title OR
   NEW.course IS DISTINCT FROM OLD.course OR
   NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date OR
   NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes OR
   NEW.shuffle_questions IS DISTINCT FROM OLD.shuffle_questions OR
   NEW.shuffle_options IS DISTINCT FROM OLD.shuffle_options OR
   NEW.instructions IS DISTINCT FROM OLD.instructions OR
   (OLD.exam_status='active' AND NEW.pass_mark IS DISTINCT FROM OLD.pass_mark)
 ) THEN
   RAISE EXCEPTION 'Exam instructions and scoring settings are frozen after opening';
 END IF;
 IF NEW.pass_mark < 0 OR NEW.pass_mark > NEW.total_marks THEN
   RAISE EXCEPTION 'Pass mark must be between 0 and total marks';
 END IF;
 IF NEW.results_published AND NEW.exam_status<>'completed' THEN
   RAISE EXCEPTION 'Close the exam before publishing results';
 END IF;
 RETURN NEW;
END;
$func$;

REVOKE ALL ON FUNCTION public.qualify_exam_update_guard() FROM PUBLIC,anon,authenticated;
COMMIT;
