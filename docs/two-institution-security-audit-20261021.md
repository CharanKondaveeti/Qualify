# Two-institution authorization audit — 21 October 2026

Status: first executable database/HTTP boundary tranche complete; **not production security signoff**.

Base: `f508ba4690a9b64c4505c118bdbc569e03ee8149` on main.
Project: Qualify Exam Portal (`mziobiiocozbiasmufzp`).
PR #18 remains a separate draft; its latest inspected GitHub Actions run 39537356159 succeeded. This change does not duplicate its CSV patch.

## What changed

The earlier tests largely inspected source text and sampled authorization using existing records. That leaves a material verification gap: policy text alone cannot prove enforcement. Added executable rollback-only fixtures, a role matrix with positive/negative controls, mutation snapshots, persisted test evidence, a failing database runner, and read-only HTTP boundary checks. No application UI, persistent schema, grants, auth settings or existing records were changed.

Files:
- `tests/security/two-institution.sql`: executable 274-check matrix, fixtures and failure gate.
- `tests/security/database-evidence.json`: observed database results, including SQLSTATE and snapshot equality.
- `tests/security/run-db.mjs`: psql runner; missing opt-in, SQL failure or missing psql fails.
- `tests/security/http-boundary.mjs`: anonymous reads and forged JWT rejection.
- `tests/security/README.md`: role expectations, setup and limits.

## Executed evidence

| Check | Actual result |
|---|---|
| Database role/authorization matrix | 274/274 passed via connected Supabase execute_sql |
| Negative writes | Fixture snapshots unchanged; RLS zero-row no-ops distinguished from errors |
| Positive controls | Authorized edits, transfer, candidate save/submit and +5 extension succeeded within rolled-back requests |
| Fault-injection control | Deliberately expecting denial of an allowed staff edit caused the suite to raise `Security matrix failed: staff_A update exam 201` |
| Anonymous REST reads | 6/6 rejected with HTTP 401 and SQLSTATE 42501 |
| Forged service_role JWT | Rejected with HTTP 401 / PGRST301 |
| Fixture cleanup | Separate query returned 0 test users, 0 test institutions and 0 test exams after rollback |
| Existing Node tests | 32/32 passed |
| ESLint | Exit 0; existing React hook/refresh warnings remain |
| Vite build | Passed; existing large-chunk warning remains |
| Production dependency audit | `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities |
| New runner syntax | Both Node scripts passed `node --check` |
| Missing database acknowledgement | Runner exited 1 as intended |

The psql execution path itself was not exercised because psql is unavailable in this host; the exact SQL file was executed through the Supabase connector. Normal CI still runs the existing tests/lint/build/audit, not the database matrix. Do not confuse a green CI run with a new live matrix execution.

## Findings

No authorization bypass was confirmed by these 274 database checks and seven HTTP checks. This is bounded evidence, not a claim that every endpoint is secure.

Two suspected paths were disproved by execution: direct `exams.created_by` changes and `questions.exam_id` reparenting are denied by existing column grants. Authorized `qualify_institution_transfer_exam` remains functional. No extra trigger or privilege revocation was needed.

All 51 authenticated-callable public SECURITY DEFINER functions have a configured search_path. Inventoried callable grants and inspected authorization helpers, candidate, exam creation, grading, transfer, and membership functions. This is not a completed semantic audit of every function. Eight public candidate functions remain intentionally anonymous-callable.

The platform owner is not implicitly an institution exam administrator: the observed helpers require institution membership for exam content. Tests preserve that existing boundary rather than broadening owner privileges.

### Outstanding risk priorities

| Priority | Risk / evidence | Next step |
|---|---|---|
| High hardening priority | Fresh Supabase security advisor still reports leaked-password protection disabled | Enable through supported Auth settings and validate password flows; no Auth configuration update capability used here |
| High verification priority | No staging branch and no real staging login credentials available | Provision isolated staging and real role accounts; run authenticated HTTP CRUD/RPC, JWT expiry, logout, recovery and Edge Function tests |
| High abuse risk from prior audit | Public student registration lacks verified email ownership | Stage invitation/verification and rate-limit changes while preserving the accepted exam workflow |
| Medium credential exposure risk from prior audit | Staff onboarding emails temporary passwords | Stage one-use password setup links; test expiry, replay and existing account handling |
| High verification priority | Concurrent two-device control, submit races, offline recovery and 100–500 student capacity untested | Controlled staging concurrency/load/browser tests |
| Operational | Backup restore, alert delivery and complete Git-history secret scanning not executed | Separate restore rehearsal and scoped operational/security checks |

## Important limits

SQL fixtures simulate subjects and database roles; they cannot prove login, valid signed JWT processing, session revocation or browser guards. The HTTP probe uses only a public key and deliberately invalid JWT, not genuine authenticated staging accounts. In-progress candidate fixtures isolate save/resume behavior and do not test scheduled entry. The suite is not exhaustive CRUD for every table, every SECURITY DEFINER RPC, Storage, OTP, file uploads, XSS or SQL injection. No network load test, brute force or email sending was performed.

No production migration is included because these checks did not confirm a database authorization defect requiring one.
