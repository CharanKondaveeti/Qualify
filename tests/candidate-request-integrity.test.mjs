import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = path => readFileSync(new URL(path, import.meta.url), "utf8");
const sql = src("../supabase/migrations/20261020_candidate_request_integrity.sql");

test("student score is calculated on the server, not submitted by the browser", () => {
  const api = src("../src/services/secureExamService.js");
  assert.match(api, /rpc\('qualify_save'/);
  assert.doesNotMatch(api.slice(api.indexOf("export async function saveStudent("), api.indexOf("export async function logExamEvent(")),
    /p_marks_scored|p_score|p_correct_option|p_total_marks/);
});

test("candidate session tokens are random and kept in tab-scoped session storage", () => {
  const api = src("../src/services/secureExamService.js");
  assert.match(api, /crypto\.getRandomValues\(new Uint8Array\(32\)\)/);
  assert.match(api, /sessionStorage\.setItem\(secretKey\(id\), token\)/);
  assert.match(api, /sessionStorage\.getItem\(sessionKey\(id\)\)/);
  assert.doesNotMatch(api, /localStorage/);
});

test("server validates token/session formats and all review-flag payload entries", () => {
  assert.match(sql, /\^\[0-9a-f\]\{64\}\$/);
  assert.match(sql, /jsonb_typeof\(p_answers\) IS DISTINCT FROM 'object'/);
  assert.match(sql, /jsonb_typeof\(p_review\) IS DISTINCT FROM 'object'/);
  assert.match(sql, /jsonb_each\(p_review\)/);
  assert.match(sql, /jsonb_typeof\(entry.value\) <> 'boolean'/);
  assert.match(sql, /question_id::text = entry.key AND exam_id = a.exam_id/);
  assert.match(sql, /Invalid question review flag/);
  assert.match(sql, /a\.access_hash <> encode/);
  assert.match(sql, /a\.session_hash <> encode/);
});

test("server serializes and bounds candidate event submissions", () => {
  assert.match(sql, /FROM public\."studentReport"\s+WHERE student_report_id = p_attempt FOR UPDATE/);
  assert.match(sql, /student_report_id = p_attempt\) >= 500/);
  assert.match(sql, /created_at >= now\(\) - INTERVAL '1 minute'\) >= 30/);
  assert.match(sql, /p_kind IS NULL OR p_kind NOT IN/);
});
