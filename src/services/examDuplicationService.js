import { createExamWithQuestions, getQuestions } from "./examService";

// Shares the same creation path as Create Exam, without copying students/results.
// Same fields and randomization defaults as the previous Duplicate Exam action.
export async function duplicateExamFromTemplate(exam, dateInput) {
  const start = new Date(dateInput);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid date or time.");
  if (!exam?.exam_id) throw new Error("Select an exam to duplicate.");

  const questions = await getQuestions(exam.exam_id);
  if (!questions.length) throw new Error("This exam has no questions to copy.");
  const total = questions.reduce((sum, question) => sum + Number(question.marks), 0);
  if (!Number.isFinite(total) || total <= 0) throw new Error("Invalid question marks.");

  let end = null;
  if (exam.timing_mode === "time") {
    const originalEnd = new Date(exam.ends_at).getTime();
    const originalStart = new Date(exam.scheduled_date).getTime();
    const duration = originalEnd - originalStart;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("The original closing time is invalid.");
    end = new Date(start.getTime() + duration).toISOString();
  }

  return createExamWithQuestions({
    title: `Copy of ${exam.title}`,
    course: exam.course,
    institution_id: exam.institution_id,
    scheduled_date: start.toISOString(),
    duration_minutes: exam.duration_minutes,
    total_marks: total,
    timing_mode: exam.timing_mode || "duration",
    entry_window_minutes: exam.entry_window_minutes ?? 30,
    ends_at: end,
    pass_mark: Math.min(Number(exam.pass_mark) || 0, total),
    shuffle_questions: true,
    shuffle_options: true,
    instructions: exam.instructions,
  }, questions);
}
