import { FiClock, FiMaximize2 } from "react-icons/fi";
import { formatTime } from "../../../utils/formatTime";
import "../styles/exam-header.css";

function ExamHeader({ studentExamDetails, timeLeft, onEnterFullscreen }) {
  const studentName = studentExamDetails.studentName || "Student";
  const initial = studentName.trim().charAt(0).toUpperCase() || "S";

  return (
    <header className="examBoard__exam-header">
      <div className="examBoard__student-details">
        <span className="examBoard__avatar" aria-hidden="true">{initial}</span>
        <div className="examBoard__student-info">
          <StudentInfoRow label="Name" value={studentName} />
          <StudentInfoRow label="Roll No" value={studentExamDetails.rollNo} />
          <StudentInfoRow label="Email" value={studentExamDetails.email} />
        </div>
      </div>

      <div className="examBoard__exam-title">
        <span className="examBoard__exam-caption">Examination</span>
        <h1>{studentExamDetails.title}</h1>
        {studentExamDetails.subject && (
          <div className="examBoard__exam-subject">{studentExamDetails.subject}</div>
        )}
      </div>

      <div className="examBoard__header-actions">
        <div className={`examBoard__time-remaining ${timeLeft <= 300 ? "warning" : ""}`}>
          <FiClock className="examBoard__timer-icon" aria-hidden="true" />
          <div className="examBoard__timer-details">
            <span className="examBoard__timer-label">Time remaining</span>
            <time className="examBoard__timer-text">{formatTime(timeLeft)}</time>
          </div>
        </div>
        <button type="button" className="examBoard__fullscreen" onClick={onEnterFullscreen}>
          <FiMaximize2 aria-hidden="true" />
          <span>Enter fullscreen</span>
        </button>
      </div>
    </header>
  );
}

function StudentInfoRow({ label, value }) {
  return (
    <div className="examBoard__student-row">
      <span className="examBoard__student-label">{label}:</span>
      <span className="examBoard__student-value">{value || "—"}</span>
    </div>
  );
}

export default ExamHeader;
