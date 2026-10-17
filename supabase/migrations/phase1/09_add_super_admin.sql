-- Multiple Super Admins per institution. An existing active Super Admin
-- or the Platform Owner may add another verified account.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_institution_add_super(
 p_institution uuid,p_email text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $func$
DECLARE v_user uuid;
BEGIN
 IF NOT (public.qualify_is_platform_owner()
   OR public.qualify_is_institution_super(p_institution)) THEN
   RAISE EXCEPTION 'Institution Super Admin access required';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.institutions
   WHERE id=p_institution AND status='active') THEN
   RAISE EXCEPTION 'Institution is not active';
 END IF;
 SELECT id INTO v_user FROM auth.users
 WHERE lower(email)=lower(btrim(coalesce(p_email,'')))
   AND email_confirmed_at IS NOT NULL;
 IF v_user IS NULL THEN RAISE EXCEPTION 'User must verify their email first'; END IF;
 INSERT INTO public.institution_members(institution_id,user_id,role,status)
 VALUES(p_institution,v_user,'institution_super_admin','active')
 ON CONFLICT (institution_id,user_id) DO UPDATE
   SET role='institution_super_admin',status='active';
 INSERT INTO public.institution_audit(institution_id,actor_id,action,details)
 VALUES(p_institution,(SELECT auth.uid()),'super_admin_added',jsonb_build_object('user_id',v_user));
 RETURN v_user;
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_institution_add_super(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_institution_add_super(uuid,text) TO authenticated;
COMMIT;
