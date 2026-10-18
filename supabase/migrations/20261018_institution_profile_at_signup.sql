-- QUALIFY institution registration profile migration (applied in Supabase 20261018052744).
ALTER TABLE public.institution_applications ADD COLUMN IF NOT EXISTS profile_details jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS public.institution_profiles (
 institution_id uuid PRIMARY KEY REFERENCES public.institutions(id) ON DELETE CASCADE,
 institution_type text NOT NULL CHECK (institution_type IN ('school','junior_college','engineering_college','degree_college','polytechnic','university','medical_pharmacy','coaching','other')),
 official_phone text NOT NULL,official_email text NOT NULL,secondary_phone text,contact_person text,
 address_line text NOT NULL,state text NOT NULL,district text NOT NULL,city text NOT NULL,postal_code text NOT NULL,
 website text,affiliation text,registration_number text,directory_source text NOT NULL DEFAULT 'manual',
 directory_id text,directory_name text,updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.institution_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.institution_profiles FROM anon,authenticated;
GRANT SELECT ON public.institution_profiles TO authenticated;
DROP POLICY IF EXISTS "qualify_read_own_institution_profile" ON public.institution_profiles;
CREATE POLICY "qualify_read_own_institution_profile" ON public.institution_profiles
FOR SELECT TO authenticated USING (
 public.qualify_is_platform_owner() OR EXISTS(
 SELECT 1 FROM public.institution_members m JOIN public.institutions i ON i.id=m.institution_id
 WHERE m.institution_id=institution_profiles.institution_id
 AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND i.status='active'));
CREATE TABLE IF NOT EXISTS public.qualify_institution_directory (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),source text NOT NULL CHECK(source IN ('qualify','udise','aishe','state_directory')),
 source_id text NOT NULL,institution_name text NOT NULL,institution_type text,state text,district text,city text,
 UNIQUE(source,source_id)
);
ALTER TABLE public.qualify_institution_directory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qualify_institution_directory FROM anon,authenticated;
GRANT SELECT ON public.qualify_institution_directory TO anon,authenticated;
DROP POLICY IF EXISTS "qualify_directory_public_lookup" ON public.qualify_institution_directory;
CREATE POLICY "qualify_directory_public_lookup" ON public.qualify_institution_directory
FOR SELECT TO anon,authenticated USING (true);
INSERT INTO public.qualify_institution_directory(source,source_id,institution_name)
SELECT 'qualify',id::text,name FROM public.institutions WHERE status='active'
ON CONFLICT(source,source_id) DO UPDATE SET institution_name=excluded.institution_name;

CREATE OR REPLACE FUNCTION public.qualify_find_institutions(p_query text, p_type text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
select coalesce(jsonb_agg(x.payload order by x.rank,x.name),'[]'::jsonb)
from (
 select d.institution_name as name,
 case when lower(d.institution_name) like lower(btrim(p_query)) || '%' then 0 else 1 end as rank,
 jsonb_build_object('name',d.institution_name,'type',d.institution_type,
 'source',d.source,'source_id',d.source_id,'state',d.state,'district',d.district,'city',d.city) as payload
 from public.qualify_institution_directory d
 where length(btrim(coalesce(p_query,''))) between 3 and 80
 and position(lower(btrim(p_query)) in lower(d.institution_name)) > 0
 and (nullif(p_type,'') is null or d.institution_type=p_type or d.institution_type is null)
 order by rank,name limit 10
) x;
$function$;

CREATE OR REPLACE FUNCTION public.qualify_profile_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v jsonb;
begin
 if new.status='approved' and new.institution_id is not null
    and (old.status is distinct from new.status) then
  v:=coalesce(new.profile_details,'{}'::jsonb);
  if nullif(v->>'institution_type','') is not null then
    insert into public.institution_profiles (
      institution_id,institution_type,official_phone,official_email,secondary_phone,
      contact_person,address_line,state,district,city,postal_code,website,affiliation,
      registration_number,directory_source,directory_id,directory_name
    ) values (
      new.institution_id,v->>'institution_type',v->>'official_phone',v->>'official_email',
      v->>'secondary_phone',v->>'contact_person',v->>'address_line',v->>'state',
      v->>'district',v->>'city',v->>'postal_code',v->>'website',v->>'affiliation',
      v->>'registration_number',coalesce(v->>'directory_source','manual'),
      v->>'directory_id',v->>'directory_name'
    ) on conflict (institution_id) do nothing;
  end if;
 end if;
 return new;
end;
$function$;

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
 or coalesce(length(v_contact),0)>120 or coalesce(length(v_affiliation),0)>200
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
    'registration_number',v_registration,'directory_source',v_directory_source,
    'directory_id',v_directory_id,'directory_name',v_directory_name
  )
 ) returning id into v_id;
 return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.qualify_submit_pending_signup_institution()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_meta jsonb;v_user uuid:=(select auth.uid());
begin
 if v_user is null then return null; end if;
 select raw_user_meta_data->'pending_institution_application' into v_meta
 from auth.users where id=v_user and email_confirmed_at is not null;
 if v_meta is null or v_meta='null'::jsonb or jsonb_typeof(v_meta)<>'object' then return null; end if;
 return public.qualify_submit_institution_application(v_meta);
end;
$function$;

REVOKE ALL ON FUNCTION public.qualify_find_institutions(text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.qualify_find_institutions(text,text) TO anon,authenticated;
REVOKE ALL ON FUNCTION public.qualify_submit_institution_application(jsonb) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.qualify_submit_institution_application(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.qualify_submit_pending_signup_institution() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.qualify_submit_pending_signup_institution() TO authenticated;
REVOKE ALL ON FUNCTION public.qualify_profile_on_approval() FROM public,anon,authenticated;
DROP TRIGGER IF EXISTS qualify_copy_profile_when_approved ON public.institution_applications;
CREATE TRIGGER qualify_copy_profile_when_approved AFTER UPDATE OF status
ON public.institution_applications FOR EACH ROW EXECUTE FUNCTION public.qualify_profile_on_approval();
