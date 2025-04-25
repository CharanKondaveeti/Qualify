import React, { useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import "./css/questionList.css";

const UploadQuestions = ({ questions, onDelete, onUpdate, onAdd }) => {
  console.log("questions", questions);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    options: ["", "", "", ""],
    correct_option: null,
    marks: 1,
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddClick = () => {
    const { question_text, options, correct_option } = newQuestion;

    if (
      !question_text.trim() ||
      options.some((opt) => !opt.trim()) ||
      correct_option === null
    ) {
      alert("Please complete all fields.");
      return;
    }

    // Add question to state
    onAdd({ ...newQuestion, question_id: Date.now() });

    setNewQuestion({
      question_text: "",
      options: ["", "", "", ""],
      correct_option: null,
      marks: 1,
    });
    setIsAddModalOpen(false);
    alert("Question added successfully!");
  };

  const handleEdit = (question) => {
    setEditingQuestion({ ...question });
  };

 const handleSave = () => {
   const { question_text, options, correct_option } = editingQuestion;

   if (
     !question_text.trim() ||
     options.some((opt) => !opt.trim()) ||
     correct_option === null
   ) {
     alert("Please complete all fields.");
     return;
   }

   // Update the question in state (find the existing question by ID)
   const updatedQuestions = questions.map((q) =>
     q.question_id === editingQuestion.question_id
       ? { ...q, question_text, options, correct_option }
       : q
   );

   // Use onUpdate (setQuestions) passed from the parent to update the questions
   onUpdate(updatedQuestions); // Update the questions list
   setEditingQuestion(null); // Close the editor modal
   alert("Question updated successfully!");
 };

  const handleDelete = (question_id) => {
    // Remove the question from state
    onDelete(question_id);
    alert("Question deleted successfully!");
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id]
    );
  };

  return (
    <>
      <div className="questions-list">
        {questions.map((q, index) => (
          <div key={q.question_id} className="question-card">
            <div className="question-header" onClick={() => toggleExpand(q.question_id)}>
              <span className="question-number">{index + 1}</span>
              <span className="question-text">{q.question_text}</span>
              <div className="question-actions">
                <button
                  className="edit-btn"
                  onClick={(e) => {
                    e.preventDefault(); // Prevent page reload
                    handleEdit(q); // Trigger the edit logic
                  }}
                >
                  <FiEdit2 />
                </button>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(q.question_id); // Call delete function
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
                    className={`option ${
                      i === q.correct_option ? "correct" : ""
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        className="add-question-btn"
        onClick={(e) => {
          e.preventDefault();
          setIsAddModalOpen(true);
        }}
      >
        Add New Question
      </button>

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
                    onClick={(e) => {
                        e.preventDefault(); // Prevent page reload
                      setNewQuestion({ ...newQuestion, correct_option: i });
                    }}
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
                    onClick={(e) => {
                      e.preventDefault(); // Prevent page reload

                      setEditingQuestion({
                        ...editingQuestion,
                        correct_option: i,
                      });
                    }}
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
              <button
                className="save-btn"
                onClick={(e) => {
                  e.preventDefault(); // Prevent page reload
                  handleSave(); // Save the edited question
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UploadQuestions;
