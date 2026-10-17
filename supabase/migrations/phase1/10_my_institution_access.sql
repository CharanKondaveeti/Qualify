-- Minimal role-discovery RPC for React. Only returns the caller's memberships.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_my_institution_access()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $func$
DECLARE v_data jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN
   RAISE EXCEPTION 'Please sign in first';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'institution_id',i.id,'institution_name',i.name,'institution_code',i.code,
   'institution_status',i.status,'role',m.role,'member_status',m.status
 ) ORDER BY i.name),'[]'::jsonb) INTO v_data
 FROM public.institution_members m
 JOIN public.institutions i ON i.id=m.institution_id
 WHERE m.user_id=(SELECT auth.uid());
 RETURN jsonb_build_object('platform_owner',public.qualify_is_platform_owner(),
   'institutions',v_data);
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_my_institution_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_my_institution_access() TO authenticated;
COMMIT;
