import { useAppDialog } from '../../../shared/components/ConfirmDialogProvider';
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import supabase, { isDemo } from "../../../lib/supabase";
import {
  adminControl,
  adminEvents,
  adminClearEvents,
} from "../../../services/secureExamService";
import "../styles/operations.css";

function downloadCsv(filename, rows) {
  const escapeCell = (value) => {
    let text = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = `\u0027${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const content = rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");

  const url = URL.createObjectURL(
    new Blob([content], {
      type: "text/csv;charset=utf-8",
    }),
  );

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ExamOperations({
  exam,
  questions,
  students,
  view = "overview",
}) {
  const cache = useQueryClient();
  const dialog = useAppDialog();

  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [working, setWorking] = useState(false);
  const [filter, setFilter] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");

  const counts = useMemo(
    () => ({
      registered: students.length,
      notStarted: students.filter((s) => s.student_status === "not started")
        .length,
      taking: students.filter((s) => s.student_status === "in progress").length,
      submitted: students.filter((s) => s.student_status === "submitted")
        .length,
      revoked: students.filter((s) => s.student_status === "revoked").length,
      offline: students.filter(
        (s) =>
          s.student_status === "in progress" &&
          s.last_seen_at &&
          Date.now() - new Date(s.last_seen_at).getTime() > 45000,
      ).length,
    }),
    [students],
  );

  const completed = students.filter(
    (student) => student.student_status === "submitted",
  );

  const scores = completed.map((student) => Number(student.marks_scored) || 0);

  const average = scores.length
    ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
    : "—";

  const passed = completed.filter(
    (student) => Number(student.marks_scored) >= Number(exam.pass_mark),
  ).length;

  const visibleStudents = students.filter(
    (student) =>
      (filter === "all" || student.student_status === filter) &&
      `${student.student_name} ${student.roll_no} ${student.email}`
        .toLowerCase()
        .includes(studentSearch.trim().toLowerCase()),
  );

  async function refresh() {
    await cache.invalidateQueries({
      queryKey: ["students-report", exam.exam_id],
    });
  }

  useEffect(() => {
    if (isDemo || view !== "students" || exam.exam_status === "upcoming") {
      return;
    }

    let cancelled = false;

    const update = () =>
      adminEvents(exam.exam_id, activitySearch.trim())
        .then((data) => {
          if (!cancelled) {
            setEvents(data ?? []);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err.message);
          }
        });

    const delay = setTimeout(update, activitySearch.trim() ? 300 : 0);

    const timer =
      exam.exam_status === "active" ? setInterval(update, 15000) : null;

    return () => {
      cancelled = true;
      clearTimeout(delay);

      if (timer) {
        clearInterval(timer);
      }
    };
  }, [exam.exam_id, exam.exam_status, activitySearch, view]);

  async function control(attemptId, action, minutes = 0) {
    if (
      !(await dialog.confirm(`Apply ${action.replaceAll("_", " ")} to this student?`))
    ) {
      return;
    }

    setWorking(true);
    setError("");

    try {
      await adminControl(attemptId, action, minutes);

      setInfo("Student attempt updated.");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }

  async function clearActivity() {
    if (exam.exam_status !== "completed" || isDemo) {
      return;
    }

    if (
      !(await dialog.confirm(
        "Permanently delete the activity log for this CLOSED exam? Student answers and scores will NOT be deleted.", { title: "Delete activity logs", danger: true, confirmLabel: "Delete logs" }
      ))
    ) {
      return;
    }

    setWorking(true);
    setError("");
    setInfo("");

    try {
      const result = await adminClearEvents(exam.exam_id);

      setEvents([]);

      setInfo(
        `${result.deleted_count ?? 0} activity events deleted. Student scores and answers were preserved.`,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }

  async function publish() {
    if (exam.exam_status !== "completed") {
      return;
    }

    if (
      !(await dialog.confirm(
        exam.results_published
          ? "Hide published results?"
          : "Publish results so students can view their scores?",
      ))
    ) {
      return;
    }

    setWorking(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("exams")
        .update({
          results_published: !exam.results_published,
        })
        .eq("exam_id", exam.exam_id)
        .select("exam_id");

      if (updateError) {
        throw updateError;
      }

      await cache.invalidateQueries({
        queryKey: ["exams"],
      });

      setInfo("Result visibility updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }

  if (
    exam.exam_status === "upcoming" ||
    (view !== "students" && view !== "results")
  ) {
    return null;
  }

  return (
    <section className="qualify-ops qualify-exam-operations">
      <div aria-live="polite">
        {error && (
          <p role="alert" className="ops-error">
            {error}
          </p>
        )}

        {info && (
          <p role="status" className="ops-info">
            {info}
          </p>
        )}
      </div>

      {/* STUDENT MONITORING */}

      {view === "students" && exam.exam_status !== "upcoming" && (
        <>
          <div className="qualify-exam-section-heading">
            <div>
              <h2>Student monitoring</h2>

              <p className="muted">
                {exam.exam_status === "active"
                  ? "Updates about every 15 seconds. Browser activity is a signal, not proof of cheating."
                  : "Review final attempt statuses, connection history and recorded exam activity."}
              </p>
            </div>

            <div className="ops-actions">
              <button type="button" disabled={working} onClick={refresh}>
                Refresh now
              </button>
            </div>
          </div>

          <div className="ops-cards ops-monitor-metrics" aria-label="Student status summary">
            {[
              ["Total registered", counts.registered, "total"],
              ["Not started", counts.notStarted, "waiting"],
              ["In progress", counts.taking, "running"],
              ["Submitted", counts.submitted, "submitted"],
              ["Revoked", counts.revoked, "revoked"],
              ["Possibly disconnected", counts.offline, "offline"],
            ].map(([label, value, kind]) => (
              <div className={`ops-metric ops-metric--${kind}`} key={kind}>
                <span className="ops-metric__label">{label}</span>
                <strong className="ops-metric__value">{value}</strong>
              </div>
            ))}
          </div>

          <section className="ops-monitor-panel ops-student-controls" aria-labelledby="ops-student-controls-title">
            <div className="ops-monitor-panel__head">
              <div>
                <h3 id="ops-student-controls-title">Student controls</h3>
                <p>Find students, check their status and manage active attempts.</p>
              </div>
              <span className="ops-monitor-panel__counter">{visibleStudents.length} of {students.length} students</span>
            </div>

          <div className="ops-actions ops-monitor-toolbar">
            <label className="ops-filter-label" htmlFor="student-status-filter">
              <span>Status</span>
              <select
                id="student-status-filter"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">All</option>

                {["not started", "in progress", "submitted", "revoked"].map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ),
                )}
              </select>
            </label>

            <input
              className="ops-search"
              type="search"
              aria-label="Search students by name, roll number or email"
              placeholder="Search student name, roll or email"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
            />
          </div>

          <div
            className="ops-scroll ops-students-scroll"
            role="region"
            aria-label="Students table"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Last contact</th>
                  <th>Controls</th>
                </tr>
              </thead>

              <tbody>
                {visibleStudents.map((student) => (
                  <tr key={student.student_report_id}>
                    <td>
                      {student.student_name}
                      <small>{student.roll_no}</small>
                    </td>

                    <td>
                      <span className={`ops-status ops-status--${String(student.student_status || "unknown").replace(/[^a-z]+/gi, "-").toLowerCase()}`}>
                        {student.student_status}
                      </span>
                    </td>

                    <td>
                      {student.last_seen_at
                        ? new Date(student.last_seen_at).toLocaleTimeString()
                        : "—"}
                    </td>

                    <td>
                      <div className="ops-actions">
                        {exam.exam_status === "active" &&
                          student.student_status === "in progress" && (
                            <>
                              <button
                                type="button"
                                disabled={working}
                                onClick={() =>
                                  control(
                                    student.student_report_id,
                                    "reset_session",
                                  )
                                }
                              >
                                Reset device
                              </button>

                              {exam.timing_mode !== "time" && (
                                <button
                                  type="button"
                                  disabled={working}
                                  onClick={() =>
                                    control(
                                      student.student_report_id,
                                      "extend_time",
                                      5,
                                    )
                                  }
                                >
                                  +5 min
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={working}
                                onClick={() =>
                                  control(student.student_report_id, "revoke")
                                }
                              >
                                Revoke
                              </button>
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}

                {!visibleStudents.length && (
                  <tr>
                    <td colSpan={4}>No students match your filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          </section>

          {/* EXISTING ACTIVITY LOG */}

          <section className="ops-monitor-panel ops-activity-panel" aria-labelledby="ops-activity-title">
          <div className="ops-activity-heading ops-monitor-panel__head">
            <div>
              <h3 id="ops-activity-title">Recent exam activity</h3>
              <p>Recorded browser and exam events. These signals require human review.</p>
            </div>

            {exam.exam_status === "completed" && !isDemo && (
              <button
                type="button"
                className="ops-danger"
                disabled={working}
                onClick={clearActivity}
              >
                Delete activity log
              </button>
            )}
          </div>

          <div className="ops-actions ops-monitor-toolbar ops-activity-toolbar">
            <input
              className="ops-search"
              type="search"
              aria-label="Search recent exam activity by student or event"
              placeholder="Search by student name, roll no. or activity"
              value={activitySearch}
              onChange={(event) => setActivitySearch(event.target.value)}
            />

            <span className="ops-count" role="status">
              {events.length} events shown · Latest 300 matches
            </span>
          </div>

          <div
            className="ops-scroll ops-activity-scroll"
            role="region"
            aria-label="Recent exam activity, scrollable"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Event</th>
                  <th>When</th>
                </tr>
              </thead>

              <tbody>
                {events.map((event, index) => (
                  <tr key={`${event.created_at}-${index}`}>
                    <td>
                      {event.student_name} ({event.roll_no})
                    </td>

                    <td><span className="ops-event-kind">{event.kind.replaceAll("_", " ")}</span></td>

                    <td>{new Date(event.created_at).toLocaleString()}</td>
                  </tr>
                ))}

                {!events.length && (
                  <tr>
                    <td colSpan={3}>No activity events recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {exam.exam_status === "completed" && (
            <p className="ops-helper">
              This exam is closed. Clearing activity history does not delete
              registrations, answers or results. This action cannot be undone.
            </p>
          )}
          </section>
        </>
      )}

      {/* RESULTS */}

      {view === "results" && exam.exam_status === "completed" && (
        <>
          <h2>Results management</h2>

          <div className="ops-cards qualify-exam-result-metrics">
            <div>
              <strong>{average}</strong>
              <span>Average score</span>
            </div>

            <div>
              <strong>{passed}</strong>
              <span>Passed</span>
            </div>
          </div>

          <div className="ops-actions">
            <button
              type="button"
              disabled={working || exam.exam_status !== "completed"}
              onClick={publish}
            >
              {exam.results_published ? "Hide results" : "Publish results"}
            </button>

            <button
              type="button"
              onClick={() =>
                downloadCsv("qualify-results.csv", [
                  ["Name", "Roll", "Email", "Status", "Score"],
                  ...students.map((student) => [
                    student.student_name,
                    student.roll_no,
                    student.email,
                    student.student_status,
                    student.marks_scored,
                  ]),
                ])
              }
            >
              Export results CSV
            </button>
          </div>

          {exam.exam_status !== "completed" && (
            <p className="muted">
              The exam must finish before results can be published.
            </p>
          )}
        </>
      )}
    </section>
  );
}
