import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import "../styles/question-card.css";

export default function QuestionCard({
  q,
  index,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  showActions = true,
  marks = q.marks,
}) {
  return (
    <div className="question-card">
      <div
        className="question-card__header"
        onClick={() => onToggleExpand?.(q.question_id)}
      >
        <span className="question-card__number">{index + 1}</span>

        <span className="question-card__text">{q.question_text}</span>

        <small style={{ whiteSpace: "nowrap" }}>
          {marks == null
            ? "Set total marks"
            : `${marks} mark${Number(marks) === 1 ? "" : "s"}`}
        </small>

        {showActions && (
          <div className="question-card__actions">
            <button
              type="button"
              className="question-card__edit-btn"
              aria-label={`Edit question ${index + 1}`}
              onClick={(event) => {
                event.stopPropagation();
                onEdit?.(q);
              }}
            >
              <FiEdit2 />
            </button>

            <button
              type="button"
              className="question-card__delete-btn"
              aria-label={`Delete question ${index + 1}`}
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(q.question_id);
              }}
            >
              <FiTrash2 />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="question-card__options">
          {q.options.map((opt, i) => (
            <div
              key={i}
              className={`question-card__option ${
                Number(i) === Number(q.correct_option) ? "correct" : ""
              }`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
