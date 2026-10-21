# Qualify — security attack and regression test matrix
Date: 2026-10-21
Scope: GitHub main and linked Supabase project; checks here are **not** production certification.

## What we verified read-only
- RLS enabled on all 24 inspected public tables. Direct anonymous SELECT on exams, questions, studentReport, institution_members, platform_admins is not granted.
- Authenticated SELECT on studentReport is column-restricted: raw answers, access_hash and session_hash cannot be selected directly.
- SQL simulated an active institution member using authenticated role in a rolled-back transaction: visible exam rows were within the caller's authorized scope. This is a sampled test, not a comprehensive two-tenant adversarial test.
- SECURITY DEFINER RPCs require per-function audit. Eight anonymous candidate RPCs appear intentional; 51 authenticated functions are flagged for review, not automatically exploitable.
- Candidate payload function omits correct_option; client-provided answer indices are checked by qualify_save and grades are computed by database code.
- No production table writes or schema migrations were made in this review.

## High-priority unresolved findings
- Supabase Auth leaked-password protection is disabled (security advisor warning). Enable in Auth settings if available.
- Staff onboarding sends a temporary password by email. Replace with one-use invitation/password setup workflow after staging verification.
- Public qualify_register permits self-registration using unverified email/roll; add verified ownership or gated invitations for high-stakes exams, plus abuse control appropriate for shared institutional IPs.
- Browser bearer tokens (Supabase session and candidate access tokens) are visible to their own browser owner. DevTools cannot be a security boundary; prioritize XSS prevention, CSP, session limits and server-side authorization.
- No complete authenticated two-institution role-matrix run, concurrent 500-student load run, or backup restore rehearsal was demonstrated here.

## Execution rules
Test only with dedicated staging institutions and test accounts; never brute-force production auth or run high-volume scans against real exams. Run destructive actions in isolated disposable data. Capture expected denial plus verify **no state change**, not just HTTP error codes. Use the same network payload a real client sends and change only one field per test. Repeat after permissions, migrations, or edge function changes.

### Identity, login and browser state
| ID | Test | Expected |
|---|---|---|
| A01 | Open every admin route logged out, directly by URL | Denied/redirect; no privileged API data |
| A02 | Log in as platform owner; manually navigate to institution-only and staff-only URLs | Permissions enforced by API |
| A03 | Institution super admin visits another institution by replacing URL institution ID | No out-of-scope records |
| A04 | Staff visits another staff member's exam within same institution | No exam records or mutation |
| A05 | Suspended staff reuses active JWT and direct RPC endpoints | Database rejects |
| A06 | Institution suspended while a staff session is active | API rejects subsequent privileged calls |
| A07 | Reuse old session after sign-out, refresh, browser Back, new tab | No authorized API access |
| A08 | Alter workspace ID in sessionStorage/Redux/React state | Does not change server-side institution authorization |
| A09 | Set fake role/isAdmin/local flags in DevTools | Does not grant privileged backend access |
| A10 | Log in simultaneously on two browsers; change/revoke password; refresh JWT | Revocation and recovery meet session policy |
| A11 | Forgot-password, invitation, activation and callback URLs altered/replayed | One-time, scoped, expiring links |
| A12 | Malformed, expired, revoked or cross-user JWT | Denial; no data |
| A13 | MFA policy, breached passwords, login attempts, enumeration | Meets configured abuse rules |
| A14 | XSS attempt via all text fields, imported CSV and institution metadata | React renders text; no script runs; no token theft |
| A15 | Check DevTools Sources/Network/Memory/Storage after logout | No stale admin cache/draft; no service keys in frontend |
| A16 | Verify role switch / institution switch while cached queries exist | Cache cleared, no cross-tenant flash or stale data |

### Database, SQL and API tampering
| ID | Test | Expected |
|---|---|---|
| B01 | Anonymous SELECT/INSERT/UPDATE/DELETE on each sensitive table | Denied |
| B02 | Authenticated attempt to SELECT studentReport.answers/access_hash/session_hash | Denied |
| B03 | RLS read matrix: owner, super admin, exam-owning staff, other staff, other institution | Only authorized records |
| B04 | RLS write matrix for exams, questions, reports, banks, membership | Only authorized columns/actions |
| B05 | Modify request institution_id, created_by, owner_id, exam_id | Server ignores/denies escalation |
| B06 | Call every SECURITY DEFINER RPC directly as anon, unrelated authenticated user | Per-function expected denial |
| B07 | SQL injection strings in name, course, reason, search, filters and JSON payload | Safely bound; no SQL execution |
| B08 | JSON extra fields: score, status, published, correct_option, access_hash, session_hash | Rejected or ignored |
| B09 | Wrong type: array/object/null/float/NaN/huge integer for expected primitive | Validation error without mutation |
| B10 | Excessively long text, nested JSON, repeated keys, escaped Unicode | Bounded and safe |
| B11 | Forged JWT role claims, auth.uid, institution scope in body/headers | Auth derived from verified JWT |
| B12 | Read another institution's question-bank private/shared records by ID | Denied |
| B13 | Update named-bank owner/institution/visibility using API body | Guard/RLS deny illegal reassignment |
| B14 | Update question text, marks or keys after scheduled start even if status says Upcoming | Denied |
| B15 | Reopen completed exam or force results_published=true while Active | Denied |
| B16 | Forge p_minutes=120, p_action=unknown, reset/revoke submitted attempt | Rejected |
| B17 | Invoke regrade for foreign exam, invalid option, replayed preview signature | Denied |
| B18 | Tamper with registered student's roll/email or private-link issue attempt ID | Privileged function checks ownership |
| B19 | Check audit logging, no secret values in logs, errors or JSON responses | Minimal safe disclosure |
| B20 | Forged cross-origin browser requests to Edge Functions | JWT/application token checks; safe CORS |

### Candidate, exam integrity and concurrency
| ID | Test | Expected |
|---|---|---|
| C01 | Register before exam, after start, duplicate email/roll, invalid address | Intended policy and database constraints |
| C02 | Register using someone else's email; automated registrations | Must be mitigated for high-stakes use |
| C03 | Start before scheduled time, after last entry or on suspended institution | Rejected |
| C04 | Modify attempt ID/token/session in begin/state/save/results requests | Rejected |
| C05 | Copy private link to second device while first session active | Device lock honored |
| C06 | Reset device while old tab continues saving | Old session rejected |
| C07 | Save arbitrary question ID or option outside 0..N-1 | Rejected, no saved changes |
| C08 | Save injected marks, correct_option or modified total_marks | Never affects score |
| C09 | Save invalid review flags or oversized JSON | Rejected |
| C10 | Submit twice, submit concurrently from two tabs, timeout during autosave | One final grade and consistent state |
| C11 | Disconnect 1, 15, 60 seconds; reconnect after refresh | Valid drafts recover; server authoritative |
| C12 | Computer clock modified forwards/backwards, timezone changed | Server deadline controls |
| C13 | Instructor reschedules during registration, while active, after end | Only allowed before start |
| C14 | Staff disables browser JS/fullscreen/tab events | Integrity relies on server, not event log |
| C15 | Results before publication, after publication, after hide, foreign token | Correct privacy and status |
| C16 | Exam creation with zero, >200, mismatched marks, invalid pass mark | Validated; no partial exam |
| C17 | Update bank after making exam snapshot | Exam questions and prior results unchanged |
| C18 | 500 parallel starts/saves; controlled load test | Latency, rate limits, correctness measured |
| C19 | Concurrent admin stop with final candidate submit | No double grading, stable audit event |
| C20 | Reload candidate result page without original access token | Correct error/recovery, no unrelated result access |

### Form filling, export, hosting, recovery
| ID | Test | Expected |
|---|---|---|
| D01 | Empty required, leading/trailing whitespace, max length, invalid email, phone, ZIP, website | Client + server validation |
| D02 | Unicode names, apostrophes, HTML-looking text, emoji, line breaks | Escaped rendering; no data corruption |
| D03 | HTML/script/SQL payload in CSV questions and student names | Treated as text, not executed |
| D04 | CSV imports: bad headers, empty values, duplicate options, invalid correct index/marks | Atomic rejection; useful row errors |
| D05 | CSV export formula prefixes = + - @, leading spaces/tab, invisible prefix | Escaped as spreadsheet text |
| D06 | CSV special comma/quote/newline and Excel XLSX exports | No shifted columns, no formula execution |
| D07 | Logo files wrong MIME/content, huge uploads, forged institution folder | Storage policy and file validation |
| D08 | Requests larger than intended API/body limits and repeated submissions | Bounded server responses |
| D09 | CSP, CORS, HSTS, clickjacking, content-sniffing, mixed content | Correct production headers |
| D10 | Secret scan frontend bundle, Git history, src.zip and CI artifacts | No service_role/OTP/HMAC secrets |
| D11 | User uploads/downloading own and foreign storage objects | Storage tenant boundary |
| D12 | Staff OTP replay, expiry, five wrong tries, cooldown, multiple pending invites | Denial and rate limits |
| D13 | Auth/network/server errors during each form submit and upload | No duplicate or partial destructive state |
| D14 | Back/Forward/Refresh/unauthorized URL and expired session | Predictable routing; no privilege escalation |
| D15 | Continuous monitoring traffic and 500 simultaneous students | Capacity within budget |
| D16 | Backup restore and PITR, rollback migrations, rollback frontend deploy | Documented RPO/RTO and rehearsal |
| D17 | Alerts for auth abuse, Postgres errors, email provider outages, spikes | Operational notification tested |
| D18 | Keyboard only, mobile widths, zoom 200%, screen reader labels, dialog trapping | Accessible without bypasses |

## Current status
- **Verified sampled controls:** RLS present, targeted grants, column restriction and one authenticated role-simulation; inspected candidate scoring/token RPC code.
- **Patch pending CI and review:** CSV export handling for whitespace/invisible formula prefixes.
- **All attack tests above:** not automatically considered passed. Explicit staging execution, assertions and evidence are required.

See: https://supabase.com/docs/guides/api/securing-your-api
