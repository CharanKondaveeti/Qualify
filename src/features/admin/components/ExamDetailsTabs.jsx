import PageLoader from '../../../shared/components/PageLoader';
import { useAppDialog } from '../../../shared/components/ConfirmDialogProvider';
import { useState } from "react";
import { FiCheck, FiEdit2, FiLink, FiTrash2, FiX } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";
import QuestionList from "../../questions/components/QuestionList";
import StudentTable from "../../reports/components/StudentTable";
import { updateStudentInSupabase, deleteStudentFromSupabase } from "../../../services/adminService";
import { adminIssueLink, studentLink } from "../../../services/secureExamService";
import "../styles/exam-details-tabs.css";

export default function ExamDetailsTabs({
  students, studentsLoading = false, questions, exam, passMark, setPassMark, mode = "questions", editable = false,
}) {
  const cache = useQueryClient();
  const dialog = useAppDialog();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", rollNo: "" });
  const [search, setSearch] = useState("");
  const [registrationPage, setRegistrationPage] = useState(1);
  const REGISTRATIONS_PER_PAGE = 15;
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const upcoming = exam.exam_status === "upcoming";
  const canEdit = upcoming && editable;

  const visibleStudents = students.filter((student) =>
    `${student.student_name || ""} ${student.roll_no || ""} ${student.email || ""}`
      .toLowerCase().includes(search.trim().toLowerCase()),
  );

  const registrationPageCount = Math.max(1, Math.ceil(visibleStudents.length / REGISTRATIONS_PER_PAGE));
  const currentRegistrationPage = Math.min(registrationPage, registrationPageCount);
  const pageStudents = visibleStudents.slice((currentRegistrationPage - 1) * REGISTRATIONS_PER_PAGE, currentRegistrationPage * REGISTRATIONS_PER_PAGE);

  function beginEdit(student) {
    if (!canEdit) return;
    setError("");
    setMessage("");
    setEditingId(student.student_report_id);
    setForm({
      name: student.student_name || "",
      email: student.email || "",
      rollNo: student.roll_no || "",
    });
  }

  async function saveStudent(id) {
    if (!canEdit || busyId) return;
    if (!form.name.trim() || !form.email.trim() || !form.rollNo.trim()) {
      setError("Name, email and hall ticket number are required.");
      return;
    }
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await updateStudentInSupabase(id, {
        student_name: form.name.trim(),
        email: form.email.trim(),
        roll_no: form.rollNo.trim(),
      });
      setEditingId(null);
      await cache.invalidateQueries({ queryKey: ["students-report", exam.exam_id] });
      setMessage("Student registration updated.");
    } catch (err) {
      setError(err.message || "Unable to update registration.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteStudent(student) {
    if (!canEdit || busyId) return;
    if (!(await dialog.confirm(`Delete registration for ${student.student_name}? This cannot be undone.`, { title: "Delete registration", danger: true, confirmLabel: "Delete registration" }))) return;
    setBusyId(student.student_report_id);
    setError("");
    setMessage("");
    try {
      await deleteStudentFromSupabase(student.student_report_id);
      await cache.invalidateQueries({ queryKey: ["students-report", exam.exam_id] });
      setMessage("Student registration removed.");
    } catch (err) {
      setError(err.message || "Unable to delete registration.");
    } finally {
      setBusyId(null);
    }
  }

  async function renewLink(student) {
    if (!canEdit || busyId) return;
    if (!(await dialog.confirm(`Replace the private exam link for ${student.student_name}? Their old link will stop working.`, { title: "Replace private link" }))) return;
    setBusyId(student.student_report_id);
    setError("");
    setMessage("");
    try {
      const row = await adminIssueLink(student.student_report_id);
      const url = studentLink(exam.exam_id, row.student_report_id, row.access_token);
      try {
        await navigator.clipboard.writeText(url);
        setMessage("New private link copied. Share it securely; the old link is invalid.");
      } catch {
        await dialog.alert(`Copy the new private link below now. It will not be shown again:\n\n${url}`, { title: 'New private examination link', confirmLabel: 'I have copied it' });
        setMessage('New link issued. The previous one is invalid.');
      }
    } catch (err) {
      setError(err.message || "Unable to issue a new link.");
    } finally {
      setBusyId(null);
    }
  }

  if (mode === "questions") {
    return (
      <div className="upcoming-exam-details">
        {error && <p className="ops-error" role="alert">{error}</p>}
        <QuestionList questions={questions} exam={exam} editAllowed={canEdit} />
      </div>
    );
  }

  if (mode === "results") {
    return exam.exam_status === "completed" ? (
      <StudentTable students={students} passMark={passMark} setPassMark={setPassMark}
        examId={exam.exam_id} exam={exam} />
    ) : null;
  }

  // Upcoming-only editing. Active and completed student monitoring is handled by ExamOperations.
  if (!upcoming) return null;

  return (
    <div className="qualify-registration-list">
      <div className="qualify-registration-list__header">
        <div>
          <h2>Registered students <span>({students.length})</span></h2>
          <p>{canEdit ? "Review and edit registrations before the exam starts." : "View registrations. Editing is unavailable once the exam starts."}</p>
        </div>
        <input type="search" aria-label="Search registered students"
          value={search} onChange={(event) => { setSearch(event.target.value); setRegistrationPage(1); }}
          placeholder="Search name, hall ticket or email" />
      </div>

      {error && <p role="alert" className="ops-error">{error}</p>}
      {message && <p role="status" className="ops-info">{message}</p>}

      {studentsLoading ? (
        <PageLoader label="Loading registrations…" />
      ) : !students.length ? (
        <div className="qualify-registration-empty">
          <strong>No students registered yet</strong>
          <p>Share the registration link above to invite students.</p>
        </div>
      ) : (
        <div className="qualify-registration-list__scroll" role="region"
          aria-label="Registered students table" tabIndex={0}>
          <table className="students-table">
            <thead>
              <tr>
                <th>Full name</th><th>Hall ticket</th><th>Email</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageStudents.map((student) => {
                const id = student.student_report_id;
                const editing = editingId === id;
                const disabled = Boolean(busyId);
                return (
                  <tr key={id}>
                    {editing ? (
                      <>
                        <td><input autoFocus aria-label="Student full name" value={form.name} required
                          onChange={(e) => setForm({ ...form, name: e.target.value })} /></td>
                        <td><input aria-label="Hall ticket" value={form.rollNo} required
                          onChange={(e) => setForm({ ...form, rollNo: e.target.value })} /></td>
                        <td><input aria-label="Student email" type="email" value={form.email} required
                          onChange={(e) => setForm({ ...form, email: e.target.value })} /></td>
                        <td><div className="qualify-registration-list__buttons">
                          <button type="button" disabled={disabled} onClick={() => saveStudent(id)} title="Save changes" aria-label="Save changes"><FiCheck /></button>
                          <button type="button" disabled={disabled} onClick={() => setEditingId(null)} title="Cancel" aria-label="Cancel edit"><FiX /></button>
                        </div></td>
                      </>
                    ) : (
                      <>
                        <td>{student.student_name}</td>
                        <td>{student.roll_no}</td>
                        <td>{student.email}</td>
                        <td>{canEdit ? <div className="qualify-registration-list__buttons">
                          <button type="button" disabled={disabled} onClick={() => beginEdit(student)} title="Edit registration" aria-label={`Edit ${student.student_name}`}><FiEdit2 /></button>
                          <button type="button" disabled={disabled} onClick={() => renewLink(student)} title="Replace private link" aria-label={`New private link for ${student.student_name}`}><FiLink /></button>
                          <button type="button" disabled={disabled} className="qualify-registration-list__danger" onClick={() => deleteStudent(student)} title="Delete registration" aria-label={`Delete ${student.student_name}`}><FiTrash2 /></button>
                        </div> : <span className="qe-locked-cell">Read-only</span>}</td>
                      </>
                    )}
                  </tr>
                );
              })}
              {!visibleStudents.length && (
                <tr><td colSpan={4}>No registrations match your search.</td></tr>
              )}
            </tbody>
          </table>
          <nav className="qualify-registration-pagination" aria-label="Registration pages">
            <span>{visibleStudents.length ? `Showing ${(currentRegistrationPage - 1) * REGISTRATIONS_PER_PAGE + 1}–${Math.min(currentRegistrationPage * REGISTRATIONS_PER_PAGE, visibleStudents.length)} of ${visibleStudents.length} students` : "No matching students"}</span>
            {registrationPageCount > 1 && <div className="qualify-registration-pagination__actions">
              <button type="button" disabled={currentRegistrationPage === 1} onClick={() => { setRegistrationPage(p => Math.max(1, p - 1)); setEditingId(null); }}>Previous</button>
              <span aria-live="polite">Page {currentRegistrationPage} of {registrationPageCount}</span>
              <button type="button" disabled={currentRegistrationPage === registrationPageCount} onClick={() => { setRegistrationPage(p => Math.min(registrationPageCount, p + 1)); setEditingId(null); }}>Next</button>
            </div>}
          </nav>
        </div>
      )}
    </div>
  );
}
