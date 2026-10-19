-- Improve privacy cleanup for staff removals: anonymize audit details and
-- preserve regrade history without keeping former staff identity.
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
 -- Preserve grading actions without retaining the former employee's identity.
 if exists (select 1 from public.qualify_regrade_history h
   join public.exams e on e.exam_id=h.exam_id
   where h.actor_id=p_staff and e.institution_id is distinct from p_institution) then
  raise exception 'This staff account has grading history outside the institution';
 end if;
 update public.qualify_regrade_history set
   actor_id=v_actor,actor_label='Former staff member (account removed)'
 where actor_id=p_staff;
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
 -- Keep the institution-level audit event, not the removed employee's user ID.
 update public.institution_audit set details=details-'user_id'
 where institution_id=p_institution and details->>'user_id'=p_staff::text;
 insert into public.institution_audit(institution_id,actor_id,action,details)
 values (p_institution,v_actor,'staff_account_removed',
         jsonb_build_object('exams_preserved',true));
 return true;
end;
$body$;
revoke all on function public.qualify_prepare_staff_removal(uuid,uuid) from public,anon,authenticated;
grant execute on function public.qualify_prepare_staff_removal(uuid,uuid) to authenticated;

