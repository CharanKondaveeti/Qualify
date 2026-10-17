import React, { useState, useEffect } from "react";
import { FaFileExport } from "react-icons/fa";
import { useQueryClient } from "@tanstack/react-query";
import { updatePassMark } from "../../../services/examService";

import "../styles/student-table.css";
import { useAdminWorkspace } from "../../admin/context/AdminWorkspaceContext";

const StudentTable = ({ students, examId, passMark, setPassMark }) => {
  const queryClient = useQueryClient();
  const { institutionId } = useAdminWorkspace();

  const [loader, setLoader] = useState(false);
  const [saveError, setSaveError] = useState("");

  const exam = queryClient
    .getQueryData(["exams", institutionId])
    ?.find((e) => e.exam_id === examId);

  useEffect(() => {
    if (exam?.pass_mark !== undefined) {
      setPassMark(exam.pass_mark);
    }
  }, [exam?.pass_mark, setPassMark]);

  // The server grades answers with the student's randomized option map.
  // Never rescore server-produced submissions using admin/display indexes.
  const recordedScore = student => student.student_status === 'submitted' ? Number(student.marks_scored ?? 0) : null;

  const handleSavePassMark = async () => {
    const nextPassMark = Number(passMark);
    if (!Number.isSafeInteger(nextPassMark) || nextPassMark < 0 || nextPassMark > exam.total_marks) {
      setSaveError(`Enter a whole number from 0 to ${exam.total_marks}.`);
      return;
    }

    setLoader(true);
    setSaveError("");
    try {
      const updated = await updatePassMark(examId, nextPassMark);
      queryClient.setQueryData(["exams", institutionId], (current = []) =>
        current.map((item) => item.exam_id === examId
          ? { ...item, pass_mark: updated.pass_mark }
          : item),
      );
      setPassMark(updated.pass_mark);
    } catch (error) {
      setPassMark(exam.pass_mark);
      setSaveError(error.message || "Could not update the qualifying mark.");
    } finally {
      setLoader(false);
    }
  };

  const handleExportToExcel = async () => {
    const XLSX = await import("xlsx");
    const data = students.map((student) => {
      const score = recordedScore(student);

      return {
        Student: student.student_name,
        "Roll No": student.roll_no,
        Score: score ?? "-",
        Result:
          student.student_status !== "submitted"
            ? "-"
            : score >= Number(passMark)
            ? "Passed"
            : "Failed",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Exam Report");
    XLSX.writeFile(workbook, `Exam_Report_${exam?.title || "Report"}.xlsx`);
  };

  return (
    <div className="exam-report-student-table">
      {/* Controls */}
      <div className="qualifying-mark-input">
        <label htmlFor="qualifying-mark">Enter Qualifying Mark:</label>
        <input
          type="number"
          id="qualifying-mark"
          value={passMark}
          onChange={(e) => {
            setPassMark(e.target.value);
            setSaveError("");
          }}
          min="0"
          max={exam?.total_marks}
          step="1"
        />
        <button onClick={handleSavePassMark} className="save-passmark-button" disabled={loader || !exam}>
          {loader ? <div className="spinner" aria-label="Saving" /> : <p>Save</p>}
        </button>
        <button
          onClick={handleExportToExcel}
          className="export-button"
          title="Export to Excel"
        >
          <FaFileExport size={20} />
          <span>Export</span>
        </button>
      </div>
      {saveError && <p className="error-message" role="alert">{saveError}</p>}

      {/* Table */}
      <table className="exam-report-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Roll No</th>
            <th>Score</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const score = recordedScore(student);

            return (
              <tr key={student.student_report_id}>
                <td>{student.student_name}</td>
                <td>{student.roll_no}</td>
                <td>
                  {student.student_status !== "submitted" ? (
                    <span>not attempted</span>
                  ) : (
                    <span>{score}</span>
                  )}
                </td>
                <td>
                  {student.student_status !== "submitted" ? (
                    <span className="exam-report-result-badge failed">
                      Not attempted
                    </span>
                  ) : score >= Number(passMark) ? (
                    <span className="exam-report-result-badge passed">
                      Passed
                    </span>
                  ) : (
                    <span className="exam-report-result-badge failed">
                      Failed
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;
