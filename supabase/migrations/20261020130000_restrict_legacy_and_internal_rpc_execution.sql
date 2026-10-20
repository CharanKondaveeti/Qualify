-- Applied to production using Supabase migration tool on 2026-10-20.
-- Restricts obsolete and internal SECURITY DEFINER functions from client roles.
-- Does not change intentionally public candidate RPC permissions.
-- The event trigger itself continues running with its function owner's privileges.
REVOKE EXECUTE ON FUNCTION public.qualify_api(text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.qualify_exam_in_active_institution(uuid) FROM PUBLIC, anon, authenticated;

-- Verification query (read-only):
-- SELECT p.proname,
--   has_function_privilege('anon',p.oid,'EXECUTE') AS anon_exec,
--   has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_exec
-- FROM pg_proc p
-- WHERE p.pronamespace='public'::regnamespace
--   AND p.proname IN ('qualify_api','rls_auto_enable','qualify_exam_in_active_institution');
