// Validate CSV rows before inserting anything into the question bank.
// The public template uses zero-based correctAnswer values (0 = option1).
export const BANK_CSV_REQUIRED_COLUMNS = ['question', 'option1', 'option2', 'correctAnswer', 'marks'];
export const BANK_CSV_MAX_ROWS = 200;

export function validateQuestionBankCsv(rows, { course, topic, difficulty } = {}) {
  const errors = [];
  const questions = [];
  if (!course?.trim() || !topic?.trim()) errors.push('Enter a course and topic before uploading.');
  if (!['easy', 'medium', 'hard'].includes(difficulty)) errors.push('Choose a valid difficulty.');
  if (!Array.isArray(rows) || rows.length === 0) errors.push('CSV file has no question rows.');
  if (rows?.length > BANK_CSV_MAX_ROWS) errors.push(`Upload at most ${BANK_CSV_MAX_ROWS} questions at a time.`);
  if (errors.length) return { questions: [], errors };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 2; // CSV header occupies line 1
    const question_text = String(row.question ?? '').trim();
    const optionValues = Array.from({ length: 6 }, (_, n) => String(row[`option${n + 1}`] ?? '').trim());
    const optionCount = optionValues.filter(Boolean).length;
    const options = optionValues.slice(0, optionCount);
    const answerRaw = String(row.correctAnswer ?? '').trim();
    const marksRaw = String(row.marks ?? '').trim();
    const answer = Number(answerRaw);
    const marks = Number(marksRaw);

    if (!question_text) errors.push(`Row ${line}: question is missing.`);
    if (optionCount < 2 || optionValues.some((v, n) => n < optionCount && !v)) errors.push(`Row ${line}: provide 2–6 consecutive options, starting at option1.`);
    if (!answerRaw || !Number.isInteger(answer) || answer < 0 || answer >= optionCount) errors.push(`Row ${line}: correctAnswer must be 0 to ${Math.max(0,optionCount - 1)}.`);
    if (!marksRaw || !Number.isInteger(marks) || marks <= 0) errors.push(`Row ${line}: marks must be a positive whole number.`);
    if (errors.length > 20) { errors.push('More errors found. Fix these rows and retry.'); break; }
    questions.push({course:course.trim(), topic:topic.trim(), difficulty, question_text, options, correct_option:answer, marks});
  }
  return errors.length ? {questions:[],errors} : {questions,errors:[]};
}
