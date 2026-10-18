-- Review status and rejected-applicant resubmission.
-- Protect a single pending request per applicant, without deleting older decisions.
CREATE UNIQUE INDEX IF NOT EXISTS qualify_one_pending_application_per_applicant
ON public.institution_applications(applicant_user_id) WHERE status='pending';

-- A rejection must include actionable written feedback.
CREATE OR REPLACE FUNCTION public.qualify_review_institution_application(p_application uuid, p_approve boolean, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_app public.institution_applications%ROWTYPE; v_institution uuid;
BEGIN
 IF NOT public.qualify_is_platform_owner() THEN
   RAISE EXCEPTION 'Platform Owner access required';
 END IF;
 IF p_approve IS NULL THEN RAISE EXCEPTION 'Review decision required'; END IF;
 IF NOT p_approve AND char_length(btrim(coalesce(p_notes,''))) < 5 THEN
   RAISE EXCEPTION 'Please explain why the application is rejected (minimum 5 characters)';
 END IF;
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
$function$
;

-- Allow an applicant to explicitly retry only after rejection.
-- The original application and feedback remain unchanged as an audit history.
CREATE OR REPLACE FUNCTION public.qualify_resubmit_institution_application(p_application jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
 v_user uuid := (select auth.uid());
 v_last public.institution_applications%rowtype;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in to resubmit your institution details'; END IF;
 IF jsonb_typeof(p_application) IS DISTINCT FROM 'object' THEN
   RAISE EXCEPTION 'Invalid institution details';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text,73922));
 SELECT * INTO v_last FROM public.institution_applications
 WHERE applicant_user_id=v_user ORDER BY created_at DESC,id DESC LIMIT 1;
 IF NOT FOUND OR v_last.status<>'rejected' THEN
   RAISE EXCEPTION 'Only rejected applications can be corrected and resubmitted';
 END IF;
 IF EXISTS(SELECT 1 FROM public.institution_members
           WHERE user_id=v_user AND status='active') THEN
   RAISE EXCEPTION 'Your account already has an institution workspace';
 END IF;
 RETURN public.qualify_submit_institution_application(p_application);
END;
$function$;
REVOKE ALL ON FUNCTION public.qualify_resubmit_institution_application(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_resubmit_institution_application(jsonb) TO authenticated;

-- Do not silently recreate a rejected request from immutable signup metadata
-- every time an applicant signs in. Resubmission is an explicit action.
CREATE OR REPLACE FUNCTION public.qualify_submit_pending_signup_institution()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
 v_meta jsonb;
 v_user uuid := (select auth.uid());
 v_existing uuid;
BEGIN
 IF v_user IS NULL THEN RETURN NULL; END IF;
 SELECT id INTO v_existing FROM public.institution_applications
 WHERE applicant_user_id=v_user ORDER BY created_at DESC LIMIT 1;
 IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
 SELECT raw_user_meta_data->'pending_institution_application' INTO v_meta
 FROM auth.users WHERE id=v_user AND email_confirmed_at IS NOT NULL;
 IF v_meta IS NULL OR v_meta='null'::jsonb OR jsonb_typeof(v_meta)<>'object' THEN
   RETURN NULL;
 END IF;
 RETURN public.qualify_submit_institution_application(v_meta);
END;
$function$;
REVOKE ALL ON FUNCTION public.qualify_submit_pending_signup_institution() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_submit_pending_signup_institution() TO authenticated;
