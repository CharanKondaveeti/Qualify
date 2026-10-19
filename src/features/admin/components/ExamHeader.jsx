import { FiArrowLeft, FiAward, FiBookOpen, FiCalendar, FiUser, FiUsers } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { isDemo } from "../../../lib/supabase";
import { useAdminWorkspace } from "../context/AdminWorkspaceContext";

function formatDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled" :
    date.toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
}

const STATUS_LABELS = { upcoming: "Upcoming", active: "In progress", completed: "Completed" };

/** A familiar, concise exam hero inspired by the original Qualify layout. */
export default function ExamHeader({
  exam, showResponsibleStaff = false, responsibleStaff = null,
  studentCount = 0,
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
      <span className="qe-header-context">EXAM WORKSPACE</span>
    </div>
    <div className="qe-header-main">
      <div className="qe-header-title">
        <h1>{exam.title}</h1>
        <div className="qe-header-meta">
          <span><FiBookOpen aria-hidden="true" /> {exam.course || "Examination"}</span>
          <span><FiCalendar aria-hidden="true" /> {formatDate(exam.scheduled_date)}</span>
          <span><FiAward aria-hidden="true" /> {exam.total_marks ?? 0} marks</span>
          {showResponsibleStaff && <span title={responsibleStaff?.email || undefined}>
            <FiUser aria-hidden="true" /> Staff in charge: <strong>{owner}</strong>
          </span>}
          <span className="qe-header-registered"><FiUsers aria-hidden="true" /> {studentCount} students</span>
        </div>
      </div>
      <span className={`qe-exam-status qe-exam-status--${status}`}>
        <span className="qe-status-dot" aria-hidden="true" />{STATUS_LABELS[status]}
      </span>
    </div>
  </header>;
}
