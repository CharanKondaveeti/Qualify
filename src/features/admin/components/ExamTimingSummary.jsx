import { FiAward, FiCalendar, FiClock, FiLogIn } from "react-icons/fi";

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not set"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function ExamTimingSummary({ exam }) {
  const fixedTime = exam.timing_mode === "time";
  const startTime = new Date(exam.scheduled_date).getTime();
  const entryMinutes = Number(exam.entry_window_minutes ?? 30);
  const lastEntry = Number.isFinite(startTime)
    ? new Date(startTime + (Number.isFinite(entryMinutes) ? entryMinutes : 30) * 60000)
    : null;

  const metrics = [
    { label: "Opens on", value: formatDate(exam.scheduled_date), Icon: FiCalendar },
    fixedTime
      ? { label: "Closes on", value: formatDate(exam.ends_at), Icon: FiClock }
      : { label: "Duration per student", value: `${exam.duration_minutes} minutes`, Icon: FiClock },
    { label: "Last entry", value: formatDate(lastEntry), Icon: FiLogIn },
    { label: "Total marks", value: `${exam.total_marks} marks`, Icon: FiAward },
  ];

  return (
    <section className="qualify-timing-summary" aria-label="Exam timing summary">
      <div className="qualify-timing-summary__line">
        <div className="qualify-timing-summary__identity">
          <span className="qualify-timing-summary__lead-icon" aria-hidden="true">
            <FiClock />
          </span>
          <div className="qualify-timing-summary__identity-copy">
            <h2>Exam timing</h2>
            <p>{fixedTime ? "Fixed start and closing time for everyone." : "Each student receives their own timed attempt."}</p>
          </div>
        </div>
        <div className="qualify-timing-summary__metrics">
          {metrics.map(({ label, value, Icon }) => (
            <div className="qualify-timing-summary__metric" key={label}>
              <span className="qualify-timing-summary__metric-icon" aria-hidden="true"><Icon /></span>
              <div>
                <span className="qualify-timing-summary__label">{label}</span>
                <strong>{value}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="qualify-timing-summary__notice">
        {fixedTime
          ? "Everyone finishes at the scheduled closing time. Late arrivals only receive the remaining time."
          : "Each student's timer begins when they start. Approved extensions apply to that student only."}
      </p>
      {exam.emergency_stopped_at && (
        <p className="qualify-timing-summary__stopped" role="status">
          This exam was ended early by a Super Admin.
        </p>
      )}
    </section>
  );
}
