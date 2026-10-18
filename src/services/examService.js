import supabase, { isDemo } from "../lib/supabase";
import { syncDemoExam } from './demoExamTiming';

// The selected institution is an explicit filter, NEVER an authorization grant.
// RLS additionally limits staff to their own exams and super admins to their
// institution. No cross-institution reads are permitted.
export async function getExams(institutionId) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Please sign in again.');
  if (isDemo) {
    const { data, error } = await supabase.from('exams').select('*').eq('created_by', user.id);
    if (error) throw new Error(error.message);
    return Promise.all((data || []).map(exam => syncDemoExam(exam.exam_id)));
  }
  if (!institutionId) throw new Error('Choose an institution before viewing exams.');
  const { data, error } = await supabase.from('exams').select('*')
    .eq('institution_id', institutionId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export const deleteExam = async (examId) => {
  try {
    if (!examId) {
      throw new Error("Invalid exam ID");
    }

    const { error } = await supabase
      .from("exams")
      .delete()
      .eq("exam_id", examId);

    if (error) {
      throw new Error(error.message);
    }

    const { error: questionsError } = await supabase
      .from("questions")
      .delete()
      .eq("exam_id", examId);

    if (questionsError) {
      throw new Error(questionsError.message);
    }

    console.log("Questions related to the exam have been deleted.");
  } catch (error) {
    throw new Error("Error deleting exam: " + error.message);
  }
};
  
export async function createNewExam(exam) {
  try {
    const { data, error } = await supabase.from("exams").insert([exam]).select("exam_id"); 

    if (error) {
      throw new Error(`Failed to insert exam: ${error.message}`);
    }

    return data; 
  } catch {
    throw new Error("Failed to create exam");
  }
}

export async function uploadExamQuestions(questions) {
  try {
    const { data, error } = await supabase.from("questions").insert(questions);

    if (error) {
      throw new Error(`Failed to insert questions: ${error.message}`);
    }

    return data;
  } catch {
    throw new Error("Failed to create questions");
  }
}

export async function createExamWithQuestions(exam, questions, showModal) {
  try {
    if (questions.some(q => !Array.isArray(q.options) || q.options.length < 2)) {
      throw new Error('Every question must have at least two options');
    }
    if (isDemo) {
      const result = await supabase.from('exams').insert([exam]).select();
      if (result.error || !result.data?.[0]) throw new Error('Could not create demo exam');
      const examId = result.data[0].exam_id;
      const saved = await supabase.from('questions').insert(questions.map(({question_id: _questionId, ...q})=>({...q,exam_id:examId}))).select();
      if (saved.error) {
        await supabase.from('exams').delete().eq('exam_id',examId);
        throw new Error(saved.error.message);
      }
      return { success: true, examId };
    }
    if (!exam.institution_id) throw new Error('Choose an institution before creating this exam.');
    const { data, error } = await supabase.rpc('qualify_create_exam', {
      p_exam: exam,
      p_questions: questions.map(q => ({
        question_text: q.question_text,
        options: q.options,
        correct_option: Number(q.correct_option),
        marks: Number(q.marks || 1),
      })),
    });
    if (error) throw error;
    return { success: true, examId: data };
  } catch (err) {
    showModal?.('error', 'Error', err.message || 'Could not create exam');
    throw err;
  }
}


// 4. Get Questions for an exam
export async function getQuestions(exam_id) {
  let { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("exam_id", exam_id)
    .order("question_id", { ascending: true });

  if (error) {
    throw new Error("Questions could not be loaded: " + error.message);
  }

  return data;
}

export async function updatePassMark(examId, passMark) {
  const { data, error } = await supabase
    .from("exams")
    .update({ pass_mark: Number(passMark) })
    .eq("exam_id", examId)
    .select("exam_id,pass_mark");

  if (error) throw error;
  if (!data?.length) throw new Error("Pass mark was not updated. Check your exam access.");
  return data[0];
}
