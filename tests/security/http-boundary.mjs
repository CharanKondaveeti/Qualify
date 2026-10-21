// Read-only HTTP boundary checks. Never use a service-role/secret key here.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync(process.env.QUALIFY_HTTP_CONFIG, 'utf8'));
const url = new URL(config.url);
assert.equal(url.protocol, 'https:');
assert.ok(config.publishableKey && !config.publishableKey.startsWith('sb_secret_'));
if (config.publishableKey.split('.').length === 3) {
  assert.equal(JSON.parse(Buffer.from(config.publishableKey.split('.')[1], 'base64url')).role, 'anon');
}
let failed = 0;
const results = [];
async function check(name, path, token, expectedCode) {
  try {
    const headers = { apikey: config.publishableKey };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(new URL(path, url), { headers, signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    assert.ok([401, 403].includes(response.status), `Expected 401/403; got ${response.status}`);
    assert.equal(body.code, expectedCode, 'Unexpected rejection layer');
    results.push({ name, passed: true, status: response.status, code: body.code });
  } catch (error) {
    failed++;
    results.push({ name, passed: false, error: error.message });
  }
}
const tables = ['exams', 'questions', 'studentReport', 'institution_members', 'platform_admins', 'qualify_events'];
for (const table of tables) {
  await check(`anonymous ${table}`, `/rest/v1/${table}?select=*&limit=1`, null, '42501');
}
const forged = [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ sub: 'a0212026-0000-4000-8000-000000000001', role: 'service_role', exp: Math.floor(Date.now()/1000)+600 })).toString('base64url'),
  Buffer.alloc(32).toString('base64url'),
].join('.');
await check('forged service-role JWT', '/rest/v1/exams?select=exam_id&limit=1', forged, 'PGRST301');
console.log(JSON.stringify({ total: results.length, failed, results }, null, 2));
process.exitCode = failed ? 1 : 0;
