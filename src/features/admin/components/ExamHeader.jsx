import {
  FiArrowLeft, FiArrowUpRight, FiAward, FiBookOpen, FiCheckCircle,
  FiClock, FiEdit3, FiPlayCircle, FiUser, FiUsers,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { isDemo } from "../../../lib/supabase";
import { useAdminWorkspace } from "../context/AdminWorkspaceContext";

const STATES = {
  upcoming: {
    label: "Upcoming",
    caption: "Scheduled and getting ready",
    description: "Prepare questions, registrations and timing before the examination opens.",
    Icon: FiClock,
  },
  active: {
    label: "In progress",
    caption: "Examination is underway",
    description: "Monitor student attempts and review live examination activity.",
    Icon: FiPlayCircle,
  },
  completed: {
    label: "Completed",
    caption: "Examination has closed",
    description: "Review recorded results, submissions and examination history.",
    Icon: FiCheckCircle,
  },
};

export default function ExamHeader({
  exam, showResponsibleStaff = false, responsibleStaff = null,
  studentCount = 0, canEdit = false, onNavigate,
}) {
  const navigate = useNavigate();
  const { institutionId } = useAdminWorkspace();
  const examsPath = isDemo
    ? "/demo/admin/exams"
    : `/app/i/${encodeURIComponent(institutionId)}/exams`;
  const status = STATES[exam.exam_status] ? exam.exam_status : "upcoming";
  const current = STATES[status];
  const StatusIcon = current.Icon;
  const responsibleName = responsibleStaff?.name || responsibleStaff?.email ||
    (exam.created_by ? "Staff unavailable" : "Not assigned");
  const targetTab = canEdit ? "edit" : status === "completed" ? "results" : "students";
  const actionLabel = canEdit ? "Edit exam setup" : status === "completed"
    ? "Review results" : status === "active" ? "Monitor students" : "View students";

  return <header className={`qe-header qe-header--${status}`}>
    <div className="qe-header-top">
      <button type="button" className="qe-back" onClick={() => navigate(examsPath, { replace: true })}>
        <FiArrowLeft aria-hidden="true" /> All examinations
      </button>
      <span className="qe-header-label"><span aria-hidden="true" /> QUALIFY EXAM WORKSPACE</span>
    </div>

    <div className="qe-header-main">
      <div className="qe-header-title">
        <div className="qe-header-eyebrow"><span aria-hidden="true" /> EXAMINATION OVERVIEW</div>
        <h1>{exam.title}</h1>
        <div className="qe-header-meta">
          <span className="qe-subject"><FiBookOpen aria-hidden="true" /> {exam.course || "Examination"}</span>
          {showResponsibleStaff && <span className="qe-responsible" title={responsibleStaff?.email || undefined}>
            <FiUser aria-hidden="true" /> In charge: <strong>{responsibleName}</strong>
          </span>}
        </div>
      </div>

      <div className="qe-header-status-panel">
        <span className="qe-header-status-eyebrow"><StatusIcon aria-hidden="true" /> CURRENT STAGE</span>
        <span className={`qe-exam-status qe-exam-status--${status}`}>
          <span aria-hidden="true" /> {current.label}
        </span>
        <strong>{current.caption}</strong>
        <p>{current.description}</p>
        {onNavigate && <button type="button" className="qe-header-cta" onClick={() => onNavigate(targetTab)}>
          {canEdit && <FiEdit3 aria-hidden="true" />}
          {actionLabel} <FiArrowUpRight aria-hidden="true" />
        </button>}
      </div>
    </div>

    <div className="qe-header-facts" aria-label="Exam at a glance">
      <button type="button" onClick={() => onNavigate?.("questions")} className="qe-header-fact">
        <span className="qe-fact-icon"><FiBookOpen aria-hidden="true" /></span>
        <span><strong>{exam.total_questions ?? 0}</strong><small>Questions</small></span>
        <FiArrowUpRight className="qe-fact-arrow" aria-hidden="true" />
      </button>
      <div className="qe-header-fact">
        <span className="qe-fact-icon"><FiAward aria-hidden="true" /></span>
        <span><strong>{exam.total_marks ?? 0}</strong><small>Total marks</small></span>
      </div>
      <button type="button" onClick={() => onNavigate?.("students")} className="qe-header-fact">
        <span className="qe-fact-icon"><FiUsers aria-hidden="true" /></span>
        <span><strong>{studentCount}</strong><small>Registered students</small></span>
        <FiArrowUpRight className="qe-fact-arrow" aria-hidden="true" />
      </button>
    </div>
  </header>;
}
