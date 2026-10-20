-- Least privilege for directly readable administrative candidate reports.
-- The dashboard and institution student-list services select only this subset.
-- PostgREST clients must not request access_hash, session_hash, saved answers,
-- review flags, question shuffles or option order. SECURITY DEFINER exam RPCs
-- continue their own token and authorization checks.
-- Apply ONLY after the reduced-field studentService.js has deployed.
REVOKE SELECT ON TABLE public."studentReport" FROM authenticated;

GRANT SELECT (
  student_report_id, exam_id, student_name, email, roll_no,
  student_status, started_at, marks_scored, created_at,
  deadline, submitted_at, last_seen_at, time_bonus_minutes
) ON TABLE public."studentReport" TO authenticated;

-- Existing RLS policy "Institution reports read" remains enabled.
-- No direct candidate/anon table access is granted.
