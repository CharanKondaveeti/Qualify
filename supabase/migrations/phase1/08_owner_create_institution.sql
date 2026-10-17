-- Platform Owners can create an institution without an application.
-- First Super Admin MUST already have a verified Supabase Auth account.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_owner_create_institution(
 p_name text,p_code text,p_super_email text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $func$
DECLARE v_owner uuid := (SELECT auth.uid()); v_super uuid; v_institution uuid;
 v_code text := lower(btrim(coalesce(p_code,'')));
BEGIN
 IF NOT public.qualify_is_platform_owner() THEN
   RAISE EXCEPTION 'Platform Owner access required';
 END IF;
 IF char_length(btrim(coalesce(p_name,''))) NOT BETWEEN 3 AND 160
   OR v_code !~ '^[a-z0-9][a-z0-9-]{2,39}$' THEN
   RAISE EXCEPTION 'Invalid institution name or code';
 END IF;
 SELECT u.id INTO v_super FROM auth.users u
 WHERE lower(u.email)=lower(btrim(coalesce(p_super_email,'')))
   AND u.email_confirmed_at IS NOT NULL;
 IF v_super IS NULL THEN
   RAISE EXCEPTION 'First Super Admin must register and verify their email first';
 END IF;
 INSERT INTO public.institutions(name,code,created_by)
 VALUES(btrim(p_name),v_code,v_owner)
 RETURNING id INTO v_institution;
 INSERT INTO public.institution_members(institution_id,user_id,role)
 VALUES(v_institution,v_super,'institution_super_admin');
 INSERT INTO public.institution_audit(institution_id,actor_id,action)
 VALUES(v_institution,v_owner,'institution_created_by_platform');
 RETURN v_institution;
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_owner_create_institution(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_owner_create_institution(text,text,text) TO authenticated;
COMMIT;
