import { isDemo } from '../../../lib/supabase';
import React, { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
  FiCheck,
  FiClock,
  FiFileText,
  FiLoader,
  FiPlus,
  FiSliders,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import { createExamWithQuestions } from "../../../services/examService";
import { getCurrentAdmin } from "../../../services/adminService";
import { resetExam, setQuestions } from "../../../store/newExamSlice";
import { useAdminWorkspace } from "../context/AdminWorkspaceContext";
import { parseCSVFile } from "../../../utils/parseQuestionsCsv";
import {
  calculateQuestionTotal,
  distributeEqualMarks,
} from "../../../utils/examMarks";
import { timingValues, buildExamTiming } from "../../../utils/examTiming";

import ExamTimingFields from "../components/ExamTimingFields";
import FileUpload from "../../questions/components/QuestionFileUpload";
import BankPicker from "../../questions/components/BankPicker";
import PreviewQuestions from "../../questions/components/QuestionPreview";
import Modal from "../../../shared/components/Modal";
import useModal from "../../../shared/hooks/useModal";
import "../styles/create-exam.css";

const STEPS = [
  { label: "Basic Details", description: "Name and course", Icon: FiFileText },
  { label: "Exam Timing", description: "Date and duration", Icon: FiClock },
  { label: "Questions", description: "Add and preview", Icon: FiBookOpen },
  {
    label: "Marking & Rules",
    description: "Marks and randomization",
    Icon: FiSliders,
  },
];

export default function CreateExamPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { institutionId } = useAdminWorkspace();
  const questions = useSelector((state) => state.newExam.questions);
  const pageRef = useRef(null);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm({ shouldUnregister: false });

  const { modal, showModal, closeModal } = useModal();
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [markingMode, setMarkingMode] = useState("automatic");
  const [timing, setTiming] = useState(() => timingValues());
  const [requestedTotal, setRequestedTotal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [questionError, setQuestionError] = useState("");

  const automaticMarks = useMemo(() => {
    if (markingMode !== "automatic" || requestedTotal === "") return null;
    try {
      return distributeEqualMarks(Number(requestedTotal), questions.length);
    } catch {
      return null;
    }
  }, [markingMode, requestedTotal, questions.length]);

  const customTotal = useMemo(() => {
    try {
      return calculateQuestionTotal(questions);
    } catch {
      return null;
    }
  }, [questions]);

  const goToStep = (nextStep) => {
    if (isLoading || nextStep < 1 || nextStep > STEPS.length) return;
    setStep(nextStep);
    // The dashboard content scrolls independently of the sidebar/header.
    const scrollPanel = pageRef.current?.closest(".content-wrapper");
    if (scrollPanel) scrollPanel.scrollTo({ top: 0, behavior: "smooth" });
    else
      pageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const nextStep = async () => {
    if (step === 1) {
      const valid = await trigger(["name", "course"]);
      if (!valid) return;
    }

    if (step === 2) {
      const valid = await trigger(["date", "time"]);
      if (!valid) return;
      try {
        const values = getValues();
        const scheduledDate = new Date(`${values.date}T${values.time}`);
        buildExamTiming(timing, scheduledDate);
      } catch (error) {
        toast.error(error.message || "Check the exam timing details.");
        return;
      }
    }

    if (step === 3 && !questions.length) {
      setQuestionError("Please add at least one question.");
      return;
    }

    setQuestionError("");
    setCompletedSteps((done) => (done.includes(step) ? done : [...done, step]));
    goToStep(step + 1);
  };

  const changeMarkingMode = (nextMode) => {
    if (nextMode === markingMode) return;

    // Keep previously assigned marks when moving from automatic to custom.
    if (nextMode === "custom" && automaticMarks) {
      dispatch(
        setQuestions(
          questions.map((question, index) => ({
            ...question,
            marks: automaticMarks[index],
          })),
        ),
      );
    }

    if (nextMode === "automatic" && customTotal !== null && questions.length) {
      setRequestedTotal(String(customTotal));
    }
    setMarkingMode(nextMode);
  };

  const createExamMutation = useMutation({
    mutationFn: ({ exam, examQuestions }) =>
      createExamWithQuestions(exam, examQuestions, showModal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      dispatch(resetExam());
      setQuestionError("");
      toast.success("Exam created successfully!");
      navigate(isDemo ? "/demo/admin/exams" : `/app/i/${institutionId}/exams`);
    },
  });

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showModal("error", "File Error", "Only CSV files are supported.");
      event.target.value = "";
      return;
    }

    parseCSVFile(
      file,
      (parsed) => {
        if (!parsed.length) {
          setQuestionError("CSV must contain at least one valid question.");
          return;
        }
        setQuestionError("");
        dispatch(setQuestions(parsed));
      },
      () => showModal("error", "CSV Error", "Error parsing CSV file."),
      setIsLoading,
    );
    event.target.value = "";
  };

  const handleCreateExam = async (formData) => {
    if (isLoading) return;

    // Check all steps even if the admin jumped directly to the last step.
    if (!formData.name?.trim() || !formData.course?.trim()) {
      toast.error("Enter the exam name and course.");
      goToStep(1);
      return;
    }
    if (!formData.date || !formData.time) {
      toast.error("Enter the exam date and start time.");
      goToStep(2);
      return;
    }
    if (!questions.length) {
      setQuestionError("Please add at least one question.");
      toast.error("Please add at least one question.");
      goToStep(3);
      return;
    }

    setIsLoading(true);
    try {
      const finalMarks =
        markingMode === "automatic"
          ? distributeEqualMarks(Number(requestedTotal), questions.length)
          : null;

      const examQuestions = questions.map((question, index) => ({
        ...question,
        marks:
          markingMode === "automatic"
            ? finalMarks[index]
            : Number(question.marks),
      }));
      const totalMarks = calculateQuestionTotal(examQuestions);
      const passMark = Number(formData.passMark || 0);

      if (
        !Number.isSafeInteger(passMark) ||
        passMark < 0 ||
        passMark > totalMarks
      ) {
        throw new Error(`Passing Marks must be between 0 and ${totalMarks}.`);
      }

      const scheduledDate = new Date(`${formData.date}T${formData.time}`);
      if (Number.isNaN(scheduledDate.getTime())) {
        goToStep(2);
        throw new Error("Enter a valid exam date and time.");
      }
      const timingData = buildExamTiming(timing, scheduledDate);
      const user = await getCurrentAdmin(showModal);
      if (!user) throw new Error("Please sign in again.");

      await createExamMutation.mutateAsync({
        exam: {
          title: formData.name,
          ...(institutionId ? { institution_id: institutionId } : {}),
          course: formData.course,
          exam_status: "upcoming",
          scheduled_date: scheduledDate.toISOString(),
          ...timingData,
          total_marks: totalMarks,
          total_questions: examQuestions.length,
          pass_mark: passMark,
          created_by: user.id,
          shuffle_questions: Boolean(formData.shuffleQuestions),
          shuffle_options: Boolean(formData.shuffleOptions),
          instructions:
            formData.instructions ||
            "Answer all questions carefully. Your exam is timed.",
        },
        examQuestions,
      });
    } catch (error) {
      toast.error(error.message || "Could not create exam.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-exam__container" ref={pageRef}>
      <div className="create-exam__heading">
        <button
          type="button"
          className="create-exam__back"
          aria-label="Back to examinations"
          onClick={() => navigate(isDemo ? "/demo/admin/exams" : `/app/i/${institutionId}/exams`)}
          disabled={isLoading}
        >
          <FiArrowLeft />
        </button>
        <div>
          <h1>Create New Exam</h1>
          <p>Complete the four steps to set up your examination.</p>
        </div>
      </div>

      <nav className="create-exam__steps" aria-label="Exam creation steps">
        {STEPS.map(({ label, description, Icon }, index) => {
          const number = index + 1;
          const isCurrent = number === step;
          const isPrevious = completedSteps.includes(number);
          return (
            <button
              type="button"
              key={label}
              className={`create-exam__step ${isCurrent ? "is-active" : ""} ${isPrevious ? "is-complete" : ""}`}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => goToStep(number)}
              disabled={isLoading}
            >
              <span className="create-exam__step-number">
                {isPrevious ? <FiCheck aria-hidden="true" /> : number}
              </span>
              <span className="create-exam__step-words">
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <Icon className="create-exam__step-icon" aria-hidden="true" />
            </button>
          );
        })}
      </nav>

      <form
        className="create-exam__form"
        onSubmit={handleSubmit(handleCreateExam)}
        noValidate
      >
        <section
          className="create-exam__panel"
          aria-labelledby="create-exam-panel-title"
        >
          <div className="create-exam__panel-heading">
            <span className="create-exam__panel-emblem">
              {React.createElement(STEPS[step - 1].Icon)}
            </span>
            <div>
              <span className="create-exam__eyebrow">STEP {step} OF 4</span>
              <h2 id="create-exam-panel-title">{STEPS[step - 1].label}</h2>
              <p>
                {step === 1 && "Enter the basic information for your exam."}
                {step === 2 && "Set the date, start time, and timing method."}
                {step === 3 && "Import, review, add, or edit your questions."}
                {step === 4 &&
                  "Set question marks and exam rules before creating."}
              </p>
            </div>
            {step === 3 && (
              <span className="create-exam__count">
                {questions.length} question{questions.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {step === 1 && (
            <div className="create-exam__step-content create-exam__step-content--short">
              <div className="create-exam__fields">
                <div className="create-exam__form-group">
                  <label htmlFor="name">
                    Exam Name <span>*</span>
                  </label>
                  <input
                    id="name"
                    autoComplete="off"
                    placeholder="Enter exam name"
                    aria-invalid={Boolean(errors.name)}
                    {...register("name", {
                      required: "Exam name is required.",
                      validate: (value) =>
                        Boolean(value?.trim()) || "Exam name is required.",
                    })}
                  />
                  {errors.name && (
                    <p className="create-exam__error">{errors.name.message}</p>
                  )}
                </div>
                <div className="create-exam__form-group">
                  <label htmlFor="course">
                    Course <span>*</span>
                  </label>
                  <input
                    id="course"
                    autoComplete="off"
                    placeholder="Enter course"
                    aria-invalid={Boolean(errors.course)}
                    {...register("course", {
                      required: "Course is required.",
                      validate: (value) =>
                        Boolean(value?.trim()) || "Course is required.",
                    })}
                  />
                  {errors.course && (
                    <p className="create-exam__error">
                      {errors.course.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="create-exam__helper">
                <FiFileText aria-hidden="true" />
                <div>
                  <strong>Basic information</strong>
                  <p>
                    The exam name and course will identify this examination in
                    your dashboard.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="create-exam__step-content">
              <div className="create-exam__fields create-exam__fields--date">
                <div className="create-exam__form-group">
                  <label htmlFor="date">
                    Exam Date <span>*</span>
                  </label>
                  <input
                    id="date"
                    type="date"
                    aria-invalid={Boolean(errors.date)}
                    {...register("date", {
                      required: "Exam date is required.",
                    })}
                  />
                  {errors.date && (
                    <p className="create-exam__error">{errors.date.message}</p>
                  )}
                </div>
                <div className="create-exam__form-group">
                  <label htmlFor="time">
                    Exam starts at <span>*</span>
                  </label>
                  <input
                    id="time"
                    type="time"
                    aria-invalid={Boolean(errors.time)}
                    {...register("time", {
                      required: "Start time is required.",
                    })}
                  />
                  {errors.time && (
                    <p className="create-exam__error">{errors.time.message}</p>
                  )}
                </div>
              </div>
              <ExamTimingFields
                value={timing}
                onChange={setTiming}
                disabled={isLoading}
              />
            </div>
          )}

          {step === 3 && (
            <div className="create-exam__step-content create-exam__questions-step">
              <div className="create-exam__question-tools">
                <BankPicker />
                <button
                  type="button"
                  className="create-exam__add-question-btn"
                  onClick={() => setIsAddModalOpen(true)}
                  disabled={isLoading}
                >
                  <FiPlus aria-hidden="true" /> Add Question
                </button>
              </div>
              <FileUpload
                handleFileUpload={handleFileUpload}
                isLoading={isLoading}
                questionError={questionError}
              />
              <div className="create-exam__preview-section">
                <PreviewQuestions
                  isAddModalOpen={isAddModalOpen}
                  setIsAddModalOpen={setIsAddModalOpen}
                  markingMode={markingMode}
                  automaticMarks={automaticMarks}
                />
                {questions.length === 0 && (
                  <div className="create-exam__empty">
                    <FiBookOpen aria-hidden="true" />
                    <strong>No questions added yet</strong>
                    <p>
                      Use the question bank, upload a CSV file, or add a
                      question.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="create-exam__step-content">
              <div className="create-exam__fields">
                <div className="create-exam__form-group">
                  <label htmlFor="markingMode">Question Marking</label>
                  <select
                    id="markingMode"
                    value={markingMode}
                    onChange={(event) => changeMarkingMode(event.target.value)}
                  >
                    <option value="automatic">
                      Automatic — distribute total marks
                    </option>
                    <option value="custom">
                      Custom — edit each question&apos;s marks
                    </option>
                  </select>
                </div>
                <div className="create-exam__form-group">
                  <label htmlFor="totalMarks">Total Marks</label>
                  {markingMode === "automatic" ? (
                    <input
                      id="totalMarks"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={requestedTotal}
                      onChange={(event) =>
                        setRequestedTotal(event.target.value)
                      }
                      placeholder="e.g. 100"
                    />
                  ) : (
                    <input
                      id="totalMarks"
                      type="number"
                      value={customTotal ?? ""}
                      readOnly
                    />
                  )}
                  <small>
                    {markingMode === "automatic"
                      ? "Marks are distributed between your questions when you create the exam."
                      : "Edit each question's marks using the pencil in Step 3."}
                  </small>
                  {markingMode === "custom" && (
                    <button
                      type="button"
                      className="create-exam__text-link"
                      onClick={() => goToStep(3)}
                    >
                      Go to question marks <FiArrowRight aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className="create-exam__form-group">
                  <label htmlFor="passMark">Passing Marks</label>
                  <input
                    id="passMark"
                    type="number"
                    min="0"
                    defaultValue="0"
                    {...register("passMark", { min: 0, valueAsNumber: true })}
                  />
                  {errors.passMark && (
                    <p className="create-exam__error">
                      Passing Marks must be zero or more.
                    </p>
                  )}
                </div>
              </div>

              <div className="create-exam__rules">
                <label className="create-exam__switch-row">
                  <span>
                    <strong>Randomize question order for each student</strong>
                  </span>
                  <input
                    type="checkbox"
                    defaultChecked
                    {...register("shuffleQuestions")}
                  />
                </label>
                <label className="create-exam__switch-row">
                  <span>
                    <strong>Randomize options for each student</strong>
                  </span>
                  <input
                    type="checkbox"
                    defaultChecked
                    {...register("shuffleOptions")}
                  />
                </label>
              </div>

              <div className="create-exam__form-group create-exam__instructions">
                <label htmlFor="instructions">Instructions</label>
                <textarea
                  id="instructions"
                  rows="4"
                  {...register("instructions")}
                  placeholder="Rules and instructions shown before the exam"
                />
              </div>
            </div>
          )}
        </section>

        <footer className="create-exam__footer">
          <div className="create-exam__footer-caption">
            <span className="create-exam__footer-current">{step} / 4</span>
            <span>Click any step above to make changes.</span>
          </div>
          <div className="create-exam__actions">
            {step > 1 ? (
              <button
                type="button"
                className="create-exam__secondary-btn"
                onClick={() => goToStep(step - 1)}
                disabled={isLoading}
              >
                <FiArrowLeft aria-hidden="true" /> Previous
              </button>
            ) : (
              <button
                type="button"
                className="create-exam__secondary-btn"
                onClick={() => navigate(isDemo ? "/demo/admin/exams" : `/app/i/${institutionId}/exams`)}
              >
                Cancel
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                className="create-exam__submit-btn"
                onClick={nextStep}
                disabled={isLoading}
              >
                Next <FiArrowRight aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                className="create-exam__submit-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <FiLoader
                      className="create-exam__loading"
                      aria-hidden="true"
                    />{" "}
                    Creating...
                  </>
                ) : (
                  <>
                    Create Exam <FiArrowRight aria-hidden="true" />
                  </>
                )}
              </button>
            )}
          </div>
        </footer>
      </form>

      <Modal
        modal={modal}
        closeModal={closeModal}
        confirmSubmit={modal.onConfirm}
      />
    </div>
  );
}
