import React, { useState, useEffect } from "react";
import {
  FiUpload,
  FiX,
  FiEdit2,
  FiTrash2,
  FiLoader,
  FiArrowLeft,
} from "react-icons/fi";
import Papa from "papaparse";
import "./css/CreateNewExam.css";
import QuestionList from "../../ui/QuestionList";
import AccordionSection from "../../ui/AccordionSection";

const CreateNewExam = ({ whenCloseclicked }) => {
  const [newExam, setNewExam] = useState({
    name: "",
    course: "",
    date: "",
    time: "",
    duration: 60, // Default duration in minutes
  });
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [endTime, setEndTime] = useState("");
  const [isAccordionExpanded, setIsAccordionExpanded] = useState(true);

  const addQuestion = (newQ) => {
    setQuestions((prev) => [...prev, { ...newQ, id: Date.now() }]);
  };


  // Calculate end time whenever date, time, or duration changes
  useEffect(() => {
    if (newExam.date && newExam.time && newExam.duration) {
      const [hours, minutes] = newExam.time.split(":").map(Number);
      const startDate = new Date(newExam.date);
      startDate.setHours(hours, minutes);

      const endDate = new Date(startDate.getTime() + newExam.duration * 60000);
      const endTimeStr = endDate.toTimeString().substring(0, 5);
      setEndTime(endTimeStr);
    } else {
      setEndTime("");
    }
  }, [newExam.date, newExam.time, newExam.duration]);

  // Validate form
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

  // Handle file upload
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
              id: Date.now() + i,
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

          setQuestions([...questions, ...parsedQuestions]);
          console.log([...questions, ...parsedQuestions]);
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

  const removeQuestion = (id) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const resetForm = () => {
    setNewExam({
      name: "",
      course: "",
      date: "",
      time: "",
      duration: 60,
    });
    setQuestions([]);
    setErrors({});
  };

  const createExam = async () => {
    if (!validateForm()) return;

    const examId = Date.now();
    const dateObj = new Date(`${newExam.date}T${newExam.time}`);
    const formattedDateTime = `${dateObj.getFullYear()}-${String(
      dateObj.getMonth() + 1
    ).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")} ${String(
      dateObj.getHours()
    ).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(
      2,
      "0"
    )}:${String(dateObj.getSeconds()).padStart(2, "0")}`;

    const exam = {
      id: examId,
      title: newExam.name,
      course: newExam.course,
      total_questions: questions.length,
      total_marks: questions.reduce((sum, q) => sum + q.marks, 0),
      pass_mark: 50, 
      status: "upcoming",
      created_by: 101,
      scheduled_date: formattedDateTime,
      duration_minutes: newExam.duration,
      created_at: new Date().toISOString(),
    };

    try {
      // Save exam
      const examRes = await fetch("http://localhost:5001/Exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exam),
      });

      if (!examRes.ok) throw new Error("Failed to save exam");

      // Save questions
      const questionPromises = questions.map((q) =>
        fetch("http://localhost:5002/Questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exam_id: examId,
            question_text: q.question_text,
            question_type: "mcq",
            options: q.options,
            correct_option: q.correctAnswer,
            marks: q.marks,
            negative_marks: 0,
            image_url: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        })
      );

      await Promise.all(questionPromises);

      alert("Exam created successfully!");

      resetForm();
      whenCloseclicked();
    } catch (error) {
      console.error("Error creating exam:", error);
      alert("Error creating exam. Please try again.");
    }
  };


  return (
    <div className="create-exam-form">
      <div className="form-header">
        <button
          onClick={whenCloseclicked}
          className="create-exam-form-back-btn"
        >
          <FiArrowLeft className="exam-report-icon-left" />
        </button>
        <h3>Create New Exam</h3>
      </div>

      <div className="form-body">
        <div className="form-group">
          <label>Exam Name *</label>
          <input
            type="text"
            value={newExam.name}
            onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
            placeholder="Final Physics"
            className={errors.name ? "error" : ""}
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>
        <div className="form-group">
          <label>Course *</label>
          <input
            type="text"
            value={newExam.course}
            onChange={(e) => setNewExam({ ...newExam, course: e.target.value })}
            placeholder="Physics 201"
            className={errors.course ? "error" : ""}
          />
          {errors.course && (
            <span className="error-message">{errors.course}</span>
          )}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Exam Date *</label>
            <input
              type="date"
              value={newExam.date}
              onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
              className={errors.date ? "error" : ""}
            />
            {errors.date && (
              <span className="error-message">{errors.date}</span>
            )}
          </div>
          <div className="form-group">
            <label>Start Time *</label>
            <input
              type="time"
              value={newExam.time}
              onChange={(e) => setNewExam({ ...newExam, time: e.target.value })}
              className={errors.time ? "error" : ""}
            />
            {errors.time && (
              <span className="error-message">{errors.time}</span>
            )}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Duration (minutes) *</label>
            <input
              type="number"
              min="1"
              value={newExam.duration}
              onChange={(e) =>
                setNewExam({
                  ...newExam,
                  duration: Math.max(1, parseInt(e.target.value) || 1),
                })
              }
              className={errors.duration ? "error" : ""}
            />
            {errors.duration && (
              <span className="error-message">{errors.duration}</span>
            )}
          </div>
          <div className="form-group">
            <label>End Time</label>
            <input
              type="text"
              value={endTime || "N/A"}
              readOnly
              className="read-only"
            />
          </div>
        </div>
        {/* File Upload */}
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

        {questions.length > 0 && (
            <QuestionList
              questions={questions}
              onDelete={removeQuestion}
              onUpdate={(updatedQuestion) => {
                setQuestions(
                  questions.map((q) =>
                    q.id === updatedQuestion.id ? updatedQuestion : q
                  )
                );
              }}
              onAdd={addQuestion}
            />
        )}
      </div>

      <div className="form-footer">
        <button className="cancel-btn" onClick={whenCloseclicked}>
          Cancel
        </button>
        <button
          className="save-btn"
          onClick={createExam}
          disabled={questions.length === 0}
        >
          Save Exam
        </button>
      </div>
    </div>
  );
};

export default CreateNewExam;
