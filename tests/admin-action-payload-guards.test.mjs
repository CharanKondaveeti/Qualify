import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const sql = read("../supabase/migrations/20261020_admin_action_payload_guards.sql");

test("admin +5 minute control cannot become +120 by editing a request body", () => {
  assert.match(sql, /p_action='extend_time' AND a\.student_status='in progress' AND p_minutes = 5/);
  assert.doesNotMatch(sql, /p_minutes BETWEEN 1 AND 120/);
  assert.match(sql, /qualify_exam_can_manage\(a\.exam_id\)/);
});

test("revoke control applies only to in-progress students", () => {
  assert.match(sql, /p_action='revoke' AND a\.student_status = 'in progress'/);
  assert.doesNotMatch(sql, /a\.student_status <> 'submitted'/);
});

test("emergency stop requires institution super admin and active exam", () => {
  assert.match(sql, /qualify_is_institution_super/);
  assert.match(sql, /e\.exam_status <> 'active'/);
  assert.match(sql, /Emergency stop is available only for active exams/);
});
