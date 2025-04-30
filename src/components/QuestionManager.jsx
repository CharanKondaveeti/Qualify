import React, { useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import AddNewModal from "../features/modals/AddNewQuestionModal";
import EditQuestionModal from "../features/modals/EditQuestionModal";
import { addQuestion, removeQuestion, updateQuestion } from "../store/newExamSlice";
import "./css/QuestionManager.css";

const QuestionManager = ({
  isAddModalOpen,
  setIsAddModalOpen,
  readOnly = false,
}) => {
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

    dispatch(addQuestion({ ...newQuestion, question_id: Date.now() }));
    resetNewQuestion();
    setIsAddModalOpen(false);
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

  if (readOnly) {
    return <ReadOnlyTable questions={questions} />;
  }

  return (
    <>
      <div className="preview-questions">
        {questions.map((q, index) => (
          <QuestionCard
            key={q.question_id}
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

const QuestionCard = ({
  q,
  toggleExpand,
  index,
  setEditingQuestion,
  dispatch,
  expandedIds,
}) => {
  return (
    <div className="question-card">
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
};

const ReadOnlyTable = ({ questions }) => {
  const [processedQuestions, setProcessedQuestions] = useState([]);

  useEffect(() => {
    if (!questions) return;

    const processed = questions.map((q) => ({
      id: q.question_id || q.id,
      text: q.question_text,
      correctOption:
        q.options && q.correct_option !== undefined
          ? q.options[q.correct_option]
          : "N/A",
    }));

    setProcessedQuestions(processed);
  }, [questions]);

  return (
    <div className="exam-report-questions-table">
      <div className="exam-report-table-wrapper">
        <table className="exam-report-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>Correct Option</th>
            </tr>
          </thead>
          <tbody>
            {processedQuestions.map((q) => (
              <tr key={q.id} className="exam-report-table-row">
                <td>{q.text}</td>
                <td>{q.correctOption}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuestionManager;
