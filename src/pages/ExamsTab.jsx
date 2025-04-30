import React, { useState, useMemo, useCallback } from "react";
import { FiBook, FiPlus, FiTrash2, FiSearch } from "react-icons/fi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getExams, deleteExam } from "../services/exam";
import { formatDate } from "../helper/helper";
import "./css/examsTab.css";
import useModal from "../hooks/useModal";
import { toast } from "react-toastify";
import Modal from "../modals/Modal";

const FILTERS = ["all", "active", "upcoming", "completed"];

const ExamsTab = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [deletingExamId, setDeletingExamId] = useState(null);
  const { modal, showModal, closeModal } = useModal();

  const {
    data: exams = [],
    isLoading,
    isError,
    error,
  } = useQuery({ queryKey: ["exams"], queryFn: getExams });

  const deleteExamMutation = useMutation({
    mutationFn: deleteExam,
    onSuccess: () => {
      queryClient.invalidateQueries(["exams"]);
      toast.success("Exam deleted successfully!");
    },
  });

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
  }, []);

  const handleDeleteConfirm = useCallback(
    (exam) => {
      deleteExamMutation.mutate(exam.exam_id);
      closeModal();
    },
    [deleteExamMutation, closeModal]
  );

  const handleDeleteClick = useCallback(
    (e, exam) => {
      e.stopPropagation();
      setDeletingExamId(exam.exam_id);
      showModal(
        "submit",
        "Delete Exam",
        `Are you sure you want to delete "${exam.title}"?`,
        () => handleDeleteConfirm(exam)
      );
    },
    [handleDeleteConfirm, showModal]
  );

  const goToExamDetail = useCallback(
    (examId) => navigate(`/admin/exams/${examId}`),
    [navigate]
  );

  const filteredExams = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return exams.filter(({ title, course, exam_status }) => {
      const matchesFilter =
        activeFilter === "all" || exam_status === activeFilter;
      const matchesSearch =
        title.toLowerCase().includes(query) ||
        course.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [exams, searchQuery, activeFilter]);

  const renderStatusBadge = (status) => (
    <span className={`status-badge ${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  const renderDeleteBtn = (exam) => (
    <button
      className="delete-btn"
      onClick={(e) => handleDeleteClick(e, exam)}
      disabled={deletingExamId === exam.exam_id}
    >
      {deletingExamId === exam.exam_id ? (
        <span className="spinner" />
      ) : (
        <FiTrash2 />
      )}
    </button>
  );

  const renderLoader = () => (
    <div className="loader-container">
      <div className="loader" />
      <p>Loading exams...</p>
    </div>
  );

  const renderTable = () => {
    if (isLoading) return renderLoader();
    if (isError) return <p className="error-message">Error: {error.message}</p>;

    return (
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
                onClick={() => goToExamDetail(exam.exam_id)}
              >
                <td>{exam.title}</td>
                <td>{exam.course}</td>
                <td>{formatDate(exam.scheduled_date)}</td>
                <td>{exam.duration_minutes} min</td>
                <td>{renderStatusBadge(exam.exam_status)}</td>
                <td>{exam.exam_status === "upcoming" && renderDeleteBtn(exam)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="no-exams-message">
                No exams found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  return (
    <div className="exams-tab">
      <div className="exams-management">
        {/* Header */}
        <div className="exams-header">
          <h2>
            <FiBook className="header-icon" />
            Exam Management
          </h2>
          <button
            className="add-exam-btn"
            onClick={() => navigate("/admin/exam/create")}
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
              onChange={handleSearchChange}
            />
          </div>

          <div className="filter-tabs">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                className={`filter-btn ${
                  activeFilter === filter ? "active" : ""
                }`}
                onClick={() => handleFilterChange(filter)}
              >
                {filter === "all"
                  ? "All Exams"
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="exams-table-container">{renderTable()}</div>
      </div>

      <Modal
        modal={modal.show}
        message={modal.message}
        onClose={closeModal}
        onConfirm={() => {
          modal.onConfirm?.();
        }}
      />
    </div>
  );
};

export default ExamsTab;
