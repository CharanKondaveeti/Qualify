import { isDemo } from '../../../lib/supabase';
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FiBookOpen, FiCheck, FiLayers, FiPlus } from "react-icons/fi";

import { useAdminWorkspace } from "../../admin/context/AdminWorkspaceContext";
import {
  listBankQuestions,
  listNamedBanks,
} from "../../../services/namedBankService";
import { setQuestions } from "../../../store/newExamSlice";

import "../../admin/styles/question-banks.css";

export default function BankPicker() {
  const { institutionId } = useAdminWorkspace();

  const dispatch = useDispatch();

  const current = useSelector((state) => state.newExam.questions);

  const [banks, setBanks] = useState([]);
  const [mode, setMode] = useState("multiple");
  const [selected, setSelected] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    setSelected([]);
    setBanks([]);
    setError("");

    if (!open || !institutionId) return;

    listNamedBanks(institutionId)
      .then((data) => {
        if (!cancelled) setBanks(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [open, institutionId]);

  const selectedNames = useMemo(
    () => banks.filter((bank) => selected.includes(bank.id)),
    [banks, selected],
  );

  function select(bankId) {
    setMessage("");

    if (mode === "single") {
      setSelected([bankId]);
    } else {
      setSelected((previous) =>
        previous.includes(bankId)
          ? previous.filter((id) => id !== bankId)
          : [...previous, bankId],
      );
    }
  }

  async function loadSelectedBanks() {
    if (!selected.length || busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      // Supabase RLS restricts which bank questions
      // the signed-in staff member is allowed to read.
      const results = await Promise.all(
        selected.map((bankId) => listBankQuestions(bankId)),
      );

      const alreadyUsed = new Set(
        current
          .map((question) => question.source_bank_question_id)
          .filter(Boolean),
      );

      const toAdd = [];

      for (const group of results) {
        for (const question of group) {
          if (alreadyUsed.has(question.id)) continue;

          alreadyUsed.add(question.id);

          toAdd.push({
            question_id: crypto.randomUUID(),
            source_bank_question_id: question.id,
            question_text: question.question_text,
            options: [...question.options],
            correct_option: Number(question.correct_option),
            marks: Number(question.marks),
          });
        }
      }

      if (!toAdd.length) {
        setMessage(
          "No new questions to add. These banks are empty or their questions were already loaded.",
        );
      } else {
        dispatch(setQuestions([...current, ...toAdd]));

        setMessage(
          `${toAdd.length} questions copied from ${selected.length} bank${selected.length === 1 ? "" : "s"}. Edit these copies below without changing the saved banks.`,
        );
      }
    } catch (err) {
      setError(err.message || "Unable to load selected banks.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="qb-picker">
      <div className="qb-picker-heading">
        <div>
          <strong>
            <FiLayers aria-hidden="true" />
            Select Question Banks
          </strong>
          <small>
            Load a complete bank or combine several banks in this exam.
          </small>
        </div>

        <button
          type="button"
          className="qb-btn qb-btn-muted"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? "Hide banks" : "Choose banks"}
        </button>
      </div>

      {open && (
        <div className="qb-picker-content">
          <div
            className="qb-mode-switch"
            role="group"
            aria-label="Question bank selection mode"
          >
            <button
              type="button"
              className={mode === "single" ? "is-active" : ""}
              aria-pressed={mode === "single"}
              onClick={() => {
                setMode("single");
                setSelected((previous) => previous.slice(0, 1));
              }}
            >
              Single bank
            </button>

            <button
              type="button"
              className={mode === "multiple" ? "is-active" : ""}
              aria-pressed={mode === "multiple"}
              onClick={() => setMode("multiple")}
            >
              Multiple banks
            </button>
          </div>

          {!banks.length ? (
            <p className="qb-helper">
              No banks available yet.{" "}
              <Link to={isDemo ? "/demo/admin/question-banks" : `/app/i/${institutionId}/question-banks`}>Create a question bank</Link>.
            </p>
          ) : (
            <div className="qb-picker-list">
              {banks.map((bank) => (
                <label
                  key={bank.id}
                  className={`qb-picker-row ${
                    selected.includes(bank.id) ? "is-selected" : ""
                  }`}
                >
                  <input
                    type={mode === "single" ? "radio" : "checkbox"}
                    name={mode === "single" ? "qualify-bank" : undefined}
                    checked={selected.includes(bank.id)}
                    onChange={() => select(bank.id)}
                  />

                  <span className="qb-bank-icon">
                    <FiBookOpen aria-hidden="true" />
                  </span>

                  <span className="qb-picker-title">
                    <strong>{bank.name}</strong>
                    <small>
                      {[bank.course, bank.topic].filter(Boolean).join(" · ") ||
                        "General questions"}
                    </small>
                  </span>

                  <span className="qb-picker-visibility">
                    {bank.visibility === "institution" ? "Shared" : "Private"}
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className="qb-picker-footer">
            <span>
              {selectedNames.length} bank
              {selectedNames.length === 1 ? "" : "s"} selected
            </span>

            <button
              type="button"
              className="qb-btn qb-btn-primary"
              disabled={!selected.length || busy}
              onClick={loadSelectedBanks}
            >
              <FiPlus />
              {busy ? "Loading…" : "Add selected banks"}
            </button>
          </div>

          {message && (
            <p className="qb-notice qb-success" role="status">
              <FiCheck />
              {message}
            </p>
          )}

          {error && (
            <p className="qb-notice qb-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
