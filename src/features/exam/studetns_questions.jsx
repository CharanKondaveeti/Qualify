import React, { useState } from "react";
import { FaTrash, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { FiEdit2 } from "react-icons/fi";
import QuestionList from "../../ui/QuestionList";
import "../admin/css/upcomingExamDetails.css";
import {
  editQuestionInSupabase,
  updateStudentInSupabase,
  deleteStudentFromSupabase,
} from "../../services/admin";
import QuestionTable from "../../ui/QuestionTable";
import StudentTable from "../../ui/StudentTable";

const StudentQuesTab = ({
  students,
  questions,
  setQuestions,
  exam,
  passMark,
  setPassMark,
}) => {
  const [activeMenu, setActiveMenu] = useState("questions");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    email: "",
    rollNo: "",
  });

  const handleEdit = (index) => {
    setEditingIndex(index);
    const student = students[index];
    setEditForm({
      id: student.student_report_id,
      name: student.student_name,
      email: student.email,
      rollNo: student.roll_no,
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    try {
      if (!editForm.id) {
        console.error("Student report ID missing");
        return;
      }
      const updatedStudent = {
        student_name: editForm.name,
        email: editForm.email,
        roll_no: editForm.rollNo,
      };

      await updateStudentInSupabase(editForm.id, updatedStudent);
      setEditingIndex(null);
    } catch (error) {
      console.error("Error updating student:", error);
    }
  };

  const handleDelete = async (index) => {
    const studentId = students[index].student_report_id;
    try {
      await deleteStudentFromSupabase(studentId);
    } catch (error) {
      console.error("Error deleting student:", error);
    }
  };

  const onUpdateQuestion = async (newQ) => {
    await editQuestionInSupabase(newQ);
  };

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
      {activeMenu === "questions" && (
        <>
          {exam.status !== "completed" ? (
            <div className="questions-section">
              <QuestionList
                questions={questions}
                onDelete={(id) =>
                  setQuestions((prev) => prev.filter((q) => q.id !== id))
                }
                onUpdate={onUpdateQuestion}
                examId={exam.exam_id}
                exam={exam}
              />
            </div>
          ) : (
            <QuestionTable questions={questions} />
          )}
        </>
      )}

      {activeMenu === "students" && (
        <>
          {exam.status === "completed" ? (
            <StudentTable
              students={students}
              passMark={passMark}
              setPassMark={setPassMark}
              examId={exam.exam_id}
            />
          ) : (
            <div className="students-section">
              <div className="students-container">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Hall Ticket</th>
                      <th>Email</th>
                      {exam.status === "active" && <th>Status</th>}
                      {exam.status === "upcoming" && <th>Actions</th>}
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
                                value={editForm.email}
                                onChange={(e) =>
                                  handleEditChange("email", e.target.value)
                                }
                                placeholder="Email"
                                type="email"
                              />
                            </td>
                            {exam.status === "active" && (
                              <td>{s.exam_status}</td>
                            )}
                            {exam.status === "upcoming" && (
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
                            )}
                          </>
                        ) : (
                          <>
                            <td>{s.student_name}</td>
                            <td>{s.roll_no}</td>
                            <td>{s.email}</td>
                            {exam.status === "active" && (
                              <td>{s.exam_status}</td>
                            )}
                            {exam.status === "upcoming" && (
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
                            )}
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentQuesTab;
