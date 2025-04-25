import React from "react";
import { FiArrowLeft, FiUser, FiClock } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date
    .toLocaleString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    })
    .replace("at", ",");
};


const ExamHeader = ({ exam }) => {
  const navigate = useNavigate();
  return (
    <div className="exam-report-header">
      <button onClick={()=> navigate(-1)} className="exam-report-back-btn">
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
            <span className="exam-report-meta-item">
              <FiClock className="exam-report-meta-icon" />
              {formatDate(exam.scheduled_date)}
            </span>
          </div>
        </div>

        <div className={`exam-report-status-chip ${exam.status}`}>
          {exam.status?.charAt(0).toUpperCase() + exam.status?.slice(1)}
        </div>
      </div>
    </div>
  );
};

export default ExamHeader;
