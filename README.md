# Qualify Portal — cleaned source project

The original **Qualify** React/Vite interface is the one admin interface. The existing dashboard, **Calendar**, Examinations, Exam Details, Question Bank, Reports, and Settings remain in `src/features/admin/`. Institution management and team management are pages within this same dashboard.

## Start locally

1. Copy `.env.example` to `.env.local` and supply your own Supabase project URL and **public anon/publishable** key. Never use a service-role key in Vite.
2. Run `npm ci` then `npm run dev`.
3. Run `npm test`, `npm run lint`, and `npm run build` before deployment.

Main admin login: `/admin-login`. Admin dashboard: `/admin`. Calendar: `/admin/calendar`. Institutional applications: `/institution/apply`. Staff invite acceptance: `/institution/invite?token=...`. Existing student URLs are unchanged.

## Permissions and institutional hierarchy

- Platform Owner: `platform_admins` and the **Institutions** tab (`/admin/institutions`).
- Institution Super Admin / Staff Admin: `institution_members`; both use the original `/admin` interface. Institution Super Admins can manage their own institution; staff manage exams permitted by database policies.
- `admins` is a legacy compatibility table. Do not use it to promote new staff accounts.

**Actual permissions must be enforced by Supabase RLS and trusted RPCs.** The React navigation is not a security boundary.

## Supabase database scripts

The code ZIP provided for cleanup held only the older secure upgrade SQL. To keep this cleaned project complete as a *source archive*, previously supplied **unchanged** Phase 1–3 SQL scripts are now collected at:

- `supabase/migrations/20261015_qualify_secure_upgrade.sql` (older secure upgrade)
- `supabase/migrations/phase1/` (12 institution foundation scripts)
- `supabase/migrations/phase2/` (8 invitation and management scripts)
- `supabase/migrations/phase3/` (24 access and exam integration scripts)

**Do NOT blindly run all SQL files on an existing database.** If you've already applied any phase, leave it applied. These scripts were restored from earlier project packages, not validated against your live Supabase instance. Before any fresh setup, read `SETUP_GUIDE.md`, back up your database, compare applied functions/policies and test on a staging copy.

## Exam timing modes

Creation and upcoming-exam editing support time-based (fixed opening/closing) and duration-based (minutes per student) exams. See [timing rules and database rollout](docs/EXAM_TIMING.md) for migrations 26–27 and staging checks. Apply the database changes before using the new timing controls against Supabase.

## Cleanup scope

Removed unused institutional dashboard copies, broken duplicate `src/pages` files, and the legacy `archive` binaries/snapshots. The original uploaded ZIP remains your historical backup. No active admin or student routes and no exam data were deleted. No database was modified.

See `docs/CLEANUP_REPORT.md`, `docs/PROJECT_STRUCTURE.md`, and `docs/PRODUCTION_READINESS.md` for details. **A successful local source test does not establish a live Supabase installation or production readiness.**
