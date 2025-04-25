import React, { useState } from "react";
import { FaTrash, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { FiEdit2 } from "react-icons/fi";
import QuestionList from "../../ui/QuestionList";
import "./css/upcomingExamDetails.css";
import { deleteQuestionFromSupabase, editQuestionInSupabase } from "../../services/admin";

const UpcomingExamDetails = ({
  questions,
  setQuestions,
  students,
  setStudents,
  examId,
}) => {
  const [activeMenu, setActiveMenu] = useState("questions");

  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    rollNo: "",
    hallTicket: "",
  });

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditForm(students[index]);
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = () => {
    const updated = [...students];
    updated[editingIndex] = editForm;
    setStudents(updated);
    setEditingIndex(null);
  };

  const handleDelete = (index) => {
    const updated = students.filter((_, i) => i !== index);
    setStudents(updated);
  };

  const onUpdate = async (newQ) => {
      await editQuestionInSupabase(newQ);
  };

  deleteQuestionFromSupabase;

  return (
    <div className="upcoming-exam-details">
      <div className="menu">
        <button
          className={activeMenu === "questions" ? "active" : ""}
          onClick={() => setActiveMenu("questions")}
        >
          Questions
        </button>
        <button
          className={activeMenu === "students" ? "active" : ""}
          onClick={() => setActiveMenu("students")}
        >
          Registered Students
        </button>
      </div>

      {/* Display content based on the active menu */}
      {activeMenu === "questions" && (
        <div className="questions-section">
          <QuestionList
            questions={questions}
            onDelete={(id) => {
              setQuestions((prev) => prev.filter((q) => q.id !== id));
            }}
            onUpdate={onUpdate}
            examId={examId}
          />
        </div>
      )}

      {activeMenu === "students" && (
        <div className="students-section">
          <div className="students-container">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Hall Ticket</th>
                  <th>Email</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => (
                  <tr key={idx} className="student-row">
                    {editingIndex === idx ? (
                      <>
                        <td>
                          <input
                            value={editForm.name}
                            onChange={(e) =>
                              handleEditChange("name", e.target.value)
                            }
                            placeholder="Full Name"
                          />
                        </td>
                        <td>
                          <input
                            value={editForm.rollNo}
                            onChange={(e) =>
                              handleEditChange("rollNo", e.target.value)
                            }
                            placeholder="Roll No"
                          />
                        </td>
                        <td>
                          <input
                            value={editForm.hallTicket}
                            onChange={(e) =>
                              handleEditChange("hallTicket", e.target.value)
                            }
                            placeholder="Hall Ticket"
                          />
                        </td>
                        <td>
                          <input
                            value={editForm.email}
                            onChange={(e) =>
                              handleEditChange("email", e.target.value)
                            }
                            placeholder="Email"
                            type="email"
                          />
                        </td>
                        <td>
                          <div className="edit-actions">
                            <button
                              className="edit-actions-save-btn"
                              onClick={handleEditSave}
                            >
                              <FaCheckCircle />
                            </button>
                            <button
                              className="edit-actions-cancel-btn"
                              onClick={() => setEditingIndex(null)}
                            >
                              <FaTimesCircle />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{s.student_name}</td>
                        <td>{s.roll_no}</td>
                        <td>{s.email}</td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="edit-btn"
                              onClick={() => handleEdit(idx)}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDelete(idx)}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpcomingExamDetails;
