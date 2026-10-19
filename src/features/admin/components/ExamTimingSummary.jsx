import { FiAward, FiCalendar, FiClock, FiLogIn } from "react-icons/fi";
import { entryClosesAt } from "../../../utils/examTiming";

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" :
    date.toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
}

/** Four non-duplicated facts in the white strip of the exam hero. */
export default function ExamTimingSummary({ exam }) {
  const lastEntry = entryClosesAt(exam);
  const duration = Number(exam.duration_minutes);
  const metrics = [
    { label: "Exam time", value: formatDate(exam.scheduled_date), Icon: FiCalendar },
    { label: "Total marks", value: `${exam.total_marks ?? 0} marks`, Icon: FiAward },
    {
      label: "Duration",
      value: Number.isFinite(duration) && duration > 0
        ? `${duration} minutes${exam.timing_mode === "time" ? " (fixed)" : ""}`
        : "Not set",
      Icon: FiClock,
    },
    { label: "Last entry", value: formatDate(lastEntry), Icon: FiLogIn },
  ];
  return (
    <section className="qe-schedule" aria-label="Exam time, marks and entry information">
      <div className="qe-schedule-items">
        {metrics.map(({ label, value, Icon }) => (
          <div className="qe-schedule-item" key={label}>
            <span className="qe-schedule-icon"><Icon aria-hidden="true" /></span>
            <div><small>{label}</small><strong>{value}</strong></div>
          </div>
        ))}
      </div>
    </section>
  );
}
