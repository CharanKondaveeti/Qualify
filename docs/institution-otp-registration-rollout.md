# Pre-account institution registration — Qualify

## Status

The OTP-first registration flow is **permanent**. The database migration was applied and verified, the `qualify-institution-registration` Edge Function is deployed with `verify_jwt=false`, and the signup, application-status and activation routes are always available. There is no Vercel feature switch. The applicant has verified the end-to-end flow; continue operational monitoring of email delivery and activation errors.

## Design

1. Applicant enters email. `qualify-institution-registration` Edge Function generates and emails a 6-digit HMAC-protected code through Resend.
2. Applicant verifies the code (5 attempts, 10-minute expiry); a random hashed applicant session token grants access to the form. No Supabase Auth user exists yet.
3. Applicant submits a detailed institution application. All writes are server-side, tied to the verified applicant email.
4. Platform Owner reviews, rejects with feedback or approves. On approval the backend creates an Auth user, grants the first institution Super Admin membership through the existing owner-authorized review RPC, and emails a 48-hour one-use activation link.
5. The applicant chooses a permanent password through `/activate`. They then sign in.
6. If rejected, the applicant verifies their email again and may edit/resubmit or permanently delete the rejected application. Deletion revokes applicant sessions and removes verification records. A pre-account rejected applicant has no Auth user to delete.

## Installation

1. **Applied and verified:** [`supabase/migrations/20261019_applicant_otp_activation.sql`](../supabase/migrations/20261019_applicant_otp_activation.sql) using the Supabase SQL Editor or an authorized migration run. It drops the `NOT NULL` constraint on `institution_applications.applicant_user_id` and adds applicant OTP/session/activation storage.
2. **Deployed:** [`supabase/functions/qualify-institution-registration/index.ts`](../supabase/functions/qualify-institution-registration/index.ts) as Edge Function `qualify-institution-registration` with **verify_jwt=false**. This is intentional: email-verified applicants do not have Auth JWTs. The function handles all applicant session checks and separately validates Platform Owner JWTs.
3. Confirm the function's secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `QUALIFY_EMAIL_FROM`, `QUALIFY_OTP_HMAC_SECRET` (32+ random chars), `QUALIFY_SITE_ORIGIN` (for example https://www.qualifyexam.online).
4. Test the full flow with a fresh email address not yet linked to an Auth account: OTP request, wrong OTP/attempt limit, verify, directory/manual entry, submit, reject, sign in via OTP, edit/resubmit, approve, receive activation email, set password, sign in. Test deletion of rejected application separately.
5. Deploy the latest `main` branch on Vercel. No `VITE_INSTITUTION_REGISTRATION_V2` environment variable is required; the new workflow is the only public registration route.

## Operational cautions

- `/signup` always serves email-OTP-first registration, `/application-status` the applicant status flow, and `/activate` password setup. Legacy `/institutions/apply` and `/institutions/application-status` URLs redirect to the new pages.
- This migration preserves existing development applications rather than deleting them. Existing Auth-account-based applications can still use the original review action.
- Auth signup emails and the applicant OTP are **different mechanisms**. The applicant OTP does not use Supabase Auth email OTP.
- The full institution registration flow does not require a temporary password emailed to the applicant. Activation links are single-use and never supplied in the URL query string.
- Avoid changing existing institutional RLS policies, exam tables or Platform Owner accounts for this release.
