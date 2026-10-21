# Executable security checks

These are integration checks, separate from `npm test`. Ordinary CI does not execute the database or HTTP suites. Missing credentials must not count as a pass.

## Database suite

Run against a disposable Supabase database with the current Qualify schema, or review and execute the entire rollback-only script in one administrator SQL connection.

```sh
# Supply PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD securely.
# Install psql first. Never paste credentials in the command or commit them.
QUALIFY_SECURITY_DB_ACK=rollback-fixtures node tests/security/run-db.mjs
```

`two-institution.sql` creates two institutions and seven fake Auth identities with reserved `a0212026-*` UUIDs. An existing UUID/code collision aborts setup; it never deletes or overwrites pre-existing records. Identities have no passwords and no emails are sent. All changes occur inside BEGIN/ROLLBACK; each request also rolls back independently. Any failed assertion raises an exception. The psql runner uses ON_ERROR_STOP and returns a nonzero exit code on failure; connection closure rolls back the failed transaction.

The SQL is an administrator test harness: only fixture setup and snapshots use administrator privileges. Requests execute with SET LOCAL ROLE authenticated/anon, realistic subject claims, and forged user_metadata role flags. Snapshot checks compare fixture exams, questions, reports, membership, institutions, banks, events and audit rows before/after every negative request. This is not a test of JWT signatures, Auth login, HTTP serialization or browser behavior.

| Role | Exam access | Question-bank access |
|---|---|---|
| Platform owner without institution membership | No direct institution exam access; platform management allowed | No private/shared bank access |
| Institution A super admin | A staff exams; not B | A shared banks; not another staff member's private bank |
| Institution A staff | Own exams only | Own private banks and A shared banks |
| Peer staff in A | Peer-owned exams only | A shared banks |
| Suspended staff | No exam/bank access | Denied |
| Institution B super admin | B exams; not A | No A banks |
| Unrelated authenticated user | Denied | Denied |
| Anonymous/candidate | No direct sensitive table access; validated candidate RPCs | Denied |

Test groups include scoped reads/updates, protected columns, privilege escalation, transfer RPCs, premature publication, candidate token/attempt/session substitution, invalid answers/review flags, active question immutability, admin extension tampering, server grading, submitted-answer replay, and institution suspension.

Candidate in-progress rows are constructed as fixtures to test save/resume independently of wall-clock waits. This does NOT validate scheduled start/last entry, real two-device concurrency, or login. Current counts and results are in the audit report.

## Read-only HTTP boundary suite

Create a private local JSON config outside the repository:

```json
{"url":"https://YOUR_PROJECT.supabase.co","publishableKey":"YOUR_PUBLIC_KEY"}
```

```sh
QUALIFY_HTTP_CONFIG=/absolute/private/config.json node tests/security/http-boundary.mjs
```

Uses only a publishable/legacy anon key. Checks six anonymous table reads and a deliberately invalid signed service-role claim. It expects specific database/JWT rejection codes; network failures, missing configuration, unexpected response bodies and unrelated errors fail. No writes or real user sessions are used.

## Still required

Real staging Auth accounts and HTTP CRUD/RPC tests across the same role matrix; JWT expiry/logout/recovery, Edge Functions, OTP and invitation replay, browser storage/cache and XSS tests, Storage upload validation, concurrent submission/session races, 100–500 student load tests, and restore rehearsals. Passing these scripts is not full production signoff.
