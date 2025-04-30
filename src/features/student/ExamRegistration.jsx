import { useState } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import "./css/examRegistration.css";
import supabase from "../../services/supabase";

// Supabase setup
export default function ExamRegistration() {
  const { examId } = useParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hallticket, setHallticket] = useState("");
  const [message, setMessage] = useState("");

const handleSubmit = async (e) => {
  e.preventDefault();

  const newStudentReport = {
    exam_id: examId,
    student_name: name,
    roll_no: hallticket,
    email: email,
    marks_scored: 0,
    exam_status: "not started",
    answers: {},
    current_question: null,
  };

  try {
    const { data, error } = await supabase
      .from("studentReport")
      .insert([newStudentReport])
      .select();

    if (error) {
      throw error;
    }
const token = data[0].student_report_id;
    setMessage(`http://localhost:5173/exams/${examId}/student/${token}`);
  } catch (error) {
    setMessage("❌ Registration failed: " + error.message);
  }
};


  return (
    <div className="exam-reg-container">
      <div className="exam-reg-card">
        <h2>Exam Registration</h2>
        <p className="exam-id-info">Exam Name: {examId}</p>
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
