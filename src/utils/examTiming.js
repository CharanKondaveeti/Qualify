export function timingValues(exam = {}) {
  const localDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  return {
    mode: exam.timing_mode || 'duration',
    durationMinutes: exam.duration_minutes ?? 60,
    entryMinutes: exam.entry_window_minutes ?? 30,
    endAt: localDate(exam.ends_at),
  };
}

export function buildExamTiming(values, startDate) {
  const start = new Date(startDate).getTime();
  if (!Number.isFinite(start)) throw new Error('Enter a valid start date and time.');
  if (values.mode === 'time') {
    const end = new Date(values.endAt).getTime();
    if (!Number.isFinite(end) || end <= start) throw new Error('The closing time must be after the starting time.');
    return { timing_mode: 'time', ends_at: new Date(end).toISOString(), duration_minutes: Math.ceil((end - start) / 60000), entry_window_minutes: 30 };
  }
  if (values.mode !== 'duration') throw new Error('Choose an exam timing mode.');
  const duration = Number(values.durationMinutes);
  const entry = Number(values.entryMinutes);
  if (!Number.isSafeInteger(duration) || duration < 1) throw new Error('Enter a whole number of minutes for the duration.');
  if (!Number.isSafeInteger(entry) || entry < 1 || entry > 180) throw new Error('Allow students to start within 1–180 minutes of opening.');
  return { timing_mode: 'duration', ends_at: null, duration_minutes: duration, entry_window_minutes: entry };
}

export function entryClosesAt(exam) {
  return exam.timing_mode === 'time'
    ? new Date(exam.ends_at).getTime()
    : new Date(exam.scheduled_date).getTime() + (exam.entry_window_minutes ?? 30) * 60000;
}

export function attemptDeadline(exam, startedAt, bonusMinutes = 0) {
  return exam.timing_mode === 'time'
    ? new Date(exam.ends_at).toISOString()
    : new Date(new Date(startedAt).getTime() + (Number(exam.duration_minutes) + bonusMinutes) * 60000).toISOString();
}
