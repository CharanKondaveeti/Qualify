import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function collect(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? collect(path) : [path];
  });
}

test('all local JS/JSX/CSS imports resolve to existing files', () => {
  const src = join(root, 'src');
  const failures = [];
  for (const file of collect(src).filter(f => ['.js', '.jsx'].includes(extname(f)))) {
    const content = readFileSync(file, 'utf8');
    const imports = [
      ...content.matchAll(/\bfrom\s*['"](\.[^'"]+)['"]/g),
      ...content.matchAll(/\bimport\s*['"](\.[^'"]+)['"]/g),
      ...content.matchAll(/\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g),
    ];
    for (const [, relative] of imports) {
      const target = resolve(dirname(file), relative);
      if (![target, `${target}.js`, `${target}.jsx`, `${target}.css`, join(target, 'index.js'), join(target, 'index.jsx')].some(existsSync)) {
        failures.push(`${file.replace(root, '')} -> ${relative}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test('current workspace, platform, candidate and authentication routes stay wired', () => {
  const app = readFileSync(join(root, 'src/app/App.jsx'), 'utf8');
  const expected = {
    workspaceRoutes: ['/app', '/app/i/:institutionId', 'calendar', 'exams', 'question-banks', 'team'],
    platformRoutes: ['/platform', 'institutions', 'applications'],
    candidateRoutes: ['/join/:examId', '/candidate/exams/:examId/attempts/:studentId', '/candidate/results/:studentId'],
    authRoutes: ['/login', '/signup', '/auth/callback', '/reset-password'],
  };
  for (const [module, paths] of Object.entries(expected)) {
    assert.ok(app.includes(`...${module}`), `Unwired route module: ${module}`);
    const source = readFileSync(join(root, `src/app/routes/${module}.jsx`), 'utf8');
    for (const path of paths) assert.ok(source.includes(`'${path}'`), `Missing route: ${path}`);
  }
  assert.ok(existsSync(join(root, 'src/features/admin/pages/CalendarPage.jsx')));
});

test('obsolete separate institution dashboards and env secrets are excluded', () => {
  for (const file of [
    'src/pages',
    'src/features/institutions/pages/InstitutionWorkspacePage.jsx',
    'src/features/institutions/pages/InstitutionExamPage.jsx',
    'src/features/institutions/pages/PlatformOwnerPage.jsx',
    'archive',
  ]) assert.equal(existsSync(join(root, file)), false, `${file} must be absent`);
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0');
  assert.deepEqual(tracked.filter(file => /(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.env.example')), []);
  assert.ok(existsSync(join(root, '.env.example')));
});
