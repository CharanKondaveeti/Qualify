-- Two safe, read-only authorization helpers for RLS and application functions.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_is_platform_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $func$
 SELECT EXISTS(
   SELECT 1 FROM public.platform_admins
   WHERE user_id = (SELECT auth.uid())
 );
$func$;

CREATE OR REPLACE FUNCTION public.qualify_is_institution_super(p_institution uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $func$
 SELECT EXISTS(
   SELECT 1 FROM public.institution_members m
   JOIN public.institutions i ON i.id = m.institution_id
   WHERE m.user_id = (SELECT auth.uid())
     AND m.institution_id = p_institution
     AND m.role = 'institution_super_admin'
     AND m.status = 'active' AND i.status = 'active'
 );
$func$;

REVOKE ALL ON FUNCTION public.qualify_is_platform_owner() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.qualify_is_institution_super(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_is_platform_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_is_institution_super(uuid) TO authenticated;
COMMIT;
