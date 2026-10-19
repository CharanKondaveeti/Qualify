-- Staff accounts are employment scoped. Suspended staff retain only their suspended
-- membership; removal detaches all personal data then the Edge Function deletes auth.users.
-- No actual staff member is removed by applying this migration.
create table if not exists public.qualify_staff_removal_jobs (
 user_id uuid primary key,
 institution_id uuid not null references public.institutions(id) on delete cascade,
 email text not null,
 requested_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists qualify_staff_removal_jobs_institution_idx on public.qualify_staff_removal_jobs(institution_id,created_at desc);
alter table public.qualify_staff_removal_jobs enable row level security;
revoke all on public.qualify_staff_removal_jobs from public,anon,authenticated;
grant all on public.qualify_staff_removal_jobs to service_role;

-- Run as the signed-in institutional Super Admin (not as a service-role impersonation).
-- Transactionally revoke membership and clear all user-owned institutional resources;
-- the Auth admin API is used separately to delete the account.
create or replace function public.qualify_prepare_staff_removal(
 p_institution uuid,p_staff uuid
) returns boolean language plpgsql security definer set search_path='' as $body$
declare
 v_actor uuid := (select auth.uid());
 v_member public.institution_members%rowtype;
 v_email text;
 v_job public.qualify_staff_removal_jobs%rowtype;
begin
 if v_actor is null or not public.qualify_is_institution_super(p_institution) then
  raise exception 'Institution Super Admin access required';
 end if;
 if p_staff is null or p_staff=v_actor then
  raise exception 'Invalid staff account';
 end if;
 perform 1 from public.institutions where id=p_institution and status='active' for update;
 if not found then raise exception 'Institution is not active'; end if;
 select * into v_job from public.qualify_staff_removal_jobs where user_id=p_staff for update;
 if found then
  if v_job.institution_id<>p_institution then raise exception 'Staff removal belongs to another institution'; end if;
  return true; -- Resume pending Auth deletion after a network or API failure.
 end if;
 select * into v_member from public.institution_members
 where institution_id=p_institution and user_id=p_staff for update;
 if not found or v_member.role<>'staff_admin' then
  raise exception 'Only Staff Admin accounts can be removed';
 end if;
 if exists (select 1 from public.institution_members
            where user_id=p_staff and institution_id<>p_institution)
   or exists (select 1 from public.platform_admins where user_id=p_staff)
   or exists (select 1 from public.institution_applications where applicant_user_id=p_staff)
   or exists (select 1 from public.exams where created_by=p_staff
              and institution_id is distinct from p_institution)
   or exists (select 1 from public.qualify_named_banks where owner_id=p_staff
              and institution_id<>p_institution)
 then
  raise exception 'This account has additional ownership; contact the Platform Owner before removal';
 end if;
 select lower(email) into v_email from auth.users where id=p_staff;
 if v_email is null then raise exception 'Staff Auth user not found'; end if;
 insert into public.qualify_staff_removal_jobs(user_id,institution_id,email,requested_by)
 values (p_staff,p_institution,v_email,v_actor);
 -- Exams and student results are institution records, not personal employee data.
 -- Transfer required authorship FK to the responsible institution Super Admin.
 update public.exams set created_by=v_actor
 where created_by=p_staff and institution_id=p_institution;
 -- Personal bank content and staff-owned named banks are removed.
 delete from public.qualify_question_bank where owner_id=p_staff;
 delete from public.qualify_named_banks where owner_id=p_staff and institution_id=p_institution;
 -- Historic invitation records cannot retain FK references to the deleted user.
 update public.institution_invitations set invited_by=v_actor where invited_by=p_staff;
 update public.institution_invitations set reviewed_by=null where reviewed_by=p_staff;
 update public.institution_invitations set accepted_by=null where accepted_by=p_staff;
 delete from public.qualify_staff_first_login where user_id=p_staff;
 delete from public.qualify_staff_otp_invites
 where institution_id=p_institution and lower(invited_email)=v_email;
 -- No account entitlement survives.
 delete from public.institution_members where institution_id=p_institution and user_id=p_staff;
 insert into public.institution_audit(institution_id,actor_id,action,details)
 values (p_institution,v_actor,'staff_account_removed',
         jsonb_build_object('exams_preserved',true));
 return true;
end;
$body$;
revoke all on function public.qualify_prepare_staff_removal(uuid,uuid) from public,anon,authenticated;
grant execute on function public.qualify_prepare_staff_removal(uuid,uuid) to authenticated;

create or replace function public.qualify_finalize_staff_removal(
 p_institution uuid,p_staff uuid
) returns boolean language plpgsql security definer set search_path='' as $body$
begin
 if (select auth.uid()) is null or not public.qualify_is_institution_super(p_institution) then
  raise exception 'Institution Super Admin access required';
 end if;
 delete from public.qualify_staff_removal_jobs
 where institution_id=p_institution and user_id=p_staff;
 if not found then raise exception 'No pending removal'; end if;
 return true;
end;
$body$;
revoke all on function public.qualify_finalize_staff_removal(uuid,uuid) from public,anon,authenticated;
grant execute on function public.qualify_finalize_staff_removal(uuid,uuid) to authenticated;
