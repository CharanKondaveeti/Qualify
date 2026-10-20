// Browser storage is untrusted. Recover only values for real questions
// returned by the server; everything else must be ignored, not saved.
const asRecord = value =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value : {};

export function restoreCandidateDraft(questions, serverAnswers, draftAnswers, serverFlags, draftFlags) {
  const byId = new Map(
    (Array.isArray(questions) ? questions : [])
      .filter(question => typeof question.question_id === "string")
      .map(question => [question.question_id, question]),
  );
  const answers = {};
  for (const [questionId, answer] of Object.entries({
    ...asRecord(serverAnswers),
    ...asRecord(draftAnswers),
  })) {
    const question = byId.get(questionId);
    if (question && Array.isArray(question.options) &&
        Number.isInteger(answer) && answer >= 0 && answer < question.options.length) {
      answers[questionId] = answer;
    }
  }

  const flags = {};
  for (const [questionId, flag] of Object.entries({
    ...asRecord(serverFlags),
    ...asRecord(draftFlags),
  })) {
    if (byId.has(questionId) && typeof flag === "boolean") {
      flags[questionId] = flag;
    }
  }
  return { answers, flags };
}
