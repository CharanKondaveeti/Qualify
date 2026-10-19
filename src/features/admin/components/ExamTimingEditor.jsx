import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FiCheckCircle, FiFileText, FiSave, FiSliders, FiClock } from "react-icons/fi";
import { updateExamInSupabase } from "../../../services/adminService";
import ExamTimingFields from "./ExamTimingFields";
import { timingValues, buildExamTiming } from "../../../utils/examTiming";

function toLocalInput(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
}

function initialDetails(exam) {
  return {
    title: exam.title || "",
    course: exam.course || "",
    instructions: exam.instructions || "",
    pass_mark: String(exam.pass_mark ?? 0),
    shuffle_questions: Boolean(exam.shuffle_questions),
    shuffle_options: Boolean(exam.shuffle_options),
  };
}

/** Full pre-start editor. Total marks and question count are derived from the Questions tab. */
export default function ExamTimingEditor({ exam, canEdit = true }) {
  const cache = useQueryClient();
  const [details, setDetails] = useState(() => initialDetails(exam));
  const [editableDate, setEditableDate] = useState(() => toLocalInput(exam.scheduled_date));
  const [timing, setTiming] = useState(() => timingValues(exam));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDetails(initialDetails(exam));
    setEditableDate(toLocalInput(exam.scheduled_date));
    setTiming(timingValues(exam));
    setSaved(false);
  }, [exam.exam_id, exam.title, exam.course, exam.instructions, exam.pass_mark,
    exam.shuffle_questions, exam.shuffle_options, exam.scheduled_date, exam.duration_minutes,
    exam.entry_window_minutes, exam.timing_mode, exam.ends_at]);

  const set = (key, value) => {
    setDetails(old => ({ ...old, [key]: value }));
    setSaved(false);
  };

  async function handleUpdate(event) {
    event.preventDefault();
    setSaveError("");
    setSaved(false);
    if (!canEdit || isSaving) return;
    setIsSaving(true);
    try {
      const start = new Date(editableDate);
      if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
        throw new Error("Choose a future start date and time.");
      }
      const title = details.title.trim();
      const course = details.course.trim();
      if (title.length < 2 || course.length < 2) {
        throw new Error("Exam name and course need at least two characters.");
      }
      const passMark = Number(details.pass_mark);
      if (!Number.isInteger(passMark) || passMark < 0 || passMark > Number(exam.total_marks)) {
        throw new Error(`Pass mark must be between 0 and ${exam.total_marks}.`);
      }
      const timingData = buildExamTiming(timing, editableDate);
      await updateExamInSupabase(exam.exam_id, {
        title, course,
        scheduled_date: start.toISOString(),
        ...timingData,
        instructions: details.instructions.trim(),
        shuffle_questions: details.shuffle_questions,
        shuffle_options: details.shuffle_options,
        pass_mark: passMark,
      });
      await cache.invalidateQueries({ queryKey: ["exams"] });
      setSaved(true);
    } catch (error) {
      setSaveError(error.message || "Unable to update examination.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="qualify-exam-card qe-setup-card" aria-labelledby="qe-editor-heading">
      <div className="qe-setup-heading">
        <div>
          <span className="qe-setup-eyebrow">EXAM CONFIGURATION</span>
          <h2 id="qe-editor-heading">Edit examination</h2>
          <p>Update the full exam setup before its scheduled opening. Changes are saved together.</p>
        </div>
        <span className="qe-editable-tag"><FiCheckCircle aria-hidden="true" /> Editable before start</span>
      </div>

      <form onSubmit={handleUpdate} className="qe-setup-form">
        <div className="qe-form-section">
          <div className="qe-form-section-heading">
            <span className="qe-section-icon"><FiFileText aria-hidden="true" /></span>
            <div><h3>Basic information</h3><p>How students and staff recognize this examination.</p></div>
          </div>
          <div className="qe-field-grid">
            <label className="qe-field">Exam name
              <input type="text" minLength={2} maxLength={200} required disabled={!canEdit || isSaving}
                value={details.title} onChange={e => set("title", e.target.value)}
                placeholder="Enter exam name" />
            </label>
            <label className="qe-field">Course / subject
              <input type="text" minLength={2} maxLength={200} required disabled={!canEdit || isSaving}
                value={details.course} onChange={e => set("course", e.target.value)}
                placeholder="Enter course or subject" />
            </label>
          </div>
        </div>

        <div className="qe-form-section">
          <div className="qe-form-section-heading">
            <span className="qe-section-icon"><FiClock aria-hidden="true" /></span>
            <div><h3>Schedule & timing</h3><p>Set the opening time and student attempt rules.</p></div>
          </div>
          <label className="qe-field qe-date-field">Exam starts at
            <input type="datetime-local" required disabled={!canEdit || isSaving}
              value={editableDate} min={toLocalInput(new Date().toISOString())}
              onChange={e => { setEditableDate(e.target.value); setSaved(false); }} />
          </label>
          <div className="qe-timing-wrap">
            <ExamTimingFields value={timing}
              onChange={value => { setTiming(value); setSaved(false); }} disabled={!canEdit || isSaving} />
          </div>
        </div>

        <div className="qe-form-section">
          <div className="qe-form-section-heading">
            <span className="qe-section-icon"><FiSliders aria-hidden="true" /></span>
            <div><h3>Marking & exam rules</h3><p>Pass criteria, question display and student instructions.</p></div>
          </div>
          <div className="qe-field-grid">
            <label className="qe-field">Passing marks
              <input type="number" min="0" max={exam.total_marks} step="1" required
                disabled={!canEdit || isSaving} value={details.pass_mark}
                onChange={e => set("pass_mark", e.target.value)} />
              <small>Out of {exam.total_marks} marks; adjust individual question marks in Questions.</small>
            </label>
            <div className="qe-total-summary">
              <span>Total questions <strong>{exam.total_questions}</strong></span>
              <span>Total marks <strong>{exam.total_marks}</strong></span>
              <small>Automatically calculated from the question list.</small>
            </div>
          </div>
          <div className="qe-checkboxes">
            <label><input type="checkbox" checked={details.shuffle_questions} disabled={!canEdit || isSaving}
              onChange={e => set("shuffle_questions", e.target.checked)} />
              <span><strong>Shuffle questions</strong><small>Randomize question order for students.</small></span>
            </label>
            <label><input type="checkbox" checked={details.shuffle_options} disabled={!canEdit || isSaving}
              onChange={e => set("shuffle_options", e.target.checked)} />
              <span><strong>Shuffle answer options</strong><small>Randomize choices within questions.</small></span>
            </label>
          </div>
          <label className="qe-field">Instructions shown to students
            <textarea rows={4} maxLength={5000} disabled={!canEdit || isSaving}
              value={details.instructions} onChange={e => set("instructions", e.target.value)}
              placeholder="Rules and instructions students should read before taking this exam" />
          </label>
        </div>

        {saveError && <p role="alert" className="qe-save-error">{saveError}</p>}
        {saved && <p role="status" className="qe-save-success"><FiCheckCircle aria-hidden="true" /> All exam changes saved.</p>}
        <div className="qe-save-footer">
          <p>Changes are locked automatically when the examination begins.</p>
          <button type="submit" className="qe-save-button" disabled={!canEdit || isSaving}>
            <FiSave aria-hidden="true" /> {isSaving ? "Saving changes…" : "Save exam changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
