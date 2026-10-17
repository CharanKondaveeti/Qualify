-- Phase 3 / 01: institution-scoped exam and reporting permissions.
-- Requires all Phase 1 and Phase 2 SQL; run after backing up your database.
BEGIN;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."studentReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualify_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.qualify_can_create_institution_exam(p_institution uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $func$
  SELECT EXISTS (
    SELECT 1 FROM public.institution_members m
    JOIN public.institutions i ON i.id=m.institution_id
    WHERE m.user_id=(SELECT auth.uid()) AND m.institution_id=p_institution
      AND m.status='active' AND i.status='active'
      AND m.role IN ('institution_super_admin','staff_admin')
  );
$func$;

CREATE OR REPLACE FUNCTION public.qualify_exam_can_manage(p_exam uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $func$
  SELECT EXISTS (
    SELECT 1 FROM public.exams e
    JOIN public.institutions i ON i.id=e.institution_id
    JOIN public.institution_members m ON m.institution_id=e.institution_id
    WHERE e.exam_id=p_exam AND m.user_id=(SELECT auth.uid())
      AND m.status='active' AND i.status='active'
      AND (m.role='institution_super_admin' OR e.created_by=(SELECT auth.uid()))
  );
$func$;

-- This helper is used by older administrator RPCs. Suspending their membership
-- must also remove access through those older RPCs.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $func$
 SELECT EXISTS (
   SELECT 1 FROM public.admins a
   JOIN public.institution_members m ON m.user_id=a.id
   JOIN public.institutions i ON i.id=m.institution_id
   WHERE a.id=(SELECT auth.uid()) AND a.role='admin'
     AND m.status='active' AND i.status='active'
 );
$func$;

REVOKE ALL ON FUNCTION public.qualify_can_create_institution_exam(uuid),public.qualify_exam_can_manage(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_can_create_institution_exam(uuid),public.qualify_exam_can_manage(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
-- The server-side expiration sweeper must not be callable as a public API.
REVOKE ALL ON FUNCTION public.qualify_finalize_expired() FROM PUBLIC,anon,authenticated;

-- Remove legacy author-only policies, then reapply institution permissions.
DROP POLICY IF EXISTS "Admins can read own exams" ON public.exams;
DROP POLICY IF EXISTS "Admins can create own exams" ON public.exams;
DROP POLICY IF EXISTS "Admins can update own exams" ON public.exams;
DROP POLICY IF EXISTS "Admins can delete own exams" ON public.exams;
DROP POLICY IF EXISTS "Institution exams select" ON public.exams;
DROP POLICY IF EXISTS "Institution exams insert" ON public.exams;
DROP POLICY IF EXISTS "Institution exams update" ON public.exams;
DROP POLICY IF EXISTS "Institution exams delete" ON public.exams;
CREATE POLICY "Institution exams select" ON public.exams FOR SELECT TO authenticated
  USING (public.qualify_exam_can_manage(exam_id));
CREATE POLICY "Institution exams insert" ON public.exams FOR INSERT TO authenticated
  WITH CHECK (created_by=(SELECT auth.uid()) AND public.qualify_can_create_institution_exam(institution_id));
CREATE POLICY "Institution exams update" ON public.exams FOR UPDATE TO authenticated
  USING (public.qualify_exam_can_manage(exam_id)) WITH CHECK (public.qualify_exam_can_manage(exam_id));
CREATE POLICY "Institution exams delete" ON public.exams FOR DELETE TO authenticated
  USING (exam_status='upcoming' AND public.qualify_exam_can_manage(exam_id));

DROP POLICY IF EXISTS "Admins can read questions for own exams" ON public.questions;
DROP POLICY IF EXISTS "Admins can add questions to own exams" ON public.questions;
DROP POLICY IF EXISTS "Admins can update questions for own exams" ON public.questions;
DROP POLICY IF EXISTS "Admins can delete questions for own exams" ON public.questions;
DROP POLICY IF EXISTS "Institution questions select" ON public.questions;
DROP POLICY IF EXISTS "Institution questions insert" ON public.questions;
DROP POLICY IF EXISTS "Institution questions update" ON public.questions;
DROP POLICY IF EXISTS "Institution questions delete" ON public.questions;
CREATE POLICY "Institution questions select" ON public.questions FOR SELECT TO authenticated
  USING (public.qualify_exam_can_manage(exam_id));
CREATE POLICY "Institution questions insert" ON public.questions FOR INSERT TO authenticated
  WITH CHECK (public.qualify_exam_can_manage(exam_id));
CREATE POLICY "Institution questions update" ON public.questions FOR UPDATE TO authenticated
  USING (public.qualify_exam_can_manage(exam_id)) WITH CHECK (public.qualify_exam_can_manage(exam_id));
CREATE POLICY "Institution questions delete" ON public.questions FOR DELETE TO authenticated
  USING (public.qualify_exam_can_manage(exam_id));

DROP POLICY IF EXISTS "Admins can read reports for own exams" ON public."studentReport";
DROP POLICY IF EXISTS "Admins can add reports for own exams" ON public."studentReport";
DROP POLICY IF EXISTS "Admins can update reports for own exams" ON public."studentReport";
DROP POLICY IF EXISTS "Admins can delete reports for own exams" ON public."studentReport";
DROP POLICY IF EXISTS "Institution reports read" ON public."studentReport";
CREATE POLICY "Institution reports read" ON public."studentReport" FOR SELECT TO authenticated
  USING (public.qualify_exam_can_manage(exam_id));
-- Student registrations/answers/scores are always written by guarded RPCs.
REVOKE INSERT,UPDATE,DELETE ON public."studentReport" FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public."studentReport" TO authenticated;

DROP POLICY IF EXISTS "Exam owners can read events" ON public.qualify_events;
DROP POLICY IF EXISTS "Institution events read" ON public.qualify_events;
CREATE POLICY "Institution events read" ON public.qualify_events FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public."studentReport" a
    WHERE a.student_report_id=qualify_events.student_report_id
      AND public.qualify_exam_can_manage(a.exam_id)));

-- Prevent a browser from assigning a different exam creator, including an
-- UPDATE intended to take over another staff member's exam.
REVOKE UPDATE ON public.exams FROM PUBLIC,anon,authenticated;
GRANT UPDATE(title,course,exam_status,scheduled_date,duration_minutes,total_marks,
 total_questions,pass_mark,shuffle_questions,shuffle_options,results_published,instructions)
 ON public.exams TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.exams TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.questions TO authenticated;
COMMIT;
