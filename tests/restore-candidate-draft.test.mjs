import { test } from "node:test";
import assert from "node:assert/strict";
import { restoreCandidateDraft } from "../src/utils/restoreCandidateDraft.js";

const questions = [
  { question_id: "q1", options: ["A", "B", "C"] },
  { question_id: "q2", options: ["Yes", "No"] },
];

test("valid local answers survive reload and override older server autosaves", () => {
  assert.deepEqual(
    restoreCandidateDraft(questions, { q1: 1 }, { q1: 2, q2: 0 }, {}, { q1: true }),
    { answers: { q1: 2, q2: 0 }, flags: { q1: true } },
  );
});

test("tampered local storage cannot inject unknown questions or invalid option indices", () => {
  const result = restoreCandidateDraft(
    questions,
    { q1: 1 },
    { q1: 500, q2: -1, not_a_question: 0, __proto__: { polluted: true } },
    { q1: true },
    { q1: "true", q2: false, fake: true },
  );
  assert.deepEqual(result, {
    answers: {},
    flags: { q2: false },
  });
  assert.equal({}.polluted, undefined);
});

test("null or invalid draft state is handled safely", () => {
  assert.deepEqual(
    restoreCandidateDraft(questions, { q2: 1 }, "invalid", null, [true], null),
    { answers: { q2: 1 }, flags: {} },
  );
});

test("invalid review flags cannot be restored into a save payload", () => {
  const result = restoreCandidateDraft(
    questions, {}, {}, {}, { q1: { arbitrary: true }, q2: true, fake: false },
  );
  assert.deepEqual(result.flags, { q2: true });
});
