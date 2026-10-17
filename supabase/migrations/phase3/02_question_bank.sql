-- Phase 3 / 02: private/shared institutional question bank.
BEGIN;
ALTER TABLE public.qualify_question_bank
  ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.institutions(id);
ALTER TABLE public.qualify_question_bank
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private','institution'));

-- Assign old bank rows to their owner's Phase 1 legacy workspace.
UPDATE public.qualify_question_bank b SET institution_id=i.id
 FROM public.institutions i
 WHERE b.institution_id IS NULL AND i.is_legacy=true
   AND i.code='legacy-' || replace(b.owner_id::text,'-','');
-- For accounts with exactly one other active institution, use it.
UPDATE public.qualify_question_bank b SET institution_id=m.institution_id
 FROM public.institution_members m JOIN public.institutions i ON i.id=m.institution_id
 WHERE b.institution_id IS NULL AND b.owner_id=m.user_id
  AND m.status='active' AND i.status='active'
  AND (SELECT count(*) FROM public.institution_members x JOIN public.institutions z ON z.id=x.institution_id
       WHERE x.user_id=b.owner_id AND x.status='active' AND z.status='active')=1;

CREATE OR REPLACE FUNCTION public.qualify_bank_insert_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $func$
DECLARE v_institution uuid; v_count integer;
BEGIN
 IF NEW.owner_id IS DISTINCT FROM (SELECT auth.uid()) THEN
   RAISE EXCEPTION 'Question bank owner must be the signed-in user';
 END IF;
 IF NEW.institution_id IS NULL THEN
   SELECT i.id INTO v_institution FROM public.institutions i
   JOIN public.institution_members m ON m.institution_id=i.id
   WHERE m.user_id=NEW.owner_id AND m.status='active' AND i.status='active'
     AND i.is_legacy=true LIMIT 1;
   IF v_institution IS NULL THEN
     SELECT count(*),min(m.institution_id) INTO v_count,v_institution
     FROM public.institution_members m JOIN public.institutions i ON i.id=m.institution_id
     WHERE m.user_id=NEW.owner_id AND m.status='active' AND i.status='active';
     IF v_count<>1 THEN RAISE EXCEPTION 'Choose an institution for this question'; END IF;
   END IF;
   NEW.institution_id:=v_institution;
 END IF;
 IF NOT public.qualify_can_create_institution_exam(NEW.institution_id) THEN
   RAISE EXCEPTION 'You cannot add questions to this institution';
 END IF;
 RETURN NEW;
END;
$func$;
DROP TRIGGER IF EXISTS qualify_bank_insert_guard ON public.qualify_question_bank;
CREATE TRIGGER qualify_bank_insert_guard BEFORE INSERT ON public.qualify_question_bank
 FOR EACH ROW EXECUTE FUNCTION public.qualify_bank_insert_guard();
REVOKE ALL ON FUNCTION public.qualify_bank_insert_guard() FROM PUBLIC,anon,authenticated;

DROP POLICY IF EXISTS "Admins manage own question bank" ON public.qualify_question_bank;
DROP POLICY IF EXISTS "Institution bank select" ON public.qualify_question_bank;
DROP POLICY IF EXISTS "Institution bank insert" ON public.qualify_question_bank;
DROP POLICY IF EXISTS "Institution bank update" ON public.qualify_question_bank;
DROP POLICY IF EXISTS "Institution bank delete" ON public.qualify_question_bank;
CREATE POLICY "Institution bank select" ON public.qualify_question_bank FOR SELECT TO authenticated
 USING (public.qualify_can_create_institution_exam(institution_id) AND
   (owner_id=(SELECT auth.uid()) OR visibility='institution'));
CREATE POLICY "Institution bank insert" ON public.qualify_question_bank FOR INSERT TO authenticated
 WITH CHECK (owner_id=(SELECT auth.uid()) AND public.qualify_can_create_institution_exam(institution_id));
CREATE POLICY "Institution bank update" ON public.qualify_question_bank FOR UPDATE TO authenticated
 USING (owner_id=(SELECT auth.uid()) AND public.qualify_can_create_institution_exam(institution_id))
 WITH CHECK (owner_id=(SELECT auth.uid()) AND public.qualify_can_create_institution_exam(institution_id));
CREATE POLICY "Institution bank delete" ON public.qualify_question_bank FOR DELETE TO authenticated
 USING (owner_id=(SELECT auth.uid()) AND public.qualify_can_create_institution_exam(institution_id));
REVOKE UPDATE ON public.qualify_question_bank FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.qualify_question_bank TO authenticated;
GRANT UPDATE(course,topic,difficulty,question_text,options,correct_option,marks,visibility)
 ON public.qualify_question_bank TO authenticated;
CREATE INDEX IF NOT EXISTS qualify_bank_institution_idx ON public.qualify_question_bank(institution_id,visibility,created_at DESC);
COMMIT;
-- Must be zero before relying on the new bank features.
SELECT count(*) AS unassigned_bank_questions FROM public.qualify_question_bank WHERE institution_id IS NULL;
