import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FiBook, FiPlus, FiTrash2, FiSearch } from "react-icons/fi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getExams, deleteExam } from "../../services/exam";
import { formatDate } from "../../helper/helper";
import supabase from "../../services/supabase";

import "./css/examsTab.css";

const FILTERS = ["all", "active", "upcoming", "completed"];

const ExamsTab = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [deletingExamId, setDeletingExamId] = useState(null);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("exams-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "exams" },
        () => {
          queryClient.invalidateQueries(["exams"]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [queryClient]);

  // Fetch exams
  const {
    data: exams = [],
    isLoading,
    isError,
    error,
  } = useQuery({ queryKey: ["exams"], queryFn: getExams });

  // Delete mutation
  const deleteExamMutation = useMutation({
    mutationFn: deleteExam,
    onSuccess: () => queryClient.invalidateQueries(["exams"]),
  });

  // Filter & search
  const filteredExams = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return exams.filter(({ title, course, status }) => {
      const matchFilter = activeFilter === "all" || status === activeFilter;
      const matchSearch =
        title.toLowerCase().includes(query) ||
        course.toLowerCase().includes(query);
      return matchFilter && matchSearch;
    });
  }, [exams, searchQuery, activeFilter]);

  const handleSearchChange = useCallback(
    (e) => setSearchQuery(e.target.value),
    []
  );
  const handleFilterChange = useCallback(
    (filter) => setActiveFilter(filter),
    []
  );

  const handleDeleteClick = useCallback(
    (e, examId) => {
      e.stopPropagation();
      if (!window.confirm("Are you sure you want to delete this exam?")) return;
      setDeletingExamId(examId);
      deleteExamMutation.mutate(examId, {
        onSettled: () => setDeletingExamId(null),
      });
    },
    [deleteExamMutation]
  );

  const goToExamDetail = useCallback(
    (exam) => {
      navigate(`/admin/exams/${exam.exam_id}`);
    },
    [navigate]
  );

  const renderStatusBadge = (status) => (
    <span className={`status-badge ${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  const renderDeleteBtn = (examId) => (
    <button
      className="delete-btn"
      onClick={(e) => handleDeleteClick(e, examId)}
      disabled={deletingExamId === examId}
    >
      {deletingExamId === examId ? <span className="spinner" /> : <FiTrash2 />}
    </button>
  );

  const renderLoader = () => (
    <div className="loader-container">
      <div className="loader"></div>
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
                onClick={() => goToExamDetail(exam)}
              >
                <td>{exam.title}</td>
                <td>{exam.course}</td>
                <td>{formatDate(exam.scheduled_date)}</td>
                <td>{exam.duration_minutes} min</td>
                <td>{renderStatusBadge(exam.status)}</td>
                <td>
                  {exam.status === "upcoming" && renderDeleteBtn(exam.exam_id)}
                </td>
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
        {/* Table */}
        <div className="exams-table-container">{renderTable()}</div>
      </div>
    </div>
  );
};

export default ExamsTab;
