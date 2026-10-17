import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { scoreExam } from '../src/utils/scoreExam.js';

test('weighted scoring honours question marks (not average question count)', () => {
  const q=[{question_id:'1',correct_option:1,marks:2},{question_id:'2',correct_option:0,marks:5},{question_id:'3',correct_option:2,marks:3}];
  assert.equal(scoreExam(q,{'1':1,'2':0,'3':1},10),7);
  assert.equal(scoreExam(q,{'1':0,'2':1,'3':0},10),0);
  assert.equal(scoreExam(q,{},10),0);
});
test('student pages no longer import direct question and report writes',()=>{
  const page=fs.readFileSync('src/features/student/pages/ExamPage.jsx','utf8');
  const reg=fs.readFileSync('src/features/student/pages/ExamRegistrationPage.jsx','utf8');
  assert.doesNotMatch(page,/from\(['"]questions['"]\)|from\(['"]studentReport['"]\)/);
  assert.doesNotMatch(reg,/from\(['"]studentReport['"]\)/);
  assert.match(page,/saveStudent/);
  assert.match(reg,/registerStudent/);
});
test('migration exposes secure functions and keeps RLS enabled',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261015_qualify_secure_upgrade.sql','utf8');
 for(const name of ['qualify_student_state','qualify_begin','qualify_save','qualify_register','qualify_grade_internal','qualify_admin_control','qualify_admin_bulk_register']) assert.match(sql,new RegExp(`FUNCTION public\\.${name}`));
 assert.match(sql,/ALTER TABLE public\.qualify_events ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON public\.exams, public\.questions, public\."studentReport", public\.admins FROM anon/);
 assert.doesNotMatch(sql,/GRANT (SELECT|ALL) ON public\.questions TO anon/);
});
