import React, { useState, useEffect } from "react";
import { FiUsers, FiCheckCircle, FiAward, FiAlertCircle } from "react-icons/fi";
import supabase from "../services/supabase";

// Fetch students report from supabase
export async function getStudentsReport(exam_id) {
  const { data, error } = await supabase
    .from("studentReport")
    .select("*")
    .eq("exam_id", exam_id);

  if (error) {
    throw new Error("Student report could not be loaded: " + error.message);
  }

  return data;
}

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

const SummaryGrid = ({ exam, passMark }) => {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    // Subscribe to real-time updates
    const channel = supabase
      .channel("exam-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "studentReport" },
        (payload) => {
          console.log("Received update:", payload);
          setStudents((prevStudents) =>
            prevStudents.map((student) =>
              student.student_report_id === payload.new.student_report_id
                ? { ...student, exam_status: payload.new.exam_status }
                : student
            )
          );
        }
      )
      .subscribe();

    // Fetch initial students data
    const fetchStudents = async () => {
      try {
        const data = await getStudentsReport(exam.exam_id);
        setStudents(data || []);
      } catch (error) {
        console.error(error.message);
      }
    };

    fetchStudents();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [exam.exam_id]);

  // Calculations
  const totalStudents = students.length;
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
