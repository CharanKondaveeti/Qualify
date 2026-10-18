import PageLoader from '../../../shared/components/PageLoader';
import { useAppDialog } from '../../../shared/components/ConfirmDialogProvider';
import { isDemo } from '../../../lib/supabase';
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";

import {
  FiArrowLeft,
  FiBookOpen,
  FiEdit2,
  FiFileText,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";

import { useAdminWorkspace } from "../context/AdminWorkspaceContext";

import {
  addBankQuestion,
  createNamedBank,
  deleteBankQuestion,
  deleteNamedBank,
  importBankQuestions,
  listBankQuestions,
  listNamedBanks,
  updateBankQuestion,
  updateNamedBank,
} from "../../../services/namedBankService";

import {
  BANK_CSV_MAX_ROWS,
  BANK_CSV_REQUIRED_COLUMNS,
  validateQuestionBankCsv,
} from "../../../utils/questionBankCsv";

import AddQuestionDialog from "../../questions/dialogs/AddQuestionDialog";
import EditQuestionDialog from "../../questions/dialogs/EditQuestionDialog";

import "../../questions/styles/question-preview.css";
import "../styles/question-banks.css";

const blankBank = () => ({
  name: "",
  course: "",
  topic: "",
  visibility: "private",
});

const blankQuestion = () => ({
  question_text: "",
  options: ["", "", "", ""],
  correct_option: null,
  marks: 1,
});

export default function QuestionBankPage() {
  const { institutionId, user } = useAdminWorkspace();
  const dialog = useAppDialog();

  const [banks, setBanks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState("");

  const [bankForm, setBankForm] = useState(blankBank);
  const [editingBank, setEditingBank] = useState(false);
  const [creatingBank, setCreatingBank] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState(blankQuestion);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [difficulty, setDifficulty] = useState("medium");

  const [csvFile, setCsvFile] = useState(null);
  const [csvDifficulty, setCsvDifficulty] = useState("medium");

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedBank = banks.find((bank) => bank.id === selectedId) || null;

  const canEdit = Boolean(selectedBank && user?.id === selectedBank.owner_id);

  const refreshBanks = useCallback(async () => {
    if (!institutionId) {
      setBanks([]);
      return [];
    }

    const data = await listNamedBanks(institutionId);
    setBanks(data);
    return data;
  }, [institutionId]);

  useEffect(() => {
    let cancelled = false;

    setSelectedId(null);
    setQuestions([]);
    setSearch("");
    setError("");
    setMessage("");
    setLoading(true);

    if (!institutionId) {
      setBanks([]);
      setLoading(false);
      return;
    }

    listNamedBanks(institutionId)
      .then((data) => {
        if (!cancelled) setBanks(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [institutionId]);

  const loadQuestions = useCallback(async (id) => {
    setQuestionsLoading(true);

    try {
      setQuestions(await listBankQuestions(id));
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setQuestions([]);

    if (!selectedId) return;

    setQuestionsLoading(true);

    listBankQuestions(selectedId)
      .then((data) => {
        if (!cancelled) setQuestions(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setQuestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const visibleBanks = useMemo(
    () =>
      banks.filter((bank) =>
        `${bank.name} ${bank.course} ${bank.topic}`
          .toLowerCase()
          .includes(search.toLowerCase().trim()),
      ),
    [banks, search],
  );

  const marksTotal = questions.reduce(
    (sum, question) => sum + Number(question.marks || 0),
    0,
  );

  const clearNotices = () => {
    setError("");
    setMessage("");
  };

  async function perform(action, successMessage) {
    if (busy) return;

    clearNotices();
    setBusy(true);

    try {
      await action();

      if (successMessage) {
        setMessage(successMessage);
      }
    } catch (err) {
      setError(err.message || "The request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveBank(event) {
    event.preventDefault();

    await perform(
      async () => {
        if (!bankForm.name.trim()) {
          throw new Error("Enter the bank name.");
        }

        if (editingBank && selectedBank) {
          await updateNamedBank(selectedBank.id, bankForm);
          await refreshBanks();
          await loadQuestions(selectedBank.id);
          setEditingBank(false);
        } else {
          const bank = await createNamedBank(institutionId, bankForm);

          await refreshBanks();
          setCreatingBank(false);
          setSelectedId(bank.id);
        }

        setBankForm(blankBank());
      },
      editingBank ? "Bank details updated." : "Question bank created.",
    );
  }

  async function removeBank() {
    if (!canEdit) return;

    const confirmed = await dialog.confirm(
      `Delete "${selectedBank.name}" and ALL ${questions.length} reusable questions in it? Existing exams will not be changed. This cannot be undone.`, { title: "Delete question bank", confirmLabel: "Delete bank", danger: true }
    );

    if (!confirmed) return;

    await perform(async () => {
      await deleteNamedBank(selectedBank.id);
      setSelectedId(null);
      setQuestions([]);
      await refreshBanks();
    }, "Question bank deleted. Existing exam papers are unchanged.");
  }

  async function saveNewQuestion() {
    if (!canEdit) return;

    await perform(async () => {
      await addBankQuestion(selectedBank, newQuestion, difficulty);

      await loadQuestions(selectedBank.id);
      setNewQuestion(blankQuestion());
      setAddOpen(false);
    }, "Question added to this bank.");
  }

  async function saveEditedQuestion() {
    if (!editingQuestion || !canEdit) return;

    await perform(async () => {
      await updateBankQuestion(selectedBank, editingQuestion);

      await loadQuestions(selectedBank.id);
      setEditingQuestion(null);
    }, "Question updated. Existing exam papers were not changed.");
  }

  async function removeQuestion(question) {
    if (!canEdit) return;

    if (
      !(await dialog.confirm(
        "Delete this saved question from the bank? Existing exams will not change.",
      ))
    ) {
      return;
    }

    await perform(async () => {
      await deleteBankQuestion(selectedBank.id, question.id);

      await loadQuestions(selectedBank.id);
    }, "Question deleted from bank.");
  }

  async function uploadCsv(event) {
    event.preventDefault();

    if (!canEdit || !csvFile) return;

    await perform(async () => {
      if (
        !csvFile.name.toLowerCase().endsWith(".csv") ||
        csvFile.size > 2 * 1024 * 1024
      ) {
        throw new Error("Select a CSV file smaller than 2 MB.");
      }

      const result = await new Promise((resolve, reject) => {
        Papa.parse(csvFile, {
          header: true,
          skipEmptyLines: "greedy",
          transformHeader: (header) => header.trim(),
          complete: resolve,
          error: reject,
        });
      });

      if (result.errors?.length) {
        throw new Error(result.errors[0].message);
      }

      const missing = BANK_CSV_REQUIRED_COLUMNS.filter(
        (column) => !result.meta.fields?.includes(column),
      );

      if (missing.length) {
        throw new Error(`Missing CSV columns: ${missing.join(", ")}`);
      }

      const checked = validateQuestionBankCsv(result.data, {
        course: selectedBank.course || "General",
        topic: selectedBank.topic || "General",
        difficulty: csvDifficulty,
      });

      if (checked.errors.length) {
        throw new Error(checked.errors.join("\n"));
      }

      const inserted = await importBankQuestions(
        selectedBank,
        checked.questions,
      );

      setCsvFile(null);
      await loadQuestions(selectedBank.id);

      setMessage(`${inserted} questions imported into "${selectedBank.name}".`);
    });
  }

  function openBank(bank) {
    setSelectedId(bank.id);
    setEditingBank(false);
    setCreatingBank(false);
    setError("");
    setMessage("");
  }

  const bankFields = (
    <>
      <label>
        Bank name
        <input
          required
          maxLength={120}
          value={bankForm.name}
          onChange={(event) =>
            setBankForm((previous) => ({
              ...previous,
              name: event.target.value,
            }))
          }
          placeholder="e.g. Java Programming — Unit 1"
        />
      </label>

      <label>
        Course
        <input
          value={bankForm.course}
          onChange={(event) =>
            setBankForm((previous) => ({
              ...previous,
              course: event.target.value,
            }))
          }
          placeholder="e.g. Computer Science"
        />
      </label>

      <label>
        Topic
        <input
          value={bankForm.topic}
          onChange={(event) =>
            setBankForm((previous) => ({
              ...previous,
              topic: event.target.value,
            }))
          }
          placeholder="e.g. Unit 1"
        />
      </label>

      <label>
        Visibility
        <select
          value={bankForm.visibility}
          onChange={(event) =>
            setBankForm((previous) => ({
              ...previous,
              visibility: event.target.value,
            }))
          }
        >
          <option value="private">Private — only me</option>

          <option value="institution">Shared with institution</option>
        </select>
      </label>
    </>
  );

  return (
    <section className="qb-page">
      <header className="qb-hero">
        <div className="qb-heading-icon">
          <FiBookOpen aria-hidden="true" />
        </div>

        <div className="qb-hero-copy">

          <h1>Question Bank</h1>

          <p>
            Organize questions into named banks and reuse entire banks when
            creating exams.
          </p>

        </div>

        {!selectedId && !creatingBank && (
          <button
            type="button"
            className="qb-btn qb-btn-primary"
            onClick={() => {
              setBankForm(blankBank());
              setCreatingBank(true);
            }}
          >
            <FiPlus />
            New Bank
          </button>
        )}
      </header>

      {error && (
        <p
          className="qb-notice qb-error"
          role="alert"
          style={{ whiteSpace: "pre-line" }}
        >
          {error}
        </p>
      )}

      {message && (
        <p className="qb-notice qb-success" role="status">
          {message}
        </p>
      )}

      {creatingBank && (
        <div className="qb-surface qb-edit-panel">
          <h2>Create question bank</h2>

          <form onSubmit={saveBank} className="qb-bank-form">
            {bankFields}

            <div className="qb-form-actions">
              <button
                type="button"
                className="qb-btn qb-btn-muted"
                onClick={() => setCreatingBank(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="qb-btn qb-btn-primary"
                disabled={busy}
              >
                Create bank
              </button>
            </div>
          </form>
        </div>
      )}

      {!selectedId ? (
        <div className="qb-surface">
          <div className="qb-surface-heading">
            <div>
              <h2>
                Saved question banks
                <span className="qb-count">{banks.length}</span>
              </h2>

              <p>Select a bank to manage its questions.</p>
            </div>

            <label className="qb-search">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                placeholder="Search banks..."
                aria-label="Search question banks"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          {loading ? (
            <PageLoader label="Loading question banks…" />
          ) : visibleBanks.length ? (
            <div className="qb-bank-grid">
              {visibleBanks.map((bank) => (
                <button
                  type="button"
                  key={bank.id}
                  className="qb-bank-card"
                  onClick={() => openBank(bank)}
                >
                  <span className="qb-bank-icon">
                    <FiBookOpen />
                  </span>

                  <span
                    className={`qb-chip ${
                      bank.visibility === "institution" ? "qb-chip-shared" : ""
                    }`}
                  >
                    {bank.visibility === "institution"
                      ? "Institution shared"
                      : "Private"}
                  </span>

                  <strong>{bank.name}</strong>

                  <small>
                    {[bank.course, bank.topic].filter(Boolean).join(" · ") ||
                      "General questions"}
                  </small>

                  <span className="qb-open">
                    Open bank
                    <span aria-hidden="true">→</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="qb-empty">
              No question banks found. Create your first named bank.
            </p>
          )}
        </div>
      ) : selectedBank ? (
        <>
          <div className="qb-detail-top">
            <button
              type="button"
              className="qb-back"
              onClick={() => {
                setSelectedId(null);
                setEditingBank(false);
              }}
            >
              <FiArrowLeft />
              All banks
            </button>

            {canEdit && (
              <div className="qb-actions">
                <button
                  type="button"
                  className="qb-btn qb-btn-muted"
                  onClick={() => {
                    setBankForm({
                      name: selectedBank.name,
                      course: selectedBank.course,
                      topic: selectedBank.topic,
                      visibility: selectedBank.visibility,
                    });

                    setEditingBank((value) => !value);
                  }}
                >
                  <FiEdit2 />
                  Edit bank
                </button>

                <button
                  type="button"
                  className="qb-btn qb-btn-danger"
                  onClick={removeBank}
                  disabled={busy}
                >
                  <FiTrash2 />
                  Delete bank
                </button>
              </div>
            )}
          </div>

          <div className="qb-surface qb-bank-detail">
            <div className="qb-detail-heading">
              <div>
                <span className="qb-eyebrow">QUESTION BANK</span>

                <h2>{selectedBank.name}</h2>

                <p>
                  {[selectedBank.course, selectedBank.topic]
                    .filter(Boolean)
                    .join(" · ") || "General questions"}
                </p>
              </div>

              <span
                className={`qb-chip ${
                  selectedBank.visibility === "institution"
                    ? "qb-chip-shared"
                    : ""
                }`}
              >
                {selectedBank.visibility === "institution"
                  ? "Institution shared"
                  : "Private"}
              </span>
            </div>

            <div className="qb-metrics">
              <div>
                <strong>{questions.length}</strong>
                <span>Questions</span>
              </div>

              <div>
                <strong>{marksTotal}</strong>
                <span>Bank marks</span>
              </div>
            </div>

            {editingBank && (
              <form onSubmit={saveBank} className="qb-bank-form qb-inline-form">
                {bankFields}

                <div className="qb-form-actions">
                  <button
                    type="button"
                    className="qb-btn qb-btn-muted"
                    onClick={() => setEditingBank(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="qb-btn qb-btn-primary"
                    disabled={busy}
                  >
                    Save bank
                  </button>
                </div>
              </form>
            )}
          </div>

          {canEdit && (
            <div className="qb-surface">
              <div className="qb-surface-heading">
                <div>
                  <h2>Add questions</h2>

                  <p>
                    Use the existing question editor or import a CSV into this
                    bank.
                  </p>
                </div>

                <button
                  type="button"
                  className="qb-btn qb-btn-primary"
                  onClick={() => {
                    setNewQuestion(blankQuestion());
                    setAddOpen(true);
                  }}
                >
                  <FiPlus />
                  Add Question
                </button>
              </div>

              <form onSubmit={uploadCsv} className="qb-import-form">
                <label>
                  Import CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) =>
                      setCsvFile(event.target.files?.[0] || null)
                    }
                  />
                </label>

                <label>
                  Difficulty
                  <select
                    value={csvDifficulty}
                    onChange={(event) => setCsvDifficulty(event.target.value)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>

                <button
                  type="submit"
                  className="qb-btn qb-btn-muted"
                  disabled={!csvFile || busy}
                >
                  <FiUpload />
                  Import questions
                </button>
              </form>

              <p className="qb-helper">
                Maximum {BANK_CSV_MAX_ROWS} questions / CSV. Required columns:
                question, option1, option2, correctAnswer, marks.{" "}
                <a href="/templates/questions.csv" download>
                  Download CSV template
                </a>
              </p>

              <label className="qb-difficulty">
                New question difficulty
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
            </div>
          )}

          <div className="qb-surface">
            <div className="qb-surface-heading">
              <div>
                <h2>
                  Questions
                  <span className="qb-count">{questions.length}</span>
                </h2>

                <p>
                  Editing a bank never changes an exam that has already been
                  created.
                </p>
              </div>
            </div>

            {questionsLoading ? (
              <PageLoader label="Loading questions…" />
            ) : !questions.length ? (
              <p className="qb-empty">This bank has no questions yet.</p>
            ) : (
              <div className="qb-question-list">
                {questions.map((question, index) => (
                  <article className="qb-question" key={question.id}>
                    <span className="qb-question-number">{index + 1}</span>

                    <div className="qb-question-content">
                      <div className="qb-question-top">
                        <h3>{question.question_text}</h3>

                        <span className="qb-marks">{question.marks} marks</span>
                      </div>

                      <div className="qb-options">
                        {question.options.map((option, i) => (
                          <span
                            className={
                              Number(question.correct_option) === i
                                ? "qb-correct"
                                : ""
                            }
                            key={i}
                          >
                            {option}
                          </span>
                        ))}
                      </div>

                      <small>{question.difficulty || "medium"}</small>
                    </div>

                    {canEdit && (
                      <div className="qb-question-actions">
                        <button
                          type="button"
                          aria-label={`Edit question ${index + 1}`}
                          onClick={() =>
                            setEditingQuestion({
                              ...question,
                            })
                          }
                        >
                          <FiEdit2 />
                        </button>

                        <button
                          type="button"
                          aria-label={`Delete question ${index + 1}`}
                          onClick={() => removeQuestion(question)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>

          <Link className="qb-create-link" to={isDemo ? "/demo/admin/exams/new" : `/app/i/${institutionId}/exams/new`}>
            <FiFileText />
            Create exam using this bank →
          </Link>
        </>
      ) : null}

      {addOpen && (
        <AddQuestionDialog
          newQuestion={newQuestion}
          setNewQuestion={setNewQuestion}
          setIsAddModalOpen={setAddOpen}
          handleAddClick={saveNewQuestion}
          markingMode="custom"
        />
      )}

      {editingQuestion && (
        <EditQuestionDialog
          editingQuestion={editingQuestion}
          setEditingQuestion={setEditingQuestion}
          handleSave={saveEditedQuestion}
          markingMode="custom"
        />
      )}
    </section>
  );
}
