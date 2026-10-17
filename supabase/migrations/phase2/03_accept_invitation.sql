-- Phase 2 / 03: an invitation is bound to one verified email and is single-use.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_accept_institution_invite(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $func$
DECLARE v_user uuid := (SELECT auth.uid()); v_email text; v_inv public.institution_invitations%ROWTYPE;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 SELECT lower(u.email) INTO v_email FROM auth.users u
 WHERE u.id=v_user AND u.email_confirmed_at IS NOT NULL;
 IF v_email IS NULL THEN RAISE EXCEPTION 'Verify your email before accepting'; END IF;
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid invitation'; END IF;
 SELECT * INTO v_inv FROM public.institution_invitations
 WHERE token_hash=encode(extensions.digest(p_token,'sha256'),'hex') FOR UPDATE;
 IF NOT FOUND OR v_inv.status<>'pending' OR v_inv.expires_at<=now() THEN
   RAISE EXCEPTION 'Invitation is invalid or expired'; END IF;
 IF v_inv.invited_email<>v_email THEN RAISE EXCEPTION 'Sign in with the invited email address'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.institutions WHERE id=v_inv.institution_id AND status='active') THEN
   RAISE EXCEPTION 'Institution is not active'; END IF;
 INSERT INTO public.institution_members(institution_id,user_id,role,status)
 VALUES(v_inv.institution_id,v_user,v_inv.role,'active')
 ON CONFLICT(institution_id,user_id) DO UPDATE
 SET role=EXCLUDED.role,status='active';
 UPDATE public.institution_invitations SET status='accepted',accepted_by=v_user,accepted_at=now()
 WHERE id=v_inv.id;
 INSERT INTO public.institution_audit(institution_id,actor_id,action,details)
 VALUES(v_inv.institution_id,v_user,'staff_invite_accepted',jsonb_build_object('invitation_id',v_inv.id));
 RETURN v_inv.institution_id;
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_accept_institution_invite(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_accept_institution_invite(text) TO authenticated;
COMMIT;
