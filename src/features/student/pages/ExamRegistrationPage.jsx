import "../styles/institution-student.css";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  publicExam,
  registerStudent,
  savePrivateToken,
  studentLink,
} from "../../../services/secureExamService";
import {
  FiCalendar,
  FiClock,
  FiBook,
  FiAward,
  FiUser,
  FiMail,
  FiHash,
} from "react-icons/fi";
import "../styles/registration-page.css";
import Loader from "../../../shared/components/ExamLoader";
import InstitutionBrand from "../../../shared/components/InstitutionBrand";
import { getPublicExamBranding } from "../../../services/institutionService";
import { isDemo } from "../../../lib/supabase";

export default function ExamRegistrationPage() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [institutionBranding, setInstitutionBranding] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hallticket, setHallticket] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [examLink, setExamLink] = useState("");

  useEffect(() => {
    async function fetchExam() {
      try {
        const examData = await publicExam(examId);
        if (!examData) throw new Error("Exam not found");
        setExam(examData);
        if (!isDemo) {
          getPublicExamBranding(examId)
            .then(setInstitutionBranding)
            .catch(() => {});
        }
      } catch {
        setMessage({ text: "Could not load exam details", type: "error" });
      } finally {
        setFetching(false);
      }
    }
    fetchExam();
  }, [examId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const registered = await registerStudent(examId, name, email, hallticket);
      savePrivateToken(registered.student_report_id, registered.access_token);
      setExamLink(
        studentLink(
          examId,
          registered.student_report_id,
          registered.access_token,
        ),
      );
      setMessage({
        text: "Registration successful. Save your personal exam link below.",
        type: "success",
      });
    } catch (error) {
      setMessage({
        text: `Registration failed: ${error.message}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
        <div className="registration-header">
          {institutionBranding?.name && (
            <div className="qualify-registration-institution">
              <InstitutionBrand
                name={institutionBranding.name}
                logoPath={institutionBranding.logo_path}
                subtitle="Examination portal"
              />
            </div>
          )}
          <h1>Exam Registration</h1>
          {/* <p className="exam-id">Exam ID: {examId}</p> */}
        </div>

        {exam ? (
          <div className="exam-details">
            <div className="detail-item">
              <FiBook className="detail-icon" />
              <div>
                <h3>{exam.title}</h3>
                <p>{exam.course}</p>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <FiCalendar className="detail-icon" />
                <div>
                  <p className="detail-label">Opens</p>
                  <p>{new Date(exam.scheduled_date).toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="detail-item">
                <FiClock className="detail-icon" />
                <div>
                  <p className="detail-label">
                    {exam.timing_mode === "time"
                      ? "Closes at"
                      : "Time per student"}
                  </p>
                  <p>
                    {exam.timing_mode === "time"
                      ? new Date(exam.ends_at).toLocaleString("en-IN")
                      : `${exam.duration_minutes} minutes after starting`}
                  </p>
                </div>
              </div>

              <div className="detail-item">
                <FiAward className="detail-icon" />
                <div>
                  <p className="detail-label">Total Marks</p>
                  <p>{exam.total_marks}</p>
                </div>
              </div>
            </div>
          </div>
        ) : fetching ? (
          <Loader />
        ) : (
          <p role="alert">
            Exam unavailable. Check the link with your instructor.
          </p>
        )}

        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-group">
            <label htmlFor="name">
              <FiUser className="input-icon" />
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="hallticket">
              <FiHash className="input-icon" />
              Hallticket Number
            </label>
            <input
              id="hallticket"
              type="text"
              required
              value={hallticket}
              onChange={(e) => setHallticket(e.target.value)}
              placeholder="Enter your hallticket number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <FiMail className="input-icon" />
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
            />
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={
              isLoading ||
              !exam ||
              !!examLink ||
              exam.exam_status !== "upcoming"
            }
          >
            {isLoading ? "Registering..." : "Register for Exam"}
          </button>
        </form>

        {message.text && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}
        {examLink && (
          <div>
            <p>
              <strong>Keep this private link safe.</strong> It is displayed
              once. Do not share it with other students. Email ownership is not
              verified by this basic registration form.
            </p>
            <a className="demo-link" href={examLink}>
              Open your exam →
            </a>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(examLink)}
            >
              Copy private exam link
            </button>
          </div>
        )}

        {/* <div className="registration-footer">
          <p>Need help? Contact exam support at support@examsystem.edu</p>
        </div> */}
      </div>
    </div>
  );
}
