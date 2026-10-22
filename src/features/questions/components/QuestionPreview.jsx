import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AddNewModal from "../dialogs/AddQuestionDialog";
import EditQuestionModal from "../dialogs/EditQuestionDialog";
import QuestionCard from "./QuestionCard";
import {
  addQuestion,
  removeQuestion,
  updateQuestion,
} from "../../../store/newExamSlice";
import "../styles/question-preview.css";

const emptyQuestion = () => ({
  question_text: "",
  options: ["", "", "", ""],
  correct_option: null,
  marks: 1,
});

export default function PreviewQuestions({
  setIsAddModalOpen,
  isAddModalOpen,
  markingMode = "custom",
  automaticMarks = null,
}) {
  const questions = useSelector((state) => state.newExam.questions);

  const dispatch = useDispatch();
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [collapsedIds, setCollapsedIds] = useState([]);
  const [newQuestion, setNewQuestion] = useState(emptyQuestion);

  const validQuestion = (question) =>
    typeof question.question_text === "string" &&
    Boolean(question.question_text.trim()) &&
    Array.isArray(question.options) &&
    question.options.length >= 2 &&
    question.options.every(
      (option) => typeof option === "string" && option.trim(),
    ) &&
    Number.isInteger(Number(question.correct_option)) &&
    question.correct_option !== null &&
    Number(question.correct_option) >= 0 &&
    Number(question.correct_option) < question.options.length;

  const validMarks = (marks) =>
    marks !== "" && Number.isSafeInteger(Number(marks)) && Number(marks) >= 1;

  const handleAddClick = () => {
    if (!validQuestion(newQuestion)) {
      toast.error("Complete the question and choose its correct answer.");
      return;
    }

    if (markingMode === "custom" && !validMarks(newQuestion.marks)) {
      toast.error("Question marks must be a whole number of at least 1.");
      return;
    }

    dispatch(
      addQuestion({
        ...newQuestion,
        question_id: crypto.randomUUID(),
        marks: markingMode === "custom" ? Number(newQuestion.marks) : 1,
      }),
    );

    setIsAddModalOpen(false);
    setNewQuestion(emptyQuestion());
    toast.success("Question added successfully!");
  };

  const handleEdit = (question, index) => {
    setEditingQuestion({
      ...question,
      marks:
        markingMode === "automatic"
          ? (automaticMarks?.[index] ?? "")
          : question.marks,
    });
  };

  const handleSave = () => {
    if (!editingQuestion || !validQuestion(editingQuestion)) {
      toast.error("Complete the question and choose its correct answer.");
      return;
    }

    if (markingMode === "custom" && !validMarks(editingQuestion.marks)) {
      toast.error("Question marks must be a whole number of at least 1.");
      return;
    }

    dispatch(
      updateQuestion({
        question_id: editingQuestion.question_id,
        updatedQuestion: {
          question_text: editingQuestion.question_text,
          options: editingQuestion.options,
          correct_option: Number(editingQuestion.correct_option),
          ...(markingMode === "custom"
            ? { marks: Number(editingQuestion.marks) }
            : {}),
        },
      }),
    );

    setEditingQuestion(null);
    toast.success("Question updated successfully!");
  };

  return (
    <>
      {questions.length > 0 && (
        <h3 className="Preview-question__heading">Preview Questions</h3>
      )}

      <div className="preview-questions">
        {questions.map((q, index) => (
          <QuestionCard
            key={q.question_id ?? index}
            q={q}
            index={index}
            isExpanded={!collapsedIds.includes(q.question_id ?? index)}
            onToggleExpand={() => setCollapsedIds((previous) => {
              const id = q.question_id ?? index;
              return previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id];
            })}
            showActions={true}
            marks={
              markingMode === "automatic" ? automaticMarks?.[index] : q.marks
            }
            onEdit={() => handleEdit(q, index)}
            onDelete={() => dispatch(removeQuestion(q.question_id))}
          />
        ))}
      </div>

      {isAddModalOpen && (
        <AddNewModal
          newQuestion={newQuestion}
          setNewQuestion={setNewQuestion}
          handleAddClick={handleAddClick}
          setIsAddModalOpen={setIsAddModalOpen}
          markingMode={markingMode}
        />
      )}

      {editingQuestion && (
        <EditQuestionModal
          editingQuestion={editingQuestion}
          setEditingQuestion={setEditingQuestion}
          handleSave={handleSave}
          markingMode={markingMode}
        />
      )}
    </>
  );
}
