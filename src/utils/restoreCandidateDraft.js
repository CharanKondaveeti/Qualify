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
  // Apply the valid server snapshot first, then valid local changes.
  // A corrupt local value must not erase a legitimate answer saved on the server.
  for (const source of [serverAnswers, draftAnswers]) {
    for (const [questionId, answer] of Object.entries(asRecord(source))) {
      const question = byId.get(questionId);
      if (question && Array.isArray(question.options) &&
          Number.isInteger(answer) && answer >= 0 && answer < question.options.length) {
        answers[questionId] = answer;
      }
    }
  }

  const flags = {};
  for (const source of [serverFlags, draftFlags]) {
    for (const [questionId, flag] of Object.entries(asRecord(source))) {
      if (byId.has(questionId) && typeof flag === "boolean") {
        flags[questionId] = flag;
      }
    }
  }
  return { answers, flags };
}
