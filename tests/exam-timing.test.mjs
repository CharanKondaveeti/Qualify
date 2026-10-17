import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExamTiming, timingValues, entryClosesAt, attemptDeadline } from '../src/utils/examTiming.js';

const start = '2026-10-15T10:00:00.000Z';
const end = '2026-10-15T11:00:00.000Z';
const late = '2026-10-15T10:20:00.000Z';

test('fixed closing time applies equally to early and late starts, ignoring bonuses', () => {
  const exam = { scheduled_date: start, ...buildExamTiming({ mode: 'time', endAt: end }, start) };
  assert.equal(attemptDeadline(exam, start), end);
  assert.equal(attemptDeadline(exam, late, 20), end);
  assert.equal(entryClosesAt(exam), Date.parse(end));
  assert.equal(exam.duration_minutes, 60);
});

test('duration mode gives a late arrival their full duration and individual extension', () => {
  const exam = { scheduled_date: start, ...buildExamTiming({ mode: 'duration', durationMinutes: 60, entryMinutes: 30 }, start) };
  assert.equal(attemptDeadline(exam, start), end);
  assert.equal(attemptDeadline(exam, late), '2026-10-15T11:20:00.000Z');
  assert.equal(attemptDeadline(exam, late, 5), '2026-10-15T11:25:00.000Z');
  assert.equal(entryClosesAt(exam), Date.parse('2026-10-15T10:30:00.000Z'));
  assert.equal(exam.ends_at, null);
});

test('rejects missing dates, closing before/equal to opening, and invalid durations/windows', () => {
  for (const endAt of ['', start, '2026-10-15T09:59:00Z']) {
    assert.throws(() => buildExamTiming({ mode: 'time', endAt }, start), /closing time/);
  }
  assert.throws(() => buildExamTiming({ mode: 'time', endAt: end }, 'invalid'), /start date/);
  for (const durationMinutes of ['', 0, -1, 1.5]) {
    assert.throws(() => buildExamTiming({ mode: 'duration', durationMinutes, entryMinutes: 30 }, start), /whole number/);
  }
  for (const entryMinutes of [0, 181, 1.5]) {
    assert.throws(() => buildExamTiming({ mode: 'duration', durationMinutes: 60, entryMinutes }, start), /1–180/);
  }
  assert.throws(() => buildExamTiming({ mode: 'unknown' }, start), /mode/);
});

test('cross-midnight fixed exams and switching to duration discard the fixed closing time', () => {
  const values = { mode: 'time', endAt: '2026-10-16T00:30:00Z', durationMinutes: 45, entryMinutes: 30 };
  assert.equal(buildExamTiming(values, '2026-10-15T23:30:00Z').duration_minutes, 60);
  const duration = buildExamTiming({ ...values, mode: 'duration' }, start);
  assert.equal(duration.ends_at, null);
  assert.equal(duration.duration_minutes, 45);
  assert.equal(timingValues({ duration_minutes: 444 }).mode, 'duration');
});
