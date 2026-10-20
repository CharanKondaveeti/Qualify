import { FiArrowLeft, FiBookOpen, FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { isDemo } from "../../../lib/supabase";
import { useAdminWorkspace } from "../context/AdminWorkspaceContext";
import ExamTimingSummary from "./ExamTimingSummary";

const STATUS_LABELS = { upcoming: "Upcoming", active: "In progress", completed: "Completed" };

/** Shared exam overview for upcoming, active, and completed examinations. */
export default function ExamHeader({
  exam, showResponsibleStaff = false, responsibleStaff = null, managementControls = null,
}) {
  const navigate = useNavigate();
  const { institutionId } = useAdminWorkspace();
  const examsPath = isDemo ? "/demo/admin/exams"
    : `/app/i/${encodeURIComponent(institutionId)}/exams`;
  const status = STATUS_LABELS[exam.exam_status] ? exam.exam_status : "upcoming";
  const owner = responsibleStaff?.name || responsibleStaff?.email ||
    (exam.created_by ? "Staff unavailable" : "Not assigned");

  return <header className={`qe-header qe-header--${status}`}>
    <div className="qe-header-top">
      <button type="button" className="qe-back"
        onClick={() => navigate(examsPath, { replace: true })}>
        <FiArrowLeft aria-hidden="true" /> Back to Exams
      </button>
      {managementControls && <div className="qe-header-top-actions">{managementControls}</div>}
    </div>
    <div className="qe-header-main">
      <div className="qe-header-title">
        <h1>{String(exam.title || "").replace(/\s+[—–-]\s+(?:Upcoming|Active|Completed)\s*$/i, "")}</h1>
        <div className="qe-header-meta">
          <span><FiBookOpen aria-hidden="true" /> {exam.course || "Examination"}</span>
          {showResponsibleStaff && <span title={responsibleStaff?.email || undefined}>
            <FiUser aria-hidden="true" /> Staff in charge: <strong>{owner}</strong>
          </span>}
        </div>
      </div>
      <span className={`qe-exam-status qe-exam-status--${status}`}>
        <span className="qe-status-dot" aria-hidden="true" />{STATUS_LABELS[status]}
      </span>
    </div>
    <ExamTimingSummary exam={exam} />
  </header>;
}
