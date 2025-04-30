import React, { useState } from "react";
import {
  FiArrowLeft,
  FiUser,
  FiClock,
  FiAward,
  FiEdit,
  FiSave,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { updateExamInSupabase } from "../services/admin";

const ExamHeader = ({ exam }) => {
  const navigate = useNavigate();

  const [editableDate, setEditableDate] = useState(exam.scheduled_date);
  const [editableMarks, setEditableMarks] = useState(exam.total_marks);
  const [editableDuration, setEditableDuration] = useState(
    exam.duration_minutes
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      await updateExamInSupabase(exam.exam_id, {
        scheduled_date: editableDate,
        total_marks: editableMarks,
        duration_minutes: editableDuration,
      });
      alert("Exam updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update exam.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="exam-report-header">
      <button onClick={() => navigate(-1)} className="exam-report-back-btn">
        <FiArrowLeft className="exam-report-icon-left" />
        Back to Exams
      </button>

      <div className="exam-report-exam-header">
        <div>
          <h1 className="exam-report-exam-title">{exam.title}</h1>

          <div className="exam-report-exam-meta">
            <span className="exam-report-meta-item">
              <FiUser className="exam-report-meta-icon" />
              {exam.course}
            </span>

            <span className="exam-report-meta-item exam-report-editable-field">
              <FiClock className="exam-report-meta-icon" />
              {exam.exam_status === "upcoming" ? (
                <>
                  <input
                    type="datetime-local"
                    value={editableDate?.slice(0, 16)}
                    onChange={(e) => setEditableDate(e.target.value)}
                  />
                  {/* <FiEdit className="edit-indicator" /> */}
                </>
              ) : (
                new Date(exam.scheduled_date).toLocaleString("en-GB")
              )}
            </span>

            <span className="exam-report-meta-item exam-report-editable-field">
              <FiAward className="exam-report-meta-icon" />
              {exam.exam_status === "upcoming" ? (
                <>
                  <input
                    type="number"
                    value={editableMarks}
                    onChange={(e) => setEditableMarks(Number(e.target.value))}
                    min="1"
                  />
                  <span>marks</span>
                  {/* <FiEdit className="edit-indicator" /> */}
                </>
              ) : (
                `${exam.total_marks} marks`
              )}
            </span>

            <span className="exam-report-meta-item exam-report-editable-field">
              <FiClock className="exam-report-meta-icon" />
              {exam.exam_status === "upcoming" ? (
                <>
                  <input
                    type="number"
                    className="duration-input"
                    value={editableDuration}
                    onChange={(e) =>
                      setEditableDuration(Number(e.target.value))
                    }
                    min="1"
                  />
                  <span>minutes</span>
                  {/* <FiEdit className="edit-indicator" /> */}
                </>
              ) : (
                `${exam.duration_minutes} minutes`
              )}
            </span>
          </div>

          {exam.exam_status === "upcoming" && (
            <button
              onClick={handleUpdate}
              disabled={isSaving}
              className="exam-report-save-btn"
            >
              <FiSave className="exam-report-meta-icon" />{" "}
              {isSaving ? "Saving..." : "Update"}
            </button>
          )}
        </div>

        <div className={`exam-report-status-chip ${exam.exam_status}`}>
          {exam.exam_status?.charAt(0).toUpperCase() +
            exam.exam_status?.slice(1)}
        </div>
      </div>
    </div>
  );
};

export default ExamHeader;
