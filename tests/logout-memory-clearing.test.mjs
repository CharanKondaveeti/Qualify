import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import reducer, { setExamDetails, setQuestions, resetExam } from "../src/store/newExamSlice.js";

test("logout resets unsaved exam questions from in-memory Redux state", () => {
  let state = reducer(undefined, {type:"@@INIT"});
  state = reducer(state, setExamDetails({ name:"Private draft exam", course:"Internal" }));
  state = reducer(state, setQuestions([{question_id:"sensitive-question",question_text:"Draft question",correct_option:1}]));
  assert.equal(state.questions.length,1);
  state = reducer(state,resetExam());
  assert.deepEqual(state.questions,[]);
  assert.equal(state.newExam.name,"");
});
test("workspace clears query and Redux caches on user and unexpected sign-out", () => {
  const source = readFileSync(new URL("../src/features/admin/pages/DashboardPage.jsx",import.meta.url),"utf8");
  const count = (source.match(/dispatch\(resetExam\(\)\)/g)||[]).length;
  assert.ok(count >= 3, "tenant switch, explicit logout, and auth-state logout must reset drafts");
  assert.match(source,/if \(!session && event === "SIGNED_OUT"/);
  assert.match(source,/cache\.clear\(\);\s*dispatch\(resetExam\(\)\);/);
});
