import { useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./css/examRegistration.css";

export default function ExamRegistration() {
  const { examId } = useParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hallticket, setHallticket] = useState("");
  const [message, setMessage] = useState("");

  // Generate a short random ID (for json-server)
  const generateShortId = () => {
    return Math.random().toString(36).substr(2, 4); // e.g., "84c7"
  };

  // Simple student_exam_id generator (simulate auto-increment)
  const generateStudentExamId = () => Math.floor(Math.random() * 1000) + 100;

  const generateToken = (length = 8) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let token = "";
    for (let i = 0; i < length; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = generateToken();

    const newToken = {
      exam_id: parseInt(examId),
      email,
      token,
      is_used: false,
    };

    const studentExamReport = {
      student_exam_id: generateStudentExamId(),
      exam_id: parseInt(examId),
      student_name: name,
      hallticket: hallticket,
      email: email,
      marks_scored: 0,
      exam_status: "not started",
      answers: {},
      current_question: 0,
      started_at: "2025-05-04T00:00:00Z",
      completed_at: "2025-05-04T00:00:00Z",
      id: generateShortId(),
    };

    try {
      // await axios.post("http://localhost:5005/examTokens", newToken);
      await axios.post(
        "http://localhost:5004/StudentExamReport",
        studentExamReport
      );

      setMessage(`🎉 Registered successfully! Your token is: ${token}`);
    } catch (error) {
      setMessage("❌ Registration failed: " + error.message);
    }
  };

  return (
    <div className="exam-reg-container">
      <div className="exam-reg-card">
        <h2>Exam Registration</h2>
        <p className="exam-id-info">Exam ID: {examId}</p>
        <form onSubmit={handleSubmit}>
          <label>Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label>Hallticket</label>
          <input
            type="text"
            required
            value={hallticket}
            onChange={(e) => setHallticket(e.target.value)}
          />

          <label>Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button type="submit">Register</button>
        </form>

        {message && <div className="message">{message}</div>}
      </div>
    </div>
  );
}
