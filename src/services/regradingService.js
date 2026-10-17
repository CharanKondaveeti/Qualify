import supabase from '../lib/supabase';

export async function getRegrading(examId) {
  const [corrections, history] = await Promise.all([
    supabase.from('qualify_question_corrections').select('*').eq('exam_id', examId),
    supabase.from('qualify_regrade_history').select('*').eq('exam_id', examId).order('created_at', { ascending: false }).limit(20),
  ]);
  if (corrections.error) throw corrections.error;
  if (history.error) throw history.error;
  return { corrections: corrections.data || [], history: history.data || [] };
}

export async function regradeExam(examId, change, signature = null) {
  const { data, error } = await supabase.rpc('qualify_regrade', {
    p_exam: examId, p_question: change.questionId,
    p_correct: change.excluded ? null : Number(change.correct), p_excluded: change.excluded,
    p_pass_mark: Number(change.passMark), p_reason: change.reason.trim(), p_signature: signature,
  });
  if (error) throw error;
  return data;
}
