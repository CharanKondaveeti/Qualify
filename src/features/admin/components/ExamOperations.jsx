import { useAppDialog } from "../../../shared/components/ConfirmDialogProvider";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  FiActivity, FiAlertCircle, FiCheck, FiCheckCircle, FiClock, FiDownload,
  FiEye, FiEyeOff, FiRefreshCw, FiSearch, FiShield, FiUsers,
} from "react-icons/fi";
import supabase, { isDemo } from "../../../lib/supabase";
import { adminControl, adminEvents, adminClearEvents } from "../../../services/secureExamService";
import "../styles/operations.css";
import "../styles/exam-students-results.css";

const STATUSES = [
  { value: "all", title: "All" }, { value: "not started", title: "Not started" },
  { value: "in progress", title: "In progress" }, { value: "submitted", title: "Submitted" },
  { value: "revoked", title: "Revoked" },
];

const cleanStatus = value => String(value || "unknown").replace(/[^a-z]+/gi, "-").toLowerCase();

function Metric({ label, value, Icon, accent = "" }) {
  return <div className={`qe-insight${accent ? ` qe-insight--${accent}` : ""}`}>
    <div className="qe-insight-label"><span>{label}</span><Icon aria-hidden="true" /></div>
    <strong>{value}</strong>
  </div>;
}

export default function ExamOperations({ exam, students = [], view = "overview" }) {
  const cache = useQueryClient();
  const dialog = useAppDialog();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [working, setWorking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);

  const completedExam = exam.exam_status === "completed";
  const inExam = exam.exam_status === "active";
  const counts = useMemo(() => ({
    registered: students.length,
    notStarted: students.filter(s => s.student_status === "not started").length,
    taking: students.filter(s => s.student_status === "in progress").length,
    submitted: students.filter(s => s.student_status === "submitted").length,
    revoked: students.filter(s => s.student_status === "revoked").length,
    offline: students.filter(s =>
      s.student_status === "in progress" && s.last_seen_at &&
      Date.now() - new Date(s.last_seen_at).getTime() > 45000,
    ).length,
  }), [students]);

  const finished = students.filter(s => s.student_status === "submitted");
  const scores = finished.map(s => Number(s.marks_scored)).filter(Number.isFinite);
  const average = scores.length
    ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
    : "—";
  const passed = finished.filter(s =>
    Number.isFinite(Number(s.marks_scored)) && Number(s.marks_scored) >= Number(exam.pass_mark),
  ).length;
  const passRate = finished.length ? `${Math.round(passed / finished.length * 100)}%` : "—";
  const visibleStudents = useMemo(() => {
    const search = studentSearch.trim().toLowerCase();
    return students.filter(s => (filter === "all" || s.student_status === filter) &&
      [s.student_name, s.roll_no, s.email].some(v => String(v || "").toLowerCase().includes(search)));
  }, [students, filter, studentSearch]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    setError("");
    try {
      await cache.invalidateQueries({ queryKey: ["students-report", exam.exam_id] });
    } catch (err) {
      setError(err.message || "Could not refresh student attempts.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isDemo || view !== "students" || exam.exam_status === "upcoming" || !activityOpen) return;
    let cancelled = false;
    const update = () => adminEvents(exam.exam_id, activitySearch.trim())
      .then(rows => { if (!cancelled) setEvents(rows ?? []); })
      .catch(err => { if (!cancelled) setError(err.message || "Could not load activity."); });
    const debounce = setTimeout(update, activitySearch.trim() ? 300 : 0);
    const interval = inExam ? setInterval(update, 15000) : null;
    return () => {
      cancelled = true;
      clearTimeout(debounce);
      if (interval) clearInterval(interval);
    };
  }, [exam.exam_id, exam.exam_status, activitySearch, view, activityOpen, inExam]);

  async function control(attemptId, action, minutes = 0) {
    if (working || !inExam) return;
    if (!await dialog.confirm(`Apply ${action.replaceAll("_", " ")} to this student?`, {
      title: "Confirm student control", confirmLabel: "Apply change",
      danger: action === "revoke",
    })) return;
    setWorking(true);
    setError("");
    setInfo("");
    try {
      await adminControl(attemptId, action, minutes);
      setInfo("Student attempt updated.");
      await refresh();
    } catch (err) {
      setError(err.message || "Unable to change student attempt.");
    } finally {
      setWorking(false);
    }
  }

  async function clearActivity() {
    if (!completedExam || isDemo || working) return;
    if (!await dialog.confirm(
      "Permanently delete the browser activity log for this closed exam? Registered students, answers and scores will be preserved.",
      { title: "Delete activity log?", danger: true, confirmLabel: "Delete activity log" },
    )) return;
    setWorking(true);
    setError("");
    setInfo("");
    try {
      const result = await adminClearEvents(exam.exam_id);
      setEvents([]);
      setInfo(`${result.deleted_count ?? 0} activity events deleted. Exam results are intact.`);
    } catch (err) {
      setError(err.message || "Unable to clear activity history.");
    } finally {
      setWorking(false);
    }
  }

  async function publish() {
    if (!completedExam || working) return;
    if (!await dialog.confirm(
      exam.results_published ? "Hide results from students? Recorded scores will not be changed." :
        "Publish results? Students will be able to see their recorded exam results.",
      { title: exam.results_published ? "Hide published results?" : "Publish examination results?",
        confirmLabel: exam.results_published ? "Hide results" : "Publish results" },
    )) return;
    setWorking(true);
    setError("");
    setInfo("");
    try {
      const { data, error: updateError } = await supabase.from("exams")
        .update({ results_published: !exam.results_published })
        .eq("exam_id", exam.exam_id).eq("exam_status", "completed")
        .select("exam_id");
      if (updateError) throw updateError;
      if (!data?.length) throw new Error("Result visibility was not changed. Check your permissions.");
      await cache.invalidateQueries({ queryKey: ["exams"] });
      setInfo(exam.results_published ? "Results are now hidden from students." : "Results published successfully.");
    } catch (err) {
      setError(err.message || "Unable to update result visibility.");
    } finally {
      setWorking(false);
    }
  }

  if (exam.exam_status === "upcoming" || (view !== "students" && view !== "results")) return null;

  return <section className="qualify-ops qualify-exam-operations qe-operations">
    {(error || info) && <div className="qe-ops-messages" aria-live="polite">
      {error && <p role="alert" className="ops-error">{error}</p>}
      {info && <p role="status" className="ops-info">{info}</p>}
    </div>}

    {view === "students" && <>
      <div className="qe-ops-heading">
        <div>
          <span className="qe-overline">{inExam ? "LIVE EXAMINATION" : "COMPLETED EXAMINATION"}</span>
          <h2>{inExam ? "Student monitoring" : "Student attempts"}</h2>
          <p>{inExam ? "Track registrations and live attempts. Activity indicators are signals, not proof of misconduct." :
            "Review final attempt statuses and the exam's activity history."}</p>
        </div>
        <div className="qe-ops-heading-actions">
          <span className={`qe-live-indicator${inExam ? " is-live" : ""}`}>
            <span aria-hidden="true" />{inExam ? "Live · 15s refresh" : "Exam closed"}
          </span>
          <button type="button" className="qe-utility-button" onClick={refresh}
            disabled={refreshing || working}><FiRefreshCw aria-hidden="true" />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="qe-insight-grid" aria-label="Student attempt summary">
        <Metric label="Registered" value={counts.registered} Icon={FiUsers} />
        <Metric label="Not started" value={counts.notStarted} Icon={FiClock} />
        {inExam && <Metric label="In progress" value={counts.taking} Icon={FiActivity} accent="blue" />}
        <Metric label="Submitted" value={counts.submitted} Icon={FiCheckCircle} accent="green" />
        <Metric label="Revoked" value={counts.revoked} Icon={FiShield} />
      </div>

      <section className="qe-ops-panel" aria-labelledby="qe-students-title">
        <header className="qe-ops-panel-head">
          <div><h3 id="qe-students-title">Student directory</h3>
            <p>Find a student and review their examination status.</p></div>
          <span className="qe-counter">{visibleStudents.length} of {students.length}</span>
        </header>
        <div className="qe-ops-toolbar">
          <label className="qe-ops-search"><FiSearch aria-hidden="true" />
            <input type="search" aria-label="Search registered students"
              placeholder="Search name, roll no. or email"
              value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
          </label>
          <label className="qe-ops-select">Status
            <select aria-label="Filter by student status" value={filter}
              onChange={e => setFilter(e.target.value)}>
              {STATUSES.filter(s => inExam || s.value !== "in progress").map(s =>
                <option key={s.value} value={s.value}>{s.title}</option>)}
            </select>
          </label>
        </div>
        {inExam && counts.offline > 0 && <div className="qe-ops-attention">
          <FiAlertCircle aria-hidden="true" /> {counts.offline} active attempt{counts.offline === 1 ? "" : "s"} may have lost connection. Check recent activity before taking action.
        </div>}
        <div className="qe-ops-table-scroll" role="region" aria-label="Student attempts" tabIndex={0}>
          <table className="qe-ops-table">
            <thead><tr>
              <th>Student</th><th>Status</th>
              <th>{inExam ? "Last contact" : "Submitted at"}</th>
              <th>{inExam ? "Attempt controls" : "Attempt"}</th>
            </tr></thead>
            <tbody>
              {visibleStudents.map(student => <tr key={student.student_report_id}>
                <td><div className="qe-student-name">{student.student_name || "Unnamed student"}</div>
                  <span className="qe-student-sub">{student.roll_no || "—"}{student.email ? ` · ${student.email}` : ""}</span></td>
                <td><span className={`qe-attempt-status qe-attempt-status--${cleanStatus(student.student_status)}`}>
                  <span aria-hidden="true" />{student.student_status || "Unknown"}</span></td>
                <td className="qe-ops-time">
                  {inExam
                    ? (student.last_seen_at ? new Date(student.last_seen_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—")
                    : (student.submitted_at ? new Date(student.submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—")}
                </td>
                <td>{inExam && student.student_status === "in progress" ?
                  <div className="qe-attempt-controls">
                    <button type="button" disabled={working} onClick={() => control(student.student_report_id, "reset_session")}>Reset device</button>
                    {exam.timing_mode !== "time" && <button type="button" disabled={working}
                      onClick={() => control(student.student_report_id, "extend_time", 5)}>+5 min</button>}
                    <button type="button" className="qe-attempt-danger" disabled={working}
                      onClick={() => control(student.student_report_id, "revoke")}>Revoke</button>
                  </div> : <span className="qe-ops-placeholder">
                    {completedExam ? "Read-only" : "No action needed"}</span>}</td>
              </tr>)}
              {!visibleStudents.length && <tr><td colSpan={4} className="qe-empty-table">
                {students.length ? "No students match your search or status." : "No students have registered for this examination."}
              </td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <details className="qe-activity-details" open={activityOpen}
        onToggle={event => setActivityOpen(event.currentTarget.open)}>
        <summary className="qe-activity-summary">
          <span className="qe-activity-summary-icon"><FiActivity aria-hidden="true" /></span>
          <span><strong>Exam activity log</strong><small>Browser and attempt events · {activityOpen ? `${events.length} events loaded` : "Open to review"}</small></span>
          <span className="qe-activity-expand">{activityOpen ? "Hide" : "View"} activity</span>
        </summary>
        <div className="qe-activity-content">
          <div className="qe-activity-toolbar">
            <label className="qe-ops-search"><FiSearch aria-hidden="true" />
              <input type="search" aria-label="Search activity logs" placeholder="Search student or event"
                value={activitySearch} onChange={e => setActivitySearch(e.target.value)} />
            </label>
            <div className="qe-activity-actions">
              <span>{events.length} events · Latest 300 matches</span>
              {completedExam && !isDemo && <button type="button" className="qe-delete-log" disabled={working}
                onClick={clearActivity}>Delete activity log</button>}
            </div>
          </div>
          <div className="qe-ops-table-scroll qe-activity-scroll" role="region" aria-label="Exam activity" tabIndex={0}>
            <table className="qe-ops-table">
              <thead><tr><th>Student</th><th>Event</th><th>When</th></tr></thead>
              <tbody>
                {events.map((event, index) => <tr key={`${event.created_at}-${index}`}>
                  <td><div className="qe-student-name">{event.student_name || "Student"}</div>
                    <span className="qe-student-sub">{event.roll_no || "—"}</span></td>
                  <td><span className="qe-activity-kind">{String(event.kind || "event").replaceAll("_", " ")}</span></td>
                  <td className="qe-ops-time">{event.created_at ? new Date(event.created_at).toLocaleString("en-IN") : "—"}</td>
                </tr>)}
                {!events.length && <tr><td colSpan={3} className="qe-empty-table">No activity events found.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="qe-activity-note"><FiShield aria-hidden="true" />
            Browser activity is context for review, not definitive evidence of cheating.
            {completedExam ? " Deleting these logs will not change student results." : ""}
          </p>
        </div>
      </details>
    </>}

    {view === "results" && completedExam && <>
      <div className="qe-ops-heading qe-results-heading">
        <div>
          <span className="qe-overline">EXAMINATION REPORT</span>
          <h2>Results overview</h2>
          <p>Review recorded scores and manage when students can see their results.</p>
        </div>
        <span className={`qe-publish-state${exam.results_published ? " is-published" : ""}`}>
          {exam.results_published ? <FiCheckCircle aria-hidden="true" /> : <FiEyeOff aria-hidden="true" />}
          {exam.results_published ? "Published" : "Not published"}
        </span>
      </div>
      <div className="qe-insight-grid qe-results-insights">
        <Metric label="Submitted" value={counts.submitted} Icon={FiUsers} />
        <Metric label="Average score" value={scores.length ? `${average} / ${exam.total_marks}` : "—"} Icon={FiActivity} />
        <Metric label="Passed" value={passed} Icon={FiCheckCircle} accent="green" />
        <Metric label="Pass rate" value={passRate} Icon={FiAwardIcon} accent="blue" />
      </div>
      <div className="qe-publication-row">
        <span className="qe-publication-icon"><FiEye aria-hidden="true" /></span>
        <div><strong>Student result visibility</strong>
          <p>{exam.results_published ? "Results are available to students. You can hide them if needed." :
            "Results are currently private. Publish when marking and review are complete."}</p>
        </div>
        <button type="button" className={`qe-publish-button${exam.results_published ? " is-unpublish" : ""}`}
          disabled={working} onClick={publish}>
          {exam.results_published ? <FiEyeOff aria-hidden="true" /> : <FiCheck aria-hidden="true" />}
          {working ? "Updating…" : exam.results_published ? "Hide results" : "Publish results"}
        </button>
      </div>
    </>}
  </section>;
}
function FiAwardIcon(props) { return <FiActivity {...props} />; }
