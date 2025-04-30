import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { FiArrowLeft, FiPlus } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import supabase from "../services/supabase";
import { createNewExam, createNewQuestions } from "../services/exam";

import { setExamDetails, setQuestions } from "../store/newExamSlice";

import FileUpload from "../components/FileUpload";
import PreviewQuestions from "../ui/PreviewQuestions";
import Modal from "./modals/Modal";

import "./css/CreateNewExam.css";
import useModal from "../hooks/useModal";
import { parseCSVFile } from "../helper/parseCSVFile";
import { getCurrentAdmin } from "../services/admin";

const CreateNewExam = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const questions = useSelector((state) => state.newExam.questions);

  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [questionError, setQuestionError] = useState("");

  const { modal, showModal } = useModal();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isCSV = file.type === "text/csv" || file.name.endsWith(".csv");
    if (!isCSV) {
      showModal("error", "File Error", "Only CSV files are supported.");
      return;
    }

    parseCSVFile(
      file,
      (parsedQuestions) => {
        if (parsedQuestions.length === 0) {
          setQuestionError("CSV must contain at least one valid question.");
        }
        dispatch(setQuestions(parsedQuestions));
      },
      () => {
        showModal("error", "CSV Error", "Error parsing CSV file.");
      },
      setIsLoading
    );
  };

  const SubmitCreateExam = async (formData) => {
    if (questions.length === 0) {
      setQuestionError("Please upload at least one question.");
      return;
    }

    if (!formData.date || !formData.time) {
      showModal("error", "Missing Fields", "Please enter exam date and time.");
      return;
    }

    try {
      dispatch(setExamDetails(formData));

      let user;
      try {
        user = await getCurrentAdmin();
      } catch (err) {
        showModal("error", "Error", "Unable to get user. Please login again.");
        return;
      }
      const dateTimeStr = `${formData.date}T${formData.time}`;
      const scheduledDate = new Date(dateTimeStr);

      const examData = {
        title: formData.name,
        course: formData.course,
        status: "upcoming",
        scheduled_date: scheduledDate.toISOString(),
        duration_minutes: parseInt(formData.duration),
        total_marks: parseInt(formData.totalMarks),
        created_by: user.id,
        total_questions: questions.length,
      };

      const examId = await createNewExam(examData);

      const questionsWithExamId = questions.map(({ question_id, ...q }) => ({
        ...q,
        exam_id: examId[0]?.exam_id,
      }));

      await createNewQuestions(questionsWithExamId);

      reset();
      dispatch(setExamDetails({}));
      setQuestionError("");
      showModal(
        "success",
        "Exam Created",
        "Your exam has been successfully created."
      );
    } catch (error) {
      console.error("Error creating exam and questions:", error);
      showModal(
        "error",
        "Submission Error",
        "Something went wrong. Please try again."
      );
    }
  };

  return (
    <div className="create-exam__container">
      <div className="create-exam__header">
        <button onClick={() => navigate(-1)}>
          <FiArrowLeft />
        </button>
        <h4>Create New Exam</h4>
      </div>

      <form
        className="create-exam__form-grid"
        onSubmit={handleSubmit(SubmitCreateExam)}
      >
        <div className="create-exam__form-group">
          <label>Exam Name</label>
          <input type="text" {...register("name", { required: true })} />
          {errors.name && (
            <p className="create-exam__error">Exam name is required</p>
          )}
        </div>

        <div className="create-exam__form-group">
          <label>Course</label>
          <input type="text" {...register("course", { required: true })} />
          {errors.course && (
            <p className="create-exam__error">Course is required</p>
          )}
        </div>

        <div className="create-exam__form-group">
          <label>Exam Date</label>
          <input type="date" {...register("date", { required: true })} />
          {errors.date && (
            <p className="create-exam__error">Exam date is required</p>
          )}
        </div>

        <div className="create-exam__form-group">
          <label>Exam Time</label>
          <input type="time" {...register("time", { required: true })} />
          {errors.time && (
            <p className="create-exam__error">Exam time is required</p>
          )}
        </div>

        <div className="create-exam__form-group">
          <label>Duration (Minutes)</label>
          <input
            type="number"
            {...register("duration", {
              required: true,
              min: 1,
              valueAsNumber: true,
            })}
          />
          {errors.duration && (
            <p className="create-exam__error">
              Duration must be at least 1 minute
            </p>
          )}
        </div>

        <div className="create-exam__form-group">
          <label>Total Marks</label>
          <input
            type="number"
            {...register("totalMarks", {
              required: true,
              min: 1,
              valueAsNumber: true,
            })}
          />
          {errors.totalMarks && (
            <p className="create-exam__error">Total marks must be at least 1</p>
          )}
        </div>

        <FileUpload
          handleFileUpload={handleFileUpload}
          isLoading={isLoading}
          questionError={questionError}
        />

        <div className="create-exam__preview-section">
          <PreviewQuestions
            setIsAddModalOpen={setIsAddModalOpen}
            isAddModalOpen={isAddModalOpen}
          />
        </div>

        <div className="create-exam__actions">
          <button
            className="create-exam__add-question-btn"
            type="button"
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Question
          </button>

          <button type="submit" className="create-exam__submit-btn">
            Create Exam
          </button>
        </div>
        
      </form>
      <Modal
        show={modal.show}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => navigate("/admin/exams")}
        onConfirm={modal.onConfirm}
      />
    </div>
  );
};

export default CreateNewExam;
