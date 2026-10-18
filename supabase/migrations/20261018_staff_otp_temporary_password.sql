-- Staff Admin email OTP invitation, temporary password and first-login enforcement.
-- REVIEW MIGRATION: run only when the Resend-backed Edge Function and secrets are ready.
-- No existing Auth accounts are changed by this migration.
create table if not exists public.qualify_staff_otp_invites (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  invited_email text not null,
  staff_name text not null,
  otp_hash text not null,
  status text not null default 'pending' check (
    status in ('pending','verified','provisioning','provisioned','failed','superseded','expired')
  ),
  attempts integer not null default 0 check (attempts between 0 and 5),
  expires_at timestamptz not null,
  requested_by uuid not null references auth.users(id),
  provisioned_user_id uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists qualify_staff_otp_invites_org_time
  on public.qualify_staff_otp_invites(institution_id,created_at desc);
create index if not exists qualify_staff_otp_invites_email_time
  on public.qualify_staff_otp_invites(institution_id,invited_email,created_at desc);
create unique index if not exists qualify_staff_otp_one_pending_per_email
  on public.qualify_staff_otp_invites(institution_id,lower(invited_email)) where status='pending';
alter table public.qualify_staff_otp_invites enable row level security;
revoke all on public.qualify_staff_otp_invites from anon,authenticated;

-- A newly provisioned account has NO active membership until password rotation.
-- A staff member may only read their own "password change needed" flag.
create table if not exists public.qualify_staff_first_login (
  user_id uuid primary key references auth.users(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  invited_email text not null,
  invite_id uuid not null unique references public.qualify_staff_otp_invites(id),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.qualify_staff_first_login enable row level security;
revoke all on public.qualify_staff_first_login from anon,authenticated;
grant select on public.qualify_staff_first_login to authenticated;
drop policy if exists "staff_read_own_first_password_status" on public.qualify_staff_first_login;
create policy "staff_read_own_first_password_status"
on public.qualify_staff_first_login for select to authenticated
using (user_id = (select auth.uid()));

-- One atomic, attempt-limited OTP verification. Edge validates Super Admin before calling.
-- The hashed OTP is computed with a separate server-side HMAC secret and never exposed.
create or replace function public.qualify_staff_verify_otp(p_invite uuid, p_hash text)
returns boolean language plpgsql security definer set search_path=''
as $function$
declare v_status text;
begin
  update public.qualify_staff_otp_invites
  set attempts=attempts+1,
      status=case
        when otp_hash=p_hash then 'verified'
        when attempts+1>=5 then 'expired'
        else 'pending' end,
      verified_at=case when otp_hash=p_hash then now() else null end,
      updated_at=now()
  where id=p_invite and status='pending' and expires_at>now() and attempts<5
  returning status into v_status;
  return v_status='verified';
end;
$function$;
revoke all on function public.qualify_staff_verify_otp(uuid,text)
  from public,anon,authenticated;
grant execute on function public.qualify_staff_verify_otp(uuid,text) to service_role;

-- Resolve existing verified accounts without listing users from a browser.
-- Role claims are never inferred from email or user_metadata.
create or replace function public.qualify_staff_existing_auth_user(p_email text)
returns uuid language sql stable security definer set search_path=''
as $function$
  select id from auth.users
  where lower(email)=lower(btrim(p_email)) and email_confirmed_at is not null
  order by created_at asc limit 1;
$function$;
revoke all on function public.qualify_staff_existing_auth_user(text)
  from public,anon,authenticated;
grant execute on function public.qualify_staff_existing_auth_user(text) to service_role;

-- A service-role operation activates an existing account or a newly rotated password.
-- The Edge Function must independently verify invite state, owner, email and user.
create or replace function public.qualify_staff_activate(
  p_invite uuid,p_user uuid,p_mode text
) returns boolean language plpgsql security definer set search_path=''
as $function$
declare v public.qualify_staff_otp_invites%rowtype;
begin
  if p_mode not in ('existing_account','first_password_changed') then
    raise exception 'Invalid staff activation mode';
  end if;
  select * into v from public.qualify_staff_otp_invites
    where id=p_invite for update;
  if v.id is null or v.status not in ('provisioning','provisioned') then
    raise exception 'Verified staff invitation is not ready';
  end if;
  if not exists (
    select 1 from auth.users u where u.id=p_user
      and lower(u.email)=lower(v.invited_email) and u.email_confirmed_at is not null
  ) then raise exception 'Verified staff email does not match'; end if;
  if not exists (
    select 1 from public.institutions i where i.id=v.institution_id and i.status='active'
  ) then raise exception 'Institution is not active'; end if;
  if p_mode='first_password_changed' and not exists (
    select 1 from public.qualify_staff_first_login s
    where s.user_id=p_user and s.institution_id=v.institution_id
      and s.invite_id=p_invite and s.completed_at is null
  ) then raise exception 'No matching first-login setup'; end if;
  insert into public.institution_members (institution_id,user_id,role,status)
  values (v.institution_id,p_user,'staff_admin','active')
  on conflict(institution_id,user_id) do update
  set status='active'
  where public.institution_members.role='staff_admin';
  if not found then
    raise exception 'An incompatible institution membership already exists';
  end if;
  if p_mode='first_password_changed' then
    update public.qualify_staff_first_login
    set completed_at=now() where user_id=p_user and invite_id=p_invite;
  end if;
  update public.qualify_staff_otp_invites
    set status='provisioned',provisioned_user_id=p_user,updated_at=now()
    where id=p_invite;
  return true;
end;
$function$;
revoke all on function public.qualify_staff_activate(uuid,uuid,text)
  from public,anon,authenticated;
grant execute on function public.qualify_staff_activate(uuid,uuid,text) to service_role;

GRANT ALL ON public.qualify_staff_otp_invites,public.qualify_staff_first_login TO service_role;
