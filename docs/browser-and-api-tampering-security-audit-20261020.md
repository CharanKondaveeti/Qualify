# Browser inspection, storage and API request-tampering security audit
Date: 2026-10-20
Production: `www.qualifyexam.online`
Project: `CharanKondaveeti/Qualify`

## Threat model and unavoidable browser visibility
A browser user can see any response that their browser legitimately receives, and can inspect/modify their own JavaScript, memory, URL, sessionStorage/localStorage and HTTP requests. Fullscreen, disabled right-click, hidden controls and UI route guards are **not security boundaries**. A valid candidate can inspect the active exam questions delivered to that candidate; admins can inspect authorized management information. A valid browser token or session may also be visible in DevTools. Server-side authorizations and least-privilege responses are essential.

## Verified checks
- Sensitive public tables have RLS enabled, and `anon` has no direct SELECT privileges on exams, questions, studentReport, qualify_events, institution_members and platform_admins.
- `qualify_exam_can_manage` enforces active institution membership and exam creator/super-admin roles. A simulated authenticated staff account was unable to read another institution's exams, students, questions or activity, while able to read its own reports.
- Forged cross-institution `qualify_create_exam` request was rejected in a rollback transaction.
- Candidate RPCs verify hashed private access tokens, live attempt/session state and deadlines. `qualify_save` permits only answers corresponding to exam questions with valid option indices; score calculation occurs inside the database. `p_review` question IDs and boolean values are validated server-side.
- `qualify_log_event` validates event types, token/session, active exam state and caps events to reduce abuse.
- Candidate tokens are generated as random 32-byte hex strings. Browser candidate links use a URL fragment and the exam page removes the fragment from the address bar on load. Candidate draft answers remain in sessionStorage during a live attempt for recovery, and are cleared upon a confirmed final submission.
- Browser query cache is not persisted by `src/lib/queryClient.js`. Production admin logout clears query cache, and now clears Redux unsaved exam drafts too.
- Supabase Storage logo objects use role-scoped policies for authenticated management. Logo read access and public bucket behavior are not equivalent to confidentiality for public branding.

## Changes applied and verified
1. **RPC format validation**: Added exact 64-hex access-token and session validation to `qualify_begin`, `qualify_student_state`, and `qualify_results`. `qualify_student_state` keeps optional `p_session=NULL` valid before start. Existing `qualify_save` already has this check. All four malformed-token request tests passed using `anon` in a read-only rollback transaction. Migration: `supabase/migrations/20261020224000_candidate_token_format_guards.sql`.
2. **Minimized student-report API response**: Replaced `SELECT *` in `src/services/studentService.js` with the fields actually used by monitoring and results. Production `src/services/institutionExamService.js` already selected explicit columns; demo-only direct readers do not touch real Supabase.
3. **Enforced column-level DB privileges**: `authenticated` no longer has broad SELECT on `public."studentReport"`. It can SELECT only student ID, exam ID, name, email, roll, status, started/submitted/deadline timestamps, score, last-seen, time bonus and created timestamp. It cannot directly SELECT `access_hash`, `session_hash`, raw `answers`, `review_flags`, `question_order`, or `option_orders`. Verified with `has_column_privilege` and a simulated authenticated staff read/denial test. Migration: `supabase/migrations/20261020225000_minimize_student_report_read_grants.sql`.
4. **Clear sensitive draft memory on logout**: Dashboard now clears both React Query and Redux unsaved-exam draft state on confirmed logout and external `SIGNED_OUT`. Added reducer and source regression tests.
5. CI passed automated tests, lint, production dependency audit and Vite build. Vercel production deployment reports READY.

Changes: [Candidate/request minimization PR #16](https://github.com/CharanKondaveeti/Qualify/pull/16) and [Logout-memory cleanup PR #17](https://github.com/CharanKondaveeti/Qualify/pull/17).

## Remaining risks—not yet addressed / not production certified
- **Browser tokens are not invisible**: A logged-in user can inspect their own Supabase browser session. An XSS exploit or local malware could steal it. Use strict CSP, dependency upgrades, MFA and session revocation, and consider a cookie/BFF architecture for stronger session isolation. No frontend-only code can guarantee token secrecy from its own user.
- **Public exam registration**: `qualify_register` is an intended public RPC for upcoming exams and accepts a name, email and roll number without email ownership verification. Anyone with the exam ID may attempt registration. High-stakes institutions may need invite-only registration, verified emails and rate-limiting; changing that default without product acceptance would break existing registration flows.
- **Client anti-cheating**: Fullscreen and copy/paste event logging are best-effort; a sophisticated user can bypass client event generation. Do not treat the absence of warning events as proof of honest conduct.
- **Admin onboarding**: Staff onboarding currently sends a temporary password by email. Replace with a one-time activation/password setup flow in a staged, tested change.
- **Password protection**: Supabase security advisor still reports leaked-password protection disabled. Enable in Supabase Authentication settings if the plan supports it.
- **External attack testing**: No browser automation with real authenticated users across two institutions, no penetration test, no API fuzzing at scale, no verified rate-limiting/WAF enforcement, and no tested backup recovery in this audit. Read-only SQL role simulation does not substitute for those checks.
- Supabase advisor still flags 8 anonymous and 51 authenticated SECURITY DEFINER functions. Eight anonymous candidate functions are intentionally public; others require function-by-function review, not mass revocation. Six private tables with RLS but no policies are deny-by-default, not evidence of open data access.

**Release status:** These changes improve defense in depth and reduce exposed information, but do not establish that Qualify is invulnerable or fully certified for high-stakes exams.
