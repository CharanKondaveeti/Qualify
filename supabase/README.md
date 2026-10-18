# Supabase SQL and functions

## Existing production database

Do not run every SQL file, `db reset`, or an unreviewed `db push`. Historical phase scripts and date-only patches coexist here and may redefine the same objects. Applied migration history must be compared with the live schema before any rollout.

- `migrations/phase1`: original institution foundation and manual owner bootstrap.
- `migrations/phase2`: earlier invitation and membership implementation.
- `migrations/phase3`: exam access, timing, monitoring, and grading changes.
- Root migration files: later feature patches and maintenance migrations.
- `functions`: edge function source.

These historical files stay in place because tests and rollout documents refer to them. Their presence does not mean every file should be executed again. Owner bootstrap SQL requires manual review and must never be part of an automatic deployment.

## Future changes

Create migration filenames with `supabase migration new <name>`. Review current schema and dependencies, test on staging, use bounded lock/statement timeouts, and verify the result after deployment. Commit the SQL with the code that depends on it.

Do not remove empty tables or unused-index notices alone: a new feature or infrequent operation may still need them. Candidate RPCs intentionally support users without admin login; check their token validation before changing permissions.
