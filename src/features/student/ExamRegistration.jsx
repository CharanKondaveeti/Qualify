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

  // Generate a random Token
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
        .insert([newStudentReport]);

      if (error) {
        throw error;
      }

      setMessage(`🎉 Registered successfully! Your login token is: ${token}`);
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
