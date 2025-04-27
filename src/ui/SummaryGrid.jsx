import React from "react";
import { FiUsers, FiCheckCircle, FiAward, FiAlertCircle } from "react-icons/fi";

const SummaryCard = ({ label, value, percentage, icon, borderColor }) => {
  return (
    <div
      className={`exam-report-summary-card exam-report-border-${borderColor}`}
    >
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

const SummaryGrid = ({ students, exam, passMark }) => {
  const totalStudents = students.length || 0;

  const inProgress = students.filter(
    (s) => s.exam_status === "inProgress"
  ).length;
  const submitted = students.filter(
    (s) => s.exam_status === "submitted"
  ).length;
  const revoked = students.filter((s) => s.exam_status === "revoked").length;

  const attempted = submitted;
  const completionRate = totalStudents
    ? Math.round((attempted / totalStudents) * 100)
    : 0;

  const passed = students.filter((s) => s.marks_scored >= passMark).length;
  const failed = attempted - passed;

  return (
    <div className="exam-report-summary-grid">
      <SummaryCard
        label="Total Students"
        value={totalStudents}
        icon={<FiUsers className="exam-report-icon" />}
        borderColor="blue"
      />

      {exam.status === "active" && (
        <>
          <SummaryCard
            label="In Progress"
            value={inProgress}
            icon={<FiCheckCircle className="exam-report-icon" />}
            borderColor="green"
          />
          <SummaryCard
            label="Submitted"
            value={submitted}
            icon={<FiAward className="exam-report-icon" />}
            borderColor="purple"
          />
          <SummaryCard
            label="Revoked"
            value={revoked}
            icon={<FiAlertCircle className="exam-report-icon" />}
            borderColor="amber"
          />
        </>
      )}

      {exam.status === "completed" && (
        <>
          <SummaryCard
            label="Attempted"
            value={attempted}
            percentage={`${completionRate}%`}
            icon={<FiCheckCircle className="exam-report-icon" />}
            borderColor="green"
          />
          <SummaryCard
            label="Passed"
            value={passed}
            percentage={
              attempted ? `${Math.round((passed / attempted) * 100)}%` : "0%"
            }
            icon={<FiAward className="exam-report-icon" />}
            borderColor="purple"
          />
          <SummaryCard
            label="Failed"
            value={failed}
            percentage={
              attempted ? `${Math.round((failed / attempted) * 100)}%` : "0%"
            }
            icon={<FiAlertCircle className="exam-report-icon" />}
            borderColor="amber"
          />
        </>
      )}
    </div>
  );
};

export default SummaryGrid;
