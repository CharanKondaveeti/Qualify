import React, { useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiEdit2,
  FiAlertCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import "./css/examReportView.css";
import ExamHeader from "../../ui/ExamHeader";
import SummaryGrid from "../../ui/SummaryGrid";
import PerformanceOverview from "../../ui/PerformanceOverview";
import StudentTable from "../../ui/StudentTable";
import QuestionTable from "../../ui/QuestionTable";
import AccordionSection from "../../ui/AccordionSection";
import UpcomingExamDetails from "./UpcomingExamDetails";
import { getQuestions } from "../../services/admin";
import { getStudentsReport } from "../../services/admin";

const ExamReportView = ({ exam, onBack }) => {
  const [expandedSections, setExpandedSections] = useState({
    students: true,
    questions: false,
  });
  const [students, setStudents] = useState([]);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const fetchStudentReports = async () => {
      try {
        const studentData = await getStudentsReport(exam.exam_id);
        setStudents(studentData);
      } catch (error) {
        console.error("Error fetching student data:", error);
      }
    };

    fetchStudentReports();
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await getQuestions(exam.exam_id);
        setQuestions(response);
      } catch (error) {
        console.error("Error fetching exams:", error);
      }
    };

    fetchQuestions();
  }, []);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const calculateStats = () => {
    if (!students.length) return null;

    const totalStudents = students.length;
    const attempted = students.filter(
      (s) => s.exam_status === "completed"
    ).length;
    const notAttempted = totalStudents - attempted;
    const passed = students.filter((s) => s.marks_scored >= 40).length;
    const failed = attempted - passed;
    const avgScore =
      students.reduce((sum, s) => sum + (s.marks_scored || 0), 0) / attempted ||
      0;

    return {
      totalStudents,
      attempted,
      notAttempted,
      passed,
      failed,
      avgScore: avgScore.toFixed(2),
      completionRate: ((attempted / totalStudents) * 100).toFixed(2),
      disqualified: students.filter((s) => s.exam_status === "disqualified")
        .length,
      inProgress: students.filter((s) => s.exam_status === "in_progress")
        .length,
      revoked: students.filter((s) => s.exam_status === "revoked").length,
      submitted: students.filter((s) => s.exam_status === "submitted").length,
      lostConnection: students.filter(
        (s) => s.exam_status === "lost_connection"
      ).length,
    };
  };

  const stats = calculateStats();

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

  return (
    <div className="exam-report-view">
      <div className="exam-report-container">
        <ExamHeader exam={exam} onBack={onBack} />

        {exam.status === "upcoming" ? (
          <>
            <div className="exam-report-edit-section">
              <div className="exam-report-edit-header">
                <FiEdit2 className="exam-report-edit-icon" />
                <h2 className="exam-report-edit-title">Edit Exam</h2>
              </div>
              <p className="exam-report-edit-description">
                This exam hasn't started yet. You can modify questions and
                settings.
              </p>
            </div>

            <UpcomingExamDetails
              questions={questions}
              setQuestions={setQuestions}
              students={students}
              examId={exam.exam_id}
            />
          </>
        ) : (
          <div className="exam-report-report-content">
            <SummaryGrid stats={stats} />

            {exam.status === "active" && <PerformanceOverview stats={stats} />}

            <div className="exam-report-accordion-container">
              <AccordionSection
                title="Student Performance"
                isExpanded={expandedSections.students}
                toggleExpand={() => toggleSection("students")}
              >
                <StudentTable students={students} />
              </AccordionSection>

              <AccordionSection
                title="Questions Analysis"
                isExpanded={expandedSections.questions}
                toggleExpand={() => toggleSection("questions")}
              >
                <QuestionTable questions={questions} />
              </AccordionSection>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamReportView;
