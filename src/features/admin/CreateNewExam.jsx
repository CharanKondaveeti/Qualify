import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { FiUpload, FiLoader, FiArrowLeft } from "react-icons/fi";
import "./css/CreateNewExam.css";
import UploadQuestions from "../../ui/UploadQuestions";
import { createExamInSupabase, createQuestionsInSupabase } from "../../services/admin";
import supabase from "../../services/supabase";

const CreateNewExam = ({ whenCloseclicked }) => {
  const [newExam, setNewExam] = useState({
    name: "",
    course: "",
    date: "",
    time: "",
    duration: 60,
  });
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [endTime, setEndTime] = useState("");

  const addQuestion = (newQ) => {
    setQuestions((prev) => [...prev, newQ]);
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter((q) => q.question_id !== id));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!newExam.name.trim()) newErrors.name = "Exam name is required";
    if (!newExam.course.trim()) newErrors.course = "Course is required";
    if (!newExam.date) newErrors.date = "Exam date is required";
    if (!newExam.time) newErrors.time = "Exam time is required";
    if (!newExam.duration || newExam.duration < 1)
      newErrors.duration = "Duration must be at least 1 minute";
    if (questions.length === 0)
      newErrors.questions = "At least one question is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);

    if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const parsedQuestions = results.data
            .filter((q) => q.question)
            .map((q, i) => ({
              question_id: Date.now() + i,
              question_text: q.question || "",
              options: [
                q.option1 || "",
                q.option2 || "",
                q.option3 || "",
                q.option4 || "",
              ].filter((opt) => opt),
              correct_option: parseInt(q.correctAnswer) || 0,
              marks: parseInt(q.marks) || 1,
            }))
            .filter((q) => q.options.length > 0);

          setQuestions(parsedQuestions);
          setIsLoading(false);
        },
        error: () => {
          setIsLoading(false);
          alert("Error parsing CSV file");
        },
      });
    } else {
      setIsLoading(false);
      alert("Excel file support would require additional library (xlsx)");
    }
  };

  const createExam = async () => {
    if (!validateForm()) return;

    try {
      // 🔐 Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("Unable to get user. Please login again.");
        return;
      }

      const userId = user.id;

      // 📝 Exam data with created_by
      const examData = {
        title: newExam.name,
        course: newExam.course,
        status: "upcoming",
        scheduled_date: newExam.date,
        duration_minutes: newExam.duration,
        created_by: userId, // 👈 attach user ID here
      };

      // ✅ Step 1: Create exam
      const examId = await createExamInSupabase(examData);

      // ✅ Step 2: Attach exam_id to each question (remove question_id if UUID error)
      const questionsWithExamId = questions.map(({ question_id, ...q }) => ({
        ...q,
        exam_id: examId[0].exam_id,
      }));

      // ✅ Step 3: Save questions
      await createQuestionsInSupabase(questionsWithExamId);

      // ✅ Step 4: Success
      alert("Exam and questions created successfully!");
    } catch (error) {
      console.error("Error creating exam and questions:", error);
      alert("Something went wrong. Please try again.");
    }
  };


  return (
    <div className="create-exam-form">
      <div className="form-header">
        <h4>Create New Exam</h4>
        <button onClick={whenCloseclicked}>
          <FiArrowLeft />
        </button>
      </div>
      <form>
        <div className="form-group">
          <label>Exam Name</label>
          <input
            type="text"
            value={newExam.name}
            onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
          />
          {errors.name && <span className="error">{errors.name}</span>}
        </div>
        <div className="form-group">
          <label>Course</label>
          <input
            type="text"
            value={newExam.course}
            onChange={(e) => setNewExam({ ...newExam, course: e.target.value })}
          />
          {errors.course && <span className="error">{errors.course}</span>}
        </div>
        <div className="form-group">
          <label>Exam Date</label>
          <input
            type="date"
            value={newExam.date}
            onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
          />
          {errors.date && <span className="error">{errors.date}</span>}
        </div>
        <div className="form-group">
          <label>Exam Time</label>
          <input
            type="time"
            value={newExam.time}
            onChange={(e) => setNewExam({ ...newExam, time: e.target.value })}
          />
          {errors.time && <span className="error">{errors.time}</span>}
        </div>
        <div className="form-group">
          <label>Duration (Minutes)</label>
          <input
            type="number"
            min="1"
            value={newExam.duration}
            onChange={(e) =>
              setNewExam({ ...newExam, duration: e.target.value })
            }
          />
          {errors.duration && <span className="error">{errors.duration}</span>}
        </div>

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
          {errors.questions && (
            <span className="error-message">{errors.questions}</span>
          )}
        </div>

        <UploadQuestions
          questions={questions}
          onAdd={addQuestion}
          onDelete={removeQuestion}
          onUpdate={setQuestions}
        />
      </form>
      <div className="form-actions">
        <button onClick={createExam}>Create Exam</button>
      </div>
    </div>
  );
};

export default CreateNewExam;
