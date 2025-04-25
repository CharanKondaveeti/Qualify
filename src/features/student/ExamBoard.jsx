import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FiClock,
  FiUser,
  FiBook,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import "./css/examBoard.css";

const ExamBoard = ({ examId, accessToken, studentInfo }) => {
  const [examDetails, setExamDetails] = useState({
    title: "",
    subject: "",
    duration: 0,
  });
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);

  // Load exam data on mount
  useEffect(() => {
    async function fetchExamData() {
      try {
        const res = await axios.get(
          `http://localhost:5004/studentExams?access_token=${accessToken}`
        );
        const exam = res.data.find((e) => e.exam_id === examId);

        if (exam) {
          setExamDetails({
            title: exam.title || "Exam",
            subject: exam.subject || "",
            duration: exam.duration || 45,
          });
          setQuestions(exam.questions || []);
          setAnswers(exam.answers || {});
          setTimeLeft(exam.remaining_time || (exam.duration || 45) * 60);
          setCurrentQuestionIndex(exam.last_que_seen || 0);
        }
      } catch (err) {
        setError(err);
      }
    }
    fetchExamData();
  }, [examId, accessToken]);

  // Auto save every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      autoSave();
    }, 10000);
    return () => clearInterval(interval);
  }, [answers, currentQuestionIndex, timeLeft]);

  const autoSave = async () => {
    try {
      await axios.patch(
        `http://localhost:5004/studentExams/examsReport/${examId}`,
        {
          answers,
          last_que_seen: currentQuestionIndex,
          remaining_time: timeLeft,
        }
      );
    } catch (err) {
      console.error("Auto-save failed", err);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || isSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleQuestionNavigation = (direction) => {
    if (direction === "prev" && currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else if (
      direction === "next" &&
      currentQuestionIndex < questions.length - 1
    ) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (window.confirm("Are you sure you want to submit your exam?")) {
      setIsSubmitted(true);
      await autoSave();
      alert("Exam submitted successfully!");
    }
  };

  if (error) return <div className="error-message">{error.message}</div>;
  if (!questions.length)
    return <div className="no-questions">No questions available</div>;

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="exam-board">
      <header>
        <h2>{examDetails.title}</h2>
        <div>
          <FiBook /> Subject: {examDetails.subject}
        </div>
        <div>
          <FiUser /> Student: {studentInfo.name} ({studentInfo.id})
        </div>
        <div>
          <FiClock /> Time Left: {formatTime(timeLeft)}
        </div>
      </header>

      <main>
        <h3>
          Question {currentQuestionIndex + 1}: {currentQuestion.question}
        </h3>
        <ul>
          {currentQuestion.options.map((option, index) => (
            <li key={index}>
              <label>
                <input
                  type="radio"
                  name={`q-${currentQuestion.id}`}
                  value={option}
                  disabled={isSubmitted}
                  checked={answers[currentQuestion.id] === option}
                  onChange={() =>
                    handleAnswerChange(currentQuestion.id, option)
                  }
                />
                {option}
              </label>
            </li>
          ))}
        </ul>
      </main>

      <div className="question-navigation">
        <h4>Questions</h4>
        <div className="question-grid">
          {questions.map((q, index) => (
            <button
              key={q.id}
              className={`question-number ${
                currentQuestionIndex === index ? "current" : ""
              } ${answers[q.id] ? "answered" : ""}`}
              onClick={() => setCurrentQuestionIndex(index)}
            >
              {index + 1}
              {answers[q.id] && <span className="checkmark">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <footer>
        <button onClick={() => handleQuestionNavigation("prev")}>
          {" "}
          <FiChevronLeft /> Previous{" "}
        </button>
        <button onClick={() => handleQuestionNavigation("next")}>
          {" "}
          Next <FiChevronRight />{" "}
        </button>
        <button onClick={handleSubmit} disabled={isSubmitted}>
          {" "}
          Submit Exam{" "}
        </button>
      </footer>
    </div>
  );
};

export default ExamBoard;
