# Qualify Exam Portal

React 19 / Vite exam portal with Supabase authentication, institutional access, question banks, private candidate links, and browser-local demos.

## Local development

1. Copy `.env.example` to `.env.local` and enter the Supabase URL and public anon/publishable key. Never put service-role keys in Vite variables.
2. Run `npm ci`.
3. Run `npm run dev`.
4. Before submitting changes, run `npm test`, `npm run lint`, and `npm run build`.

Keep `.env.local` untracked. Configure the same public variables in the deployment environment.

## Current routes

| Area | Route |
| --- | --- |
| Sign in / sign up | `/login`, `/signup` |
| Workspace entry | `/app` |
| Institution workspace | `/app/i/:institutionId` |
| Exams | `/app/i/:institutionId/exams` |
| Question banks | `/app/i/:institutionId/question-banks` |
| Calendar / reports / team / settings | Workspace path plus `/calendar`, `/reports`, `/team`, `/settings` |
| Platform administration | `/platform/institutions`, `/platform/applications` |
| Institution application | `/institutions/apply` |
| Application status | `/institutions/application-status` |
| Candidate registration | `/join/:examId` |
| Candidate attempt | `/candidate/exams/:examId/attempts/:studentId` |

Candidate access also requires the private credentials issued by the application. Route definitions live in `src/app/routes/`; consult those modules for the full list.

## Source structure

- `src/app`: router and route environment.
- `src/features`: admin, auth, institutions, student, questions, reports, and demos.
- `src/services`: API and domain operations.
- `src/shared`: shared UI and hooks.
- `tests`: Node regression and source integrity checks.
- `supabase`: SQL history and edge function sources.

Platform Owners use `platform_admins`; institution roles use `institution_members`. Supabase RLS and trusted RPC checks enforce authorization. Client-side navigation is only UI.

## Database maintenance

Read [the SQL guide](supabase/README.md) before running scripts. The SQL directory contains historical manual phase scripts and newer patches; it is not a verified fresh-install migration chain. Never reset or replay it against production.

See [exam timing](docs/EXAM_TIMING.md), [staff onboarding](docs/staff-otp-onboarding.md), and [the latest cleanup report](docs/CLEANUP_2026-10-18.md).
