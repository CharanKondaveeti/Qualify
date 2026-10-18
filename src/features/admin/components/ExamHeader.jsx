import { FiArrowLeft, FiUser, FiClock, FiAward } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { isDemo } from "../../../lib/supabase";
import { useAdminWorkspace } from "../context/AdminWorkspaceContext";

// Presentation only. Scheduled time and timing rules are edited in the Edit tab.
export default function ExamHeader({ exam, showResponsibleStaff = false, responsibleStaff = null }) {
  const navigate = useNavigate();
  const { institutionId } = useAdminWorkspace();
  const examsPath = isDemo
    ? "/demo/admin/exams"
    : `/app/i/${encodeURIComponent(institutionId)}/exams`;
  return (
    <div className="exam-report-header">
      <button type="button" onClick={() => navigate(examsPath, { replace: true })} className="exam-report-back-btn">
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
            {showResponsibleStaff && (
              <span className="exam-report-meta-item" title={responsibleStaff?.email || undefined}>
                <FiUser className="exam-report-meta-icon" />
                Staff in charge: {responsibleStaff?.name || responsibleStaff?.email || (exam.created_by ? "Staff unavailable" : "Not assigned")}
              </span>
            )}
          </div>
        </div>
        <div className={`exam-report-status-chip ${exam.exam_status}`}>
          {exam.exam_status?.charAt(0).toUpperCase() + exam.exam_status?.slice(1)}
        </div>
      </div>
    </div>
  );
}
