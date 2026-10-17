-- Only Platform Owners approve or reject. Approval creates the institution
-- AND its first Super Admin in a single atomic operation.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_review_institution_application(
 p_application uuid,p_approve boolean,p_notes text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $func$
DECLARE v_app public.institution_applications%ROWTYPE; v_institution uuid;
BEGIN
 IF NOT public.qualify_is_platform_owner() THEN
   RAISE EXCEPTION 'Platform Owner access required';
 END IF;
 IF p_approve IS NULL THEN RAISE EXCEPTION 'Review decision required'; END IF;
 IF char_length(coalesce(p_notes,'')) > 1500 THEN
   RAISE EXCEPTION 'Review notes too long';
 END IF;
 SELECT * INTO v_app FROM public.institution_applications
 WHERE id=p_application FOR UPDATE;
 IF NOT FOUND OR v_app.status<>'pending' THEN
   RAISE EXCEPTION 'Application not found or already reviewed';
 END IF;
 IF p_approve THEN
   IF NOT EXISTS (
     SELECT 1 FROM auth.users u WHERE u.id=v_app.applicant_user_id
       AND u.email_confirmed_at IS NOT NULL
       AND lower(u.email)=v_app.applicant_email
   ) THEN RAISE EXCEPTION 'Applicant must have a verified email'; END IF;
   INSERT INTO public.institutions(name,code,created_by)
   VALUES(v_app.institution_name,v_app.requested_code,(SELECT auth.uid()))
   RETURNING id INTO v_institution;
   INSERT INTO public.institution_members(institution_id,user_id,role)
   VALUES(v_institution,v_app.applicant_user_id,'institution_super_admin');
 END IF;
 UPDATE public.institution_applications
 SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
     reviewed_by=(SELECT auth.uid()),reviewed_at=now(),
     review_notes=nullif(btrim(coalesce(p_notes,'')),''),
     institution_id=v_institution
 WHERE id=p_application;
 INSERT INTO public.institution_audit(institution_id,application_id,actor_id,action)
 VALUES(v_institution,p_application,(SELECT auth.uid()),
   CASE WHEN p_approve THEN 'application_approved' ELSE 'application_rejected' END);
 RETURN v_institution; -- NULL on rejection
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_review_institution_application(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_review_institution_application(uuid,boolean,text) TO authenticated;
COMMIT;
