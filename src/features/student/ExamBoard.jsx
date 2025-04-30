import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  FiClock,
  FiUser,
  FiBook,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import {
  getExamWithStartTime,
  getQuestions,
  submitExam,
  startExamNow,
} from "../../services/admin";
import "./css/examBoard.css";

const ExamBoard = () => {
  const { examId, studentId } = useParams();
  const [examDetails, setExamDetails] = useState({
    title: "",
    subject: "",
    duration_minutes: 0,
    started_at: null,
    exam_status: "not started",
  });
  const [questions, setQuestions] = useState([]);
  
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExamData() {
      const exam = await getExamWithStartTime(examId, studentId);
      if (exam) {
        setExamDetails({
          title: exam.title,
          subject: exam.course,
          duration_minutes: exam.duration_minutes,
          started_at: exam.started_at,
          exam_status: exam.exam_status,
        });

        const questionsData = await getQuestions(examId);
        setQuestions(questionsData);

        const savedData =
          JSON.parse(localStorage.getItem(`${examId}_${studentId}`)) || {};
        setAnswers(savedData.answers || {});

        if (savedData.current_question) {
          const savedQuestionIndex = questionsData.findIndex(
            (q) => q.question_id === savedData.current_question
          );
          if (savedQuestionIndex !== -1) {
            setCurrentQuestionIndex(savedQuestionIndex);
          }
        }

        if (exam.started_at && exam.exam_status === "in progress") {
          const examEndTime =
            new Date(exam.started_at).getTime() +
            exam.duration_minutes * 60 * 1000;
          const currentTime = Date.now(); // Also uses UTC internally
          const initialSecondsLeft = Math.max(
            0,
            Math.floor((examEndTime - currentTime) / 1000)
          );
          console.log(
            "Started at UTC:",
            new Date(exam.started_at).toISOString()
          );
          console.log("Current Time:", new Date().toISOString());
          console.log("Duration (ms):", exam.duration_minutes * 60 * 1000);
          setTimeLeft(initialSecondsLeft);
        }
      }
      setLoading(false);
    }
    fetchExamData();
  }, [examId, studentId]);

  useEffect(() => {
    if (timeLeft <= 0 || isSubmitted) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, isSubmitted]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };


  const handleStartExam = async () => {
    const startedNow = await startExamNow(studentId);
    if (startedNow.success) {
      setExamDetails((prev) => ({
        ...prev,
        started_at: startedNow.started_at,
        exam_status: "in progress",
      }));

      const examEndTime =
        new Date(startedNow.started_at).getTime() +
        examDetails.duration_minutes * 60 * 1000;
        
      const currentTime = new Date().getTime();
      const initialSecondsLeft = Math.max(
        0,
        Math.floor((examEndTime - currentTime) / 1000)
      );
      setTimeLeft(initialSecondsLeft);
    } else {
      alert("Failed to start exam. Try again.");
    }
  };

  const autoSave = async (mode) => {
    const currentQuestionId = questions[currentQuestionIndex]?.question_id;
    const saveData = {
      examId,
      studentId,
      answers,
      current_question: currentQuestionId,
    };
    localStorage.setItem(`${examId}_${studentId}`, JSON.stringify(saveData));
    const result = await submitExam(examId, studentId, answers, mode);
    console.log("Auto-saved data:", result);
  };

  const handleAnswerChange = (questionId, selectedIndex) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev, [questionId]: selectedIndex };
      const saveData = {
        examId,
        studentId,
        answers: newAnswers,
        current_question: questions[currentQuestionIndex]?.question_id,
      };
      localStorage.setItem(`${examId}_${studentId}`, JSON.stringify(saveData));
      return newAnswers;
    });
  };

  const handleQuestionNavigation = (direction) => {
    let newIndex = currentQuestionIndex;
    if (direction === "prev" && currentQuestionIndex > 0) {
      newIndex = currentQuestionIndex - 1;
    } else if (
      direction === "next" &&
      currentQuestionIndex < questions.length - 1
    ) {
      newIndex = currentQuestionIndex + 1;
    }
    setCurrentQuestionIndex(newIndex);

    const updatedData = JSON.parse(
      localStorage.getItem(`${examId}_${studentId}`)
    );
    if (updatedData) {
      updatedData.current_question = questions[newIndex].question_id;
      localStorage.setItem(
        `${examId}_${studentId}`,
        JSON.stringify(updatedData)
      );
    }
  };

  const handleSubmit = async () => {
    if (isSubmitted) return;

    if (window.confirm("Are you sure you want to submit your exam?")) {
      setIsSubmitted(true);
      await autoSave("finalsubmit");

      const currentQuestionId = questions[currentQuestionIndex]?.question_id;

      const result = await submitExam(
        examId,
        studentId,
        answers,
        currentQuestionId
      );

      if (result.success) {
        alert(result.message);
      } else {
        alert(result.message);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  if (examDetails.exam_status === "submitted")
    return (
      <div className="exam-message">You have already submitted the exam.</div>
    );

  if (examDetails.exam_status === "not started")
    // console.log("Exam not started yet");
    return (
      <div className="exam-message">
        <h2>Ready to Start Exam?</h2>
        <button onClick={handleStartExam} className="start-exam-button">
          Start Exam
        </button>
      </div>
    );

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
          <FiUser /> Student: {studentId}
        </div>
        <div>
          <FiClock /> Time Left: {formatTime(timeLeft)}
        </div>
      </header>

      <main>
        <h3>
          Question {currentQuestionIndex + 1}: {currentQuestion.question_text}
        </h3>
        <ul>
          {currentQuestion.options.map((option, index) => (
            <li key={index}>
              <label>
                <input
                  type="radio"
                  name={`q-${currentQuestion.question_id}`}
                  value={option}
                  disabled={isSubmitted}
                  checked={answers[currentQuestion.question_id] === index}
                  onChange={() =>
                    handleAnswerChange(currentQuestion.question_id, index)
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
              key={q.question_id}
              className={`question-number ${
                currentQuestionIndex === index ? "current" : ""
              } ${answers[q.question_id] !== undefined ? "answered" : ""}`}
              onClick={() => setCurrentQuestionIndex(index)}
            >
              {index + 1}
              {answers[q.question_id] !== undefined && (
                <span className="checkmark">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <footer>
        <button onClick={() => handleQuestionNavigation("prev")}>
          <FiChevronLeft /> Previous
        </button>
        <button onClick={() => handleQuestionNavigation("next")}>
          Next <FiChevronRight />
        </button>
        <button onClick={handleSubmit} disabled={isSubmitted}>
          Submit Exam
        </button>
      </footer>
    </div>
  );
};

export default ExamBoard;
