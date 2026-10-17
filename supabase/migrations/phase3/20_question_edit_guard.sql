-- Phase 3 / 20: live/published exams must have an immutable question paper.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_question_insert_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $func$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.exams e
   WHERE e.exam_id=NEW.exam_id AND e.exam_status='upcoming')
   OR EXISTS (SELECT 1 FROM public."studentReport" a
       WHERE a.exam_id=NEW.exam_id AND a.started_at IS NOT NULL) THEN
   RAISE EXCEPTION 'Questions cannot be added after the exam starts';
 END IF;
 RETURN NEW;
END;
$func$;
DROP TRIGGER IF EXISTS qualify_question_insert_guard ON public.questions;
CREATE TRIGGER qualify_question_insert_guard BEFORE INSERT ON public.questions
 FOR EACH ROW EXECUTE FUNCTION public.qualify_question_insert_guard();
REVOKE ALL ON FUNCTION public.qualify_question_insert_guard() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.qualify_protect_questions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $func$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.exams e
   WHERE e.exam_id=OLD.exam_id AND e.exam_status='upcoming')
   OR EXISTS (SELECT 1 FROM public."studentReport" a
       WHERE a.exam_id=OLD.exam_id AND a.started_at IS NOT NULL) THEN
   RAISE EXCEPTION 'Questions cannot be edited after the exam starts';
 END IF;
 IF TG_OP='UPDATE' THEN RETURN NEW; END IF;
 RETURN OLD;
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_protect_questions() FROM PUBLIC,anon,authenticated;

-- Prevent direct modification of question identity/parent exam from the client.
REVOKE UPDATE ON public.questions FROM PUBLIC,anon,authenticated;
GRANT UPDATE(question_text,options,correct_option,marks) ON public.questions TO authenticated;
-- Only controlled database triggers may recalculate totals; clients may not
-- manually inflate maximum marks or reduce number of questions.
REVOKE UPDATE(total_marks,total_questions) ON public.exams FROM authenticated;
COMMIT;
