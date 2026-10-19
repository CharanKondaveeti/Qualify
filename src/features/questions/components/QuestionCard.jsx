import { FiCheck, FiChevronDown, FiEdit2, FiTrash2 } from "react-icons/fi";
import "../styles/question-card.css";

/** One compact, keyboard-accessible question row in the exam workspace. */
export default function QuestionCard({
  q, index, isExpanded = false, onToggleExpand, onEdit, onDelete,
  showActions = false, marks = q.marks, disabled = false,
}) {
  const choices = Array.isArray(q.options) ? q.options : [];
  const optionLabel = (n) => String.fromCharCode(65 + n);
  const previewId = `qe-options-${q.question_id}`;

  return (
    <article className={`qe-question-card${isExpanded ? " is-expanded" : ""}`}>
      <div className="qe-question-main">
        <button type="button" className="qe-question-trigger"
          aria-expanded={isExpanded} aria-controls={previewId}
          onClick={() => onToggleExpand?.(q.question_id)}>
          <span className="qe-question-number">{String(index + 1).padStart(2, "0")}</span>
          <span className="qe-question-copy">
            <span className="qe-question-text">{q.question_text}</span>
            <span className="qe-question-meta">{choices.length} answer choices
              <span aria-hidden="true">·</span>
              {isExpanded ? "Hide choices" : "View choices"}
            </span>
          </span>
          <FiChevronDown className="qe-question-chevron" aria-hidden="true" />
        </button>
        <div className="qe-question-tools">
          <span className="qe-question-marks">
            <strong>{marks ?? "—"}</strong> {Number(marks) === 1 ? "mark" : "marks"}
          </span>
          {showActions && <div className="qe-question-actions">
            <button type="button" className="qe-question-edit" disabled={disabled}
              onClick={() => onEdit?.(q)} aria-label={`Edit question ${index + 1}`}
              title="Edit question"><FiEdit2 aria-hidden="true" /></button>
            <button type="button" className="qe-question-delete" disabled={disabled}
              onClick={() => onDelete?.(q)} aria-label={`Delete question ${index + 1}`}
              title="Delete question"><FiTrash2 aria-hidden="true" /></button>
          </div>}
        </div>
      </div>
      <div id={previewId} hidden={!isExpanded} className="qe-question-answers">
        <div className="qe-question-answers-heading">ANSWER OPTIONS
          <span>Correct answer highlighted</span>
        </div>
        <div className="qe-question-options">
          {choices.map((option, i) => {
            const correct = i === Number(q.correct_option);
            return <div key={i} className={`qe-question-choice${correct ? " is-correct" : ""}`}>
              <span className="qe-question-letter">{optionLabel(i)}</span>
              <span className="qe-question-option-text">{option}</span>
              {correct && <span className="qe-question-correct"><FiCheck aria-hidden="true" /> Correct</span>}
            </div>;
          })}
        </div>
      </div>
    </article>
  );
}
