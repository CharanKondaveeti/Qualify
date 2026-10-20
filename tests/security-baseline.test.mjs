import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("production hosting blocks framing and dangerous active content", () => {
  const config = JSON.parse(read("../vercel.json"));
  const headers = new Map(config.headers.flatMap(rule =>
    rule.headers.map(({ key, value }) => [key.toLowerCase(), value])
  ));
  const csp = headers.get("content-security-policy") || "";
  assert.match(csp, /(?:^|;)\s*script-src\s+'self'(?:\s|;|$)/);
  assert.match(csp, /(?:^|;)\s*object-src\s+'none'(?:\s|;|$)/);
  assert.match(csp, /(?:^|;)\s*frame-ancestors\s+'none'(?:\s|;|$)/);
  assert.match(csp, /(?:^|;)\s*base-uri\s+'self'(?:\s|;|$)/);
  assert.equal(headers.get("x-frame-options"), "DENY");
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.ok(headers.has("referrer-policy"));
});

test("production browser client uses only the publishable Supabase credential", () => {
  const source = read("../src/lib/supabase.js");
  assert.match(source, /VITE_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(source, /VITE_SUPABASE_SERVICE_ROLE_KEY|VITE_SUPABASE_SECRET_KEY|service_role/i);
  assert.match(source, /createClient/);
});

test("candidate operations use validated RPCs outside demo", () => {
  const source = read("../src/services/secureExamService.js");
  for (const name of ["qualify_student_state", "qualify_begin", "qualify_save", "qualify_results"]) {
    assert.ok(source.includes(`rpc('${name}'`), `Expected production RPC ${name}`);
  }
  assert.match(source, /if \(!isDemo\)/);
});
