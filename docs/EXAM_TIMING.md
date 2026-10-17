# Exam timing modes

- **Time-based:** choose an opening and closing date/time. Everyone's deadline is the closing time. Late arrivals get the remaining time. Individual extensions are disabled in the UI and rejected by the server.
- **Duration-based:** choose an opening time, minutes per student, and how long students may begin after opening (1–180 minutes). Each student receives their full duration from starting. Individual extensions remain available for ongoing attempts. Once entry closes and all running attempts finish, the exam completes.

Creation and upcoming-exam editing use the same validation. Timing becomes immutable after the scheduled start, after the status leaves upcoming, or after an attempt has started. Duplicate exams retain their mode; fixed closing times move by the same offset as the new opening time. Existing exams default to duration-based mode, preserving their configured durations and stored attempt deadlines.

## Database rollout

Apply `supabase/migrations/phase3/26_exam_timing_modes.sql` after phase 3 / 25 to the target database after staging verification. It adds timing columns, constraints, grants, the lifecycle worker, and updated creation/student/admin RPCs. This migration has not been applied by the code change.

Enable Supabase Cron (`pg_cron`), then apply `27_schedule_exam_timing.sql`. The named job calls `qualify_finalize_expired()` every minute to open exams, grade expired attempts using saved answers, and complete exams even when no browser is open. Existing cron jobs calling that function also use the updated worker; keep only one such schedule. Its integer return now counts processed exams.

Student state, begin, and save RPCs also synchronize lifecycle changes on each request. Deadlines use server time and are enforced at the exact boundary, regardless of the one-minute cron cadence. The admin listing can take up to the next sweep and refresh to display a new status. The local demo follows the same rules on reads, without a background scheduler.

## Staging checks

Use two registered students with different starting times. For time-based mode verify identical deadlines, rejection of time extensions, no late starts at/after closing, automatic submission of saved answers, and no accepted answer changes after closing. For duration-based mode verify separate full-duration deadlines, the entry cutoff, extensions for ongoing attempts, and completion after the final attempt ends. Verify timing edits fail after opening, including direct database updates, and registration/results remain protected by the existing tenant/token checks.

Local unit checks cover timing calculations and input validation. Live RPC, RLS, cron, and database concurrency verification requires a staging Supabase instance; these are not established by the frontend build.
