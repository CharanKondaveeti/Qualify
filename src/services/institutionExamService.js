// Institution operations. All reads/writes are still authorized by Supabase RLS/RPC.
import supabase from '../lib/supabase';
import { getInstitutionAccess } from './institutionService';

function check({error,data}) { if(error) throw new Error(error.message); return data; }
export async function activeInstitutionContext(preferredId) {
  const access = await getInstitutionAccess();
  const valid = (access.institutions || []).filter(i=>i.member_status==='active' && i.institution_status==='active');
  const selected = valid.find(i=>i.institution_id===preferredId) || (!preferredId ? valid[0] : null);
  if (!selected) throw new Error('You need an active membership in this institution.');
  return selected;
}
export async function institutionExams(id) {
  return check(await supabase.from('exams')
    .select('exam_id,institution_id,created_by,title,course,exam_status,scheduled_date,duration_minutes,timing_mode,ends_at,entry_window_minutes,total_marks,total_questions,pass_mark,results_published')
    .eq('institution_id',id).order('created_at',{ascending:false}));
}
export async function institutionExam(examId) {
  const data = check(await supabase.from('exams').select('*').eq('exam_id',examId).maybeSingle());
  if (!data) throw new Error('Exam not found or you do not have access.');
  return data;
}
export const institutionQuestions = examId => checkPromise(supabase.from('questions').select('*').eq('exam_id',examId).order('created_at'));
export const institutionStudents = examId => checkPromise(supabase.from('studentReport')
  .select('student_report_id,student_name,email,roll_no,student_status,marks_scored,started_at,submitted_at,deadline,last_seen_at')
  .eq('exam_id',examId).order('created_at',{ascending:false}));
async function checkPromise(query) { return check(await query); }
export async function createInstitutionExam(id, exam, questions) {
  const payload = {...exam,institution_id:id,total_questions:questions.length,
    total_marks:questions.reduce((sum,q)=>sum+Number(q.marks),0)};
  return check(await supabase.rpc('qualify_create_exam',{p_exam:payload,p_questions:questions}));
}
export async function changeInstitutionExam(examId, changes) {
  return check(await supabase.from('exams').update(changes).eq('exam_id',examId).select('exam_id').single());
}
export async function transferInstitutionExam(examId,userId) {
  return check(await supabase.rpc('qualify_institution_transfer_exam',{p_exam:examId,p_new_owner:userId}));
}
export async function institutionBank(id) {
  return check(await supabase.from('qualify_question_bank').select('*')
    .eq('institution_id',id).order('created_at',{ascending:false}));
}
export async function insertInstitutionBank(id, questions, visibility) {
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user) throw new Error('Please sign in again.');
  return check(await supabase.from('qualify_question_bank')
    .insert(questions.map(q=>({...q,institution_id:id,owner_id:user.id,visibility}))));
}
export async function changeBankVisibility(id,visibility) {
  return check(await supabase.from('qualify_question_bank').update({visibility}).eq('id',id));
}
export async function deleteBankQuestion(id) {
  return check(await supabase.from('qualify_question_bank').delete().eq('id',id));
}

export async function institutionReportSummary(id) {
  return check(await supabase.rpc('qualify_institution_report_summary',{p_institution:id}));
}
