import PageLoader from '../../../shared/components/PageLoader';
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiChevronRight, FiRotateCcw, FiStar } from "react-icons/fi";

import {
  beginStudent,
  clearPrivateSession,
  logExamEvent,
  savePrivateToken,
  saveStudent,
  studentState,
} from "../../../services/secureExamService";

import ExamHeader from "../components/ExamHeader";
import ExamStartCard from "../components/ExamStartCard";
import QuestionPalette from "../components/QuestionPalette";
import QuestionHeader from "../components/QuestionHeader";
import QuestionContent from "../components/QuestionContent";

import "../styles/exam-page.css";
import "../styles/secure-exam.css";
import "../styles/exam-test-redesign.css";

export default function ExamPage({ demoExamId, demoStudentId }) {
  const params = useParams();
  const examId = demoExamId || params.examId;
  const studentId = demoStudentId || params.studentId;

  const draftKey = `qualify-draft-${studentId}`;

  const [details, setDetails] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [flags, setFlags] = useState({});

  const currentAnswers = useRef({});
  const currentFlags = useRef({});

  const [index, setIndex] = useState(0);

  const [clock, setClock] = useState(Date.now());
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [saveStatus, setSaveStatus] = useState("Ready");
  const [confirm, setConfirm] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const submitting = useRef(false);

  // ------------------------------------------
  // SERVER CLOCK SYNCHRONIZATION
  // ------------------------------------------

  const syncClock = (value) => {
    if (value) {
      setOffset(new Date(value).getTime() - Date.now());
    }
  };

  // ------------------------------------------
  // APPLY SERVER EXAM STATE
  // ------------------------------------------

  const apply = useCallback(
    (data, initial = false) => {
      if (data.server_now) {
        setOffset(new Date(data.server_now).getTime() - Date.now());
      }

      setDetails(data);

      if (Array.isArray(data.questions) && data.questions.length) {
        setQuestions(data.questions);

        if (initial) {
          let draft = {};

          try {
            draft = JSON.parse(sessionStorage.getItem(draftKey) || "{}");
          } catch {
            // Ignore invalid local draft.
          }

          const restored = {
            ...(data.answers || {}),
            ...(draft.answers || {}),
          };

          const restoredFlags = {
            ...(data.review_flags || {}),
            ...(draft.flags || {}),
          };

          currentAnswers.current = restored;
          currentFlags.current = restoredFlags;

          setAnswers(restored);
          setFlags(restoredFlags);

          const restoredIndex = data.questions.findIndex(
            (q) => q.question_id === draft.questionId,
          );

          setIndex(Math.max(0, restoredIndex));
        }
      }
    },
    [draftKey],
  );

  // ------------------------------------------
  // VERIFY PRIVATE STUDENT ACCESS
  // ------------------------------------------

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const secret = hash.get("access");

    if (secret) {
      savePrivateToken(studentId, secret);

      // Remove the secret from the visible URL.
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }

    let cancelled = false;

    studentState(examId, studentId)
      .then((data) => {
        if (!cancelled) {
          apply(data, true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [examId, studentId, apply]);

  // ------------------------------------------
  // LIVE CLOCK
  // ------------------------------------------

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const active = details?.student_status === "in progress";

  // ------------------------------------------
  // FINAL SUBMISSION
  // ------------------------------------------

  const finish = useCallback(async () => {
    if (submitting.current) return;

    submitting.current = true;

    setBusy(true);
    setError("");

    try {
      const result = await saveStudent(
        examId,
        studentId,
        currentAnswers.current,
        currentFlags.current,
        true,
      );

      if (!result.saved && !result.expired) {
        throw new Error("Submission not accepted");
      }

      sessionStorage.removeItem(draftKey);
      clearPrivateSession(studentId);

      setDetails((previous) => ({
        ...previous,
        student_status: "submitted",
      }));

      setSaveStatus("Submitted successfully");

      setConfirm(false);
    } catch (err) {
      // Supabase Cron might have already
      // finalized the student's attempt.
      //
      // Ask the server before showing an error.

      try {
        const latest = await studentState(examId, studentId);

        if (latest.student_status === "submitted") {
          apply(latest);

          sessionStorage.removeItem(draftKey);

          clearPrivateSession(studentId);

          setSaveStatus("Submission confirmed by server");

          setConfirm(false);

          return;
        }
      } catch {
        // Preserve original submission error.
      }

      setError(err.message);

      setSaveStatus("Submission failed — do not close this tab");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }, [apply, draftKey, examId, studentId]);

  // ------------------------------------------
  // AUTOMATIC ANSWER SAVING
  // ------------------------------------------

  useEffect(() => {
    if (!active) return;

    const timer = setInterval(async () => {
      if (submitting.current) return;

      try {
        const result = await saveStudent(
          examId,
          studentId,
          currentAnswers.current,
          currentFlags.current,
          false,
        );

        if (result.expired) {
          setDetails((previous) => ({
            ...previous,
            student_status: "submitted",
          }));

          setSaveStatus("Time ended. Previously saved answers were submitted.");

          return;
        }

        syncClock(result.server_now);

        setSaveStatus("Saved to server · " + new Date().toLocaleTimeString());
      } catch {
        setSaveStatus(
          "Offline or session problem — answers held on this tab, retrying",
        );
      }
    }, 8000);

    return () => {
      clearInterval(timer);
    };
  }, [active, examId, studentId]);

  // ------------------------------------------
  // AUTOMATIC EXAM OPENING
  // ------------------------------------------
  //
  // Refresh the server state every 15 seconds
  // while waiting for the exam.
  //
  // Students do not need to refresh manually
  // when the exam becomes active.
  // ------------------------------------------

  useEffect(() => {
    if (details?.student_status !== "not started") {
      return;
    }

    let mounted = true;

    const timer = setInterval(() => {
      studentState(examId, studentId)
        .then((next) => {
          if (!mounted) return;

          syncClock(next.server_now);

          setDetails((previous) => ({
            ...previous,
            ...next,
          }));
        })
        .catch(() => {
          // Retry on the next refresh.
        });
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [details?.student_status, examId, studentId]);

  // ------------------------------------------
  // SERVER STATUS MONITORING
  // ------------------------------------------
  //
  // Detect:
  // - Exam revocation
  // - Session reset
  // - Forced submission
  // - Emergency stop
  // - Server clock changes
  // ------------------------------------------

  useEffect(() => {
    if (!active) return;

    const timer = setInterval(() => {
      studentState(examId, studentId)
        .then((next) => {
          syncClock(next.server_now);

          if (next.student_status !== "in progress") {
            setDetails((previous) => ({
              ...previous,
              ...next,
            }));
          }
        })
        .catch(() => {
          // Retry on next refresh.
        });
    }, 15000);

    return () => {
      clearInterval(timer);
    };
  }, [active, examId, studentId]);

  // ------------------------------------------
  // EXAM ACTIVITY MONITORING
  // ------------------------------------------

  useEffect(() => {
    if (!active) return;

    const detect = (kind) => {
      logExamEvent(studentId, kind);
    };

    const hidden = () => {
      if (document.hidden) {
        detect("tab_hidden");
      }
    };

    const fullscreenExit = () => {
      if (!document.fullscreenElement) {
        detect("fullscreen_exit");
      }
    };

    const copyAttempt = (event) => {
      event.preventDefault();
      detect("copy_attempt");
    };

    const pasteAttempt = (event) => {
      event.preventDefault();
      detect("paste_attempt");
    };

    const contextMenu = (event) => {
      event.preventDefault();
    };

    const offline = () => {
      setSaveStatus("Offline — answers saved in this tab");

      detect("offline");
    };

    const online = () => {
      detect("online");
    };

    document.addEventListener("visibilitychange", hidden);

    document.addEventListener("fullscreenchange", fullscreenExit);

    document.addEventListener("copy", copyAttempt);

    document.addEventListener("paste", pasteAttempt);

    document.addEventListener("contextmenu", contextMenu);

    window.addEventListener("offline", offline);

    window.addEventListener("online", online);

    return () => {
      document.removeEventListener("visibilitychange", hidden);

      document.removeEventListener("fullscreenchange", fullscreenExit);

      document.removeEventListener("copy", copyAttempt);

      document.removeEventListener("paste", pasteAttempt);

      document.removeEventListener("contextmenu", contextMenu);

      window.removeEventListener("offline", offline);

      window.removeEventListener("online", online);
    };
  }, [active, studentId]);

  // ------------------------------------------
  // INDIVIDUAL STUDENT EXAM TIMER
  // ------------------------------------------

  const end = details?.deadline ? new Date(details.deadline).getTime() : null;

  const left =
    end === null ? 0 : Math.max(0, Math.ceil((end - clock - offset) / 1000));

  const expired = end !== null && left === 0;

  // Automatic submission when student's
  // individual deadline is reached.

  useEffect(() => {
    if (active && expired) {
      finish();
    }
  }, [active, expired, finish]);

  // ------------------------------------------
  // LOCAL DRAFT RECOVERY
  // ------------------------------------------

  const persist = (a, f, questionId) => {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          answers: a,
          flags: f,
          questionId,
        }),
      );

      setSaveStatus("Saved on this tab · waiting for server sync");
    } catch {
      setSaveStatus("Local storage unavailable — stay online");
    }
  };

  // ------------------------------------------
  // START EXAM
  // ------------------------------------------

  async function start() {
    if (busy || !accepted || entryClosed) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const data = await beginStudent(examId, studentId);

      apply(data, true);

      setSaveStatus("Exam started");

      document.documentElement.requestFullscreen?.().catch(() => {
        // Browser may deny fullscreen.
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // ------------------------------------------
  // QUESTION ANSWERING
  // ------------------------------------------

  function answer(id, value) {
    if (busy || expired) return;

    const next = {
      ...currentAnswers.current,
      [id]: value,
    };

    currentAnswers.current = next;

    setAnswers(next);

    persist(next, currentFlags.current, id);
  }

  function clearAnswer() {
    if (busy || expired) return;

    const questionId = questions[index]?.question_id;

    if (!questionId) return;

    const next = {
      ...currentAnswers.current,
    };

    delete next[questionId];

    currentAnswers.current = next;

    setAnswers(next);

    persist(next, currentFlags.current, questionId);
  }

  function toggleFlag() {
    if (busy || expired) return;

    const questionId = questions[index]?.question_id;

    if (!questionId) return;

    const next = {
      ...currentFlags.current,
      [questionId]: !currentFlags.current[questionId],
    };

    currentFlags.current = next;

    setFlags(next);

    persist(currentAnswers.current, next, questionId);
  }

  // ------------------------------------------
  // LAST ENTRY TIME
  // ------------------------------------------

  const entryClosed =
    Boolean(details?.last_entry_at) &&
    clock + offset >= new Date(details.last_entry_at).getTime();

  // ------------------------------------------
  // LOADING STATE
  // ------------------------------------------

  if (loading) {
    return (
      <PageLoader fullPage label="Verifying your private examination access…" />
    );
  }

  // ------------------------------------------
  // INVALID ACCESS
  // ------------------------------------------

  if (!details) {
    return (
      <div className="portal-message" role="alert">
        <h2>Cannot open exam</h2>

        <p>{error}</p>

        <Link to="/">Return to portal</Link>
      </div>
    );
  }

  // ------------------------------------------
  // LOCKED ATTEMPT
  // ------------------------------------------

  if (details.student_status === "locked") {
    return (
      <div className="portal-message" role="alert">
        <h2>Attempt locked</h2>

        <p>{details.message}</p>

        <p>
          Ask your exam administrator to reset your session if another device is
          active.
        </p>

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");

            try {
              clearPrivateSession(studentId);

              const data = await beginStudent(examId, studentId);

              apply(data, true);
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Rejoin after admin reset
        </button>

        {error && <p>{error}</p>}
      </div>
    );
  }

  // ------------------------------------------
  // REVOKED ATTEMPT
  // ------------------------------------------

  if (details.student_status === "revoked") {
    return (
      <div className="portal-message">
        Your exam access has been revoked. Contact your administrator.
      </div>
    );
  }

  // ------------------------------------------
  // SUBMITTED EXAM
  // ------------------------------------------

  if (details.student_status === "submitted") {
    return (
      <div className="portal-message">
        <span className="eyebrow">EXAM COMPLETE</span>

        <h1>Submission received</h1>

        <p>
          Your answers are recorded. Your administrator controls when results
          are visible.
        </p>

        <Link
          to={
            demoStudentId
              ? "/demo/student/result"
              : `/candidate/results/${studentId}`
          }
        >
          Check results →
        </Link>
        {demoStudentId && <Link to="/demo/student">Try demo exam again →</Link>}
      </div>
    );
  }

  // ------------------------------------------
  // WAITING TO START EXAM
  // ------------------------------------------

  if (details.student_status === "not started") {
    const countdown = Math.max(
      0,
      Math.ceil(
        (new Date(details.scheduled_date).getTime() - clock - offset) / 1000,
      ),
    );

    return (
      <>
        <ExamStartCard
          studentExamDetails={{
            ...details,
            subject: details.course,
          }}
          startCountdown={countdown}
          handleStartExam={start}
          disabled={!accepted || busy || entryClosed}
          accepted={accepted}
          onAcceptedChange={setAccepted}
          entryClosed={entryClosed}
          busy={busy}
          error={error}
        />
      </>
    );
  }

  // ------------------------------------------
  // QUESTIONS NOT AVAILABLE
  // ------------------------------------------

  if (!questions.length) {
    return (
      <div className="portal-message" role="alert">
        No questions loaded. Please contact your administrator.
      </div>
    );
  }

  const current = questions[index];
  const answeredCount = questions.filter(
    (question) =>
      answers[question.question_id] !== undefined &&
      answers[question.question_id] !== null,
  ).length;
  const navigateQuestion = (direction) => {
    setIndex((i) =>
      Math.max(
        0,
        Math.min(questions.length - 1, i + (direction === "next" ? 1 : -1)),
      ),
    );
  };
  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  // ------------------------------------------
  // ACTIVE EXAM INTERFACE
  // ------------------------------------------

  return (
    <div className="exam-container">
      <ExamHeader
        studentExamDetails={{
          ...details,
          studentName: details.student_name,
          rollNo: details.roll_no,
          subject: details.course,
        }}
        timeLeft={left}
        onEnterFullscreen={enterFullscreen}
      />

      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}

      {expired && (
        <p role="alert">Exam time ended. Submitting saved answers…</p>
      )}

      <div className="exam-content">
        <QuestionPalette
          progressPercentage={(100 * answeredCount) / questions.length}
          questions={questions}
          currentQuestionIndex={index}
          setCurrentQuestionIndex={setIndex}
          answers={answers}
          flags={flags}
          handleSubmit={() => setConfirm(true)}
          isSubmitted={busy || expired}
          answeredCount={answeredCount}
        />

        <div className="question-container">
          <QuestionHeader
            currentQuestionIndex={index}
            totalQuestions={questions.length}
            questionMarks={current.marks}
            handleQuestionNavigation={navigateQuestion}
          />

          <QuestionContent
            currentQuestion={current}
            answers={answers}
            handleAnswerChange={answer}
            isSubmitted={busy || expired}
          />

          <div className="exam-question-footer">
            <div className="exam-question-actions">
              <button
                type="button"
                onClick={clearAnswer}
                disabled={busy || expired}
              >
                <FiRotateCcw aria-hidden="true" /> Clear answer
              </button>
              <button
                type="button"
                className={flags[current.question_id] ? "is-marked" : ""}
                aria-pressed={Boolean(flags[current.question_id])}
                onClick={toggleFlag}
                disabled={busy || expired}
              >
                <FiStar aria-hidden="true" />
                {flags[current.question_id]
                  ? "Marked for review"
                  : "Mark for review"}
              </button>
            </div>
            <div className="exam-question-footer__right">
              <span className="exam-save-status" role="status">
                {saveStatus}
              </span>
              <button
                type="button"
                className="exam-next-footer"
                disabled={index === questions.length - 1 || busy || expired}
                onClick={() => navigateQuestion("next")}
              >
                Next question <FiChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FINAL SUBMISSION DIALOG */}

      {confirm && (
        <div className="exam-confirm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm exam submission"
          >
            <h2>Submit your exam?</h2>

            <p>
              {Object.keys(answers).length} of {questions.length} answered. You
              cannot change answers afterward.
            </p>

            <button
              type="button"
              onClick={() => setConfirm(false)}
              disabled={busy}
            >
              Continue exam
            </button>

            <button type="button" onClick={finish} disabled={busy}>
              {busy ? "Submitting…" : "Final submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
