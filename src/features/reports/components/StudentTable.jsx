import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiDownload, FiFileText, FiSearch, FiShield } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";
import { updatePassMark } from "../../../services/examService";
import { useAdminWorkspace } from "../../admin/context/AdminWorkspaceContext";
import "../styles/student-table.css";
import "../../admin/styles/exam-students-results.css";

function recordedScore(student) {
  if (student.student_status !== "submitted") return null;
  const score = Number(student.marks_scored);
  return student.marks_scored == null || !Number.isFinite(score) ? null : score;
}
function resultFor(student, qualifyingMark) {
  const score = recordedScore(student);
  if (score === null) return "not submitted";
  return score >= qualifyingMark ? "passed" : "failed";
}
function escapeCsv(value) {
  let text = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
function saveCsv(filename, records) {
  const content = records.map(record => record.map(escapeCsv).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function StudentTable({ students = [], examId, exam, passMark, setPassMark }) {
  const queryClient = useQueryClient();
  const { institutionId } = useAdminWorkspace();
  const [draftMark, setDraftMark] = useState(String(exam?.pass_mark ?? passMark ?? 0));
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name");

  const effectiveMark = Number(exam?.pass_mark ?? passMark ?? 0);
  useEffect(() => {
    setDraftMark(String(exam?.pass_mark ?? passMark ?? 0));
    setSaved(false);
  }, [exam?.pass_mark, examId]);

  const results = useMemo(() => students.map(student => ({
    ...student, score: recordedScore(student),
    result: resultFor(student, effectiveMark),
  })), [students, effectiveMark]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = results.filter(student =>
      (filter === "all" || student.result === filter) &&
      [student.student_name, student.roll_no, student.email]
        .some(field => String(field || "").toLowerCase().includes(term)));
    rows.sort((a, b) => {
      if (sort === "high") return (b.score ?? -1) - (a.score ?? -1);
      if (sort === "low") return (a.score ?? Number.MAX_SAFE_INTEGER) - (b.score ?? Number.MAX_SAFE_INTEGER);
      return String(a.student_name || "").localeCompare(String(b.student_name || ""));
    });
    return rows;
  }, [results, filter, search, sort]);

  async function saveQualifyingMark(event) {
    event.preventDefault();
    if (!exam || saving) return;
    const next = Number(draftMark);
    if (draftMark === "" || !Number.isSafeInteger(next) || next < 0 || next > Number(exam.total_marks)) {
      setSaveError(`Enter a whole number between 0 and ${exam.total_marks}.`);
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const updated = await updatePassMark(examId, next);
      queryClient.setQueryData(["exams", institutionId], (current = []) =>
        current.map(item => item.exam_id === examId ? { ...item, pass_mark: updated.pass_mark } : item));
      setPassMark(updated.pass_mark);
      setDraftMark(String(updated.pass_mark));
      setSaved(true);
    } catch (error) {
      setSaveError(error.message || "Could not update qualifying marks.");
    } finally { setSaving(false); }
  }

  const exportRows = () => [
    ["Student", "Roll number", "Email", "Attempt status", "Score", "Maximum marks", "Result"],
    ...results.map(s => [
      s.student_name, s.roll_no, s.email, s.student_status,
      s.score ?? "", exam?.total_marks ?? "", s.result,
    ]),
  ];
  async function exportExcel() {
    if (exporting) return;
    setExporting(true);
    try {
      // Use a browser-focused XLSX writer instead of the vulnerable SheetJS npm package.
      const { default: writeExcelFile } = await import("write-excel-file/browser");
      const rows = exportRows().map((row, rowIndex) => row.map(value => {
        const cell = typeof value === "number" ? value : String(value ?? "");
        return rowIndex === 0 ? { value: String(cell), fontWeight: "bold" } : cell;
      }));
      await writeExcelFile(rows, { sheet: "Results", stickyRowsCount: 1 })
        .toFile(`Qualify_Results_${examId}.xlsx`);
    } catch (err) {
      setSaveError(err.message || "Unable to export Excel file.");
    } finally { setExporting(false); }
  }

  return <section className="qe-scoreboard" aria-labelledby="qe-scoreboard-heading">
    <header className="qe-scoreboard-header">
      <div>
        <span className="qe-overline">DETAILED REPORT</span>
        <h2 id="qe-scoreboard-heading">Student results</h2>
        <p>Recorded scores and pass/fail outcomes for registered students.</p>
      </div>
      <div className="qe-scoreboard-exports">
        <button type="button" onClick={() => saveCsv(`Qualify_Results_${examId}.csv`, exportRows())}
          className="qe-utility-button"><FiDownload aria-hidden="true" /> Export CSV</button>
        <button type="button" onClick={exportExcel} disabled={exporting}
          className="qe-utility-button"><FiFileText aria-hidden="true" /> {exporting ? "Exporting…" : "Export Excel"}</button>
      </div>
    </header>

    <form className="qe-score-criteria" onSubmit={saveQualifyingMark}>
      <span className="qe-score-criteria-icon"><FiShield aria-hidden="true" /></span>
      <div className="qe-score-criteria-copy">
        <strong>Qualifying marks</strong>
        <span>Students scoring at least this mark pass the exam.</span>
      </div>
      <div className="qe-score-criteria-actions">
        <label htmlFor="qe-qualifying-mark">Pass mark</label>
        <input id="qe-qualifying-mark" type="number" min="0" max={exam?.total_marks} step="1"
          value={draftMark} disabled={saving || !exam}
          onChange={e => { setDraftMark(e.target.value); setSaveError(""); setSaved(false); }} />
        <span className="qe-score-max">/ {exam?.total_marks ?? "—"}</span>
        <button type="submit" className="qe-score-save" disabled={!exam || saving || Number(draftMark) === effectiveMark}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
    {saveError && <p className="qe-score-error" role="alert">{saveError}</p>}
    {saved && <p className="qe-score-success" role="status"><FiCheckCircle aria-hidden="true" /> Qualifying marks updated.</p>}

    <div className="qe-scoreboard-toolbar">
      <label className="qe-ops-search"><FiSearch aria-hidden="true" />
        <input value={search} type="search" onChange={e => setSearch(e.target.value)}
          placeholder="Search student, roll no. or email" aria-label="Search student results" />
      </label>
      <div className="qe-scoreboard-selectors">
        <label className="qe-ops-select">Result
          <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter student results">
            <option value="all">All results</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="not submitted">Not submitted</option>
          </select>
        </label>
        <label className="qe-ops-select">Sort
          <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort student results">
            <option value="name">Name A–Z</option>
            <option value="high">Highest score</option>
            <option value="low">Lowest score</option>
          </select>
        </label>
      </div>
    </div>

    <div className="qe-scoreboard-table-scroll" role="region" aria-label="Student results table" tabIndex={0}>
      <table className="qe-ops-table qe-score-table">
        <thead><tr><th>Student</th><th>Roll number</th><th>Score</th><th>Result</th></tr></thead>
        <tbody>
          {visible.map(student => <tr key={student.student_report_id}>
            <td><strong className="qe-student-name">{student.student_name || "Unnamed student"}</strong>
              {student.email && <span className="qe-student-sub">{student.email}</span>}</td>
            <td><span className="qe-roll-number">{student.roll_no || "—"}</span></td>
            <td>{student.score === null ? <span className="qe-score-missing">—</span> :
              <span className="qe-score-value">{student.score} <small>/ {exam?.total_marks ?? "—"}</small></span>}</td>
            <td><span className={`qe-grade qe-grade--${student.result.replaceAll(" ", "-")}`}>
              <span aria-hidden="true" />{student.result === "not submitted" ? "Not submitted" :
                student.result === "passed" ? "Passed" : "Failed"}</span></td>
          </tr>)}
          {!visible.length && <tr><td colSpan={4} className="qe-empty-table">
            {students.length ? "No students match these filters." : "No student results are available yet."}
          </td></tr>}
        </tbody>
      </table>
    </div>
    <footer className="qe-scoreboard-footer">
      Showing {visible.length} of {students.length} registered students
      <span>Scores are taken from completed student submissions.</span>
    </footer>
  </section>;
}
