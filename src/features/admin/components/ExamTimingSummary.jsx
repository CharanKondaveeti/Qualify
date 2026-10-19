import { FiCalendar, FiCheck, FiClock, FiInfo, FiLogIn } from "react-icons/fi";

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" :
    date.toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
}

const STAGES = [
  { id: "upcoming", label: "Scheduled" },
  { id: "active", label: "In progress" },
  { id: "completed", label: "Completed" },
];

export default function ExamTimingSummary({ exam }) {
  const fixed = exam.timing_mode === "time";
  const startTime = new Date(exam.scheduled_date).getTime();
  const entryMinutes = Number(exam.entry_window_minutes ?? 30);
  const lastEntry = Number.isFinite(startTime)
    ? new Date(startTime + (Number.isFinite(entryMinutes) ? entryMinutes : 30) * 60000)
    : null;
  const metrics = [
    { label: "Exam starts", value: formatDate(exam.scheduled_date), Icon: FiCalendar },
    fixed
      ? { label: "Scheduled closing", value: formatDate(exam.ends_at), Icon: FiClock }
      : { label: "Time per student", value: `${exam.duration_minutes} minutes`, Icon: FiClock },
    { label: "Last entry", value: formatDate(lastEntry), Icon: FiLogIn },
  ];
  const stage = Math.max(0, STAGES.findIndex(item => item.id === exam.exam_status));

  return <section className="qe-schedule" aria-label="Exam schedule and progress">
    <div className="qe-schedule-head">
      <div className="qe-schedule-heading">
        <span className="qe-schedule-emblem"><FiCalendar aria-hidden="true" /></span>
        <div>
          <span className="qe-schedule-eyebrow">EXAMINATION TIMELINE</span>
          <h2>Schedule &amp; progress</h2>
        </div>
      </div>
      <span className="qe-schedule-type">{fixed ? "Fixed closing time" : "Individual student timers"}</span>
    </div>

    <div className="qe-schedule-layout">
      <div className="qe-schedule-items">
        {metrics.map(({ label, value, Icon }) => (
          <div className="qe-schedule-item" key={label}>
            <span className="qe-schedule-icon"><Icon aria-hidden="true" /></span>
            <div><small>{label}</small><strong>{value}</strong></div>
          </div>
        ))}
      </div>
      <div className="qe-schedule-journey" aria-label="Exam lifecycle">
        <span className="qe-journey-title">EXAM LIFECYCLE</span>
        <ol className="qe-journey-steps">
          {STAGES.map((item, index) => <li key={item.id}
            className={`qe-journey-step${index < stage ? " is-past" : ""}${index === stage ? " is-current" : ""}`}
            aria-current={index === stage ? "step" : undefined}>
            <span className="qe-journey-node" aria-hidden="true">{index < stage ? <FiCheck /> : index + 1}</span>
            <span>{item.label}</span>
          </li>)}
        </ol>
      </div>
    </div>

    <p className="qe-schedule-note"><FiInfo aria-hidden="true" />
      {fixed ? "Students share the scheduled closing time, even when joining late." :
        "Each student's timer begins when they start the examination."}
      {exam.emergency_stopped_at ? " The examination was stopped early." : ""}
    </p>
  </section>;
}
