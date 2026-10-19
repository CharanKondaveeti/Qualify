import {
  FiArrowLeft, FiArrowRight, FiAward, FiBookOpen, FiCalendar,
  FiCheckCircle, FiClock, FiEdit2, FiUsers, FiUser,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { isDemo } from "../../../lib/supabase";
import { useAdminWorkspace } from "../context/AdminWorkspaceContext";

const STATE = {
  upcoming: { label: "Upcoming", Icon: FiClock },
  active: { label: "Active", Icon: FiClock },
  completed: { label: "Completed", Icon: FiCheckCircle },
};

export default function ExamHeader({
  exam, showResponsibleStaff = false, responsibleStaff = null,
  studentCount = 0, canEdit = false, onNavigate,
}) {
  const navigate = useNavigate();
  const { institutionId } = useAdminWorkspace();
  const examsPath = isDemo ? "/demo/admin/exams"
    : `/app/i/${encodeURIComponent(institutionId)}/exams`;
  const status = STATE[exam.exam_status] ? exam.exam_status : "upcoming";
  const { Icon: StatusIcon, label } = STATE[status];
  const owner = responsibleStaff?.name || responsibleStaff?.email ||
    (exam.created_by ? "Staff unavailable" : "Not assigned");
  const primaryTab = canEdit ? "edit" : status === "completed" ? "results" : "students";
  const primaryLabel = canEdit ? "Edit exam" : status === "completed"
    ? "View results" : status === "active" ? "Monitor students" : "View students";

  return <header className={`qe-header qe-header--${status}`}>
    <div className="qe-header-top">
      <button type="button" className="qe-back"
        onClick={() => navigate(examsPath, { replace: true })}>
        <FiArrowLeft aria-hidden="true" /> All examinations
      </button>
      <span className="qe-header-context">EXAM DETAILS</span>
    </div>

    <div className="qe-header-main">
      <div className="qe-header-title">
        <span className="qe-subject"><FiBookOpen aria-hidden="true" />
          {exam.course || "Examination"}
        </span>
        <h1>{exam.title}</h1>
        {showResponsibleStaff && <div className="qe-responsible" title={responsibleStaff?.email || undefined}>
          <FiUser aria-hidden="true" /> In charge: <strong>{owner}</strong>
        </div>}
      </div>
      <div className="qe-header-aside">
        <span className={`qe-exam-status qe-exam-status--${status}`}>
          <StatusIcon aria-hidden="true" /> {label}
        </span>
        {onNavigate && <button type="button" className="qe-header-cta"
          onClick={() => onNavigate(primaryTab)}>
          {canEdit ? <FiEdit2 aria-hidden="true" /> : status === "completed"
            ? <FiAward aria-hidden="true" /> : <FiUsers aria-hidden="true" />}
          {primaryLabel} <FiArrowRight aria-hidden="true" />
        </button>}
      </div>
    </div>

    <div className="qe-header-facts">
      <div className="qe-header-fact">
        <span className="qe-fact-icon"><FiBookOpen aria-hidden="true" /></span>
        <span><strong>{exam.total_questions ?? 0}</strong><small>Questions</small></span>
      </div>
      <div className="qe-header-fact">
        <span className="qe-fact-icon"><FiAward aria-hidden="true" /></span>
        <span><strong>{exam.total_marks ?? 0}</strong><small>Total marks</small></span>
      </div>
      <div className="qe-header-fact">
        <span className="qe-fact-icon"><FiUsers aria-hidden="true" /></span>
        <span><strong>{studentCount}</strong><small>Registered students</small></span>
      </div>
    </div>
  </header>;
}
