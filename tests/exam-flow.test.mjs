import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoClient } from '../src/lib/demoClient.js';
import { scoreExam } from '../src/utils/scoreExam.js';
const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };

test('zero-based answers, unanswered questions and empty exams are scored consistently', () => {
 const questions = [{question_id:'a',correct_option:0},{question_id:'b',correct_option:3},{question_id:'c',correct_option:1}];
 assert.equal(scoreExam(questions, {a:0,b:3}, 30),20);
 assert.equal(scoreExam(questions, {a:1,b:0,c:0}, 30),0);
 assert.equal(scoreExam([], {},30),0);
});

test('demo create → register → start → save → submit → report persists between clients', async () => {
 memory.clear(); const db=createDemoClient();
 const {data:created}=await db.from('exams').insert([{title:'Integration test',exam_status:'upcoming',total_marks:20}]).select();
 const examId=created[0].exam_id;
 const {data:questions}=await db.from('questions').insert([{exam_id:examId,question_text:'First?',options:['Yes','No'],correct_option:0},{exam_id:examId,question_text:'Second?',options:['Yes','No'],correct_option:1}]).select();
 const {data:students}=await db.from('studentReport').insert([{exam_id:examId,student_status:'not started',answers:{}}]).select();
 const studentId=students[0].student_report_id;
 await db.from('exams').update({exam_status:'active'}).eq('exam_id',examId);
 await db.from('studentReport').update({student_status:'in progress',started_at:new Date().toISOString()}).eq('student_report_id',studentId).eq('student_status','not started');
 const answers={[questions[0].question_id]:0};
 await db.from('studentReport').update({answers}).eq('student_report_id',studentId);
 const score=scoreExam(questions,answers,20);
 await db.from('studentReport').update({answers,marks_scored:score,student_status:'submitted'}).eq('student_report_id',studentId).eq('student_status','in progress');
 const {data:report}=await createDemoClient().from('studentReport').select().eq('student_report_id',studentId).single();
 assert.equal(report.student_status,'submitted'); assert.equal(report.marks_scored,10); assert.deepEqual(report.answers,answers);
 const {data:lateSave}=await db.from('studentReport').update({answers:{}}).eq('student_report_id',studentId).eq('student_status','in progress').select();
 assert.equal(lateSave.length,0);
 await db.from('exams').delete().eq('exam_id',examId);
 assert.equal((await db.from('questions').select().eq('exam_id',examId)).data.length,0);
 assert.equal((await db.from('studentReport').select().eq('exam_id',examId)).data.length,0);
});

test('missing demo records return an error instead of a successful empty single result', async () => {
 const result=await createDemoClient().from('exams').select().eq('exam_id','missing').single();
 assert.equal(result.data,null); assert.ok(result.error);
});
