-- A signed-in, email-verified user may APPLY, but gets no admin access.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_apply_institution(
 p_name text,p_code text,p_website text DEFAULT NULL,p_details text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $func$
DECLARE v_user uuid := (SELECT auth.uid()); v_email text; v_id uuid; v_code text;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Please sign in first'; END IF;
 SELECT u.email INTO v_email FROM auth.users u
 WHERE u.id=v_user AND u.email_confirmed_at IS NOT NULL;
 IF v_email IS NULL THEN RAISE EXCEPTION 'Verify your email before applying'; END IF;
 v_code := lower(btrim(coalesce(p_code,'')));
 IF char_length(btrim(coalesce(p_name,''))) NOT BETWEEN 3 AND 160
    OR v_code !~ '^[a-z0-9][a-z0-9-]{2,39}$'
    OR char_length(coalesce(p_website,'')) > 500
    OR char_length(coalesce(p_details,'')) > 1500 THEN
   RAISE EXCEPTION 'Invalid institution application';
 END IF;
 IF EXISTS(SELECT 1 FROM public.institutions i WHERE i.code=v_code) THEN
   RAISE EXCEPTION 'Institution code is already taken';
 END IF;
 INSERT INTO public.institution_applications (
   applicant_user_id,applicant_email,institution_name,requested_code,website,details
 ) VALUES (v_user,lower(v_email),btrim(p_name),v_code,
   nullif(btrim(coalesce(p_website,'')),''),nullif(btrim(coalesce(p_details,'')),''))
 RETURNING id INTO v_id;
 RETURN v_id;
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_apply_institution(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_apply_institution(text,text,text,text) TO authenticated;
COMMIT;
