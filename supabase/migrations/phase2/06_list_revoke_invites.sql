-- Phase 2 / 06: managers can list/revoke pending invitations, never read token hashes.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_list_institution_invites(p_institution uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $func$
DECLARE v_data jsonb;
BEGIN
 IF NOT (public.qualify_is_platform_owner() OR public.qualify_is_institution_super(p_institution)) THEN
  RAISE EXCEPTION 'Institution manager access required'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'email',invited_email,
 'role',role,'status',CASE WHEN status='pending' AND expires_at<=now() THEN 'expired' ELSE status END,
 'expires_at',expires_at,'created_at',created_at) ORDER BY created_at DESC),'[]'::jsonb)
 INTO v_data FROM public.institution_invitations WHERE institution_id=p_institution;
 RETURN v_data;
END;
$func$;
CREATE OR REPLACE FUNCTION public.qualify_revoke_institution_invite(p_invite uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $func$
DECLARE v_institution uuid;
BEGIN
 SELECT institution_id INTO v_institution FROM public.institution_invitations WHERE id=p_invite;
 IF v_institution IS NULL OR NOT (public.qualify_is_platform_owner()
 OR public.qualify_is_institution_super(v_institution)) THEN
  RAISE EXCEPTION 'Invitation not found or access denied'; END IF;
 UPDATE public.institution_invitations SET status='revoked'
 WHERE id=p_invite AND status='pending';
 INSERT INTO public.institution_audit(institution_id,actor_id,action,details)
 VALUES(v_institution,(SELECT auth.uid()),'invitation_revoked',jsonb_build_object('id',p_invite));
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_list_institution_invites(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.qualify_revoke_institution_invite(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_list_institution_invites(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_revoke_institution_invite(uuid) TO authenticated;
COMMIT;
