import React, { useState, useEffect } from "react";
import { FaFileExport } from "react-icons/fa";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getExams, getQuestions, updatePassMark } from "../services/exam";
import * as XLSX from "xlsx";
import "./css/studentTable.css";

const StudentTable = ({ students, examId, passMark, setPassMark }) => {
  const queryClient = useQueryClient();

  const [loader, setLoader] = useState(false);

  const exam = queryClient
    .getQueryData(["exams"])
    ?.find((e) => e.exam_id === examId);

  const { data: questions = [] } = useQuery({
    queryKey: ["questions", exam?.exam_id],
    queryFn: () => getQuestions(exam.exam_id),
    enabled: !!exam?.exam_id,
  });

  useEffect(() => {
    if (exam?.pass_mark !== undefined) {
      setPassMark(exam.pass_mark);
    }
  }, [exam]);

  const calculateScoreFromAnswers = (studentAnswers, questions, totalMarks) => {
    if (!studentAnswers || !questions.length) return 0;

    let correctCount = 0;

    questions.forEach((q) => {
      const selectedOption = studentAnswers[q.question_id];
      if (selectedOption !== undefined && selectedOption === q.correct_option) {
        correctCount++;
      }
    });

    const markPerQuestion = totalMarks / questions.length;
    return Math.round(correctCount * markPerQuestion);
  };

  const handleSavePassMark = async () => {
    if (!passMark && passMark === 0) {
      alert("Please enter a valid qualifying mark!");
      return;
    }

    setLoader(true);
    await updatePassMark(examId, passMark);
    setLoader(false);

    const freshExams = await queryClient.fetchQuery({
      queryKey: ["exams"],
      queryFn: getExams,
    });

    const updatedExam = freshExams.find((e) => e.exam_id === examId);
    setPassMark(updatedExam?.pass_mark);
  };

  const handleExportToExcel = () => {
    const data = students.map((student) => {
      const score = calculateScoreFromAnswers(
        student.answers,
        questions,
        exam.total_marks
      );

      return {
        Student: student.student_name,
        "Roll No": student.roll_no,
        Score: score ?? "-",
        Result:
          student.exam_status !== "submitted"
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
          }}
          min="0"
        />
        <button onClick={handleSavePassMark} className="save-passmark-button">
          {loader ? <div className="spinner"></div> : <p>Save</p>}
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
            const score = calculateScoreFromAnswers(
              student.answers,
              questions,
              exam.total_marks
            );

            return (
              <tr key={student.id}>
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
                      Failed
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
