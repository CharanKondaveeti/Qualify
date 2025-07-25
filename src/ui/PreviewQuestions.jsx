import React, { useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import "./css/PreviewQuestions.css";

import AddNewModal from "../features/modals/AddNewQuestionModal";
import EditQuestionModal from "../features/modals/EditQuestionModal";
import {
  addQuestion,
  removeQuestion,
  updateQuestion,
} from "../store/newExamSlice";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PreviewQuestions = ({ setIsAddModalOpen, isAddModalOpen }) => {
  const questions = useSelector((state) => state.newExam.questions);
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
      toast.error("Please complete all fields.");
      return;
    }

    dispatch(addQuestion({ ...newQuestion, question_id: Date.now() }));
    setIsAddModalOpen(false);
    resetNewQuestion();
    toast.success("Question added successfully!");
  };

  const handleSave = () => {
    if (!validateQuestion(editingQuestion)) {
      toast.error("Please complete all fields.");
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
    toast.success("Question updated successfully!");
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id]
    );
  };

  return (
    <>
      {questions.length > 0 && (
        <h3 className="Preview-question__heading">Preview Questions</h3>

)}
      <div className="preview-questions">
        {questions.map((q, index) => (
          <QuestionCard
            key={q.question_id || index}
            q={q}
            toggleExpand={toggleExpand}
            index={index}
            setEditingQuestion={setEditingQuestion}
            dispatch={dispatch}
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

function QuestionCard({ q, toggleExpand, index, setEditingQuestion, dispatch }) {
  return (
    <div key={q.question_id} className="Preview-question__question-card">
      <div
        className="Preview-question__question-header"
        onClick={() => toggleExpand(q.question_id)}
      >
        <span className="Preview-question__question-number">{index + 1}</span>
        <span className="Preview-question__question-text">
          {q.question_text}
        </span>
        <div className="Preview-question__question-actions">
          <button
            className="Preview-question__edit-btn"
            onClick={(e) => {
              e.preventDefault();
              setEditingQuestion({ ...q });
            }}
          >
            <FiEdit2 />
          </button>
          <button
            className="Preview-question__delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              dispatch(removeQuestion(q.question_id));
              toast.success("Question deleted successfully!");
            }}
          >
            <FiTrash2 />
          </button>
        </div>
      </div>

      {q.options && q.options.length > 0 && (
        <div className="Preview-question__options-list">
          {q.options.map((opt, i) => (
            <div
              key={i}
              className={`Preview-question__option ${
                i === q.correct_option ? "correct" : ""
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

export default PreviewQuestions;
 