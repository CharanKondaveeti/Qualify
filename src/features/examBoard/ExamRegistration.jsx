import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import supabase from "../../services/supabase";
import {
  FiCalendar,
  FiClock,
  FiBook,
  FiAward,
  FiUser,
  FiMail,
  FiHash,
} from "react-icons/fi";
import "./css/examRegistration.css";

async function getExam(exam_id) {
  let { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("exam_id", exam_id);

  if (error) {
    throw new Error("Exams could not be loaded");
  }
  return data[0];
}

export default function ExamRegistration() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hallticket, setHallticket] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchExam() {
      try {
        const examData = await getExam(examId);
        setExam(examData);
      } catch (error) {
        setMessage({ text: "Could not load exam details", type: "error" });
      }
    }
    fetchExam();
  }, [examId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("exam_id, status")
        .eq("exam_id", examId)
        .single();

      if (examError) throw examError;

      if (examData.status !== "upcoming") {
        setMessage({
          text: "Registration is only available for upcoming exams",
          type: "error",
        });
        setIsLoading(false);
        return;
      }

      const { data: existing, error: checkError } = await supabase
        .from("studentReport")
        .select("student_report_id")
        .eq("exam_id", examId)
        .or(`email.eq.${email},roll_no.eq.${hallticket}`);

      if (checkError) throw checkError;

      if (existing?.length > 0) {
        setMessage({
          text: "You're already registered for this exam",
          type: "error",
        });
        setIsLoading(false);
        return;
      }

      const newStudentReport = {
        exam_id: examId,
        student_name: name,
        roll_no: hallticket,
        email: email,
        marks_scored: 0,
        exam_status: "not started",
        answers: {},
      };

      const { data, error } = await supabase
        .from("studentReport")
        .insert([newStudentReport])
        .select();

      if (error) throw error;

      const token = data[0].student_report_id;
      setMessage({
        text: `Exam link: http://localhost:5173/exams/${examId}/student/${token}`,
        type: "success",
      });

      // In a real app, you would send this link via email
      console.log(
        `Exam link: http://localhost:5173/exams/${examId}/student/${token}`
      );
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
                  <p className="detail-label">Date</p>
                  <p>{new Date(exam.scheduled_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="detail-item">
                <FiClock className="detail-icon" />
                <div>
                  <p className="detail-label">Duration</p>
                  <p>{exam.duration_minutes} minutes</p>
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
        ) : (
          <div className="loading-placeholder">
            <div className="loading-animation"></div>
            <p>Loading exam details...</p>
          </div>
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

          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? "Registering..." : "Register for Exam"}
          </button>
        </form>

        {message.text && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        {/* <div className="registration-footer">
          <p>Need help? Contact exam support at support@examsystem.edu</p>
        </div> */}
      </div>
    </div>
  );
}


// setMessage(
//   `✅ Registered! Start exam at: http://localhost:5173/exams/${examId}/student/${token}`
// );