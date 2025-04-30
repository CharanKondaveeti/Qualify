import React, { useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import "./css/questionList.css";
import {
  addQuestionToSupabase,
  editQuestionInSupabase,
  deleteQuestionFromSupabase,
} from "../services/admin";  import { useMutation, useQueryClient } from "@tanstack/react-query";
import QuestionCard from "../components/QuestionCard";

const QuestionList = ({
  questions,
  // onDelete,
  onUpdate,
  onAdd,
  exam,
}) => {
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    options: ["", "", "", ""],
    correct_option: null,
    marks: 1,
  });
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // mutations
    const deleteQuestionMutation = useMutation({
      mutationFn: deleteQuestionFromSupabase,
      onSuccess: () => {
        queryClient.invalidateQueries(["questions", exam.exam_id]);
        alert("Question deleted successfully!");
      },
      onError: (error) => {
        console.error(error);
        alert("Error deleting question. Please try again.");
      },
    });


  const handleAddClick = async () => {
    const { question_text, options, correct_option } = newQuestion;

    if (
      !question_text.trim() ||
      options.some((opt) => !opt.trim()) ||
      correct_option === null
    ) {
      alert("Please complete all fields.");
      return;
    }

    try {
      const newQ = {
        ...newQuestion,
        exam_id: exam.exam_id,
      };

      await addQuestionToSupabase(newQ);
      onAdd?.(newQ);

      setNewQuestion({
        question_text: "",
        options: ["", "", "", ""],
        correct_option: null,
        marks: 1,
      });
      setIsAddModalOpen(false);
      alert("Question added successfully!");
    } catch (error) {
      console.error("Error adding question:", error);
      alert("Error adding question. Please try again.");
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion({ ...question });
  };

  const handleSave = async () => {
    const { question_text, options, correct_option } = editingQuestion;

    if (
      !question_text.trim() ||
      options.some((opt) => !opt.trim()) ||
      correct_option === null
    ) {
      alert("Please complete all fields.");
      return;
    }

    try {
      await editQuestionInSupabase(editingQuestion);
      onUpdate(editingQuestion);
      setEditingQuestion(null);
      alert("Question updated successfully!");
    } catch (error) {
      console.error(error);
      alert("Error updating question. Please try again.");
    }
  };


const handleDelete = (question_id) => {
  deleteQuestionMutation.mutate(question_id);
};

  // const handleDelete = async (question_id) => {
  //   try {
  //     await deleteQuestionFromSupabase(question_id);
  //     onDelete(question_id);
  //     alert("Question deleted successfully!");
  //   } catch (error) {
  //     console.error(error);
  //     alert("Error deleting question. Please try again.");
  //   }
  // };

  const toggleExpand = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id]
    );
  };

  return (
    <>
      <div className="question-manager__question-list">
        {questions.map((q, index) => (
          <QuestionCard
            key={q.question_id}
            q={q}
            index={index}
            isExpanded={expandedIds.includes(q.question_id)}
            onToggleExpand={toggleExpand}
            onEdit={handleEdit}
            onDelete={handleDelete}
            showActions={exam.exam_status === "upcoming"}
          />
        ))}
      </div>

      {exam.exam_status === "upcoming" && (
        <button
          className="add-question-btn"
          onClick={(e) => {
            e.preventDefault();
            setIsAddModalOpen(true);
          }}
        >
          Add New Question
        </button>
      )}

      {/* Add Question Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Add New Question</h4>
            <div className="form-group">
              <label>Question Text</label>
              <input
                type="text"
                value={newQuestion.question_text}
                onChange={(e) =>
                  setNewQuestion({
                    ...newQuestion,
                    question_text: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-group">
              <label>Options</label>
              {newQuestion.options.map((opt, i) => (
                <div key={i} className="option-edit">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...newQuestion.options];
                      newOptions[i] = e.target.value;
                      setNewQuestion({ ...newQuestion, options: newOptions });
                    }}
                  />
                  <button
                    className={`option-select ${
                      i === newQuestion.correct_option ? "selected" : ""
                    }`}
                    onClick={() =>
                      setNewQuestion({ ...newQuestion, correct_option: i })
                    }
                  >
                    Correct
                  </button>
                </div>
              ))}
            </div>
            <button className="add-btn" onClick={handleAddClick}>
              Add Question
            </button>
            <button
              className="cancel-btn"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {editingQuestion && (
        <div className="editor-modal">
          <div className="modal-content">
            <h4>Edit Question</h4>
            <div className="form-group">
              <label>Question Text</label>
              <input
                type="text"
                value={editingQuestion.question_text}
                onChange={(e) =>
                  setEditingQuestion({
                    ...editingQuestion,
                    question_text: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-group">
              <label>Options</label>
              {editingQuestion.options.map((opt, i) => (
                <div key={i} className="option-edit">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...editingQuestion.options];
                      updated[i] = e.target.value;
                      setEditingQuestion({
                        ...editingQuestion,
                        options: updated,
                      });
                    }}
                  />
                  <button
                    className={`option-select ${
                      i === editingQuestion.correct_option ? "selected" : ""
                    }`}
                    onClick={() =>
                      setEditingQuestion({
                        ...editingQuestion,
                        correct_option: i,
                      })
                    }
                  >
                    Correct
                  </button>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setEditingQuestion(null)}
              >
                Cancel
              </button>
              <button className="save-btn" onClick={handleSave}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuestionList;
