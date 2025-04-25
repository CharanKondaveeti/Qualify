import React, { useEffect, useState } from "react";
import {
  FiBook,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiArrowLeft,
} from "react-icons/fi";
import "./css/examsTab.css";
import CreateNewExam from "./CreateNewExam";
import axios from "axios";
import ExamReportView from "./ExamReportView";
import deleteExam, { getExams } from "../../services/admin";

const ExamsTab = () => {
  const [exams, setExams] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createExam, setCreateExam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examStudents, setExamStudents] = useState(null);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await getExams();
        setExams(response);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching exams:", error);
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

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

  const filteredExams = exams.filter((exam) => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "active" && exam.status === "active") ||
      (activeFilter === "upcoming" && exam.status === "upcoming") ||
      (activeFilter === "completed" && exam.status === "completed");

    const matchesSearch =
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.course.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const whenCloseClicked = () => {
    setCreateExam(false);
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this exam?"
    );
    if (!confirmDelete) return;
    await deleteExam(id);
  };

  const handleEdit = async (exam) => {
    const newTitle = prompt("Enter new exam title:", exam.title);
    if (newTitle === null || newTitle.trim() === "") return;

    const updatedExam = { ...exam, title: newTitle };

    try {
      await axios.put(
        `http://localhost:5001/Exams/${exam.exam_id}`,
        updatedExam
      );
      setExams((prevExams) =>
        prevExams.map((ex) => (ex.exam_id === exam.exam_id ? updatedExam : ex))
      );
    } catch (error) {
      console.error("Error updating exam:", error);
    }
  };

  if (selectedExam) {
    return (
      <ExamReportView
        exam={selectedExam}
        examStudents={examStudents}
        onBack={() => setSelectedExam(null)}
      />
    );
  }

  return (
    <div className="exams-tab">
      {createExam ? (
        <CreateNewExam whenCloseclicked={whenCloseClicked} />
      ) : (
        <div className="exams-management">
          <div className="exams-header">
            <h2>
              <FiBook className="header-icon" />
              Exam Management
            </h2>
            <button
              className="add-exam-btn"
              onClick={() => setCreateExam(true)}
            >
              <FiPlus />
              Create New Exam
            </button>
          </div>

          {/* Controls */}
          <div className="exams-controls">
            <div className="search-bar">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search exams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-tabs">
              {["all", "active", "upcoming", "completed"].map((filter) => (
                <button
                  key={filter}
                  className={`filter-btn ${
                    activeFilter === filter ? "active" : ""
                  }`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter === "all"
                    ? "All Exams"
                    : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Exams Table */}
          <div className="exams-table-container">
            {loading ? (
              <p>Loading exams...</p>
            ) : (
              <table className="exams-table">
                <thead>
                  <tr>
                    <th>Exam Name</th>
                    <th>Course</th>
                    <th>Date & Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExams.length > 0 ? (
                    filteredExams.map((exam) => (
                      <tr
                        key={exam.exam_id}
                        className="exam-row"
                        onClick={() => setSelectedExam(exam)}
                      >
                        <td>{exam.title}</td>
                        <td>{exam.course}</td>
                        <td>{formatDate(exam.scheduled_date)}</td>
                        <td>{exam.duration_minutes || "-"}</td>
                        <td>
                          <span className={`status-badge ${exam.status}`}>
                            {exam.status?.charAt(0).toUpperCase() +
                              exam.status?.slice(1)}
                          </span>
                        </td>
                        <td className="actions-cell">
                          {/* <button
                            className="edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(exam);
                            }}
                          >
                            <FiEdit2 />
                          </button> */}
                          <button
                            className="delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log(exam.exam_id);
                              handleDelete(exam.exam_id);
                            }}
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="no-results">
                      <td colSpan="8">No exams found matching your criteria</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamsTab;
