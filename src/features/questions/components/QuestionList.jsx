import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  FiAward, FiBookOpen, FiCheck, FiChevronDown, FiChevronUp, FiEdit2,
  FiPlus, FiSearch, FiShield, FiX,
} from "react-icons/fi";
import { useAppDialog } from "../../../shared/components/ConfirmDialogProvider";
import {
  addQuestionToSupabase, editQuestionInSupabase, deleteQuestionFromSupabase,
} from "../../../services/adminService";
import QuestionCard from "./QuestionCard";
import "../styles/question-list.css";

const freshQuestion = () => ({
  question_text: "", options: ["", "", "", ""], correct_option: null, marks: 1,
});

function validateQuestion(q) {
  if (!q.question_text?.trim()) throw new Error("Enter the question text.");
  if (!Array.isArray(q.options) || q.options.length < 2 ||
    q.options.some(option => !String(option).trim())) {
    throw new Error("Enter at least two non-empty answer options.");
  }
  const correct = Number(q.correct_option);
  if (q.correct_option === null || !Number.isInteger(correct) ||
      correct < 0 || correct >= q.options.length) {
    throw new Error("Select the correct answer.");
  }
  const marks = Number(q.marks);
  if (!Number.isSafeInteger(marks) || marks < 1) {
    throw new Error("Marks must be a positive whole number.");
  }
  return {
    question_text: q.question_text.trim(),
    options: q.options.map(option => String(option).trim()),
    correct_option: correct, marks,
  };
}

export default function QuestionList({ questions = [], exam, editAllowed = false, onUpdate, onAdd }) {
  const cache = useQueryClient();
  const dialog = useAppDialog();
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState([]);
  const [editor, setEditor] = useState(null);
  const [draft, setDraft] = useState(freshQuestion);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const editorRef = useRef(null);
  const textareaRef = useRef(null);
  const previousFocus = useRef(null);

  // The parent verifies signed-in ownership and live exam timing; the backend
  // independently enforces the same policy even for direct API calls.
  const canEdit = Boolean(editAllowed && exam?.exam_status === "upcoming" &&
    new Date(exam.scheduled_date).getTime() > Date.now());

  const totalMarks = useMemo(() =>
    questions.reduce((total, q) => total + (Number(q.marks) || 0), 0), [questions]);
  const indexed = useMemo(() => questions.map((q, index) => ({ q, index })), [questions]);
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return !needle ? indexed : indexed.filter(({ q, index }) =>
      [q.question_text, ...(Array.isArray(q.options) ? q.options : []), String(index + 1)]
        .some(value => String(value ?? "").toLowerCase().includes(needle)));
  }, [indexed, search]);
  const allExpanded = Boolean(visible.length) &&
    visible.every(({ q }) => expandedIds.includes(q.question_id));

  useEffect(() => {
    if (!editor) return undefined;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    textareaRef.current?.focus();
    function keydown(event) {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        setEditor(null);
      }
      if (event.key !== "Tab") return;
      const focusables = [...(editorRef.current?.querySelectorAll(
        'button:not([disabled]),textarea:not([disabled]),input:not([disabled])'
      ) || [])];
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", keydown);
      previousFocus.current?.focus?.();
    };
  }, [Boolean(editor), busy]);

  function startEditor(question = null) {
    if (!canEdit || busy) return;
    previousFocus.current = document.activeElement;
    setDraft(question
      ? { ...question, options: [...(question.options || [])] }
      : freshQuestion());
    setError("");
    setEditor(question ? { mode: "edit", id: question.question_id } : { mode: "new" });
  }

  function closeEditor() {
    if (busy) return;
    setEditor(null);
    setError("");
  }

  function toggleExpand(id) {
    setExpandedIds(ids => ids.includes(id) ? ids.filter(key => key !== id) : [...ids, id]);
  }

  function toggleAll() {
    setExpandedIds(ids => allExpanded
      ? ids.filter(id => !visible.some(({ q }) => q.question_id === id))
      : [...new Set([...ids, ...visible.map(({ q }) => q.question_id)])]);
  }

  async function saveQuestion(event) {
    event.preventDefault();
    if (!canEdit || !editor || busy) return;
    let payload;
    try { payload = validateQuestion(draft); }
    catch (err) { setError(err.message); return; }

    setBusy(true);
    setError("");
    try {
      if (editor.mode === "edit") {
        await editQuestionInSupabase({ ...payload, question_id: editor.id });
        onUpdate?.({ ...payload, question_id: editor.id });
      } else {
        await addQuestionToSupabase({ ...payload, exam_id: exam.exam_id });
        onAdd?.({ ...payload, exam_id: exam.exam_id });
      }
      setEditor(null);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["questions", exam.exam_id] }),
        cache.invalidateQueries({ queryKey: ["exams"] }),
      ]);
      toast.success(editor.mode === "edit" ? "Question updated." : "Question added.");
    } catch (err) {
      setError(err.message || "Unable to save question. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuestion(question) {
    if (!canEdit || busy) return;
    const confirmed = await dialog.confirm(
      `Permanently delete this question? Its marks will be removed from the exam total.\n\n${question.question_text}`,
      { title: "Delete question?", confirmLabel: "Delete question", danger: true }
    );
    if (!confirmed || !canEdit) return;
    setBusy(true);
    try {
      await deleteQuestionFromSupabase(question.question_id);
      setExpandedIds(ids => ids.filter(id => id !== question.question_id));
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["questions", exam.exam_id] }),
        cache.invalidateQueries({ queryKey: ["exams"] }),
      ]);
      toast.success("Question deleted; exam totals updated.");
    } catch (err) {
      toast.error(err.message || "Unable to delete the question.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="qe-question-manager" aria-label="Exam question manager">
    <div className="qe-question-overview">
      <div className="qe-question-summary">
        <span className="qe-question-summary-icon"><FiBookOpen aria-hidden="true" /></span>
        <div>
          <span>QUESTION BANK</span>
          <h3>Questions & answers</h3>
          <p>{canEdit ? "Manage questions, answer keys and marking before the exam opens." :
            "Review the examination questions and answer keys. Editing is locked."}</p>
        </div>
      </div>
      <div className="qe-question-stats">
        <span><FiBookOpen aria-hidden="true" /><strong>{questions.length}</strong> questions</span>
        <span><FiAward aria-hidden="true" /><strong>{totalMarks}</strong> total marks</span>
      </div>
    </div>

    <div className="qe-question-toolbar">
      <label className="qe-question-search">
        <FiSearch aria-hidden="true" />
        <input type="search" value={search} onChange={event => setSearch(event.target.value)}
          placeholder="Search questions or answers" aria-label="Search questions or answers" />
      </label>
      <div className="qe-question-toolbar-actions">
        <button className="qe-question-expand-all" type="button" disabled={!visible.length}
          onClick={toggleAll}>{allExpanded ? <FiChevronUp aria-hidden="true" /> :
            <FiChevronDown aria-hidden="true" />}
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
        {canEdit && <button className="qe-question-add" type="button" disabled={busy}
          onClick={() => startEditor()}>
          <FiPlus aria-hidden="true" /> Add question
        </button>}
      </div>
    </div>

    <div className="qe-question-list-status">
      <span>Showing <strong>{visible.length}</strong> of <strong>{questions.length}</strong> questions</span>
      {!canEdit && <span className="qe-question-readonly"><FiShield aria-hidden="true" /> Read-only</span>}
    </div>

    <div className="qe-question-items">
      {visible.map(({ q, index }) => <QuestionCard
        key={q.question_id} q={q} index={index}
        isExpanded={expandedIds.includes(q.question_id)} onToggleExpand={toggleExpand}
        onEdit={startEditor} onDelete={deleteQuestion}
        showActions={canEdit} disabled={busy}
      />)}
      {!visible.length && <div className="qe-question-empty">
        <FiBookOpen aria-hidden="true" />
        <strong>{questions.length ? "No matching questions" : "No questions added yet"}</strong>
        <p>{questions.length ? "Try searching for a different word or answer." :
          "Questions will appear here once they are added to this examination."}</p>
        {Boolean(search) && <button type="button" onClick={() => setSearch("")}>Clear search</button>}
        {!questions.length && canEdit && <button className="qe-question-add" type="button"
          onClick={() => startEditor()}><FiPlus aria-hidden="true" /> Add first question</button>}
      </div>}
    </div>

    {editor && <div className="qe-question-dialog-backdrop"
      onMouseDown={event => { if (event.currentTarget === event.target) closeEditor(); }}>
      <section ref={editorRef} className="qe-question-dialog" role="dialog" aria-modal="true"
        aria-labelledby="qe-question-dialog-title" aria-describedby="qe-question-dialog-description">
        <header className="qe-question-dialog-header">
          <div>
            <span className="qe-question-dialog-eyebrow">{editor.mode === "edit" ? "UPDATE QUESTION" : "NEW QUESTION"}</span>
            <h2 id="qe-question-dialog-title">{editor.mode === "edit" ? "Edit question" : "Add question"}</h2>
            <p id="qe-question-dialog-description">Enter the question, mark the correct answer, and assign its marks.</p>
          </div>
          <button type="button" className="qe-question-dialog-close" onClick={closeEditor}
            aria-label="Close question editor" disabled={busy}><FiX aria-hidden="true" /></button>
        </header>
        <form id="qe-question-dialog-form" className="qe-question-editor-form" onSubmit={saveQuestion}>
          {error && <p role="alert" className="qe-question-error">{error}</p>}
          <label className="qe-question-field">Question text
            <textarea ref={textareaRef} rows={3} required value={draft.question_text}
              disabled={busy} onChange={event => setDraft(d => ({ ...d, question_text: event.target.value }))}
              placeholder="Write your question here" />
          </label>
          <fieldset className="qe-question-choices-fieldset" disabled={busy}>
            <legend>Answer choices <small>Choose one correct answer</small></legend>
            <div className="qe-question-edit-choices">
              {draft.options.map((option, i) => <label key={i}
                className={`qe-question-edit-choice${Number(draft.correct_option) === i && draft.correct_option !== null ? " is-correct" : ""}`}>
                <input type="radio" name="qe-correct-option" checked={Number(draft.correct_option) === i && draft.correct_option !== null}
                  onChange={() => setDraft(d => ({ ...d, correct_option: i }))} required />
                <span className="qe-question-edit-letter">{String.fromCharCode(65 + i)}</span>
                <input type="text" required value={option} placeholder={`Option ${i + 1}`}
                  aria-label={`Option ${i + 1} text`} onChange={event => setDraft(d => {
                    const nextOptions = [...d.options];
                    nextOptions[i] = event.target.value;
                    return { ...d, options: nextOptions };
                  })} />
                {Number(draft.correct_option) === i && draft.correct_option !== null &&
                  <span className="qe-question-edit-correct"><FiCheck aria-hidden="true" /> Correct</span>}
              </label>)}
            </div>
          </fieldset>
          <label className="qe-question-field qe-question-marks-field">Marks awarded
            <input type="number" min="1" step="1" required value={draft.marks}
              disabled={busy} onChange={event => setDraft(d => ({ ...d, marks: event.target.value }))} />
            <small>Updating marks also updates the examination's total.</small>
          </label>
        </form>
        <footer className="qe-question-dialog-footer">
          <button type="button" className="qe-question-cancel" disabled={busy}
            onClick={closeEditor}>Cancel</button>
          <button type="submit" form="qe-question-dialog-form" className="qe-question-save"
            disabled={busy || !canEdit}><FiCheck aria-hidden="true" />
            {busy ? "Saving…" : editor.mode === "edit" ? "Save changes" : "Add question"}
          </button>
        </footer>
      </section>
    </div>}
  </section>;
}
