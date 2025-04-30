import { formatTime } from "../../helper/formatTime";
import "./css/examStartCard.css";

function ExamStartCard({
  studentExamDetails,
  startCountdown,
  handleStartExam,
}) {
  const { exam_status, title, subject, duration_minutes } = studentExamDetails;

  return (
    <div className="exam-status-container">
      <div className="exam-status-card ready">
        <h2>Exam Status</h2>

        <div className="exam-details-preview">
          <div>
            <strong>Title:</strong> {title}
          </div>
          <div>
            <strong>Subject:</strong> {subject}
          </div>
          <div>
            <strong>Duration:</strong> {duration_minutes} minutes
          </div>
        </div>

        {/* Status-specific display */}
        {exam_status === "upcoming" && (
          <div className="exam-countdown">
            <h3>Exam starts in: {formatTime(startCountdown)}</h3>
          </div>
        )}

        {exam_status === "active" && (
          <button onClick={handleStartExam} className="start-exam-button pulse">
            Begin Exam Now
          </button>
        )}

        {(exam_status === "completed") && (
          <div className="exam-expired-message">
            <h3>Exam is expired</h3>
          </div>
        )}

        {/* Instructions always shown */}
        <div className="exam-instructions">
          <h3>Instructions:</h3>
          <ul>
            <li>
              You will have {duration_minutes} minutes to complete the exam
            </li>
            <li>All questions must be answered within the time limit</li>
            <li>
              Developer tools, copy/paste, right click, and shortcuts are
              disabled
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ExamStartCard;
