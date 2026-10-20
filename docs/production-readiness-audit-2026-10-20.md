# Qualify — Production Readiness Audit (initial assessment)
Date: 2026-10-20
Scope: GitHub `CharanKondaveeti/Qualify` main; Supabase project `mziobiiocozbiasmufzp`; Vercel project `prj_f4kj3AnsqXg4KgXigfSbMTLmZWwo`.

**Status: NOT SIGNED OFF FOR PUBLIC LAUNCH.** This is a preliminary static/database/configuration audit, not a passed end-to-end or load test. No production data, database grants, or business logic have been changed by this audit.

## Verified observations
1. Vercel production deployment is READY and uses Vite; configured domains include `www.qualifyexam.online` and apex.
2. `vercel.json` sets Content-Security-Policy, X-Frame-Options DENY, nosniff and referrer policy. A policy's presence does not prove it is sufficient for every flow.
3. All 25 inspected public database tables have RLS enabled. Six intentional/private-looking tables have RLS without browser policies, which is *not* itself an exposure. Policies on `exams`, `questions`, `studentReport`, `qualify_events` use institution-scoped permission checks.
4. `qualify_exam_can_manage` confirms active membership, active institution, and institution-super-admin/creator. `qualify_admin_control` checks permissions and allowed student states. `qualify_admin_search_events` checks permissions.
5. Candidate `qualify_begin` and `qualify_save` validate the hashed private access token and session binding, and enforce attempt status/deadline. `qualify_save` locks its attempt row (`FOR UPDATE`). These are positive implementation findings; race conditions still need concurrency tests.
6. `qualify_admin_search_events` limits responses to the latest 300 events. A directory Last Activity value derived from this list can be blank or old for some students when a busy exam has more than 300 total events.
7. Vercel reports SSO protection for deployment URLs except custom domains. This does not replace application-level access control.
8. Package scripts include `build`, `lint` and `test` (`node --test tests/*.test.mjs`). No CI test execution was verified in this audit.

## Findings requiring action
| Priority | Finding | Action and validation |
|---|---|---|
| High | Supabase security advisor warns that leaked-password protection is disabled | Enable leaked-password protection in Supabase Auth security settings; confirm auth flows |
| High/review | 11 anonymous-accessible SECURITY DEFINER RPCs (candidate RPCs may be intentional). `qualify_api` appears to use legacy `qualify_exams`/ `qualify_admins` tables, with no current GitHub reference found | Inventory external callers, distinguish public candidate API from obsolete API; remove grants for unused functions only after proof |
| Medium | 19 unindexed foreign keys | Prioritize by actual query plans and growth; apply reviewed indexes on staging, preferably CONCURRENTLY on production |
| Medium | 3 indexes reported unused | Validate observation window and query patterns before removing |
| Medium | Last Activity based on latest 300 events across an exam | Use dedicated per-attempt last event query (or batch query) after validating authorization; avoid 300-event cap |
| Medium | Current dashboard polls active reports/events approximately every 15 seconds | Load test with realistic number of admins/students; inspect database/query load |
| High/test | Live flows (OTP/approval/staff login/registration/exam submit/reconnect/results) not exercised end-to-end | Run automated browser tests using dedicated test accounts and a staging database; no production side effects |
| High/test | Concurrent saves, disconnections, deadline races, duplicate submits, reset sessions | Add deterministic server-level and browser concurrency tests; compare recorded answers/results |
| Operational | Backup restore, RPO/RTO, email quota/deliverability, deployment rollbacks not verified | Document and rehearse restore and rollback; configure monitoring/alerting |

## Production validation matrix — currently UNTESTED
- Role matrix: platform owner; institution super admin; staff owner; other staff; unrelated institution; anonymous.
- Registration: successful; duplicates; expired link; revoked link; window closing.
- Examination: start before/after window, two devices, reconnect, partial saves, concurrent save & submit, timeout & finalization, forced closure.
- Results: publish/hide, regrade, per-institution access, stale cache.
- UI: desktop & narrow mobile, independent scrolling, action dropdowns, accessible keyboard navigation.
- Email: first activation, OTP replay/expiry/rate limiting, password reset, bounced mail and rate/SES limits.
- Recovery: deploy rollback, point-in-time backup availability and tested restore in an isolated environment.

## Control rules
- Do not run destructive cleanup on live auth or exam tables.
- Do not disable intentionally public candidate RPCs based on a generic advisor warning.
- Do not claim tests pass from a Vercel READY deployment; run lint, unit/integration tests and browser/load tests separately.
- Make security or schema changes through reviewed migrations and verify on staging before production.

References:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection


## Hardening implementation update — 2026-10-20

### Applied to production
- Supabase DDL migration restricts PUBLIC, anon and authenticated execution of legacy `qualify_api` and internal `rls_auto_enable`, `qualify_exam_in_active_institution`. Verified: direct grants denied. Eight candidate-specific anonymous SECURITY DEFINER RPCs intentionally remain; they are not proven safe by lint output alone.
- RLS remains enabled for all inspected public tables. Anonymous role has no direct SELECT, INSERT or UPDATE grants on exams, questions, student reports, activity events, institution membership, institutions, platform admin tables. Attempted anonymous read of exams failed with permission denied.
- Added HSTS and browser Permissions-Policy in `vercel.json`; existing CSP/frame restrictions retained.
- Added GitHub Actions checks covering tests/build, lint and production dependencies; added security regression tests and a public-only `.env.example`.
- Initial CI run found six high-severity production dependency findings, a missing `.env.example`, and an unused score variable. Corrected the code/test issues.
- [Security dependency PR #12](https://github.com/CharanKondaveeti/Qualify/pull/12) passed all three CI jobs and was merged (commit `0de0286b56a9a7efcfe18688dddedbc86bcd9006`). Runtime dependencies updated and vulnerable `xlsx` replaced with `write-excel-file/browser`, retaining an XLSX exporter. The production Vercel deployment is READY. Browser Excel-export/role regression testing still required.

### Not yet resolved — do not claim production security signoff
- Supabase Auth leaked-password protection is **still disabled** per security advisor; enable it in Auth settings.
- Staff onboarding currently emails plaintext temporary passwords; replace with single-use password setup links after staging tests.
- Authenticated SECURITY DEFINER function authorization requires role-matrix negative tests across two institutions.
- The public candidate registration endpoint requires abuse protection and load testing; CORS alone is not anti-bot protection.
- Backups and restores, email provider quotas/delivery, real student concurrency/timeout tests, and authenticated browser regression tests have not been verified.
- Supabase performance advisor indexing findings are informational, not evidence of breached RLS; prioritize based on actual queries and growth.
- GitHub Actions passing does not itself prove penetration-test certification or resilience against all attacks.

Follow-up review and go-live checklist: [Draft PR #11](https://github.com/CharanKondaveeti/Qualify/pull/11).
