# Team Management redesign — deployment checklist

## Frontend
- `src/features/admin/pages/TeamPage.jsx` now uses a table, search, status filters, action menus and compact dialogs.
- `src/features/admin/styles/staff-invitations.css` contains the matching responsive styles.
- The Staff Admin onboarding service adds the `cancel` action.
- There is no separate always-visible OTP form or always-visible verification history.
- The Platform Owner's Super Admin appointment action is in a restricted dialog.
- Existing database checks for 10-minute OTP expiry, five attempts and cooldown stay unchanged.

## Backend (required for cancellation)
1. Ensure `20261018_staff_otp_temporary_password.sql` has already been applied.
2. Apply `supabase/migrations/20261018_staff_otp_z_cancellation.sql` to the correct Supabase project.
3. Redeploy `supabase/functions/qualify-staff-onboarding/index.ts` with JWT verification enabled and existing email/HMAC secrets configured.
4. Redeploy the frontend after the backend is ready.

## Security
- Only active Super Admins of the selected institution can request, verify, list or cancel staff OTP invitations.
- Cancel uses a conditional update on `status='pending'`, preventing cancellation of provisioned/activated accounts.
- Cancelled records are kept with `cancelled_at` and `cancelled_by` for audit.
- The browser never receives the OTP secret or service-role key.
- An expired OTP may remain stored as `pending`; the UI labels it expired while the database rejects it based on `expires_at`.
- New staff must complete their first-login password change before membership activation.
- A failed or provisioned account should go through support recovery, not the pending-invitation cancel action.

## Manual QA
- Add staff -> email code -> pending appears -> verify -> first-login setup.
- Resend within 2 minutes fails; resend after cooldown invalidates previous code.
- Cancel pending -> old code fails -> history shows Cancelled.
- Wrong 6-digit code, expired code, five wrong attempts.
- Existing verified user keeps password.
- Staff cannot see invitation actions.
- Super Admin cannot promote/demote staff; Platform Owner can.
- Suspend/reactivate still work; search and tabs filter correctly.
- Check small screens and keyboard navigation.

Note: Committing changes to GitHub does not apply SQL or deploy Supabase Edge Functions. 
