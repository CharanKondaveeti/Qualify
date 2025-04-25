import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiBook, FiPlus, FiTrash2, FiSearch, FiBarChart2 } from "react-icons/fi";
import "./css/examsTab.css";
import CreateNewExam from "./CreateNewExam";
import {
  fetchExams,
  deleteExam,
  setActiveFilter,
  setSearchQuery,
} from "../../store/AllExamsSlice";
import { formatDate } from "../../helper/helper";
import {Link, useNavigate } from "react-router-dom";

const ExamsTab = () => {
  const dispatch = useDispatch();
  const { exams, loading, searchQuery, activeFilter } = useSelector(
    (state) => state.exams
  );
   const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState(null);

  useEffect(() => {
    dispatch(fetchExams());
  }, [dispatch]);

  const whenExamDltClicked = (e, exam) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      "Are you sure you want to delete this exam?"
    );
    if (confirmed) {
      dispatch(deleteExam(exam.exam_id));
    }
  };

  const filteredExams = exams.filter((exam) => {
    const matchesFilter =
      activeFilter === "all" || exam.status === activeFilter;
    const matchesSearch =
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.course.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="exams-tab">
      <div className="exams-management">
        <div className="exams-header">
          <h2>
            <FiBook className="header-icon" />
            Exam Management
          </h2>
          <button
            className="add-exam-btn"
            onClick={() => {
              navigate("/admin/exam/create");
            }}
          >
            <FiPlus />
            Create New Exam
          </button>
        </div>

        <div className="exams-controls">
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search exams..."
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            />
          </div>

          <div className="filter-tabs">
            {["all", "active", "upcoming", "completed"].map((filter) => (
              <button
                key={filter}
                className={`filter-btn ${
                  activeFilter === filter ? "active" : ""
                }`}
                onClick={() => dispatch(setActiveFilter(filter))}
              >
                {filter === "all"
                  ? "All Exams"
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

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
                      onClick={() => navigate(`/admin/exams/${exam.exam_id}`, { state: { exam } })}
                    >
                      <td>{exam.title}</td>
                      <td>{exam.course}</td>
                      <td>{formatDate(exam.scheduled_date)}</td>
                      <td>{exam.duration_minutes} min</td>
                      <td>
                        <span className={`status-badge ${exam.status}`}>
                          {exam.status?.charAt(0).toUpperCase() +
                            exam.status?.slice(1)}
                        </span>
                      </td>
                      <td>
                        {exam.status === "upcoming" && (
                          <button
                            className="delete-btn"
                            onClick={(e) => whenExamDltClicked(e, exam)}
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">No exams found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamsTab;
