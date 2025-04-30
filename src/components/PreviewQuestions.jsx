import React, { useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import "./css/previewQuestionss.css";

import AddNewModal from "../modals/AddNewQuestionModal";
import EditQuestionModal from "../modals/EditQuestionModal";
import {
  addQuestion,
  removeQuestion,
  updateQuestion,
} from "../store/newExamSlice";
import QuestionCard from "../components/QuestionCard";

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

  const handleEdit = (question) => {
    setEditingQuestion({ ...question });
  };

  const handleDelete = (question_id) => {
    dispatch(removeQuestion(question_id));  }

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
            isExpanded={true}
            index={index}
            setEditingQuestion={setEditingQuestion}
            dispatch={dispatch}
            onEdit={handleEdit}
            onDelete={handleDelete}
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

export default PreviewQuestions;