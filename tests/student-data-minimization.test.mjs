import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const src = join(root, "src");
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const filename = join(dir, entry.name);
    return entry.isDirectory() ? files(filename) : /\.[cm]?[jt]sx?$/.test(filename) ? [filename] : [];
  });
}
test("admin student reports never request token hashes in the UI", () => {
  const source = readFileSync(join(src, "services", "studentService.js"), "utf8");
  assert.doesNotMatch(source, /\.from\(["']studentReport["']\)\s*\.select\(["']\*["']\)/);
  assert.doesNotMatch(source, /access_hash|session_hash/);
  for (const field of ["student_report_id", "student_status", "marks_scored", "last_seen_at", "deadline"]) {
    assert.ok(source.includes(field), `Student monitoring needs ${field}`);
  }
});
test("report direct studentReport data access paths for manual security review", () => {
  const direct = files(src).filter(file =>
    /\.from\(\s*["']studentReport["']\s*\)/.test(readFileSync(file, "utf8"))
  ).map(file => file.slice(src.length + 1));
  console.log("Direct studentReport callers: " + direct.join(", "));
  assert.ok(direct.includes("services/studentService.js"));
});
test("private exam links use URL fragment and candidate operations require server RPCs", () => {
  const source = readFileSync(join(src, "services", "secureExamService.js"), "utf8");
  assert.match(source, /#access=/);
  assert.match(source, /rpc\('qualify_save'/);
  assert.match(source, /rpc\('qualify_begin'/);
  assert.match(source, /rpc\('qualify_student_state'/);
});
