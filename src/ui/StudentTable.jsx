import React, { useState } from "react";
import "./css/studentTable.css";
import supabase from "../services/supabase";

const StudentTable = ({ students, passMark, setPassMark, examId }) => {
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortedStudents = () => {
    let sorted = [...students];
    if (!sortConfig.key) return sorted;

    sorted.sort((a, b) => {
      const aVal =
        sortConfig.key === "result"
          ? a.passed
          : sortConfig.key === "attempted"
          ? a.is_attempted
          : a[sortConfig.key] || 0;

      const bVal =
        sortConfig.key === "result"
          ? b.passed
          : sortConfig.key === "attempted"
          ? b.is_attempted
          : b[sortConfig.key] || 0;

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const handleSavePassMark = async () => {
    console.log(passMark, examId);
    if (!passMark) {
      alert("Please enter a qualifying mark!");
      return;
    }

    const { data, error } = await supabase
      .from("exams")
      .update({ pass_mark: Number(passMark) })
      .eq("exam_id", examId);

    if (error) {
      console.error(error);
      alert("Failed to update pass mark!");
    } else {
      alert("Qualifying mark updated successfully!");
    }
  };

  return (
    <div className="exam-report-student-table">
      <div className="qualifying-mark-input">
        <label htmlFor="qualifying-mark">Enter Qualifying Mark:</label>
        <input
          type="number"
          id="qualifying-mark"
          value={passMark}
          onChange={(e) => setPassMark(e.target.value)}
          min="0"
        />
        <button onClick={handleSavePassMark} className="save-passmark-button">
          {"Save"}
        </button>
      </div>

      <div className="exam-report-table-wrapper">
        <table className="exam-report-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Roll No</th>
              <th
                onClick={() => handleSort("score")}
                style={{ cursor: "pointer" }}
              >
                Score{" "}
                {sortConfig.key === "score" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("result")}
                style={{ cursor: "pointer" }}
              >
                Result{" "}
                {sortConfig.key === "result" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th
                onClick={() => handleSort("attempted")}
                style={{ cursor: "pointer" }}
              >
                Attempted{" "}
                {sortConfig.key === "attempted" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody>
            {getSortedStudents().map((student) => (
              <tr key={student.id} className="exam-report-table-row">
                <td>{student.student_name}</td>
                <td>{student.roll_no}</td>
                <td>{student.marks_scored ?? "-"}</td>
                <td>
                  {!student.completed_at ? (
                    "-"
                  ) : student.marks_scored >= Number(passMark) ? (
                    <span className="exam-report-result-badge passed">
                      Passed
                    </span>
                  ) : (
                    <span className="exam-report-result-badge failed">
                      Failed
                    </span>
                  )}
                </td>
                {/* 
                <td>
                  {student.completed_at ? (
                    <span className="exam-report-attempt-badge yes">Yes</span>
                  ) : (
                    <span className="exam-report-attempt-badge no">No</span>
                  )}
                </td> */}

                <td>
                  {student.exam_status === "submitted" &&
                  student.completed_at ? (
                    <span className="exam-report-attempt-badge yes">Yes</span>
                  ) : student.exam_status === "revoked" ? (
                    <span className="exam-report-attempt-badge no">
                      Revoked
                    </span>
                  ) : (
                    <span className="exam-report-attempt-badge no">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentTable;
