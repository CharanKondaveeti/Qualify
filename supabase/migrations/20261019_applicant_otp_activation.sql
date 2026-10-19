-- QUALIFY pre-account institution registration.
-- A verified applicant is not an auth user. Only the Edge Function holds the service role.
alter table public.institution_applications alter column applicant_user_id drop not null;
create table if not exists public.qualify_applicant_otps (
 id uuid primary key default gen_random_uuid(),
 email text not null,
 code_hash text not null,
 ip_hash text not null,
 attempts int not null default 0 check (attempts between 0 and 5),
 sent_at timestamptz not null default now(),
 expires_at timestamptz not null,
 verified_at timestamptz
);
create index if not exists qualify_applicant_otps_email_time on public.qualify_applicant_otps(email,sent_at desc);
create index if not exists qualify_applicant_otps_ip_time on public.qualify_applicant_otps(ip_hash,sent_at desc);
create table if not exists public.qualify_applicant_sessions (
 id uuid primary key default gen_random_uuid(),
 email text not null,
 token_hash text not null unique,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 revoked_at timestamptz
);
create index if not exists qualify_applicant_sessions_email on public.qualify_applicant_sessions(email);
create table if not exists public.qualify_institution_activations (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.institution_applications(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 token_hash text not null unique,
 expires_at timestamptz not null,
 used_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists qualify_institution_activations_application on public.qualify_institution_activations(application_id);
alter table public.qualify_applicant_otps enable row level security;
alter table public.qualify_applicant_sessions enable row level security;
alter table public.qualify_institution_activations enable row level security;
revoke all on public.qualify_applicant_otps,public.qualify_applicant_sessions,public.qualify_institution_activations from public,anon,authenticated;
grant all on public.qualify_applicant_otps,public.qualify_applicant_sessions,public.qualify_institution_activations to service_role;
-- Atomic attempt counting prevents concurrent guesses from bypassing the five-attempt limit.
create or replace function public.qualify_applicant_verify_otp(p_id uuid,p_hash text)
returns text language plpgsql security definer set search_path='' as $body$
declare v public.qualify_applicant_otps%rowtype;
begin
 select * into v from public.qualify_applicant_otps where id=p_id for update;
 if not found or v.verified_at is not null or v.expires_at <= now() or v.attempts >= 5 then return null; end if;
 if v.code_hash <> p_hash then
  update public.qualify_applicant_otps set attempts=attempts+1 where id=p_id;
  return null;
 end if;
 update public.qualify_applicant_otps set verified_at=now() where id=p_id;
 return v.email;
end;$body$;
revoke all on function public.qualify_applicant_verify_otp(uuid,text) from public,anon,authenticated;
grant execute on function public.qualify_applicant_verify_otp(uuid,text) to service_role;
