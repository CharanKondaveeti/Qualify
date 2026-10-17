-- Phase 2 / 02: only a Platform Owner or active Institution Super Admin may invite.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_invite_institution_staff(
 p_institution uuid,p_email text,p_role text DEFAULT 'staff_admin'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $func$
DECLARE v_email text := lower(btrim(coalesce(p_email,'')));
 v_token text; v_invite uuid; v_code text;
BEGIN
 IF NOT (public.qualify_is_platform_owner() OR public.qualify_is_institution_super(p_institution)) THEN
   RAISE EXCEPTION 'Only institution administrators can invite staff'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.institutions i WHERE i.id=p_institution AND i.status='active') THEN
   RAISE EXCEPTION 'Institution is not active'; END IF;
 IF p_role NOT IN ('staff_admin','institution_super_admin') THEN RAISE EXCEPTION 'Invalid staff role'; END IF;
 IF char_length(v_email) > 254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
   RAISE EXCEPTION 'Valid email required'; END IF;
 IF EXISTS(SELECT 1 FROM public.institution_members m JOIN auth.users u ON u.id=m.user_id
   WHERE m.institution_id=p_institution AND lower(u.email)=v_email AND m.status='active') THEN
   RAISE EXCEPTION 'This user is already an active member'; END IF;
 IF (SELECT count(*) FROM public.institution_invitations
    WHERE institution_id=p_institution AND status='pending' AND expires_at>now()) >= 100 THEN
   RAISE EXCEPTION 'Too many pending invitations'; END IF;
 -- Replace old pending invitation without exposing its previous token.
 UPDATE public.institution_invitations SET status='revoked'
 WHERE institution_id=p_institution AND invited_email=v_email AND status='pending';
 v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
 INSERT INTO public.institution_invitations(institution_id,invited_email,role,token_hash,invited_by)
 VALUES(p_institution,v_email,p_role,encode(extensions.digest(v_token,'sha256'),'hex'),(SELECT auth.uid()))
 RETURNING id INTO v_invite;
 SELECT code INTO v_code FROM public.institutions WHERE id=p_institution;
 INSERT INTO public.institution_audit(institution_id,actor_id,action,details)
 VALUES(p_institution,(SELECT auth.uid()),'staff_invited',jsonb_build_object('invitation_id',v_invite,'role',p_role));
 RETURN jsonb_build_object('id',v_invite,'token',v_token,'institution_code',v_code);
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_invite_institution_staff(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_invite_institution_staff(uuid,text,text) TO authenticated;
COMMIT;
