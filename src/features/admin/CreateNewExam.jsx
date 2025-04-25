import React, { useState } from "react";
import Papa from "papaparse";
import { FiUpload, FiLoader, FiArrowLeft } from "react-icons/fi";
import "./css/CreateNewExam.css";
import PreviewQuestions from "../../ui/PreviewQuestions";
import {
  createExamInSupabase,
  createQuestionsInSupabase,
} from "../../services/admin";
import supabase from "../../services/supabase";
import { useDispatch, useSelector } from "react-redux";
import { setExamDetails } from "../../store/newExamSlice";
import { setQuestionsR } from "../../store/questionSlice";
import { useNavigate } from "react-router-dom";

const CreateNewExam = () => {
  const dispatch = useDispatch();
  const newExamStore = useSelector((state) => state.newExam.newExam);
  const questions = useSelector((state) => state.questions.questions);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const navigate = useNavigate();

  const onInputChange = (field) => (e) =>
    dispatch(setExamDetails({ [field]: e.target.value }));

  const parseCSV = (file) => {
    setIsLoading(true);

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const parsed = results.data
          .filter((q) => q.question)
          .map((q, i) => ({
            question_id: Date.now() + i,
            question_text: q.question || "",
            options: [q.option1, q.option2, q.option3, q.option4].filter(
              Boolean
            ),
            correct_option: parseInt(q.correctAnswer) || 0,
            marks: parseInt(q.marks) || 1,
          }))
          .filter((q) => q.options.length > 0);

        dispatch(setQuestionsR(parsed));
        setIsLoading(false);
      },
      error: () => {
        alert("Error parsing CSV file");
        setIsLoading(false);
      },
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isCSV = file.type === "text/csv" || file.name.endsWith(".csv");

    if (isCSV) {
      parseCSV(file);
    } else {
      alert("Only CSV files are supported.");
    }
  };

  const createExam = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("Unable to get user. Please login again.");
        return;
      }

      const examData = {
        title: newExamStore.name,
        course: newExamStore.course,
        status: "upcoming",
        scheduled_date: newExamStore.date,
        duration_minutes: newExamStore.duration,
        created_by: user.id,
      };

      const examId = await createExamInSupabase(examData);

      const questionsWithExamId = questions.map(({ question_id, ...q }) => ({
        ...q,
        exam_id: examId[0]?.exam_id,
      }));

      await createQuestionsInSupabase(questionsWithExamId);

      alert("Exam and questions created successfully!");
      navigate("/admin/exams");
    } catch (error) {
      console.error("Error creating exam and questions:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  const formLabels = [
    {
      label: "Exam Name",
      type: "text",
      value: newExamStore.name,
      field: "name",
    },
    {
      label: "Course",
      type: "text",
      value: newExamStore.course,
      field: "course",
    },
    {
      label: "Exam Date",
      type: "date",
      value: newExamStore.date,
      field: "date",
    },
    {
      label: "Exam Time",
      type: "time",
      value: newExamStore.time,
      field: "time",
    },
    {
      label: "Duration (Minutes)",
      type: "number",
      value: newExamStore.duration,
      field: "duration",
      min: 1,
    },
  ]
  
  return (
    <div className="create-exam-form">
      <div className="form-header">
        <button onClick={() => navigate(-1)}>
          <FiArrowLeft />
        </button>
        <h4>Create New Exam</h4>
      </div>

      <form>
        {formLabels.map(({ label, ...input }) => (
          <div className="form-group" key={input.field}>
            <label>{label}</label>
            <input {...input} onChange={onInputChange(input.field)} />
          </div>
        ))}

        <FileUpload handleFileUpload={handleFileUpload} isLoading={isLoading} />
        <PreviewQuestions
          setIsAddModalOpen={setIsAddModalOpen}
          isAddModalOpen={isAddModalOpen}
        />
      </form>

      <button
        className="add-question-btn"
        onClick={(e) => {
          e.preventDefault();
          setIsAddModalOpen(true);
        }}
      >
        Add New Question
      </button>

      <div className="form-actions">
        <button onClick={createExam}>Create Exam</button>
      </div>
    </div>
  );
};


function FileUpload({ handleFileUpload, isLoading }) {
  return (
    <div className="form-group">
      <label>Upload Questions *</label>
      <div className="upload-area">
        <label className="upload-btn">
          <FiUpload />
          Choose CSV File
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
        </label>
        <p className="upload-text">or drag and drop file here</p>
        {isLoading && (
          <div className="loading-indicator">
            <FiLoader className="spinner" />
            <span>Processing file...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateNewExam;
