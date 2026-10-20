# Qualify — Security hardening status and go-live gates
Date: 2026-10-20

**Status: Security hardening in progress; NOT a completed penetration-test or production readiness signoff.**

## Verified RLS posture
- Every inspected public table has RLS enabled.
- `anon` has **no direct SELECT, INSERT or UPDATE grants** on `exams`, `questions`, `studentReport`, `qualify_events`, `institution_members`, `institutions`, or `platform_admins`.
- A direct anonymous SELECT against `public.exams` was denied.
- `authenticated` can SELECT the required tables but policies restrict access with `qualify_exam_can_manage`, user membership and institution checks.
- Six server-only tables have RLS enabled without any policies. This is deny-by-default and **not itself a vulnerability**.
- Candidate operations use anonymous-accessible SECURITY DEFINER RPCs with hash-checked private exam tokens and session binding; these **must not be revoked indiscriminately**.

## Changes implemented on the production project
1. Applied migration `restrict_legacy_and_internal_rpc_execution_20261020`, with repo source `supabase/migrations/20261020130000_restrict_legacy_and_internal_rpc_execution.sql`.
   - Removed PUBLIC/anon/authenticated EXECUTE on obsolete `qualify_api`, internal `rls_auto_enable`, and `qualify_exam_in_active_institution`.
   - Confirmed privileges after the migration and reran Supabase advisor.
   - Anonymous SECURITY DEFINER warnings: **11 to 8**; authenticated: **54 to 51**.
   - Remaining eight anonymous warnings are intentional candidate-facing RPCs requiring additional adversarial verification, not blanket removal.
2. Added HSTS `max-age=31536000` and restrictive browser permissions for unused geolocation/payment/USB APIs in `vercel.json`. Existing CSP, frame protection, nosniff, and referrer headers remain.
3. Added `.github/workflows/qualify-security-ci.yml` to check `npm ci`, `npm test`, `npm run build`, `npm run lint`, and `npm audit --omit=dev --audit-level=high` for commits/PRs. **A READY Vercel build does not prove these jobs passed.**
4. Added `tests/security-baseline.test.mjs` covering hosting security headers, client publishable key boundary and candidate RPC boundary.

## Outstanding critical/high go-live requirements
1. **Enable leaked-password protection in Supabase Auth settings.** Supabase advisor still flags it disabled. This setting is not writable via the available project integration. Verify password reset, staff activation and signup afterward.
2. **Replace email-delivered temporary passwords** in `qualify-staff-onboarding` with one-time single-use password setup links. That function currently emails a plaintext temporary credential. Changes require new onboarding tests, staging deployment and safe rollout.
3. **Abuse protection / rate limits:** anonymous registration and pre-auth OTP are expected public flows. Assess bot protection, rate limiting by trusted proxy identity, request sizes, OTP brute-force and abuse. CORS is not authorization.
4. **Cross-tenant authorization tests:** with accounts from *two real test institutions*, verify no other institution's exams, questions, students, events, results, staff, banks or management RPCs are accessible. SQL policy review is not a substitute.
5. **Candidate concurrency tests:** two devices, autosave collisions, timeout at boundary, reconnect/refresh, session reset, duplicate submit and emergency stop. Verify persisted answers and scores, not just UI alerts.
6. **Account security:** require phishing-resistant MFA for Platform Owners / Super Admins where supported, secure recovery, remove unused accounts and regularly review active sessions.
7. **Recovery and operations:** verify automatic database backups and point-in-time recovery entitlement, rehearse isolated restoration, document RPO/RTO and deployment rollback. Do not test restore against production data.
8. **Dependency supply chain:** review `npm audit` output and remediate genuine advisories; `xlsx@0.18.5` merits a targeted audit if imported for untrusted spreadsheets.
9. **Load test:** simulate candidate concurrent requests and admin polling without using the live student exam database. Monitor p95/p99 latencies and database connection/CPU limits.
10. **Email provider:** examine actual deployed configuration; both Supabase edge onboarding functions currently reference `RESEND_API_KEY`, not SES. Confirm the intended provider, domain verification, sending limits and delivery monitoring.

## Performance and advisor warnings
- Supabase performance advisor reported 19 unindexed foreign keys and three unused indexes. These are informational, not evidence of unsafe RLS. Audit queries and workload before creating/removing indexes. Core exam/student/activity keys already have indexes.
- RLS without policies for private service tables is often the correct configuration.
- SECURITY DEFINER findings should be fixed **per function** after authorization review, not by disabling required public candidate endpoints.

## Go-live acceptance checklist
- [ ] CI quality checks green on a PR and protected main; no unexplained high/critical dependency alerts
- [ ] Database functions and grants audited with least privilege for anon/authenticated
- [ ] Leaked-password protection enabled; admin MFA policy established
- [ ] Staff onboarding no longer sends passwords by email
- [ ] Cross-tenant role matrix passed in a separate test environment
- [ ] Candidate full workflow and concurrency/deadline test suite passed
- [ ] Verified rate limiting and abuse prevention on all public endpoints
- [ ] Tested HTTPS/security headers on public domain and mobile/desktop browsers
- [ ] Backup and recovery tested; incident response/rollback documented
- [ ] Independent penetration test completed for first institution-wide launch

## Remediation references
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [SECURITY DEFINER anonymous execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [SECURITY DEFINER authenticated execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Auth password security and leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [Unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)
