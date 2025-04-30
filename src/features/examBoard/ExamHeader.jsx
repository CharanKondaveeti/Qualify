import { FiClock, FiUser } from "react-icons/fi";
import { formatTime } from "../../helper/formatTime";
import "./css/examHeader.css"

function ExamHeader({ studentExamDetails, timeLeft }) {
  return (
    <div className="examBoard__exam-header">
      <div className="examBoard__exam-meta">
        <div className="examBoard__student-details">
          <div className="examBoard__student-info">
            <StudentInfoRow
              label="Name"
              value={studentExamDetails.studentName}
            />
            <StudentInfoRow label="Roll No" value={studentExamDetails.rollNo} />
            <StudentInfoRow label="Email" value={studentExamDetails.email} />
          </div>
        </div>
      </div>

      <div className="examBoard__exam-title">
        <h1>{studentExamDetails.title}</h1>
        <div className="examBoard__exam-subject">
          {studentExamDetails.subject}
        </div>
      </div>

      <div
        className={`examBoard__time-remaining ${
          timeLeft <= 300 ? "warning" : ""
        }`}
      >
        <FiClock className="examBoard__timer-icon" />
        <span className="examBoard__timer-text">{formatTime(timeLeft)}</span>
      </div>
    </div>
  );
}

function StudentInfoRow({ label, value }) {
  return (
    <div className="examBoard__student-row">
      <span className="examBoard__student-label">{label}:</span>
      <span className="examBoard__student-value">{value}</span>
    </div>
  );
}

export default ExamHeader;
