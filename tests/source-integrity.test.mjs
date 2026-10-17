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

test('original admin Calendar, exam and student routes are preserved', () => {
  const routes = readFileSync(join(root, 'src/app/App.jsx'), 'utf8');
  for (const route of ["path: '/admin'", "path: 'calendar'", "path: 'exams'", "path: 'question-bank'", "path: 'team'", "path: 'institutions'", "path: '/institution/apply'", "path: '/institution/invite'", "path: '/exams/:examId/student/:studentId'", "path: '/register/exam/:examId'"]) {
    assert.ok(routes.includes(route), `Missing route: ${route}`);
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
    '.env.local',
  ]) assert.equal(existsSync(join(root, file)), false, `${file} must be absent`);
  assert.ok(existsSync(join(root, '.env.example')));
});
