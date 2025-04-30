import React, { useState, useEffect } from "react";
import "./css/studentTable.css";
import supabase from "../services/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getExams } from "../services/exam";
import * as XLSX from "xlsx";
import { getQuestions } from "../services/admin";

const ITEMS_PER_PAGE = 10;

const StudentTable = ({ students, examId }) => {
  const queryClient = useQueryClient();
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [passMark, setPassMark] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const exam = queryClient
    .getQueryData(["exams"])
    ?.find((e) => e.exam_id === examId);

  const {
    data: questions = [],
    isLoading: loadingQuestions,
    isError: errorQuestions,
  } = useQuery({
    queryKey: ["questions", exam?.exam_id],
    queryFn: () => getQuestions(exam.exam_id),
    enabled: !!exam?.exam_id,
  });

  console.log(questions);

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
  

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedStudents = [...students].sort((a, b) => {
    const { key, direction } = sortConfig;
    if (!key) return 0;

    const aScore = calculateScoreFromAnswers(
      a.answers,
      questions,
      exam.total_marks
    );
    const bScore = calculateScoreFromAnswers(
      b.answers,
      questions,
      exam.total_marks
    );

    let aVal =
      key === "result"
        ? aScore >= passMark
        : key === "marks_scored"
        ? aScore
        : a[key];
    let bVal =
      key === "result"
        ? bScore >= passMark
        : key === "marks_scored"
        ? bScore
        : b[key];

    return direction === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  const paginatedStudents = sortedStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(students.length / ITEMS_PER_PAGE);

  const handleSavePassMark = async () => {
    if (!passMark && passMark !== 0) {
      alert("Please enter a qualifying mark!");
      return;
    }

    const { error } = await supabase
      .from("exams")
      .update({ pass_mark: Number(passMark) })
      .eq("exam_id", examId);

    if (error) {
      alert("Failed to update pass mark!");
      return;
    }

    alert("Qualifying mark updated successfully!");

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
      <div className="qualifying-mark-input no-print">
        <label htmlFor="qualifying-mark">Enter Qualifying Mark:</label>
        <input
          type="number"
          id="qualifying-mark"
          value={passMark}
          onChange={(e) => setPassMark(e.target.value)}
          min="0"
        />
        <button onClick={handleSavePassMark} className="save-passmark-button">
          Save
        </button>
        <button onClick={handleExportToExcel} className="excel-button">
          Export to Excel
        </button>
      </div>

      {/* Printable Info */}
      <div className="printable-area">
        <div className="exam-header-section print-only">
          <h1 className="exam-title">Exam Report</h1>
          <p>
            <strong>Exam Name:</strong> {exam?.title}
          </p>
          <p>
            <strong>Exam Date:</strong> {exam?.scheduled_date}
          </p>
          <p>
            <strong>Total Marks:</strong> {exam?.total_marks}
          </p>
          <p>
            <strong>Pass Mark:</strong> {passMark}
          </p>
        </div>

        {/* Table */}
        <div className="exam-report-table-wrapper">
          <table className="exam-report-table">
            <thead>
              <tr>
                {["student_name", "roll_no", "marks_scored", "result"].map(
                  (col) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      style={{ cursor: "pointer" }}
                    >
                      {col === "student_name"
                        ? "Student"
                        : col === "roll_no"
                        ? "Roll No"
                        : col === "marks_scored"
                        ? "Score"
                        : "Result"}
                      {sortConfig.key === col &&
                        (sortConfig.direction === "asc" ? " ↑" : " ↓")}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student) => {
                const score = calculateScoreFromAnswers(
                  student.answers,
                  questions,
                  exam.total_marks
                );

                return (
                  <tr key={student.id}>
                    <td>{student.student_name}</td>
                    <td>{student.roll_no}</td>
                    <td>{score}</td>
                    <td>
                      {student.exam_status !== "submitted" ? (
                        "-"
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

        {/* Pagination Controls */}
        <div className="pagination no-print">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentTable;
