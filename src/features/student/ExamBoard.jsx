import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  FiClock,
  FiUser,
  FiBook,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
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
  const [warningShown, setWarningShown] = useState(false);
  const [modal, setModal] = useState({
    show: false,
    type: "",
    message: "",
  });

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
          const examStartTime = new Date(exam.started_at).getTime();
          const examEndTime = examStartTime + exam.duration_minutes * 60 * 1000;
          const currentTime = Date.now();
          const remainingSeconds = Math.max(
            0,
            Math.floor((examEndTime - currentTime) / 1000)
          );
          setTimeLeft(remainingSeconds);
        }
      }
      setLoading(false);
    }
    fetchExamData();
  }, [examId, studentId]);

  useEffect(() => {
    if (timeLeft <= 0 || isSubmitted) return;

    if (timeLeft <= 300 && !warningShown) {
      setWarningShown(true);
      showModal(
        "warning",
        "⚠️ Time Warning",
        "Only 5 minutes remaining! Please review your answers."
      );
    }

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, isSubmitted]);

  useEffect(() => {
    const disableContextMenu = (e) => e.preventDefault();
    const blockKeys = (e) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
        (e.ctrlKey && e.key === "U")
      ) {
        e.preventDefault();
        showModal(
          "warning",
          "Action Blocked",
          "Developer tools are disabled during the exam."
        );
      }
    };
    const disableCopyPaste = (e) => e.preventDefault();

    window.addEventListener("contextmenu", disableContextMenu);
    document.addEventListener("keydown", blockKeys);
    document.addEventListener("copy", disableCopyPaste);
    document.addEventListener("paste", disableCopyPaste);

    return () => {
      window.removeEventListener("contextmenu", disableContextMenu);
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("copy", disableCopyPaste);
      document.removeEventListener("paste", disableCopyPaste);
    };
  }, [isSubmitted]);

  const showModal = (type, title, message) => {
    setModal({
      show: true,
      type,
      title,
      message,
    });
  };

  const closeModal = () => {
    setModal({ ...modal, show: false });
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  };

  const handleStartExam = async () => {
    await enterFullscreen();
    const startedNow = await startExamNow(studentId);
    if (startedNow.success) {
      setExamDetails((prev) => ({
        ...prev,
        started_at: startedNow.started_at,
        exam_status: "in progress",
      }));

      const examStartTime = new Date(startedNow.started_at).getTime();
      const examEndTime =
        examStartTime + examDetails.duration_minutes * 60 * 1000;
      const currentTime = Date.now();
      const initialSecondsLeft = Math.max(
        0,
        Math.floor((examEndTime - currentTime) / 1000)
      );
      setTimeLeft(initialSecondsLeft);
    } else {
      showModal(
        "warning",
        "Start Failed",
        "Failed to start exam. Please try again."
      );
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

  const handleAutoSubmit = async () => {
    if (isSubmitted) return;

    setIsSubmitted(true);
    await autoSave("finalsubmit");

    const result = await submitExam(
      examId,
      studentId,
      answers,
      questions[currentQuestionIndex]?.question_id
    );

    if (result.success) {
      showModal(
        "info",
        "Exam Submitted",
        "Your exam has been automatically submitted. Your answers have been recorded."
      );
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } else {
      showModal(
        "warning",
        "Submission Error",
        "There was an issue submitting your exam. Please contact your instructor."
      );
    }
  };

  const handleSubmit = async () => {
    if (isSubmitted) return;
    showModal(
      "submit",
      "Confirm Submission",
      "Are you sure you want to submit your exam? You won't be able to make changes after submission.",
      true
    );
  };

  const confirmSubmit = async () => {
    closeModal();
    setIsSubmitted(true);
    await autoSave("finalsubmit");

    const result = await submitExam(
      examId,
      studentId,
      answers,
      questions[currentQuestionIndex]?.question_id
    );

    if (result.success) {
      showModal(
        "submit",
        "Exam Submitted",
        "Your exam has been submitted successfully! Your answers have been recorded."
      );
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } else {
      showModal(
        "warning",
        "Submission Error",
        "There was an issue submitting your exam. Please try again."
      );
    }
  };

  if (loading) return <div className="loading-screen">Loading Exam...</div>;

  if (examDetails.exam_status === "submitted")
    return (
      <div className="exam-status-container">
        <div className="exam-status-card success">
          <FiCheckCircle className="status-icon" />
          <h2>Exam Submitted Successfully</h2>
          <p>Your answers have been recorded. You can now close this window.</p>
        </div>
      </div>
    );

  if (examDetails.exam_status === "not started")
    return (
      <div className="exam-status-container">
        <div className="exam-status-card ready">
          <h2>Exam Ready to Start</h2>
          <div className="exam-details-preview">
            <div>
              <strong>Title:</strong> {examDetails.title}
            </div>
            <div>
              <strong>Subject:</strong> {examDetails.subject}
            </div>
            <div>
              <strong>Duration:</strong> {examDetails.duration_minutes} minutes
            </div>
          </div>
          <button onClick={handleStartExam} className="start-exam-button pulse">
            Begin Exam Now
          </button>
          <div className="exam-instructions">
            <h3>Instructions:</h3>
            <ul>
              <li>
                You will have {examDetails.duration_minutes} minutes to complete
                the exam
              </li>
              <li>All questions must be answered within the time limit</li>
              <li>
                Developer tools, copy/paste, right click, and shortcuts are
                disabled
              </li>
            </ul>
          </div>
        </div>
      </div>
    );

  if (!questions.length)
    return (
      <div className="exam-status-container">
        <div className="exam-status-card error">
          <FiAlertCircle className="status-icon" />
          <h2>No Questions Available</h2>
          <p>
            This exam doesn't contain any questions yet. Please contact your
            instructor.
          </p>
        </div>
      </div>
    );

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = (answeredCount / questions.length) * 100;

  return (
    <div className="exam-container">
      {/* Modal Component */}
      {modal.show && (
        <div className="modal-overlay">
          <div className={`modal-container ${modal.type}`}>
            <div className="modal-header">
              <h3>{modal.title}</h3>
              {modal.type !== "submit" && (
                <button onClick={closeModal} className="modal-close">
                  <FiX />
                </button>
              )}
            </div>
            <div className="modal-body">
              <p>{modal.message}</p>
            </div>
            <div className="modal-footer">
              {modal.type === "submit" ? (
                <>
                  <button onClick={confirmSubmit} className="modal-confirm">
                    Confirm Submit
                  </button>
                  <button onClick={closeModal} className="modal-cancel">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={closeModal} className="modal-ok">
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="exam-header">
        <div className="exam-title">
          <h1>{examDetails.title}</h1>
          <div className="exam-subject">{examDetails.subject}</div>
        </div>

        <div className="exam-meta">
          <div className={`time-remaining ${timeLeft <= 300 ? "warning" : ""}`}>
            <FiClock />
            <span>{formatTime(timeLeft)}</span>
          </div>
          <div className="student-id">
            <FiUser />
            <span>{studentId}</span>
          </div>
        </div>
      </div>

      <div className="exam-content">
        <div className="question-palette">
          <h3>Question Palette</h3>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            ></div>
            <div className="progress-text">
              {answeredCount}/{questions.length} answered
            </div>
          </div>
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
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            className="submit-button"
            disabled={isSubmitted}
          >
            Submit Exam
          </button>
        </div>

        <div className="question-container">
          <div className="question-header">
            <span className="question-counter">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <div className="question-nav-buttons">
              <button
                onClick={() => handleQuestionNavigation("prev")}
                disabled={currentQuestionIndex === 0}
              >
                <FiChevronLeft /> Previous
              </button>
              <button
                onClick={() => handleQuestionNavigation("next")}
                disabled={currentQuestionIndex === questions.length - 1}
              >
                Next <FiChevronRight />
              </button>
            </div>
          </div>

          <div className="question-content">
            <h3>{currentQuestion.question_text}</h3>
            <div className="options-list">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={`option-item ${
                    answers[currentQuestion.question_id] === index + 1
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    !isSubmitted &&
                    handleAnswerChange(currentQuestion.question_id, index + 1)
                  }
                >
                  <div className="option-selector">
                    <div
                      className={`option-circle ${
                        answers[currentQuestion.question_id] === index + 1
                          ? "selected"
                          : ""
                      }`}
                    ></div>
                  </div>
                  <div className="option-text">{option}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamBoard;
