import React, { useState, useEffect } from "react"; // ✅ added useEffect
import { FiBook, FiPlus, FiTrash2, FiSearch } from "react-icons/fi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import "./css/examsTab.css";
import { deleteExam, getExams } from "../../services/admin";
import { formatDate } from "../../helper/helper";
import supabase from "../../services/supabase";

const ExamsTab = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // ✅ Realtime: listen to exam status updates
  useEffect(() => {
    const channel = supabase
      .channel("exams-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "exams",
        },
        (payload) => {
          // Refetch the exams when any exam gets updated
          console.log("Exam updated:", payload.new);
          queryClient.invalidateQueries(["exams"]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel); // Cleanup
    };
  }, [queryClient]);

  // Fetch exams
  const {
    data: exams = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["exams"],
    queryFn: getExams,
  });

  // Delete mutation
  const deleteExamMutation = useMutation({
    mutationFn: (examId) => deleteExam(examId),
    onSuccess: () => {
      queryClient.invalidateQueries(["exams"]);
    },
  });

  const whenExamDltClicked = (e, exam) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      "Are you sure you want to delete this exam?"
    );
    if (confirmed) {
      deleteExamMutation.mutate(exam.exam_id);
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
            onClick={() => navigate("/admin/exam/create")}
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

        <div className="exams-table-container">
          {isLoading ? (
            <p>Loading exams...</p>
          ) : isError ? (
            <p>Error: {error.message}</p>
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
                      onClick={() =>
                        navigate(`/admin/exams/${exam.exam_id}`, {
                          state: { exam },
                        })
                      }
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
