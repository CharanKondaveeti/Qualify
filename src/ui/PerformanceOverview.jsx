import React from "react";
import {
  FiClock,
  FiAlertCircle,
  FiCheckCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import "./css/PerformanceOverview.css"

const PerformanceItem = ({ label, value, icon, iconColor }) => {
  return (
    <div className="exam-report-performance-card">
      <div className="exam-report-performance-item">
        <div className={`exam-report-icon-container ${iconColor}`}>{icon}</div>
        <div>
          <p className="exam-report-label">{label}</p>
          <p className="exam-report-value">{value}</p>
        </div>
      </div>
    </div>
  );
};

const PerformanceOverview = ({ stats }) => {
  return (
    <div className="exam-report-performance-section">
      <div className="exam-report-section-header">Performance Overview</div>
      <div className="exam-report-performance-grid">
        <PerformanceItem
          label="In Progress"
          value={stats?.inProgress || 0}
          icon={<FiClock className="exam-report-icon" />}
          iconColor="blue"
        />
        <PerformanceItem
          label="Revoked"
          value={stats?.revoked || 0}
          icon={<FiAlertCircle className="exam-report-icon" />}
          iconColor="orange"
        />
        <PerformanceItem
          label="Submitted"
          value={stats?.submitted || 0}
          icon={<FiCheckCircle className="exam-report-icon" />}
          iconColor="green"
        />
        <PerformanceItem
          label="Lost Connection"
          value={stats?.lostConnection || 0}
          icon={<FiAlertTriangle className="exam-report-icon" />}
          iconColor="red"
        />
      </div>
    </div>
  );
};

export default PerformanceOverview;
