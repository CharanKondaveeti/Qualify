import PageLoader from "../../../shared/components/PageLoader";
import { useAppDialog } from "../../../shared/components/ConfirmDialogProvider";
import { isDemo } from "../../../lib/supabase";
import { useEffect, useMemo, useState } from "react";
import {
  FiFileText,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiMoreHorizontal,
  FiCopy,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiActivity,
} from "react-icons/fi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getExams, deleteExam } from "../../../services/examService";
import { listInstitutionMembers } from "../../../services/institutionService";
import { duplicateExamFromTemplate } from "../../../services/examDuplicationService";
import { formatDate } from "../../../utils/dateAndStorage";
import { useAdminWorkspace } from "../context/AdminWorkspaceContext";
import useModal from "../../../shared/hooks/useModal";
import Modal from "../../../shared/components/Modal";
import "../styles/exams-page.css";

const FILTERS = ["all", "active", "upcoming", "completed"];

const STATS = [
  { label: "All examinations", status: "all", Icon: FiFileText },
  { label: "Active now", status: "active", Icon: FiActivity },
  { label: "Upcoming", status: "upcoming", Icon: FiClock },
  { label: "Completed", status: "completed", Icon: FiCheckCircle },
];

export default function ExamsPage() {
  const navigate = useNavigate();
  const { institutionId, isSuperAdmin } = useAdminWorkspace();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [examPage, setExamPage] = useState(1);
  const EXAMS_PER_PAGE = 15;
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deletingExamId, setDeletingExamId] = useState(null);
  const [duplicatingExamId, setDuplicatingExamId] = useState(null);
  const { modal, showModal, closeModal } = useModal();
  const dialog = useAppDialog();

  const {
    data: exams = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["exams", institutionId],
    queryFn: () => getExams(institutionId),
    refetchInterval: 15000,
  });

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ["exam-responsible-staff", institutionId],
    queryFn: () => listInstitutionMembers(institutionId),
    enabled: Boolean(isSuperAdmin && institutionId && !isDemo),
    staleTime: 60_000,
  });
  const staffById = useMemo(
    () => new Map(staff.map(person => [person.user_id, person])),
    [staff],
  );
  const responsibleName = exam => {
    if (!exam.created_by) return "Not assigned";
    const owner = staffById.get(exam.created_by);
    return owner?.name || owner?.email || (staffLoading ? "Loading…" : "Staff unavailable");
  };

  const deleteExamMutation = useMutation({
    mutationFn: deleteExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast.success("Exam deleted successfully!");
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setDeletingExamId(null),
  });

  const summary = useMemo(
    () =>
      exams.reduce(
        (counts, exam) => {
          counts.all += 1;
          if (counts[exam.exam_status] !== undefined)
            counts[exam.exam_status] += 1;
          return counts;
        },
        { all: 0, active: 0, upcoming: 0, completed: 0 },
      ),
    [exams],
  );

  const filteredExams = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return exams.filter(
      (exam) =>
        (activeFilter === "all" || exam.exam_status === activeFilter) &&
        `${exam.title || ""} ${exam.course || ""} ${isSuperAdmin ? (staffById.get(exam.created_by)?.name || "") + " " + (staffById.get(exam.created_by)?.email || "") : ""}`
          .toLocaleLowerCase()
          .includes(query),
    );
  }, [exams, searchQuery, activeFilter, staffById, isSuperAdmin]);

  const totalExamPages = Math.max(1, Math.ceil(filteredExams.length / EXAMS_PER_PAGE));
  const currentExamPage = Math.min(examPage, totalExamPages);
  const pagedExams = filteredExams.slice((currentExamPage - 1) * EXAMS_PER_PAGE, currentExamPage * EXAMS_PER_PAGE);
  useEffect(() => { setExamPage(1); setOpenMenuId(null); }, [searchQuery, activeFilter]);
  useEffect(() => { if (examPage > totalExamPages) setExamPage(totalExamPages); }, [examPage, totalExamPages]);

  useEffect(() => {
    if (!openMenuId) return;

    const closeOutside = (event) => {
      if (!event.target.closest("[data-exam-actions]")) setOpenMenuId(null);
    };

    const closeEscape = (event) => {
      if (event.key === "Escape") setOpenMenuId(null);
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [openMenuId]);

  const goToExam = (examId) =>
    navigate(
      isDemo
        ? `/demo/admin/exams/${examId}`
        : `/app/i/${institutionId}/exams/${examId}`,
    );

  function toLocalInput(date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }

  async function handleDuplicate(exam) {
    setOpenMenuId(null);
    const date = await dialog.input(
      "Choose the scheduled date and time for the new examination.",
      {
        title: "Duplicate examination",
        label: "New exam date and time",
        inputType: "datetime-local",
        initialValue: toLocalInput(new Date(Date.now() + 86400000)),
        confirmLabel: "Create copy",
      },
    );
    if (!date) return;

    setDuplicatingExamId(exam.exam_id);
    try {
      await duplicateExamFromTemplate(exam, date);
      await queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast.success(`Created Copy of ${exam.title} in Upcoming examinations.`);
    } catch (err) {
      toast.error(err.message || "Could not duplicate exam.");
    } finally {
      setDuplicatingExamId(null);
    }
  }

  function confirmDelete(exam) {
    setOpenMenuId(null);

    showModal(
      "submit",
      "Delete Exam",
      `Are you sure you want to delete "${exam.title}"?`,
      () => {
        setDeletingExamId(exam.exam_id);
        deleteExamMutation.mutate(exam.exam_id);
        closeModal();
      },
    );
  }

  function renderRows() {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={isSuperAdmin ? 7 : 6} className="exams-table-message">
            <PageLoader label="Loading examinations…" />
          </td>
        </tr>
      );
    }

    if (isError) {
      return (
        <tr>
          <td colSpan={isSuperAdmin ? 7 : 6} className="exams-table-message" role="alert">
            {error?.message || "Could not load examinations."}
          </td>
        </tr>
      );
    }

    if (!filteredExams.length) {
      return (
        <tr>
          <td colSpan={isSuperAdmin ? 7 : 6} className="exams-table-message">
            No examinations match your search.
          </td>
        </tr>
      );
    }

    return pagedExams.map((exam) => (
      <tr
        key={exam.exam_id}
        className="exam-row"
        tabIndex={0}
        aria-label={`Open ${exam.title}`}
        onClick={() => goToExam(exam.exam_id)}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            goToExam(exam.exam_id);
          }
        }}
      >
        <td className="exam-name-cell">{exam.title}</td>
        <td>{exam.course}</td>
        {isSuperAdmin && (
          <td className="exam-responsible-cell">
            <span className="exam-responsible-name">{responsibleName(exam)}</span>
            {staffById.get(exam.created_by)?.email && (
              <small className="exam-responsible-email">{staffById.get(exam.created_by).email}</small>
            )}
          </td>
        )}
        <td>
          <span className="exam-meta-value">
            <FiCalendar aria-hidden="true" />
            {formatDate(exam.scheduled_date)}
          </span>
        </td>
        <td>
          <span className="exam-meta-value">
            <FiClock aria-hidden="true" />
            {exam.timing_mode === "time" && exam.ends_at
              ? `Closes ${new Date(exam.ends_at).toLocaleString("en-IN")}`
              : `${exam.duration_minutes} min / student`}
          </span>
        </td>
        <td>
          <span className={`status-badge ${exam.exam_status}`}>
            {exam.exam_status?.charAt(0).toUpperCase() +
              exam.exam_status?.slice(1)}
          </span>
        </td>
        <td
          className="exam-actions-cell"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="exam-row-actions" data-exam-actions>
            <button
              type="button"
              className="exam-more-btn"
              aria-label={`Actions for ${exam.title}`}
              aria-haspopup="menu"
              aria-expanded={openMenuId === exam.exam_id}
              onClick={() =>
                setOpenMenuId((value) =>
                  value === exam.exam_id ? null : exam.exam_id,
                )
              }
            >
              <FiMoreHorizontal aria-hidden="true" />
            </button>

            {openMenuId === exam.exam_id && (
              <div className="exam-actions-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => goToExam(exam.exam_id)}
                >
                  View exam
                </button>

                <button
                  type="button"
                  role="menuitem"
                  disabled={duplicatingExamId === exam.exam_id}
                  onClick={() => handleDuplicate(exam)}
                >
                  <FiCopy aria-hidden="true" />
                  {duplicatingExamId === exam.exam_id
                    ? "Duplicating…"
                    : "Duplicate exam"}
                </button>

                {exam.exam_status === "upcoming" && (
                  <button
                    type="button"
                    role="menuitem"
                    className="exam-delete-action"
                    disabled={deletingExamId === exam.exam_id}
                    onClick={() => confirmDelete(exam)}
                  >
                    <FiTrash2 aria-hidden="true" />
                    Delete exam
                  </button>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>
    ));
  }

  return (
    <div className="exams-tab">
      <header className="exams-page-heading">
        <div className="exams-page-heading-copy">
          <h1>Examinations</h1>
          <p>Create, manage and monitor your assessments.</p>
        </div>
        <button
          type="button"
          className="add-exam-btn"
          onClick={() =>
            navigate(
              isDemo
                ? "/demo/admin/exams/new"
                : `/app/i/${institutionId}/exams/new`,
            )
          }
        >
          <FiPlus aria-hidden="true" />
          Create exam
        </button>
      </header>

      <section className="exam-summary" aria-label="Examination totals">
        {STATS.map(({ label, status, Icon }) => (
          <div className={`exam-stat exam-stat--${status}`} key={status}>
            <span className="exam-stat-icon">
              <Icon aria-hidden="true" />
            </span>
            <strong>{summary[status]}</strong>
            <span className="exam-stat-label">{label}</span>
          </div>
        ))}
      </section>

      <section className="exams-management" aria-label="Exam management">
        <div className="exams-controls">
          <div className="filter-tabs" aria-label="Filter examinations">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`filter-btn${activeFilter === filter ? " active" : ""}`}
                aria-pressed={activeFilter === filter}
                onClick={() => setActiveFilter(filter)}
              >
                {filter === "all"
                  ? "All Exams"
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          <label className="search-bar">
            <FiSearch className="search-icon" aria-hidden="true" />
            <span className="sr-only">Search examinations</span>
            <input
              type="search"
              placeholder="Search exams..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
        </div>

        <div
          className="exams-table-container"
          tabIndex={0}
          role="region"
          aria-label="Examination list"
        >
          <table className="exams-table">
            <thead>
              <tr>
                <th>Exam Name</th>
                <th>Course</th>
                {isSuperAdmin && <th>Staff in charge</th>}
                <th>Date &amp; Time</th>
                <th>Timing</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
          </table>
        </div>
        {!isLoading && !isError && filteredExams.length > 0 && <nav className="exams-pagination" aria-label="Examination list pages">
          <span>Showing {(currentExamPage - 1) * EXAMS_PER_PAGE + 1}–{Math.min(currentExamPage * EXAMS_PER_PAGE, filteredExams.length)} of {filteredExams.length} exams</span>
          {totalExamPages > 1 && <div className="exams-pagination-actions">
            <button type="button" disabled={currentExamPage === 1} onClick={() => { setExamPage(p => Math.max(1, p - 1)); setOpenMenuId(null); }}>Previous</button>
            <span aria-live="polite">Page {currentExamPage} of {totalExamPages}</span>
            <button type="button" disabled={currentExamPage === totalExamPages} onClick={() => { setExamPage(p => Math.min(totalExamPages, p + 1)); setOpenMenuId(null); }}>Next</button>
          </div>}
        </nav>}
      </section>

      <Modal
        modal={modal}
        closeModal={closeModal}
        confirmSubmit={() => modal.onConfirm?.()}
      />
    </div>
  );
}
