import { FiArrowLeft, FiUser, FiClock, FiAward } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

// Presentation only. Scheduled time and timing rules are edited in the Edit tab.
export default function ExamHeader({ exam }) {
  const navigate = useNavigate();
  return (
    <div className="exam-report-header">
      <button type="button" onClick={() => navigate(-1)} className="exam-report-back-btn">
        <FiArrowLeft className="exam-report-icon-left" />
        Back to Exams
      </button>
      <div className="exam-report-exam-header">
        <div>
          <h1 className="exam-report-exam-title">{exam.title}</h1>
          <div className="exam-report-exam-meta">
            <span className="exam-report-meta-item">
              <FiUser className="exam-report-meta-icon" />{exam.course}
            </span>
            <span className="exam-report-meta-item">
              <FiClock className="exam-report-meta-icon" />
              {new Date(exam.scheduled_date).toLocaleString("en-IN")}
            </span>
            <span className="exam-report-meta-item">
              <FiAward className="exam-report-meta-icon" />{exam.total_marks} marks
            </span>
          </div>
        </div>
        <div className={`exam-report-status-chip ${exam.exam_status}`}>
          {exam.exam_status?.charAt(0).toUpperCase() + exam.exam_status?.slice(1)}
        </div>
      </div>
    </div>
  );
}
