-- Store the applicant's Super Admin designation in profile_details.
-- Backward compatible with unsubmitted legacy signups (designation may be absent).
CREATE OR REPLACE FUNCTION public.qualify_submit_institution_application(p_application jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_user uuid := (select auth.uid());
 v_email text;
 v_name text:= btrim(coalesce(p_application->>'name',''));
 v_code text:= lower(btrim(coalesce(p_application->>'code','')));
 v_kind text:= btrim(coalesce(p_application->>'institution_type',''));
 v_phone text:= btrim(coalesce(p_application->>'official_phone',''));
 v_official_email text:= lower(btrim(coalesce(p_application->>'official_email','')));
 v_address text:= btrim(coalesce(p_application->>'address_line',''));
 v_state text:= btrim(coalesce(p_application->>'state',''));
 v_district text:= btrim(coalesce(p_application->>'district',''));
 v_city text:= btrim(coalesce(p_application->>'city',''));
 v_pin text:= btrim(coalesce(p_application->>'postal_code',''));
 v_site text:= nullif(btrim(coalesce(p_application->>'website','')),'');
 v_notes text:= nullif(btrim(coalesce(p_application->>'details','')),'');
 v_secondary text:= nullif(btrim(coalesce(p_application->>'secondary_phone','')),'');
 v_contact text:= nullif(btrim(coalesce(p_application->>'contact_person','')),'');
 v_designation text:= btrim(coalesce(p_application->>'super_admin_designation',''));
 v_affiliation text:= nullif(btrim(coalesce(p_application->>'affiliation','')),'');
 v_registration text:= nullif(btrim(coalesce(p_application->>'registration_number','')),'');
 v_directory_source text:= coalesce(nullif(btrim(coalesce(p_application->>'directory_source','')),''),'manual');
 v_directory_id text:= nullif(btrim(coalesce(p_application->>'directory_id','')),'');
 v_directory_name text:= nullif(btrim(coalesce(p_application->>'directory_name','')),'');
 v_existing uuid;
 v_id uuid;
begin
 if v_user is null then raise exception 'Please sign in first'; end if;
 select lower(email) into v_email from auth.users
 where id=v_user and email_confirmed_at is not null;
 if v_email is null then raise exception 'Verify your email before submitting an institution application'; end if;
 if jsonb_typeof(p_application) is distinct from 'object' then raise exception 'Invalid institution application'; end if;
 if length(v_name) not between 3 and 160
   or v_code !~ '^[a-z0-9][a-z0-9-]{2,39}$' then
   raise exception 'Enter an institution name and an available code'; end if;
 if v_kind not in ('school','junior_college','engineering_college','degree_college','polytechnic',
   'university','medical_pharmacy','coaching','other') then raise exception 'Select an institution type'; end if;
 if length(v_phone) not between 8 and 20 or v_phone !~ '^[+0-9][0-9 ()-]+$'
   or (v_secondary is not null and (length(v_secondary) not between 8 and 20 or v_secondary !~ '^[+0-9][0-9 ()-]+$')) then
   raise exception 'Enter a valid phone number'; end if;
 if length(v_official_email) not between 6 and 254
  or v_official_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
 then raise exception 'Enter a valid official email address'; end if;
 if length(v_address) not between 8 and 250
   or length(v_state) not between 2 and 80 or length(v_district) not between 2 and 80
   or length(v_city) not between 2 and 80
   or v_pin !~ '^[1-9][0-9]{5}$'
 then raise exception 'Complete the institution address with a valid 6-digit PIN code'; end if;
 if coalesce(length(v_site),0) > 250 or coalesce(length(v_notes),0)>1500
 or coalesce(length(v_contact),0)>120 or length(v_designation)>120 or coalesce(length(v_affiliation),0)>200
 or coalesce(length(v_registration),0)>100
 or coalesce(length(v_directory_id),0)>160 or coalesce(length(v_directory_name),0)>160 then
   raise exception 'Institution details are too long'; end if;
 if v_site is not null and v_site !~* '^https?://[a-z0-9][a-z0-9.-]+([/:?#].*)?$' then
   raise exception 'Use a valid http or https website address'; end if;
 if v_directory_source not in ('manual','qualify','google_places','udise','aishe','state_directory')
 then raise exception 'Invalid directory source'; end if;
 if v_directory_source = 'manual' then v_directory_id:=null;v_directory_name:=null;end if;
 if exists (select 1 from public.institutions where code=v_code) then
   raise exception 'Institution code already taken'; end if;
 -- Idempotency prevents the login/callback retry from creating duplicate requests.
 select id into v_existing from public.institution_applications
 where applicant_user_id=v_user and requested_code=v_code
   and status in ('pending','approved')
 order by created_at desc limit 1;
 if v_existing is not null then return v_existing; end if;
 if exists (select 1 from public.institution_applications
  where requested_code=v_code and status='pending' and applicant_user_id<>v_user)
 then raise exception 'Institution code is already requested'; end if;
 insert into public.institution_applications(
  applicant_user_id,applicant_email,institution_name,requested_code,
  website,details,profile_details
 ) values (
  v_user,v_email,v_name,v_code,v_site,v_notes,
  jsonb_build_object(
    'institution_type',v_kind,'official_phone',v_phone,'official_email',v_official_email,
    'address_line',v_address,'state',v_state,'district',v_district,'city',v_city,
    'postal_code',v_pin,'website',v_site,'secondary_phone',v_secondary,
    'contact_person',v_contact,'affiliation',v_affiliation,
    'registration_number',v_registration,'super_admin_designation',nullif(v_designation,''),'directory_source',v_directory_source,
    'directory_id',v_directory_id,'directory_name',v_directory_name
  )
 ) returning id into v_id;
 return v_id;
end;
$function$;
