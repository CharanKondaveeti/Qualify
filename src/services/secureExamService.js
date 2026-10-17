// Student access in real Supabase MUST use these RPCs. No student browser
// is allowed direct SELECT on questions or UPDATE on studentReport.
import supabase, { isDemo } from '../lib/supabase';
import { scoreExam } from '../utils/scoreExam';
import { attemptDeadline, entryClosesAt } from '../utils/examTiming';
import { syncDemoExam } from './demoExamTiming';

const secretKey = id => `qualify-private-${id}`;
const sessionKey = id => `qualify-session-${id}`;
const requireToken = id => {
  const key = sessionStorage.getItem(secretKey(id));
  if (!key) throw new Error('Missing private access code. Open your original registration link.');
  return key;
};
export function savePrivateToken(id, token) { sessionStorage.setItem(secretKey(id), token); }
export function getPrivateToken(id) { return requireToken(id); }
export function getSessionToken(id) { return sessionStorage.getItem(sessionKey(id)); }
export function clearPrivateSession(id) { sessionStorage.removeItem(sessionKey(id)); }
const newSession = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), v => v.toString(16).padStart(2,'0')).join('');
async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}
export async function publicExam(examId) {
  if (!isDemo) return rpc('qualify_public_exam', { p_exam: examId });
  return syncDemoExam(examId);
}
export async function registerStudent(examId, name, email, rollNo) {
  if (!isDemo) return rpc('qualify_register', { p_exam:examId, p_name:name, p_email:email, p_roll:rollNo });
  const { data, error } = await supabase.from('studentReport').insert([{exam_id:examId,student_name:name,email,roll_no:rollNo,student_status:'not started',answers:{},marks_scored:0}]).select();
  if (error) throw new Error(error.message);
  return {student_report_id:data[0].student_report_id,access_token:'demo-access'};
}
export function studentLink(examId, attemptId, token) {
  return `${location.origin}/candidate/exams/${encodeURIComponent(examId)}/attempts/${encodeURIComponent(attemptId)}#access=${encodeURIComponent(token)}`;
}
export async function studentState(examId, attemptId) {
  if (!isDemo) return rpc('qualify_student_state', { p_attempt:attemptId, p_token:requireToken(attemptId), p_session:getSessionToken(attemptId) });
  await syncDemoExam(examId);
  const [e,a] = await Promise.all([supabase.from('exams').select('*').eq('exam_id',examId).single(),supabase.from('studentReport').select('*').eq('student_report_id',attemptId).single()]);
  if (e.error || a.error) throw new Error('Attempt not found');
  const q=await supabase.from('questions').select('*').eq('exam_id',examId);
  return { ...e.data,last_entry_at:new Date(entryClosesAt(e.data)).toISOString(),student_status:a.data.student_status,student_name:a.data.student_name,roll_no:a.data.roll_no,email:a.data.email,answers:a.data.answers||{},review_flags:{},started_at:a.data.started_at,deadline:a.data.started_at ? (a.data.deadline || attemptDeadline(e.data,a.data.started_at)):null,server_now:new Date().toISOString(),questions:q.data||[],marks_scored:a.data.marks_scored,results_published:true };
}
export async function beginStudent(examId, attemptId) {
  let session=getSessionToken(attemptId);
  if (!session) { session=newSession(); sessionStorage.setItem(sessionKey(attemptId), session); }
  if (!isDemo) return rpc('qualify_begin',{p_attempt:attemptId,p_token:requireToken(attemptId),p_session:session});
  const exam = await syncDemoExam(examId);
  const current = await studentState(examId, attemptId);
  if (current.student_status === 'in progress' || current.student_status === 'submitted') return current;
  if (exam.exam_status !== 'active' || Date.now() >= entryClosesAt(exam)) throw new Error('This exam is not open for starts.');
  const startedAt = new Date().toISOString();
  const { data, error } = await supabase.from('studentReport').update({student_status:'in progress',started_at:startedAt,deadline:attemptDeadline(exam,startedAt)}).eq('student_report_id',attemptId).eq('student_status','not started').select();
  if (error || !data?.length) throw new Error('Could not start demo exam');
  return studentState(examId,attemptId);
}
export async function saveStudent(examId, attemptId, answers, review, final=false) {
  if (!isDemo) return rpc('qualify_save',{p_attempt:attemptId,p_token:requireToken(attemptId),p_session:getSessionToken(attemptId),p_answers:answers,p_review:review,p_final:final});
  const state = await studentState(examId, attemptId);
  if (state.student_status === 'submitted') return { saved: false, expired: true, student_status: 'submitted' };
  const changes={answers, ...(final?{student_status:'submitted'}:{})};
  if (final) {
    const q=await supabase.from('questions').select('*').eq('exam_id',examId);
    const e=await supabase.from('exams').select('*').eq('exam_id',examId).single();
    changes.marks_scored=scoreExam(q.data||[],answers,e.data.total_marks);
  }
  const {data,error}=await supabase.from('studentReport').update(changes).eq('student_report_id',attemptId).eq('student_status','in progress').select();
  if (error || !data?.length) throw new Error('Exam is already closed');
  return {saved:true,student_status:final?'submitted':'in progress'};
}
export async function logExamEvent(attemptId, kind) {
  if (isDemo) return;
  try { await rpc('qualify_log_event',{p_attempt:attemptId,p_token:requireToken(attemptId),p_session:getSessionToken(attemptId),p_kind:kind}); }
  catch { /* monitoring is best effort and must never break answering */ }
}
export async function publishedResult(attemptId) {
  if (!isDemo) return rpc('qualify_results',{p_attempt:attemptId,p_token:requireToken(attemptId)});
  const {data:attempt,error:aErr}=await supabase.from('studentReport').select('*').eq('student_report_id',attemptId).single();
  if(aErr || !attempt) return {status:'pending'};
  if(attempt.student_status!=='submitted') return {status:'pending'};
  const {data:exam,error:eErr}=await supabase.from('exams').select('*').eq('exam_id',attempt.exam_id).single();
  if(eErr||!exam) return {status:'pending'};
  return {status:'published',title:exam.title,student_name:attempt.student_name,roll_no:attempt.roll_no,score:Number(attempt.marks_scored)||0,total_marks:exam.total_marks,pass_mark:exam.pass_mark,passed:Number(attempt.marks_scored)>=Number(exam.pass_mark)};
}
export async function adminControl(attemptId, action, minutes=0) {
  return rpc('qualify_admin_control',{p_attempt:attemptId,p_action:action,p_minutes:minutes});
}
export async function adminEvents(examId, search='') { return rpc('qualify_admin_search_events',{p_exam:examId,p_search:search}); }
export async function adminClearEvents(examId) { return rpc('qualify_admin_clear_events',{p_exam:examId}); }

export async function adminIssueLink(attemptId) { return rpc('qualify_admin_issue_link',{p_attempt:attemptId}); }
