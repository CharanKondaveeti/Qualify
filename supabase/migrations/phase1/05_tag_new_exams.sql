-- Tag new exams without changing the existing create-exam API.
-- Old admins default to their own legacy workspace.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_tag_exam_institution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $func$
DECLARE v_id uuid; v_count int;
BEGIN
 IF NEW.institution_id IS NULL THEN
   SELECT i.id INTO v_id FROM public.institutions i
   JOIN public.institution_members m ON m.institution_id=i.id
   WHERE m.user_id=NEW.created_by AND m.status='active'
     AND i.status='active' AND i.is_legacy=true
   LIMIT 1;
   IF v_id IS NULL THEN
     SELECT count(*),min(m.institution_id) INTO v_count,v_id
     FROM public.institution_members m
     JOIN public.institutions i ON i.id=m.institution_id
     WHERE m.user_id=NEW.created_by AND m.status='active' AND i.status='active';
     IF v_count <> 1 THEN
       RAISE EXCEPTION 'Select an institution before creating this exam';
     END IF;
   END IF;
   NEW.institution_id := v_id;
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.institution_members m
   JOIN public.institutions i ON i.id=m.institution_id
   WHERE m.institution_id=NEW.institution_id AND m.user_id=NEW.created_by
     AND m.status='active' AND i.status='active'
 ) THEN
   RAISE EXCEPTION 'Exam creator must belong to the selected institution';
 END IF;
 RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS qualify_tag_exam_institution ON public.exams;
CREATE TRIGGER qualify_tag_exam_institution
 BEFORE INSERT ON public.exams
 FOR EACH ROW EXECUTE FUNCTION public.qualify_tag_exam_institution();
REVOKE ALL ON FUNCTION public.qualify_tag_exam_institution() FROM PUBLIC,anon,authenticated;

-- Prevent old direct-update grants from letting a user move an exam to
-- another institution. A future owner-only transfer RPC can replace this guard.
CREATE OR REPLACE FUNCTION public.qualify_protect_exam_institution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $func$
BEGIN
 IF NEW.institution_id IS DISTINCT FROM OLD.institution_id THEN
   RAISE EXCEPTION 'Exam institution cannot be edited directly';
 END IF;
 RETURN NEW;
END;
$func$;
DROP TRIGGER IF EXISTS qualify_protect_exam_institution ON public.exams;
CREATE TRIGGER qualify_protect_exam_institution
 BEFORE UPDATE OF institution_id ON public.exams
 FOR EACH ROW EXECUTE FUNCTION public.qualify_protect_exam_institution();
REVOKE ALL ON FUNCTION public.qualify_protect_exam_institution() FROM PUBLIC,anon,authenticated;
COMMIT;
