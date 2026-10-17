-- Read permissions only. Writes are performed by narrowly guarded RPCs.
BEGIN;
DROP POLICY IF EXISTS "Platform owners read own role" ON public.platform_admins;
CREATE POLICY "Platform owners read own role" ON public.platform_admins
 FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Institution members see institutions" ON public.institutions;
CREATE POLICY "Institution members see institutions" ON public.institutions
 FOR SELECT TO authenticated USING (
   public.qualify_is_platform_owner() OR EXISTS (
     SELECT 1 FROM public.institution_members m
     WHERE m.institution_id = institutions.id
       AND m.user_id = (SELECT auth.uid()) AND m.status = 'active'
   )
 );

DROP POLICY IF EXISTS "Members see self or institution administrators" ON public.institution_members;
CREATE POLICY "Members see self or institution administrators" ON public.institution_members
 FOR SELECT TO authenticated USING (
   user_id = (SELECT auth.uid()) OR public.qualify_is_platform_owner()
   OR public.qualify_is_institution_super(institution_id)
 );

DROP POLICY IF EXISTS "Applicant or owner reads applications" ON public.institution_applications;
CREATE POLICY "Applicant or owner reads applications" ON public.institution_applications
 FOR SELECT TO authenticated USING (
   applicant_user_id = (SELECT auth.uid()) OR public.qualify_is_platform_owner()
 );

DROP POLICY IF EXISTS "Institution audit for authorized managers" ON public.institution_audit;
CREATE POLICY "Institution audit for authorized managers" ON public.institution_audit
 FOR SELECT TO authenticated USING (
   public.qualify_is_platform_owner()
   OR (institution_id IS NOT NULL AND public.qualify_is_institution_super(institution_id))
 );
COMMIT;
