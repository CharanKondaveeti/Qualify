export function distributeEqualMarks(total, questionCount) {
  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new Error("Enter a valid whole-number Total Marks value.");
  }

  if (!Number.isInteger(questionCount) || questionCount <= 0) {
    throw new Error("Add at least one question first.");
  }

  if (total < questionCount) {
    throw new Error(
      `Total Marks must be at least ${questionCount}, because each question needs at least 1 mark.`,
    );
  }

  const base = Math.floor(total / questionCount);
  const remainder = total % questionCount;

  return Array.from(
    { length: questionCount },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}

export function calculateQuestionTotal(questions) {
  if (!questions.length) return 0;

  return questions.reduce((total, question, index) => {
    const marks = Number(question.marks);

    if (question.marks === "" || !Number.isSafeInteger(marks) || marks < 1) {
      throw new Error(
        `Question ${index + 1} must have a whole-number mark of at least 1.`,
      );
    }

    return total + marks;
  }, 0);
}

export function describeDistribution(marks) {
  if (!marks.length) return "";

  const counts = new Map();

  marks.forEach((value) => {
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return Array.from(
    counts,
    ([mark, count]) =>
      `${count} question${count === 1 ? "" : "s"} × ${mark} mark${mark === 1 ? "" : "s"}`,
  ).join(" + ");
}
