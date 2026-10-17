// Zero-based option indexes. Prefer per-question marks; legacy tests using
// markless questions still distribute totalMarks evenly.
export function scoreExam(questions, answers, totalMarks = 0) {
  if (!questions.length) return 0;
  const explicit = questions.every(q => Number.isFinite(Number(q.marks)) && Number(q.marks) > 0);
  return questions.reduce((sum,q) => {
    const correct = answers[q.question_id] !== undefined &&
      Number(answers[q.question_id]) === Number(q.correct_option);
    return sum + (correct ? (explicit ? Number(q.marks) : Number(totalMarks)/questions.length) : 0);
  }, 0);
}
