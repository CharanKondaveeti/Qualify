import React from "react";
import { FiUsers, FiCheckCircle, FiAward, FiAlertCircle } from "react-icons/fi";

function SummaryCard({ label, value, percentage, Icon, color }) {
  return (
    <div className={`exam-report-summary-card exam-report-border-${color}`}>
      <div className="exam-report-card-content">
        <div>
          <p className="exam-report-card-label">{label}</p>

          <div className="exam-report-card-metric">
            <p className="exam-report-card-value">{value}</p>

            {percentage !== undefined && (
              <span className={`exam-report-card-percentage ${color}`}>
                {percentage}
              </span>
            )}
          </div>
        </div>

        <div className={`exam-report-icon-container ${color}`}>
          <Icon className="exam-report-icon" />
        </div>
      </div>
    </div>
  );
}

export default function SummaryGrid({ exam, students = [], passMark }) {
  const total = students.length;

  const inProgress = students.filter(
    (s) => s.student_status === "in progress",
  ).length;

  const submitted = students.filter((s) => s.student_status === "submitted");

  const revoked = students.filter((s) => s.student_status === "revoked").length;

  const passed = submitted.filter(
    (s) => Number(s.marks_scored) >= Number(passMark),
  ).length;

  const percentage = (value, count) =>
    count ? `${Math.round((value / count) * 100)}%` : "0%";

  return (
    <div className="exam-report-summary-grid">
      <SummaryCard
        label="Total Students"
        value={total}
        Icon={FiUsers}
        color="blue"
      />

      {exam.exam_status === "active" ? (
        <>
          <SummaryCard
            label="In Progress"
            value={inProgress}
            Icon={FiCheckCircle}
            color="green"
          />

          <SummaryCard
            label="Submitted"
            value={submitted.length}
            Icon={FiAward}
            color="purple"
          />

          <SummaryCard
            label="Revoked"
            value={revoked}
            Icon={FiAlertCircle}
            color="amber"
          />
        </>
      ) : (
        <>
          <SummaryCard
            label="Attempted"
            value={submitted.length}
            percentage={percentage(submitted.length, total)}
            Icon={FiCheckCircle}
            color="green"
          />

          <SummaryCard
            label="Passed"
            value={passed}
            percentage={percentage(passed, submitted.length)}
            Icon={FiAward}
            color="purple"
          />

          <SummaryCard
            label="Failed"
            value={submitted.length - passed}
            percentage={percentage(submitted.length - passed, submitted.length)}
            Icon={FiAlertCircle}
            color="amber"
          />
        </>
      )}
    </div>
  );
}
