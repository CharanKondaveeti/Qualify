# Qualify — safe setup and upgrade guidance

## 1. Before any installation

- Keep a copy of your working project and export/back up existing Supabase tables and policies.
- Copy `.env.example` to `.env.local` with your own Supabase URL and **public** key. `.env.local` was excluded from the cleaned download intentionally.
- The cleaned package uses the old original dashboard and calendar for institutional admins. All institutional permissions are server-enforced through Supabase.

## 2. Code installation

```sh
npm ci
npm test
npm run lint
npm run build
npm run dev
```

Navigate to `/admin-login`. The admin pages are `/admin`, `/admin/exams`, `/admin/calendar`, `/admin/question-bank`, `/admin/reports`, `/admin/team`, and `/admin/institutions` (depending on role). Student URLs such as `/register/exam/:examId` and `/exams/:examId/student/:studentId` are preserved.

## 3. SQL inventory: do not re-run previously applied migrations

1. `supabase/migrations/20261015_qualify_secure_upgrade.sql`: original 4-table secure functionality (where not already installed).
2. `supabase/migrations/phase1/01_...sql` through `12_...sql`: institutions, super admins, applications and role lookup.
3. `supabase/migrations/phase2/01_...sql` through `08_...sql`: staff invitations and management.
4. `supabase/migrations/phase3/01_...sql` through `24_...sql`: institution-scoped exams and management.

These are archived SQL scripts from the previously delivered phases and have not been executed during this cleanup. Confirm your actual deployed schema before running anything. Some verification scripts may contain context-specific assertions; the Phase 1 owner bootstrap requires replacing its email placeholder and must never be used unedited. The migration numbering is phase-local; execute in phase and numerical order **only in a fresh, prepared staging database** after reviewing dependencies and test results.

## 4. Administrator records

`auth.users` holds sign-in accounts. `platform_admins` holds Platform Owner permissions. `institutions` holds college/institution profiles. `institution_members` holds both Institution Super Admin and Staff Admin records; their `role` determines access. `admins` is the original legacy admin table and is not the correct way to grant institution roles.

## 5. Required checks before production

Use separate real accounts (owner, two institutions, super admin, staff, student) to verify RLS and RPC permissions, staff suspension, ownership transfers, registration, timed submission, and links from the previous version. See `docs/PRODUCTION_READINESS.md`.
