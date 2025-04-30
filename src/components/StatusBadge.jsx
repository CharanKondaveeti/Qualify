import React from "react";
import {
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import "./css/statusBadge.css"

const StatusBadge = ({ status }) => {
  const statusMap = {
    not_started: {
      color: "exam-report-status-badge gray",
      icon: <FiClock className="exam-report-status-icon" />,
    },
    in_progress: {
      color: "exam-report-status-badge blue",
      icon: <FiClock className="exam-report-status-icon" />,
    },
    submitted: {
      color: "exam-report-status-badge green",
      icon: <FiCheckCircle className="exam-report-status-icon" />,
    },
    disqualified: {
      color: "exam-report-status-badge red",
      icon: <FiXCircle className="exam-report-status-icon" />,
    },
    revoked: {
      color: "exam-report-status-badge orange",
      icon: <FiAlertCircle className="exam-report-status-icon" />,
    },
    lost_connection: {
      color: "exam-report-status-badge red",
      icon: <FiAlertTriangle className="exam-report-status-icon" />,
    },
  };

  return (
    <span
      className={`exam-report-badge ${
        statusMap[status]?.color || "exam-report-status-badge gray"
      }`}
    >
      {statusMap[status]?.icon}
      {status?.charAt(0).toUpperCase() + status?.slice(1).replace("_", " ")}
    </span>
  );
};

export default StatusBadge;
