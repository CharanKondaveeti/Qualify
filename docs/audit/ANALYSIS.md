# Qualify Portal: code, features and DOM review

Reviewed 15 October 2026 (Asia/Calcutta); route guard follow-up added the same day.

The portal has a coherent React/Supabase architecture and substantial exam-management functionality, but the supplied frontend and SQL are not a consistent deployable version. The highest-priority issues concern exam scheduling, deadline extensions, answer import integrity and the mismatch between editable report controls and database rules.

## Scope and evidence

- Inventoried 154 first-party files under `src`, `supabase`, `tests` and `public`: 14,701 lines, 53 JSX files, 1,128 JSX element declarations, 29 CSS files and 45 SQL files. Counts include unused modules and conditional templates, not 1,128 simultaneously rendered browser nodes.
- Read the application routes, pages, components, state, services, utilities, tests and supplied SQL. Parsed every JS/JSX module and stylesheet for structure and dependencies. Reviewed root configuration, setup documentation, dependency declarations and lockfile/build behavior.
- Generated [DOM_TREES.md](DOM_TREES.md), with source-derived nested element/component trees and line references for every JSX file; [FILE_INDEX.md](FILE_INDEX.md), with per-file coverage; and [INVENTORY.json](INVENTORY.json), with imports, SQL functions, CSS overlap and structural accessibility candidates.
- Browser-inspected login, demo exam list, create-exam form and its add-question dialog, upcoming exam details, completed details and student report tab, calendar, question bank, reports, settings, registration, an already-submitted student attempt, unpublished results, landing and not-found pages. The completed-report console check returned no warnings/errors at inspection time.
- Live owner, institution-super-admin and staff accounts were not available for an authenticated role matrix. Their page trees were reviewed from source, not claimed as rendered/authorized in the browser. Active answering, timeout, lock/rejoin, published-result and every modal/data variant were not exhaustively exercised live.
- Browser tabs became unavailable between some inspection calls. Subsequent inspections used a fresh background tab and batched navigation. No live Supabase writes or migrations were performed.
- `.env.local` has the two expected variable names; values are omitted from this report. Presence does not prove the project schema, key privileges or connectivity are correct.
- `src.zip` is a separate older source snapshot. Its entries were inventoried, not treated as active code. It differs from the working source and lacks `examMarks.js`. `node_modules` is third-party code and `dist` is generated output; neither was reviewed line-by-line as application code.
- This directory is not a Git working tree. There was no Git history/diff available to distinguish changes made before this review.

## Verification results

| Check | Result | Interpretation |
|---|---|---|
| Production build | Passed | Vite compiled the application; this does not validate SQL or permissions. |
| Existing tests | 8 passed, 1 failed | Packaging test rejects `.env.local`; the same test also expects the missing `.env.example`. |
| ESLint | 9 errors, 3 warnings | Mainly unused bindings, plus effect-dependency warnings. |
| Local import resolution | Passed | The existing integrity test found no broken local imports. |
| JSX/CSS parse inventory | Passed | Every inspected source module/stylesheet parsed. |
| Browser demo rendering | Partial pass | Main accessible/demo pages rendered; several features intentionally require real Supabase. |
| Live database/RLS | Not verified | No authenticated staging accounts, installed-schema export or SQL execution. |

The `npm` command resolves to a broken per-user npm installation (`npm-cli.js` missing under the roaming profile). Checks were completed using the installed Node entry points directly:

```powershell
node --test tests/source-integrity.test.mjs tests/qualify-regression.test.mjs tests/exam-flow.test.mjs
node node_modules/eslint/bin/eslint.js .
node node_modules/vite/bin/vite.js build
node docs/audit/inventory.mjs
```

Build output: main JavaScript 650.58 kB / 197.41 kB gzip; lazy XLSX chunk 429.50 kB / 143.09 kB gzip; CSS 99.76 kB / 18.07 kB gzip. Vite warns about the main chunk exceeding 500 kB. No dependency vulnerability assessment was performed, so these results say nothing about advisory status.

## Architecture and state

```text
index.html → #root
  main.jsx → StrictMode
    App → Redux Provider
      QueryClientProvider
        .app-container
          Suspense → RouterProvider → route component
          ToastContainer
        development-only React Query devtools

Admin route
  DashboardPage → authentication + institution access lookup
    AdminWorkspaceContext.Provider
      .admin-dashboard
        aside.sidebar → brand, collapse control, nav, sign out
        main.main-content
          header.top-nav → institution selector + user/role
          .content-wrapper → notices + Outlet
            role guard → selected page

Student route
  registration → public description RPC → registration RPC → private link
  exam → private token/session RPCs → server deadline + randomized questions
  results → private token RPC → pending / unpublished / published scorecard
```

React Router owns navigation. Redux holds the new-exam question draft. TanStack Query holds server records in memory with a 15-second stale time and one retry. Workspace context owns selected institution and role-derived UI permissions. Components also hold local form and modal state; some duplicate server state already available in Query.

Supabase is called directly from the browser using Auth, RLS-protected tables and RPCs. There is no application API server in this folder. PostgreSQL functions are the trusted business-logic layer. The local demo client is a separate localStorage implementation, enabled only in Vite development; it is not a model of production authorization.

Session storage holds the selected institution per user, demo flag, student private token, device session token and answer draft. Demo records use localStorage. The Query cache is cleared on tenant switch and sign-out, but the Redux question draft is only reset on tenant switch and successful exam creation.

## Route and feature map

| Route | Main structure and features | Access |
|---|---|---|
| `/`, `/login` | Landing header; administrator card; student link form; development demo links | Public |
| `/admin-login` | Login/signup card; email/password; conditional name/password confirmation; error text | Public |
| `/institution/apply` | Auth card; institution form; application status list | Signed-in applicant |
| `/institution/invite` | Token validation; accept action; login continuation link | Signed-in invited user |
| `/admin` | Workspace shell, then role-aware redirect | Authenticated workspace |
| `/admin/exams` | Summary cards; search; status filters; clickable exam table; upcoming deletion dialog | Exam membership |
| `/admin/exam/create`, `/admin/exams/create` | Exam metadata; schedule; marking mode; shuffling; instructions; bank picker; CSV upload; question preview and dialogs | Exam membership |
| `/admin/exams/:examId` | Editable upcoming header; schedule summary; registration link; monitoring; transfers; question/student tabs; results export | Exam membership + database exam permission |
| `/admin/calendar` | Month navigation; 42-cell calendar; selected-date popup | Exam membership |
| `/admin/question-bank` | Private/shared visibility; CSV import; manual entry; search; copy/delete/share | Exam membership |
| `/admin/reports` | Counts and per-exam registration/submission/average table | Exam membership |
| `/admin/team` | Invitations; verified-super-admin appointment; staff search; role/status controls; invitation revoke | Owner or institution super admin |
| `/admin/institutions` | Create institution; application review; search/list; suspend/reactivate; manage staff | Platform owner |
| `/admin/settings` | Connection description; demo reset; CSV template; workflow help; portal-link copy | Authenticated workspace |
| `/register/exam/:examId` | Exam metadata; name/roll/email form; one-time private exam link | Public registration RPC |
| `/exams/:examId/student/:studentId` | Access validation, waiting/consent, active paper, locked/revoked/submitted states | Private attempt token and device session |
| `/results/:studentId` | Pending/unpublished/published scorecard and print control | Private attempt token |
| Legacy `/platform`, `/institution`, institutional exam/bank routes | Redirect to original admin dashboard | Destination guard |
| `*` | Not-found message and home link | Public |

Platform ownership alone intentionally does not grant examination access. A platform owner needs active membership to use a selected institution's exam screens. Super admins can manage that institution's exams; ordinary staff are constrained to their own exams by `qualify_exam_can_manage`. UI visibility follows the same broad design, but the database is the authority.

## Findings, ordered by impact

### 1. High: automatic lifecycle UI depends on missing database functionality

`ExamDetailsPage.jsx:121` calls `qualify_emergency_stop`; no supplied SQL defines it. `ExamHeader.jsx:64` writes `entry_window_minutes`; no supplied migration adds that column or grants its update. The UI also reads `emergency_stopped_at` and `last_entry_at`, absent from the supplied schema additions/payload.

The supplied `qualify_create_exam` always creates `upcoming` exams. The student can begin only after status becomes `active`. There is no automatic opening/completion scheduler installation in this folder, and the current admin UI has no normal open/close control. `qualify_finalize_expired` only grades expired attempts and explicitly requires scheduling separately; it does not open exams.

**Impact:** an installation based on these files cannot fulfill the automatic schedule shown to administrators. Header updates can fail because they always include the missing field; emergency stop can fail with an unknown function. Existing live deployments might contain additional SQL, but that was not verified.

**Fix direction:** reconcile the frontend with a complete versioned database migration, including lifecycle scheduler, entry-window enforcement, payload fields, grants and guarded emergency stop. Validate on staging before running anything against existing exams.

### 2. High: approved time extensions do not update the active student's countdown

`ExamPage.jsx:341` polls server state, but at line 346 only merges the response when the student status changes away from `in progress`. A normal extension leaves status unchanged. Autosave at line 270 updates server clock offset but ignores the returned deadline. The timer therefore retains the old deadline and calls `finish()` at line 457.

**Reproduction from the code path:** extend an active attempt by five minutes before its original deadline. The database deadline moves, but the UI still reaches zero at the original time and submits early. The valid server extension does not prevent a client-initiated final submit.

**Fix direction:** merge authoritative deadline and exam metadata on every successful poll/save while preserving local answers; cover extension, shortened deadline and rejoin cases.

### 3. High: option compaction can silently change the answer key

`parseQuestionsCsv.js:14` removes blank options but keeps the original zero-based `correctAnswer`. A local reproduction using options `A, blank, B, C` and `correctAnswer=2` produced `[A,B,C]` with correct index `2`, changing the answer from B to C. The output remains in range, so backend range validation cannot detect the mistake. Invalid/missing answer and mark values also fall back silently through `parseInt(...) || default`.

`QuestionBankPage.jsx:36` applies the same compaction to manual options without remapping the selected answer. Its dedicated bank CSV validator is stronger and rejects gaps, but Create Exam does not use that validator.

**Fix direction:** share one strict parser/validator; reject interior blank options, malformed indexes and fractional/truncated values. Preserve row-specific errors and support the same 2–6 options everywhere.

### 4. Resolved in source: completed reports can update the pass mark

`StudentTable.jsx` now validates and saves the qualifying mark, refreshes the cached exam row only after a successful update, and restores the persisted value with an inline error if saving fails. The service confirms that an exam row was updated. Active-exam pass marks remain frozen.

The new `supabase/migrations/phase3/25_allow_completed_pass_mark_update.sql` updates the database guard to allow a valid pass-mark change on completed exams while preserving the other lifecycle restrictions. Apply this migration to the target Supabase database; until then, the existing trigger will continue rejecting the save.

### 5. Medium: upcoming exam deletion conflicts with the question delete guard

`examService.js` deletes the exam before issuing a second question deletion. The secure upgrade explicitly anticipates FK cascade deletion. However, `phase3/20_question_edit_guard.sql:23` rejects question deletion when its parent exam no longer exists. With an exam-to-question cascade, the parent deletion triggers child deletions after the parent is gone, so this guard can reject the intended cascade. With a restrictive FK, deleting the parent first also fails.

**Evidence limit:** the original four-table base schema and FK definitions are missing from this archive, so this is a strong source-level compatibility finding, not a reproduced live SQL failure.

**Fix direction:** define and test a single transactional delete path with explicit authorization, upcoming/unstarted checks and cascade-compatible trigger behavior. Avoid two separate browser writes.

### 6. Medium: question edits write twice and can report success too early

`QuestionList.jsx:97` awaits `editQuestionInSupabase`, then calls `onUpdate(editingQuestion)` without awaiting it. The parent `ExamDetailsTabs.jsx:85` calls the same database update again. The dialog closes and alerts success before the second request completes; the parent catches failures only in the console.

**Fix direction:** one mutation should own the database write, user-visible error and cache invalidation. The callback should either notify completion or perform the write, not both.

### 7. Medium: question drafts survive sign-out in the same SPA

`DashboardPage.jsx:79` resets Redux on institution selection changes. The real sign-out and auth-loss paths clear Query but do not reset Redux. Redux lives above the router in `App`, so a second account signing in without a full reload can encounter the first account's draft questions in Create Exam.

**Fix direction:** reset sensitive draft state on sign-out and authenticated-user changes as well as institution changes. Test two users in the same tab without refreshing.

### 8. Medium: custom exam instructions are saved but not displayed before starting

Create Exam stores `instructions`; the RPC payload includes them. `ExamStartCard.jsx` only renders hard-coded instruction bullets, and `ExamPage` does not otherwise display `details.instructions`. Students are asked to accept rules without seeing the custom rules entered by the administrator.

**Fix direction:** render the saved instructions as text before consent and make them available during the attempt.

### 9. Medium: summary cards can disagree with the live student table

`SummaryGrid.jsx:32` creates its own student state and ignores the `students` prop supplied by ExamDetailsPage. Its Realtime callback changes only `student_status` at line 48, not `marks_scored`, and listens only to UPDATE. The main page independently polls Query data.

**Impact:** a newly submitted student can have updated status but stale marks in summary cards; insert/delete changes and missing Realtime configuration can leave counts stale even while the main table updates.

**Fix direction:** derive all summary cards from the existing queried students, or invalidate/refetch that query from a filtered subscription. Avoid a second independent record store.

### 10. Medium: dialogs and navigation contain keyboard/accessibility gaps

Source and browser observations agree on several issues:

- Calendar exam days are clickable `div`s without keyboard handlers, focusability or button semantics. Browser snapshots expose them as generic text, not actionable controls.
- `QuestionCard` uses a clickable header `div` to reveal answers without `aria-expanded` or keyboard activation.
- Login's Sign Up/Sign In switch is a clickable `span`. Labels beside its fields are not associated through `htmlFor`/IDs or wrapping.
- The add/edit question dialogs declare `role=dialog` but have no accessible name, focus trap, initial-focus management, Escape handling or focus restoration. Browser inspection showed unnamed textboxes and an unnamed dialog.
- The shared modal has a name, but similarly lacks focus management. Calendar and legacy QuestionList popups have weaker semantics.
- Several edit/delete/save/cancel icon buttons in the student registration table lack accessible names.
- Create Exam's primary title is an `h4`; other pages have inconsistent heading levels. Tab-like controls lack explicit selected-state semantics.

**Fix direction:** use real buttons for activations, explicit labels, named dialogs with managed focus, and consistent page headings. Review the per-file candidates in DOM_TREES.md; those heuristics are not a complete WCAG audit.

### 11. Medium: autosave is vulnerable to overlapping stale snapshots

The eight-second `setInterval(async ...)` has no in-flight save guard or request revision. A slow save can overlap the next save; the server replaces the complete `answers` object each time. A later-arriving older snapshot can overwrite newer answers before submission. Server row locking serializes execution, but does not establish client revision order.

This is a source-level concurrency risk, not a network-race reproduction. Also, finalization at the deadline intentionally grades previously persisted answers and rejects the arriving answer payload; students can lose changes made since the last successful save when waiting until zero.

**Fix direction:** serialize/coalesce autosaves with revisions and an explicit acknowledged revision. Test delayed/out-of-order requests and disconnects around final submission. Define and communicate the deadline policy precisely.

### 12. Medium: UI exposes other operations outside their supported state

The browser showed Publish results on an upcoming exam, but the lifecycle trigger permits publication only after completion. Demo mode exposes student support controls whose service calls require `.rpc`, which the demo client does not implement. Reports displays all-zero empty results because its query is disabled without an institution ID, despite populated demo exams. Demo `publishedResult` always returns unpublished, even if the demo exam is published.

**Fix direction:** disable/hide state-ineligible actions with a clear reason, and either implement demo parity or identify unsupported demo features consistently. Do not treat demo success as proof of production functionality.

## Additional correctness and maintenance notes

- Duplicate Exam prompts for local time but pre-fills UTC from `toISOString().slice(0,16)`, which shifts the accepted default for users outside UTC.
- Bulk registration splits each line on commas rather than using Papa Parse; quoted names with commas and pasted tab-separated spreadsheet data are not handled correctly despite the implementation comment mentioning spreadsheet rows.
- Several update/delete helpers treat an error-free response as success without checking affected rows. RLS can result in zero affected records. Prefer a returned identifier or an explicit guarded RPC response.
- Registration/question mutation failures in ExamDetailsTabs are console-only. Some clipboard promises are unhandled. These failures should have visible feedback.
- Student polling swallows access errors as retries; suspension or revoked private credentials can leave an apparently active paper until another state transition. Distinguish terminal access errors from temporary network failures.
- `BankPicker` has no cancellation/stale-request guard. Team mutation reloads also lack the guard used by the initial tenant load. These should be reviewed under rapid navigation/tenant switching.
- Student pages generally do not reset all local state when only route IDs change. Test client-side navigation between attempts/registrations, not just full page loads.
- The unused `ExamModal.jsx` references `FiX` without importing it. It is unreachable from `main.jsx`, so it is not an active-route crash today.
- The source inventory finds 16 JS/JSX/CSS files unreachable from the application entry import graph. They include old student hooks, an old modal/submitted component, unused report widgets, an accordion, a loader and an obsolete institution stylesheet. Reachability is module-level, not a full unused-export analysis.

## CSS and DOM structure

All 29 stylesheets parsed. The inventory found 129 exact selector strings defined in more than one stylesheet, including deliberate global overrides. This count is a collision/review list, not 129 confirmed visual bugs.

Global `.form-group` styles occur in Create Exam, Exams and student registration CSS. `.modal-overlay` occurs in Exams, student Exam and shared modal CSS. `.modal-content` is duplicated between exam and question-preview styles. `.submit-button` is shared between registration and the student paper. All route modules are eagerly imported, so their styles participate in a shared cascade even when those routes are not active.

The portal has useful responsive rules, scroll wrappers, a global `:focus-visible` outline and a reduced-motion override. However, component-local styles also remove outlines and use generic class names, fixed viewport heights and overlapping breakpoint rules. Actual color contrast, clipping, narrow-device layouts and focus visibility require a dedicated visual/mobile pass; they are not established by stylesheet parsing.

Refactor reusable layouts and dialogs first, then scope CSS with modules or deliberate root selectors. Do not remove duplicate selectors mechanically: `portal.css` intentionally overrides the original theme.

## Database and security model

The supplied SQL contains useful protections: RLS-scoped institution/exam reads; verified-email institution applications and invitations; hashed one-time invitation and student access tokens; per-attempt session locks; randomized option maps; server-side grading; no answer key in the student question payload; guarded role changes; and revocation of public access to internal grading helpers.

Phase 1 creates institutions, memberships, applications, owner roles and audit records, then maps legacy administrators to individual legacy institutions. Phase 2 adds hashed invitations and role/status management with last-active-super-admin protection. Phase 3 replaces exam authorization, scopes the question bank, adds exam ownership transfers and institution summaries, and applies suspension checks to student RPCs.

These are source-level properties. Effective RLS depends on the deployed policy set; permissive old policies not named in the drop statements could remain. The upgrade assumes pre-existing `admins`, `exams`, `questions`, `studentReport` and `is_admin`; it is not a complete fresh-database schema. Verify original constraints, FKs, defaults, triggers, Realtime publication and scheduled jobs from the actual database before claiming installation reproducibility.

Public registration deliberately does not verify student email ownership. Browser tab/fullscreen/copy events are best-effort indicators, not robust proctoring. No application-level registration/event rate limiter is implemented here. No penetration test or live abuse test was conducted.

The SQL's expired-begin branch performs grading and then raises an exception; that exception would roll back the transaction's grading work. Student-state/save calls or a scheduled sweeper must perform durable timeout finalization. Test this boundary explicitly rather than relying on the begin call's side effect.

## Documentation, tests and performance

README and SETUP_GUIDE refer to `.env.example` and `docs/CLEANUP_REPORT.md`, `docs/PROJECT_STRUCTURE.md`, `docs/PRODUCTION_READINESS.md`, none of which existed at review start. The old SQL also references a missing `SETUP.md`. The new audit documents do not replace those missing setup requirements.

The current nine tests cover scoring, the local demo data adapter and source-string/import checks. They do not execute React interaction flows, SQL migrations, RLS, shuffled server scoring, institution isolation, deadline extension or browser accessibility. The test named as a create/register/start/save/submit flow directly manipulates the demo adapter; it is not an end-to-end test of the UI or production RPCs.

All route pages are eagerly imported. Suspense currently wraps synchronous imports rather than actual lazy route loading. XLSX is already dynamically loaded, which is useful. Split admin/student/auth routes and remove proven-unused dependencies only after checking their usage and lockfile impact.

Per active student, baseline polling is about 7.5 saves plus 4 state reads per minute, before activity events/retries. The state RPC returns the randomized question payload on each authorized active poll. At 500 concurrent students this is roughly 5,750 RPC calls per minute before admin traffic. This is an estimate from intervals, not a load-test result. A lightweight heartbeat/state endpoint and revision-based answer saves would reduce repeated payloads and writes.

## Suggested implementation order

1. Reconcile the missing lifecycle migration and base-schema prerequisites on staging.
2. Fix deadline propagation and answer-import integrity; cover them with focused regression tests.
3. Align report/publication controls with database rules; repair transactional deletion and duplicate question updates.
4. Clear account-sensitive drafts on identity changes; unify live report state and terminal-error handling.
5. Fix keyboard navigation and dialog focus/labels across shared components.
6. Repair the test/configuration documentation, remove confirmed dead modules and split route bundles.
7. Validate real roles across two institutions, then run exam lifecycle, timed/network-failure and mobile browser checks.

## Role-based routing change

The admin child routes now declare one of three explicit permissions in `App.jsx`: active exam membership, institution administration (Platform Owner or Institution Super Admin), or Platform Owner. `AdminRouteGuard.jsx` applies that permission on direct URLs and redirects blocked users to the workspace they can access. Staff Admins can still use permitted exam routes, their own exam reports and the question bank; institution team management is reserved for Super Admins/owners, and the Institutions page is reserved for Platform Owners.

The institution application route now sends signed-in active members to their dashboard and Platform Owners to institution management. The invitation acceptance route remains available to invited, verified users because the token-bound acceptance RPC authorizes that specific action.

Browser-checked in the local demo: a Staff Admin opening `/admin/team` and `/admin/institutions` is redirected to `/admin/exams`. Build passed and ESLint passed for the changed route files. The demo role check verifies client navigation only; Supabase RLS/RPCs remain the security boundary and were not exercised against a live database.

This follow-up changed application route files in addition to the audit documents. It did not change SQL permissions or database scripts.
