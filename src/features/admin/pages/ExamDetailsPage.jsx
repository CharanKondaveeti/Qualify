import { isDemo } from '../../../lib/supabase';
import PageLoader from '../../../shared/components/PageLoader';
import { useAppDialog } from '../../../shared/components/ConfirmDialogProvider';
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import supabase from "../../../lib/supabase";
import { getExams, getQuestions } from "../../../services/examService";
import { getStudentsReport } from "../../../services/studentService";
import { listInstitutionMembers } from "../../../services/institutionService";
import { transferInstitutionExam } from "../../../services/institutionExamService";
import { useAdminWorkspace } from "../context/AdminWorkspaceContext";
import ExamRegistryLink from "../components/ExamRegistrationLink";
import ExamOperations from "../components/ExamOperations";
import ExamTimingEditor from "../components/ExamTimingEditor";
import ExamDetailsTabs from "../components/ExamDetailsTabs";
import ExamHeader from "../components/ExamHeader";
import ExamTimingSummary from "../components/ExamTimingSummary";
import ExamRegrading from "../components/ExamRegrading";
import "../styles/exam-details.css";
import "../styles/exam-details-layout.css";

const TABS = [
  { id: "edit", label: "Edit" },
  { id: "students", label: "Students" },
  { id: "questions", label: "Questions" },
  { id: "results", label: "Results" },
];

function visibleTabs(status) {
  return TABS.filter(({ id }) =>
    (id !== "edit" || status === "upcoming") &&
    (id !== "results" || status === "completed"),
  );
}

export default function ExamDetailsPage() {
  const { examId, tab } = useParams();
  const navigate = useNavigate();
  const { institutionId, isSuperAdmin } = useAdminWorkspace();
  const tabPath = (id) => isDemo ? `/demo/admin/exams/${examId}/${id}` : `/app/i/${institutionId}/exams/${examId}/${id}`;
  const cache = useQueryClient();
  const dialog = useAppDialog();

  const activeTab = tab || "students";
  const [passMark, setPassMark] = useState(0);
  const [staff, setStaff] = useState([]);
  const [newOwner, setNewOwner] = useState("");
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");
  const [stopBusy, setStopBusy] = useState(false);
  const [stopError, setStopError] = useState("");

  const {
    data: exams = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["exams", institutionId],
    queryFn: () => getExams(institutionId),
    refetchInterval: 15000,
  });

  const exam = exams.find((item) => String(item.exam_id) === examId);

  const { data: questions = [] } = useQuery({
    queryKey: ["questions", examId],
    queryFn: () => getQuestions(examId),
    enabled: Boolean(exam),
  });

  const {
    data: students = [],
    isLoading: studentsLoading,
    error: studentsError,
  } = useQuery({
    queryKey: ["students-report", examId],
    queryFn: () => getStudentsReport(examId),
    enabled: Boolean(exam),
    refetchInterval: exam?.exam_status === "active" ? 15000 : false,
  });

  useEffect(() => {
    setNewOwner("");
  }, [examId]);

  useEffect(() => {
    setPassMark(exam?.pass_mark ?? 0);
  }, [exam?.pass_mark]);

  useEffect(() => {
    if (exam && !visibleTabs(exam.exam_status).some((tab) => tab.id === activeTab)) {
      navigate(tabPath("students"), { replace: true });
    }
  }, [exam?.exam_status, activeTab, navigate, examId, institutionId]);

  useEffect(() => {
    if (!isSuperAdmin || !institutionId) {
      setStaff([]);
      return;
    }

    let cancelled = false;

    listInstitutionMembers(institutionId)
      .then((members) => {
        if (!cancelled) {
          // Keep inactive people for historical attribution; restrict transfers separately.
          setStaff(members ?? []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setTransferMessage(err.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [institutionId, isSuperAdmin]);

  async function transfer() {
    if (!newOwner || !(await dialog.confirm("Transfer this examination to the selected active member?", { title: "Transfer examination", confirmLabel: "Transfer" }))) {
      return;
    }

    setTransferBusy(true);
    setTransferMessage("");

    try {
      await transferInstitutionExam(examId, newOwner);

      await cache.invalidateQueries({
        queryKey: ["exams"],
      });

      setNewOwner("");
      setTransferMessage("Exam ownership transferred.");
    } catch (err) {
      setTransferMessage(err.message);
    } finally {
      setTransferBusy(false);
    }
  }

  async function emergencyStop() {
    if (!isSuperAdmin || !exam || exam.exam_status === "completed") {
      return;
    }

    const answer = await dialog.input(`All active attempts in "${exam.title}" will be submitted using saved answers. This action cannot be undone. Type STOP to proceed.`, { title: 'Emergency stop examination', label: 'Confirmation phrase', placeholder: 'STOP', danger: true, confirmLabel: 'Stop exam' });

    if (answer !== "STOP") return;

    setStopBusy(true);
    setStopError("");

    try {
      const { error: rpcError } = await supabase.rpc("qualify_emergency_stop", {
        p_exam: examId,
      });

      if (rpcError) throw rpcError;

      await Promise.all([
        cache.invalidateQueries({
          queryKey: ["exams"],
        }),
        cache.invalidateQueries({
          queryKey: ["students-report", examId],
        }),
      ]);
    } catch (err) {
      setStopError(err.message);
    } finally {
      setStopBusy(false);
    }
  }

  if (isLoading) {
    return <PageLoader label="Loading examination…" />;
  }

  if (error || !exam) {
    return (
      <p className="portal-message">{error?.message || "Exam not found."}</p>
    );
  }

  const upcoming = exam.exam_status === "upcoming";

  function selectTab(id) {
    // Tabs are views of one exam, not separate browser Back destinations.
    if (id !== activeTab) navigate(tabPath(id), { replace: true });
  }

  function onTabKeyDown(event, index) {
    const direction =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;

    if (!direction && event.key !== "Home" && event.key !== "End") {
      return;
    }

    event.preventDefault();

    const currentTabs = visibleTabs(exam.exam_status);
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
        ? currentTabs.length - 1
        : (index + direction + currentTabs.length) % currentTabs.length;

    selectTab(currentTabs[next].id);
    event.currentTarget.parentElement
      .querySelectorAll('[role="tab"]')[next]?.focus();
  }

  return (
    <div className="view-exam-details qualify-exam-detail">
      <ExamHeader exam={exam} responsibleStaff={isSuperAdmin ? staff.find(member => member.user_id === exam.created_by) : null} showResponsibleStaff={isSuperAdmin} />

      <ExamTimingSummary exam={exam} />

      {upcoming && <ExamRegistryLink examId={exam.exam_id} />}

      <div
        className="qualify-exam-tabs"
        role="tablist"
        aria-label="Exam details sections"
      >
        {visibleTabs(exam.exam_status).map((tab, index) => (
          <button
            key={tab.id}
            id={`qualify-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`qualify-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={activeTab === tab.id ? "is-active" : ""}
            onClick={() => selectTab(tab.id)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id={`qualify-panel-${activeTab}`}
        className="qualify-exam-panel"
        role="tabpanel"
        aria-labelledby={`qualify-tab-${activeTab}`}
      >
        {activeTab === "edit" && upcoming && (
          <>
            <ExamTimingEditor exam={exam} />
            <section className="qualify-exam-card qualify-edit-questions-note">
              <h2>Edit questions</h2>
              <p>Question text, answers and marks can be edited in the Questions tab.</p>
              <button type="button" className="qualify-outline-action"
                onClick={() => selectTab("questions")}>Open Questions tab</button>
            </section>
          </>
        )}

        {/* Retains search and filter state between tabs */}

        <ExamOperations
          key={examId}
          exam={exam}
          questions={questions}
          students={students}
          view={activeTab}
        />

        {/* SUPER ADMIN CONTROLS */}

        {isSuperAdmin && ((upcoming && activeTab === "edit") || (!upcoming && activeTab === "students")) && (
          <section className="qualify-ops">
            <h2>Institution exam controls</h2>

            <div className="qualify-exam-controls">
              {exam.exam_status === "active" && (
                <div className="qualify-exam-control-group">
                  <h3>Emergency stop</h3>

                  <button
                    type="button"
                    className="action-btn"
                    disabled={stopBusy}
                    onClick={emergencyStop}
                  >
                    {stopBusy ? "Stopping…" : "Emergency Stop Exam"}
                  </button>

                  {stopError && (
                    <p role="alert" className="ops-error">
                      {stopError}
                    </p>
                  )}
                </div>
              )}

              <div className="qualify-exam-control-group">
                <h3>Transfer exam ownership</h3>

                <p className="muted">
                  Only institution Super Admins can transfer exams to active
                  members of this institution.
                </p>

                <div className="ops-actions">
                  <select
                    aria-label="New exam owner"
                    value={newOwner}
                    onChange={(event) => setNewOwner(event.target.value)}
                  >
                    <option value="">Choose staff member</option>

                    {staff
                      .filter((member) => member.status === "active" && member.user_id !== exam.created_by)
                      .map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.name || member.email} (
                          {member.role === "staff_admin"
                            ? "Staff"
                            : "Super Admin"}
                          )
                        </option>
                      ))}
                  </select>

                  <button
                    type="button"
                    className="action-btn"
                    disabled={!newOwner || transferBusy}
                    onClick={transfer}
                  >
                    {transferBusy ? "Transferring…" : "Transfer ownership"}
                  </button>
                </div>

                {transferMessage && <p role="status">{transferMessage}</p>}
              </div>
            </div>
          </section>
        )}

        {activeTab === "students" && studentsError && (
          <p role="alert" className="ops-error">
            Unable to load students: {studentsError.message}
          </p>
        )}

        {/* Upcoming: registration list is immediately visible, not collapsed. */}
        {activeTab === "students" && upcoming && (
          <section className="qualify-exam-card qualify-upcoming-students">
            <ExamDetailsTabs
              mode="students"
              studentsLoading={studentsLoading}
              students={students}
              questions={questions}
              exam={exam}
              passMark={passMark}
              setPassMark={setPassMark}
            />
          </section>
        )}

        {/* QUESTIONS AND REGRADING */}

        {activeTab === "questions" && (
          <>
            <section className="qualify-exam-card">
              <h2>Exam questions</h2>

              <ExamDetailsTabs
                mode="questions"
                students={students}
                questions={questions}
                exam={exam}
                passMark={passMark}
                setPassMark={setPassMark}
              />
            </section>

            {exam.exam_status === "completed" && (
              <ExamRegrading
                key={exam.exam_id}
                exam={exam}
                questions={questions}
              />
            )}
          </>
        )}

        {/* RESULTS */}

        {activeTab === "results" && exam.exam_status === "completed" && (
          <section className="qualify-exam-card">
            <h2>Student results</h2>

            <ExamDetailsTabs
              mode="results"
              students={students}
              questions={questions}
              exam={exam}
              passMark={passMark}
              setPassMark={setPassMark}
            />
          </section>
        )}
      </div>
    </div>
  );
}
