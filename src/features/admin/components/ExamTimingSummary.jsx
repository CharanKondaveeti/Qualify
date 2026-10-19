import { FiCalendar, FiClock, FiLogIn, FiInfo } from "react-icons/fi";

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" :
    date.toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
}

/** Compact exam timetable: no decorative progress track or duplicated status. */
export default function ExamTimingSummary({ exam }) {
  const fixed = exam.timing_mode === "time";
  const startTime = new Date(exam.scheduled_date).getTime();
  const entryMinutes = Number(exam.entry_window_minutes ?? 30);
  const lastEntry = Number.isFinite(startTime)
    ? new Date(startTime + (Number.isFinite(entryMinutes) ? entryMinutes : 30) * 60000)
    : null;
  const metrics = [
    { label: "Starts at", value: formatDate(exam.scheduled_date), Icon: FiCalendar },
    fixed
      ? { label: "Closes at", value: formatDate(exam.ends_at), Icon: FiClock }
      : { label: "Duration", value: `${exam.duration_minutes} minutes / student`, Icon: FiClock },
    { label: "Last entry", value: formatDate(lastEntry), Icon: FiLogIn },
  ];

  return <section className="qe-schedule" aria-label="Exam schedule">
    <div className="qe-schedule-head">
      <h2>Exam schedule</h2>
      <span className="qe-schedule-type">{fixed ? "Fixed-time examination" : "Individual student timers"}</span>
    </div>
    <div className="qe-schedule-items">
      {metrics.map(({ label, value, Icon }) => (
        <div className="qe-schedule-item" key={label}>
          <span className="qe-schedule-icon"><Icon aria-hidden="true" /></span>
          <div><small>{label}</small><strong>{value}</strong></div>
        </div>
      ))}
    </div>
    <p className="qe-schedule-note"><FiInfo aria-hidden="true" />
      {fixed ? "Students share the same scheduled closing time." :
        "Each student's timer begins when they start."}
      {exam.emergency_stopped_at ? " This exam was stopped early." : ""}
    </p>
  </section>;
}
