import { FiCheckCircle } from "react-icons/fi";

function ExamSubmitted() {
  return (
    <div className="exam-status-container">
      <div className="exam-status-card success">
        <FiCheckCircle className="status-icon" />
        <h2>Exam Submitted Successfully</h2>
        <p>Your answers have been recorded. You can now close this window.</p>
      </div>
    </div>
  );
}

export default ExamSubmitted;
