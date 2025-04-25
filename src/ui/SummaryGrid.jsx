import React from "react";
import { FiUsers, FiCheckCircle, FiAward, FiAlertCircle } from "react-icons/fi";

const SummaryCard = ({ label, value, percentage, icon, borderColor }) => {
  return (
    <div className={`exam-report-summary-card exam-report-border-${borderColor}`}>
      <div className="exam-report-card-content">
        <div>
          <p className="exam-report-card-label">{label}</p>
          <div className="exam-report-card-metric">
            <p className="exam-report-card-value">{value}</p>
            {percentage && (
              <span className={`exam-report-card-percentage ${borderColor}`}>
                {percentage}
              </span>
            )}
          </div>
        </div>
        <div className={`exam-report-icon-container ${borderColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const SummaryGrid = ({ stats }) => {
  return (
    <div className="exam-report-summary-grid">
      <SummaryCard
        label="Total Students"
        value={stats?.totalStudents || 0}
        icon={<FiUsers className="exam-report-icon" />}
        borderColor="blue"
      />

      <SummaryCard
        label="Attempted"
        value={stats?.attempted || 0}
        percentage={`${stats?.completionRate || 0}%`}
        icon={<FiCheckCircle className="exam-report-icon" />}
        borderColor="green"
      />

      <SummaryCard
        label="Passed"
        value={stats?.passed || 0}
        percentage={
          stats?.attempted
            ? `${Math.round((stats.passed / stats.attempted) * 100)}%`
            : "0%"
        }
        icon={<FiAward className="exam-report-icon" />}
        borderColor="purple"
      />

      <SummaryCard
        label="Disqualified"
        value={stats?.avgScore || 0}
        percentage="/100"
        icon={<FiAlertCircle className="exam-report-icon" />}
        borderColor="amber"
      />
    </div>
  );
};

export default SummaryGrid;
