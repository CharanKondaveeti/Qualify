# QUALIFY — Staff Admin OTP + Temporary Password

## Status

This is an implementation proposal on a feature branch. **It is not deployed or active in the production Supabase project.** Do not merge before the email provider and security tests are ready.

### Intended flow

1. An authenticated **Institution Super Admin** opens Staff Management, enters staff name and email, and clicks **Send verification OTP**.
2. QUALIFY generates a cryptographically random 6-digit code on the server and emails it only to the staff recipient.
3. The recipient shares the code with their Super Admin. The Super Admin enters it within 10 minutes. No separate staff registration or invitation-acceptance page is required.
4. On successful verification:
   - For a **new** email: create a confirmed Supabase Auth account with a random, high-entropy *temporary password*. Email that temporary password to the recipient via Resend. Create a `qualify_staff_first_login` record. **Do not grant institution membership yet.**
   - For an **existing verified QUALIFY account**: **never reset its password**. Add staff membership to that account after verified OTP (subject to the existing role checks).
5. New staff signs in at `/login` with the temporary password, is redirected to `/staff/set-password`, and chooses a strong permanent password. Server-side account update and membership activation occur together in the protected onboarding service; then staff signs in again.
6. Subsequent logins use email + permanent password only.

### Safeguards

- Custom OTP values use a service-side random source and HMAC-SHA256, with a **server-side secret**. Store only OTP hashes in Postgres.
- 10-minute OTP expiration, 5 wrong attempts, 2-minute resend cooldown, maximum 20 requests per Super Admin per rolling 24 hours.
- No public ability to write the OTP table or call the privileged verification/activation routines.
- Each server action checks the current verified Supabase JWT and the *active Super Admin membership* for the specific institution.
- Temporary password is never returned to the admin browser, stored in raw metadata, or logged.
- Newly provisioned staff have no `institution_members` record until permanent password change.
- Password change and grant are performed server-side by an authenticated first-login account, with an institution/email/invitation match.
- Accounts already attached to another institution should retain their own password; staff roles remain institution-specific.
- **Failure handling:** if provisioning fails after Auth account creation, no membership is granted. A controlled support recovery/reissue flow is needed for accounts stranded by failed temporary-password email delivery. Do not delete existing accounts automatically.

### Before deployment

1. Have a **verified sender domain in Resend**, e.g. `qualifyexam.online`.
2. Set these Supabase Edge Function **secrets** (never in Vite):
   - `RESEND_API_KEY` — server-side Resend API key
   - `QUALIFY_EMAIL_FROM` — a verified sender, e.g. `QUALIFY <accounts@qualifyexam.online>`
   - `QUALIFY_OTP_HMAC_SECRET` — generated server-side random 32+ character secret
   - `QUALIFY_SITE_ORIGIN` — `https://qualifyexam.online`
   - Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions.
3. Apply `supabase/migrations/20261018_staff_otp_temporary_password.sql` in the target Supabase project. **Do not reapply if already migrated.**
4. Deploy `supabase/functions/qualify-staff-onboarding` with JWT verification enabled.
5. Deploy the frontend branch only after the backend API is healthy. The code does not use the old invitation acceptance flow.

### Must test before merge

- New staff email, correct OTP, wrong OTP, expired OTP, 5 attempts, resend cooldown and 24-hour limit.
- The email received contains exactly the code / temporary password intended for the recipient.
- New staff cannot access exams using their temporary password, including **direct URLs and direct Supabase RPC requests**.
- After forced password change, Supabase Auth verifies the new permanent password; the old temporary password no longer signs in.
- Existing QUALIFY staff member: password is **not** reset and existing roles cannot be downgraded.
- Invalid email/Resend failure: no activated account; blocked or unprovisioned records are recoverable by an administrator.
- Multi-institution memberships, suspension, revoked invites, concurrent verification attempts, email changes.
- Other signup flows (institution applicants, Platform Owner) remain functional.

### Rollout notes

- The main repository previously supported staff signup and an invitation dialog. This branch removes those controls, but **does not delete existing invitation records or database RPCs**.
- Supabase's Auth admin API is **never** called from the browser.
- **Product security consideration:** Emailed temporary passwords can be intercepted. Always enforce immediate password change and appropriate sender/DKIM/SPF/DMARC configuration. An admin-entered OTP establishes only email inbox possession mediated by the admin, not employment identity by itself.
