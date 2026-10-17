import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FiSave } from "react-icons/fi";
import { updateExamInSupabase } from "../../../services/adminService";
import ExamTimingFields from "./ExamTimingFields";
import { timingValues, buildExamTiming } from "../../../utils/examTiming";

function toLocalInput(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
}

export default function ExamTimingEditor({ exam }) {
  const cache = useQueryClient();
  const [editableDate, setEditableDate] = useState(() => toLocalInput(exam.scheduled_date));
  const [timing, setTiming] = useState(() => timingValues(exam));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEditableDate(toLocalInput(exam.scheduled_date));
    setTiming(timingValues({
      timing_mode: exam.timing_mode,
      duration_minutes: exam.duration_minutes,
      entry_window_minutes: exam.entry_window_minutes,
      ends_at: exam.ends_at,
    }));
    setSaved(false);
  }, [exam.exam_id, exam.scheduled_date, exam.duration_minutes,
      exam.entry_window_minutes, exam.timing_mode, exam.ends_at]);

  async function handleUpdate(event) {
    event.preventDefault();
    setSaveError("");
    setSaved(false);
    setIsSaving(true);
    try {
      const timingData = buildExamTiming(timing, editableDate);
      const start = new Date(editableDate);
      if (Number.isNaN(start.getTime())) throw new Error("Please enter a valid start date and time.");
      await updateExamInSupabase(exam.exam_id, {
        scheduled_date: start.toISOString(),
        ...timingData,
      });
      await cache.invalidateQueries({ queryKey: ["exams"] });
      setSaved(true);
    } catch (error) {
      setSaveError(error.message || "Exam update failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="qualify-exam-card qualify-edit-card">
      <div className="qualify-edit-card__heading">
        <div>
          <h2>Edit exam timing</h2>
          <p>Update the scheduled start and existing timing rules before the exam starts.</p>
        </div>
      </div>
      <form onSubmit={handleUpdate}>
        <label className="qualify-edit-card__date">
          Exam starts at
          <input type="datetime-local" value={editableDate}
            onChange={(event) => {setEditableDate(event.target.value); setSaved(false);}}
            disabled={isSaving} required />
        </label>
        <ExamTimingFields value={timing} onChange={(value) => {setTiming(value); setSaved(false);}}
          disabled={isSaving} />
        {saveError && <p role="alert" className="ops-error">{saveError}</p>}
        {saved && <p role="status" className="ops-info">Timing changes saved.</p>}
        <div className="qualify-edit-card__actions">
          <button type="submit" className="qualify-primary-action" disabled={isSaving}>
            <FiSave aria-hidden="true" /> {isSaving ? "Saving…" : "Update timing"}
          </button>
        </div>
      </form>
    </section>
  );
}
