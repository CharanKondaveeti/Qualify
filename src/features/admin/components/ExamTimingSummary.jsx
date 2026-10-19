import { FiAward, FiCalendar, FiClock, FiInfo, FiLogIn } from "react-icons/fi";

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" :
    date.toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
}

export default function ExamTimingSummary({ exam }) {
  const fixed = exam.timing_mode === "time";
  const startTime = new Date(exam.scheduled_date).getTime();
  const entryMinutes = Number(exam.entry_window_minutes ?? 30);
  const lastEntry = Number.isFinite(startTime)
    ? new Date(startTime + (Number.isFinite(entryMinutes) ? entryMinutes : 30) * 60000)
    : null;
  const metrics = [
    { label: "Opens on", value: formatDate(exam.scheduled_date), Icon: FiCalendar },
    fixed
      ? { label: "Scheduled closing", value: formatDate(exam.ends_at), Icon: FiClock }
      : { label: "Duration per student", value: `${exam.duration_minutes} minutes`, Icon: FiClock },
    { label: "Last entry", value: formatDate(lastEntry), Icon: FiLogIn },
    { label: "Total marks", value: `${exam.total_marks ?? 0} marks`, Icon: FiAward },
  ];

  return <section className="qe-schedule" aria-label="Exam timing">
    <div className="qe-schedule-layout">
      <div className="qe-schedule-intro">
        <span className="qe-schedule-intro-icon"><FiClock aria-hidden="true" /></span>
        <div>
          <h2>Exam timing</h2>
          <p>{fixed ? "All students share the same examination closing time." :
            "Each student receives their own timed attempt."}</p>
        </div>
      </div>
      <div className="qe-schedule-items">
        {metrics.map(({ label, value, Icon }) => (
          <div className="qe-schedule-item" key={label}>
            <span className="qe-schedule-icon"><Icon aria-hidden="true" /></span>
            <div><small>{label}</small><strong>{value}</strong></div>
          </div>
        ))}
      </div>
    </div>
    <p className="qe-schedule-note"><FiInfo aria-hidden="true" />
      {fixed ? "Late entries do not extend the shared closing time." :
        "A student's timer starts when they begin. Approved time extensions apply only to that student."}
      {exam.emergency_stopped_at ? " This exam was stopped early." : ""}
    </p>
  </section>;
}
