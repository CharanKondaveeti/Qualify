import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import "./css/questionCard.css";

const QuestionCard = ({
  q,
  index,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  return (
    <div className="question-card">
      <div
        className="question-card__header"
        onClick={() => onToggleExpand(q.question_id)}
      >
        <span className="question-card__number">{index + 1}</span>
        <span className="question-card__text">{q.question_text}</span>

        {showActions && (
          <div className="question-card__actions">
            <button
              className="question-card__edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(q);
              }}
            >
              <FiEdit2 />
            </button>
            <button
              className="question-card__delete-btn"
              onClick={(e) => {
                e.stopPropagation();
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
                i === q.correct_option - 1 ? "correct" : ""
              }`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionCard;