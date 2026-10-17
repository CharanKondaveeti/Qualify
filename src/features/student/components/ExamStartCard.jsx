import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiInfo,
  FiLock,
  FiShield,
  FiAlertCircle,
} from "react-icons/fi";
import { getPublicExamBranding } from "../../../services/institutionService";
import { isDemo } from "../../../lib/supabase";
import { formatTime } from "../../../utils/formatTime";
import InstitutionBrand from "../../../shared/components/InstitutionBrand";
import "../styles/institution-student.css";
import "../styles/exam-start-card.css";

function formatDateTime(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function ExamStartCard({
  studentExamDetails,
  startCountdown,
  handleStartExam,
  disabled,
  accepted,
  onAcceptedChange,
  entryClosed,
  busy,
  error,
}) {
  const { examId } = useParams();
  const [institutionBranding, setInstitutionBranding] = useState(null);

  useEffect(() => {
    let active = true;
    if (isDemo || !examId) return undefined;
    getPublicExamBranding(examId)
      .then((value) => {
        if (active) setInstitutionBranding(value);
      })
      .catch(() => {
        if (active) setInstitutionBranding(null);
      });
    return () => {
      active = false;
    };
  }, [examId]);

  const {
    exam_status: status,
    title,
    subject,
    scheduled_date,
    duration_minutes,
    timing_mode,
    ends_at,
    last_entry_at,
  } = studentExamDetails;
  const fixedTime = timing_mode === "time";
  const upcoming = status === "upcoming";
  const active = status === "active";
  const completed = status === "completed";
  const canStart = active && !disabled && !entryClosed;

  return (
    <main className="qualify-start-page">
      <div className="qualify-start-shell">
        <header className="qualify-start-topbar">
          <div className="qualify-start-brand">
            <span className="qualify-start-brand-icon">
              <FiBookOpen aria-hidden="true" />
            </span>
            <span>
              QUALIFY <small>Examination portal</small>
            </span>
          </div>
          <span className="qualify-start-secure">
            <FiLock aria-hidden="true" /> Secure exam access
          </span>
        </header>

        <section
          className="qualify-start-card"
          aria-label="Exam details and instructions"
        >
          <div className="qualify-start-titlebar">
            <div>
              {institutionBranding?.name && (
                <div className="qualify-start-institution">
                  <InstitutionBrand
                    name={institutionBranding.name}
                    logoPath={institutionBranding.logo_path}
                  />
                </div>
              )}
              <p className="qualify-start-eyebrow">EXAMINATION INSTRUCTIONS</p>
              <h1>{title || "Examination"}</h1>
              {subject && <p className="qualify-start-subject">{subject}</p>}
            </div>
            <span
              className={`qualify-start-status qualify-start-status--${status || "upcoming"}`}
            >
              <span aria-hidden="true" className="qualify-start-dot" />
              {upcoming
                ? "Upcoming"
                : active
                  ? "Ready to begin"
                  : completed
                    ? "Completed"
                    : "Exam status"}
            </span>
          </div>

          <div className="qualify-start-stats">
            <div className="qualify-start-stat">
              <FiCalendar aria-hidden="true" />
              <div>
                <span>Opens on</span>
                <strong>{formatDateTime(scheduled_date)}</strong>
              </div>
            </div>
            <div className="qualify-start-stat">
              <FiClock aria-hidden="true" />
              <div>
                <span>{fixedTime ? "Closes on" : "Time per student"}</span>
                <strong>
                  {fixedTime
                    ? formatDateTime(ends_at)
                    : `${duration_minutes} minutes`}
                </strong>
              </div>
            </div>
            <div className="qualify-start-stat">
              <FiShield aria-hidden="true" />
              <div>
                <span>{last_entry_at ? "Last entry" : "Exam timing"}</span>
                <strong>
                  {last_entry_at
                    ? formatDateTime(last_entry_at)
                    : fixedTime
                      ? "Fixed closing time"
                      : "Duration-based"}
                </strong>
              </div>
            </div>
          </div>

          <div className="qualify-start-main">
            <section
              className="qualify-start-instructions"
              aria-labelledby="qualify-start-rules"
            >
              <div className="qualify-start-section-heading">
                <FiInfo aria-hidden="true" />
                <div>
                  <h2 id="qualify-start-rules">Before you begin</h2>
                  <p>Please read the following instructions carefully.</p>
                </div>
              </div>
              <ol className="qualify-start-rules">
                <li>
                  {fixedTime
                    ? `The exam closes at ${formatDateTime(ends_at)}. Starting late reduces the time available.`
                    : `You receive ${duration_minutes} minutes from the moment you start your exam.`}
                </li>
                <li>
                  Answer your questions within the allotted time. Use the
                  question palette to navigate.
                </li>
                <li>
                  Your answers are saved automatically. Keep this page open
                  until submission is confirmed.
                </li>
                <li>
                  Tab switches, fullscreen exits and copy attempts may be
                  recorded by the exam system.
                </li>
              </ol>
              <div className="qualify-start-note">
                <FiShield aria-hidden="true" /> Your responses are linked to
                your private exam session.
              </div>
            </section>

            <aside
              className="qualify-start-action-panel"
              aria-label="Start exam controls"
            >
              <h2>Exam readiness</h2>
              {upcoming && (
                <div
                  className="qualify-start-readiness"
                  role="status"
                  aria-live="off"
                >
                  <span className="qualify-start-readiness-label">
                    Exam begins in
                  </span>
                  <strong className="qualify-start-countdown">
                    {formatTime(Math.max(0, startCountdown))}
                  </strong>
                  <span className="qualify-start-readiness-desc">
                    You can begin when the exam opens.
                  </span>
                </div>
              )}
              {active && !entryClosed && (
                <div
                  className="qualify-start-readiness qualify-start-readiness--active"
                  role="status"
                >
                  <FiCheckCircle aria-hidden="true" />
                  <strong>The exam is open</strong>
                  <span>You may begin after accepting the instructions.</span>
                </div>
              )}
              {(completed || entryClosed) && (
                <div
                  className="qualify-start-readiness qualify-start-readiness--closed"
                  role="status"
                >
                  <FiAlertCircle aria-hidden="true" />
                  <strong>
                    {completed
                      ? "The exam has ended"
                      : "The entry window has closed"}
                  </strong>
                  <span>
                    {completed
                      ? "You can no longer start this exam."
                      : "Starting a new attempt is no longer permitted."}
                  </span>
                </div>
              )}
              {!completed && !entryClosed && (
                <label className="qualify-start-consent">
                  <input
                    type="checkbox"
                    checked={Boolean(accepted)}
                    onChange={(event) => onAcceptedChange(event.target.checked)}
                  />
                  <span>
                    I have read the exam instructions and agree to the
                    monitoring of tab switches, fullscreen exits and copy
                    attempts.
                  </span>
                </label>
              )}
              {active && !entryClosed && (
                <button
                  className="qualify-start-button"
                  onClick={handleStartExam}
                  disabled={!canStart}
                  type="button"
                >
                  {busy ? "Starting exam…" : "Begin Exam"}
                </button>
              )}
              {upcoming && (
                <div className="qualify-start-muted-action">
                  Begin Exam will be available when the exam opens.
                </div>
              )}
              {error && (
                <p className="qualify-start-error" role="alert">
                  {error}
                </p>
              )}
              <p className="qualify-start-help">
                <FiLock aria-hidden="true" /> Do not share your private exam
                link.
              </p>
            </aside>
          </div>
        </section>
        <footer className="qualify-start-footer">
          QUALIFY Examination Portal · Secure student access
        </footer>
      </div>
    </main>
  );
}

export default ExamStartCard;
