-- Allow Institution Super Admins to cancel only pending OTP invitations.
-- Apply after the original 20261018_staff_otp_temporary_password.sql migration.
alter table public.qualify_staff_otp_invites
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null;

alter table public.qualify_staff_otp_invites
  drop constraint if exists qualify_staff_otp_invites_status_check;
alter table public.qualify_staff_otp_invites
  add constraint qualify_staff_otp_invites_status_check
  check (status in (
    'pending', 'verified', 'provisioning', 'provisioned',
    'failed', 'superseded', 'expired', 'cancelled'
  ));

-- RLS stays unchanged: browsers cannot update OTP records directly.
-- The restricted onboarding Edge Function uses service-role credentials
-- after checking active institution Super Admin membership.
