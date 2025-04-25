import React, { useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import {
  addQuestionR,
  removeQuestion,
  updateQuestion,
} from "../store/questionSlice";
import "./css/PreviewQuestions.css";
import AddNewModal from "../features/modals/AddNewQuestionModal";
import EditQuestionModal from "../features/modals/EditQuestionModal";

const PreviewQuestions = ({ setIsAddModalOpen, isAddModalOpen }) => {
  const questions = useSelector((state) => state.questions.questions);
  const dispatch = useDispatch();

  const [expandedIds, setExpandedIds] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    options: ["", "", "", ""],
    correct_option: null,
    marks: 1,
  });

  const resetNewQuestion = () => {
    setNewQuestion({
      question_text: "",
      options: ["", "", "", ""],
      correct_option: null,
      marks: 1,
    });
  };

  const validateQuestion = ({ question_text, options, correct_option }) => {
    return (
      question_text.trim() &&
      options.every((opt) => opt.trim()) &&
      correct_option !== null
    );
  };

  const handleAddClick = () => {
    if (!validateQuestion(newQuestion)) {
      alert("Please complete all fields.");
      return;
    }

    dispatch(addQuestionR({ ...newQuestion, question_id: Date.now() }));
    resetNewQuestion();
    isAddModalOpen(false);
    alert("Question added successfully!");
  };

  const handleSave = () => {
    if (!validateQuestion(editingQuestion)) {
      alert("Please complete all fields.");
      return;
    }

    dispatch(
      updateQuestion({
        question_id: editingQuestion.question_id,
        updatedQuestion: {
          question_text: editingQuestion.question_text,
          options: editingQuestion.options,
          correct_option: editingQuestion.correct_option,
        },
      })
    );
    setEditingQuestion(null);
    alert("Question updated successfully!");
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id]
    );
  };

  return (
    <>
      <div className="preview-questions">
        {questions.map((q, index) => (
          <QuestionCard
            q={q}
            toggleExpand={toggleExpand}
            index={index}
            setEditingQuestion={setEditingQuestion}
            dispatch={dispatch}
            expandedIds={expandedIds}
          />
        ))}
      </div>

      {isAddModalOpen && (
        <AddNewModal
          newQuestion={newQuestion}
          setNewQuestion={setNewQuestion}
          handleAddClick={handleAddClick}
          setIsAddModalOpen={setIsAddModalOpen}
        />
      )}

      {editingQuestion && (
        <EditQuestionModal
          editingQuestion={editingQuestion}
          setEditingQuestion={setEditingQuestion}
          handleSave={handleSave}
        />
      )}
    </>
  );
};


function QuestionCard({
  q,
  toggleExpand,
  index,
  setEditingQuestion,
  dispatch,
  expandedIds,
}) {
  return (
    <div key={q.question_id} className="question-card">
      <div
        className="question-header"
        onClick={() => toggleExpand(q.question_id)}
      >
        <span className="question-number">{index + 1}</span>
        <span className="question-text">{q.question_text}</span>
        <div className="question-actions">
          <button
            className="edit-btn"
            onClick={(e) => {
              e.preventDefault();
              setEditingQuestion({ ...q });
            }}
          >
            <FiEdit2 />
          </button>
          <button
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              dispatch(removeQuestion(q.question_id));
              alert("Question deleted successfully!");
            }}
          >
            <FiTrash2 />
          </button>
        </div>
      </div>

      {expandedIds.includes(q.question_id) && (
        <div className="options-list">
          {q.options.map((opt, i) => (
            <div
              key={i}
              className={`option ${i === q.correct_option ? "correct" : ""}`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PreviewQuestions;
