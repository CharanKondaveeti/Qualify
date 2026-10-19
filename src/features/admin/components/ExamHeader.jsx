import { FiArrowLeft, FiBookOpen, FiUser, FiUsers, FiAward } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { isDemo } from "../../../lib/supabase";
import { useAdminWorkspace } from "../context/AdminWorkspaceContext";

/** Compact exam identity. Schedule and actions follow in their own sections. */
export default function ExamHeader({ exam, showResponsibleStaff = false, responsibleStaff = null, studentCount = 0 }) {
  const navigate = useNavigate();
  const { institutionId } = useAdminWorkspace();
  const examsPath = isDemo
    ? "/demo/admin/exams"
    : `/app/i/${encodeURIComponent(institutionId)}/exams`;

  const status = exam.exam_status || "upcoming";
  const responsibleName = responsibleStaff?.name || responsibleStaff?.email ||
    (exam.created_by ? "Staff unavailable" : "Not assigned");

  return <header className="qe-header">
    <div className="qe-header-top">
      <button type="button" className="qe-back" onClick={() => navigate(examsPath, { replace: true })}>
        <FiArrowLeft aria-hidden="true" /> All examinations
      </button>
      <span className="qe-header-label">EXAM WORKSPACE</span>
    </div>
    <div className="qe-header-main">
      <div className="qe-header-title">
        <div className="qe-subject"><FiBookOpen aria-hidden="true" /> {exam.course || "Examination"}</div>
        <h1>{exam.title}</h1>
        {showResponsibleStaff && <div className="qe-responsible" title={responsibleStaff?.email || undefined}>
          <FiUser aria-hidden="true" /> In charge: <strong>{responsibleName}</strong>
        </div>}
      </div>
      <span className={`qe-exam-status qe-exam-status--${status}`}>
        <span aria-hidden="true" />{status === "active" ? "In progress" : status === "completed" ? "Completed" : "Upcoming"}
      </span>
    </div>
    <div className="qe-header-facts">
      <span><FiBookOpen aria-hidden="true" /><strong>{exam.total_questions ?? 0}</strong> Questions</span>
      <span><FiAward aria-hidden="true" /><strong>{exam.total_marks ?? 0}</strong> Marks</span>
      <span><FiUsers aria-hidden="true" /><strong>{studentCount}</strong> Registered students</span>
    </div>
  </header>;
}
