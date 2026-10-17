import supabase from '../lib/supabase';
import { attemptDeadline, entryClosesAt } from '../utils/examTiming';
import { scoreExam } from '../utils/scoreExam';

// Local sample data follows the same timing rules as the server RPCs.
export async function syncDemoExam(examId) {
  const { data: exam, error } = await supabase.from('exams').select('*').eq('exam_id', examId).single();
  if (error || !exam) throw new Error('Exam not found');
  const now = Date.now();
  if (exam.exam_status === 'completed' || now < new Date(exam.scheduled_date).getTime()) return exam;
  const { data: attempts = [] } = await supabase.from('studentReport').select('*').eq('exam_id', examId);
  const { data: questions = [] } = await supabase.from('questions').select('*').eq('exam_id', examId);
  let running = 0;
  for (const attempt of attempts) {
    if (attempt.student_status !== 'in progress') continue;
    const deadline = attempt.deadline || attemptDeadline(exam, attempt.started_at);
    if (now >= new Date(deadline).getTime() || (exam.timing_mode === 'time' && now >= entryClosesAt(exam))) {
      await supabase.from('studentReport').update({ student_status: 'submitted', marks_scored: scoreExam(questions, attempt.answers || {}, exam.total_marks) }).eq('student_report_id', attempt.student_report_id);
    } else running++;
  }
  const closed = now >= entryClosesAt(exam) && (exam.timing_mode === 'time' || running === 0);
  const status = closed ? 'completed' : 'active';
  if (exam.exam_status !== status) await supabase.from('exams').update({ exam_status: status }).eq('exam_id', examId);
  return { ...exam, exam_status: status };
}
