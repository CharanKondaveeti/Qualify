import React, { useState, useEffect } from "react";
import "./css/studentTable.css";

const StudentTable = ({ students }) => {
  const [qualifyingMark, setQualifyingMark] = useState("");
  const [qualifiedPercentage, setQualifiedPercentage] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  useEffect(() => {
    const percentage = calculateQualifiedPercentage();
    setQualifiedPercentage(percentage);
  }, [qualifyingMark, students]);

  const calculateQualifiedPercentage = () => {
    if (!qualifyingMark || isNaN(qualifyingMark)) return 0;

    const qualifiedStudents = students.filter(
      (student) =>
        student.is_attempted && student.score >= Number(qualifyingMark)
    ).length;

    const attemptedStudents = students.filter(
      (student) => student.is_attempted
    ).length;

    return attemptedStudents > 0
      ? Math.round((qualifiedStudents / attemptedStudents) * 100)
      : 0;
  };

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

  return (
    <div className="exam-report-student-table">
      <div className="qualifying-mark-input">
        <label htmlFor="qualifying-mark">Enter Qualifying Mark:</label>
        <input
          type="number"
          id="qualifying-mark"
          value={qualifyingMark}
          onChange={(e) => setQualifyingMark(e.target.value)}
          min="0"
        />
        {qualifyingMark && !isNaN(qualifyingMark) && (
          <div className="qualified-percentage">
            Qualified Percentage: {qualifiedPercentage}%
          </div>
        )}
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
                  ) : student.marks_scored >= Number(qualifyingMark) ? (
                    <span className="exam-report-result-badge passed">
                      Passed
                    </span>
                  ) : (
                    <span className="exam-report-result-badge failed">
                      Failed
                    </span>
                  )}
                </td>

                <td>
                  {student.completed_at ? (
                    <span className="exam-report-attempt-badge yes">Yes</span>
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
