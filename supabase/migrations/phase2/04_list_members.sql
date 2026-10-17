-- Phase 2 / 04: managers may see names/emails for members of their institution only.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_list_institution_members(p_institution uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $func$
DECLARE v_result jsonb;
BEGIN
 IF NOT (public.qualify_is_platform_owner() OR public.qualify_is_institution_super(p_institution)) THEN
  RAISE EXCEPTION 'Institution manager access required'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',u.email,
 'name',u.raw_user_meta_data->>'full_name','role',m.role,'status',m.status,
 'joined_at',m.joined_at) ORDER BY m.joined_at DESC),'[]'::jsonb)
 INTO v_result FROM public.institution_members m
 JOIN auth.users u ON u.id=m.user_id WHERE m.institution_id=p_institution;
 RETURN v_result;
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_list_institution_members(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_list_institution_members(uuid) TO authenticated;
COMMIT;
