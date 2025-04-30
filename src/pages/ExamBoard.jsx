import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  lazy,
  Suspense,
} from "react";
import supabase from "../services/supabase";
import { useParams } from "react-router-dom";
import {
  getStudentExamDetails,
  submitExam,
  startExamNow,
} from "../services/exam";
import { getQuestions } from "../services/exam";
import useExamSecurity from "../hooks/useExamSecurity";
import useFullscreen from "../hooks/useFullScreen";
import useModal from "../hooks/useModal";
import ExamLoader from "../loaders/ExamLoader";
import { useExamStatusSubscription } from "../services/subscriptions/useExamStatusSubscription";
import "./css/examBoard.css";

const ExamSubmitted = lazy(() => import("../features/examBoard/ExamSubmitted"));
const ExamStartCard = lazy(() => import("../features/examBoard/ExamStartCard"));
const ExamHeader = lazy(() => import("../features/examBoard/ExamHeader"));
const QuestionPalette = lazy(() =>
  import("../features/examBoard/QuestionPalette")
);
const QuestionHeader = lazy(() =>
  import("../features/examBoard/QuestionHeader")
);
const QuestionContent = lazy(() =>
  import("../features/examBoard/QuestionContent")
);
const Modal = lazy(() => import("../modals/Modal"));

const calculateRemainingTime = (endTime) =>
  Math.max(0, Math.floor((endTime - Date.now()) / 1000));

const ExamBoard = () => {
  const { examId, studentId } = useParams();
  const [studentExamDetails, setStudentExamDetails] = useState({
    title: "",
    subject: "",
    duration_minutes: 0,
    started_at: null,
    student_status: "",
    exam_status: "",
    scheduled_date: "",
    studentName: "",
    rollNo: "",
    email: "",
  });
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [warningShown, setWarningShown] = useState(false);
  const [startCountdown, setStartCountdown] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBlurLoader, setShowBlurLoader] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;

  const progressPercentage = useMemo(() => {
    return (answeredCount / questions.length) * 100;
  }, [answeredCount, questions]);

  const { modal, showModal, closeModal } = useModal();
  const enterFullscreen = useFullscreen();
  useExamSecurity(isSubmitted, showModal);
  useExamStatusSubscription(examId, setStudentExamDetails);

  const clearLocalStorage = () => {
    localStorage.removeItem(`${examId}_${studentId}`);
  };

  const updateLocalStorageSnapshot = (updatedAnswers, currentQuesId) => {
    localStorage.setItem(
      `${examId}_${studentId}`,
      JSON.stringify({
        examId,
        studentId,
        answers: updatedAnswers,
        current_question: currentQuesId,
      })
    );
  };

  useEffect(() => {
    if (!examId || !studentId) return;

    const channel = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "studentReport",
          filter: `student_report_id=eq.${studentId}`,
        },
        (payload) => {
          if (payload.new?.exam_status === "submitted") {
            setStudentExamDetails((prev) => ({
              ...prev,
              student_status: "submitted",
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [examId, studentId]);

  useEffect(() => {
    const fetchExamData = async () => {
      const data = await getStudentExamDetails(examId, studentId);
      if (data) {
        setStudentExamDetails({
          title: data.title,
          subject: data.course,
          duration_minutes: data.duration_minutes,
          started_at: data.started_at,
          student_status: data.student_status,
          exam_status: data.exam_status,
          scheduled_date: data.scheduled_date,
          studentName: data.studentName,
          rollNo: data.rollNo,
          email: data.email,
        });

        const questionsData = await getQuestions(examId);
        setQuestions(questionsData);

        const saved =
          JSON.parse(localStorage.getItem(`${examId}_${studentId}`)) || {};
        setAnswers(saved.answers || {});

        if (saved.current_question) {
          const savedIndex = questionsData.findIndex(
            (q) => q.question_id === saved.current_question
          );
          if (savedIndex !== -1) setCurrentQuestionIndex(savedIndex);
        }
      }
      setLoading(false);
    };

    fetchExamData();
  }, []);

  useEffect(() => {
    if (
      studentExamDetails.started_at &&
      studentExamDetails.student_status === "in progress"
    ) {
      const endTime =
        new Date(studentExamDetails.started_at).getTime() +
        studentExamDetails.duration_minutes * 60 * 1000;
      setTimeLeft(calculateRemainingTime(endTime));
    }
  }, [studentExamDetails]);

  useEffect(() => {
    if (studentExamDetails.exam_status === "upcoming") {
      const scheduledTime = new Date(
        studentExamDetails.scheduled_date
      ).getTime();
      const updateCountdown = () =>
        setStartCountdown(calculateRemainingTime(scheduledTime));
      const interval = setInterval(updateCountdown, 1000);
      updateCountdown();
      return () => clearInterval(interval);
    }
  }, [studentExamDetails.exam_status, studentExamDetails.scheduled_date]);

  useEffect(() => {
    if (timeLeft <= 0 || isSubmitted) return;

    if (timeLeft <= 300 && !warningShown) {
      setWarningShown(true);
      showModal(
        "warning",
        "Time Warning",
        "⚠️ Only 5 minutes remaining! Please review your answers."
      );
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted]);

  useEffect(() => {
    if (studentExamDetails?.student_status !== "in progress") return;

    const interval = setInterval(() => {
      const saved = JSON.parse(localStorage.getItem(`${examId}_${studentId}`));
      if (saved?.answers) {
        submitExam(examId, studentId, saved.answers, "autosave");
      }
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [examId, studentId, isSubmitted, studentExamDetails?.student_status]);
  
  const handleAnswerChange = useCallback(
    (questionId, selectedIndex) => {
      setAnswers((prev) => {
        const updated = { ...prev, [questionId]: selectedIndex };
        updateLocalStorageSnapshot(
          updated,
          questions[currentQuestionIndex]?.question_id
        );
        return updated;
      });
    },
    [examId, studentId, currentQuestionIndex, questions]
  );

  const handleQuestionNavigation = useCallback(
    (direction) => {
      setCurrentQuestionIndex((index) => {
        const newIndex =
          direction === "prev"
            ? Math.max(0, index - 1)
            : Math.min(questions.length - 1, index + 1);
        const nextQuestionId = questions[newIndex].question_id;
        updateLocalStorageSnapshot(answers, nextQuestionId);
        return newIndex;
      });
    },
    [questions, answers]
  );

  const handleAutoSubmit = async () => {
    if (isSubmitted) return;
    setShowBlurLoader(true);
    setIsSubmitted(true);

    const result = await submitExam(examId, studentId, answers, "finalsubmit");
    setShowBlurLoader(false);

    if (result.success) {
      clearLocalStorage();
      showModal(
        "success",
        "Exam Submitted",
        "✅ Your exam has been automatically submitted."
      );
    } else {
      showModal(
        "danger",
        "Submission Failed",
        "❌ Submission failed. Please contact your instructor."
      );
    }
  };

  const finalizeExamSubmission = async () => {
    const result = await submitExam(examId, studentId, answers, "finalsubmit");
    if (!result.success) {
      alert("❌ Submission failed. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const pollStatus = async () => {
      try {
        const updated = await getStudentExamDetails(examId, studentId);
        if (["completed", "submitted"].includes(updated?.student_status)) {
          clearLocalStorage();
          setStudentExamDetails((prev) => ({
            ...prev,
            student_status: "submitted",
          }));
        } else {
          setTimeout(pollStatus, 2000);
        }
      } catch {
        setTimeout(pollStatus, 3000);
      }
    };

    pollStatus();
  };

  const handleSubmit = () => {
    if (isSubmitted) return;
    showModal(
      "submit",
      "Confirm Submission",
      "Are you sure you want to submit the exam?",
      confirmSubmit
    );
  };

  const confirmSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setIsSubmitted(true);
    await finalizeExamSubmission();
  };

  const handleStartExam = async () => {
    if (studentExamDetails.exam_status !== "active")
      return alert("You cannot start the exam because it's not active.");
    await enterFullscreen();
    const result = await startExamNow(studentId);
    if (result.success) {
      setStudentExamDetails((prev) => ({
        ...prev,
        started_at: result.started_at,
        student_status: "in progress",
      }));
      const endTime =
        new Date(result.started_at).getTime() +
        studentExamDetails.duration_minutes * 60 * 1000;
      setTimeLeft(calculateRemainingTime(endTime));
    } else {
      showModal(
        "warning",
        "Start Failed",
        "Failed to start exam. Please try again."
      );
    }
  };

  if (loading) return <ExamLoader />;

  if (studentExamDetails.student_status === "submitted")
    return (
      <Suspense fallback={<ExamLoader />}>
        <ExamSubmitted />
      </Suspense>
    );

  if (studentExamDetails.student_status === "not started")
    return (
      <Suspense fallback={<ExamLoader />}>
        <ExamStartCard
          studentExamDetails={studentExamDetails}
          startCountdown={startCountdown}
          handleStartExam={handleStartExam}
        />
      </Suspense>
    );

  return (
    <div className="exam-container">
      {studentExamDetails.student_status === "in progress" && (
        <>
          <ExamHeader
            studentExamDetails={studentExamDetails}
            timeLeft={timeLeft}
          />
          <div className="exam-content">
            <QuestionPalette
              progressPercentage={progressPercentage}
              questions={questions}
              currentQuestionIndex={currentQuestionIndex}
              setCurrentQuestionIndex={setCurrentQuestionIndex}
              answers={answers}
              handleSubmit={handleSubmit}
              isSubmitted={isSubmitted}
              answeredCount={answeredCount}
            />
            <div className="question-container">
              <QuestionHeader
                currentQuestionIndex={currentQuestionIndex}
                totalQuestions={questions.length}
                handleQuestionNavigation={handleQuestionNavigation}
              />
              <QuestionContent
                currentQuestion={currentQuestion}
                answers={answers}
                handleAnswerChange={handleAnswerChange}
                isSubmitted={isSubmitted}
              />
            </div>
          </div>
        </>
      )}

      {showBlurLoader && <ExamLoader />}
      <Modal
        modal={modal}
        confirmSubmit={confirmSubmit}
        closeModal={closeModal}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default ExamBoard;
