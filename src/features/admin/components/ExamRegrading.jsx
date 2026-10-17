import PageLoader from '../../../shared/components/PageLoader';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isDemo } from '../../../lib/supabase';
import { getRegrading, regradeExam } from '../../../services/regradingService';

function ScoreChanges({ students }) {
  return <div className="ops-scroll" tabIndex={0} role="region" aria-label="Score changes"><table>
    <thead><tr><th>Student</th><th>Previous score</th><th>Revised score</th><th>Previous result</th><th>Revised result</th></tr></thead>
    <tbody>{students.map(s => <tr key={s.id}><td>{s.name} ({s.roll_no})</td><td>{s.old_score}</td><td>{s.new_score}</td><td>{s.old_passed ? 'Passed' : 'Failed'}</td><td>{s.new_passed ? 'Passed' : 'Failed'}</td></tr>)}</tbody>
  </table></div>;
}

export default function ExamRegrading({ exam, questions }) {
  const cache = useQueryClient();
  const { data, error: loadError, isPending } = useQuery({ queryKey: ['regrading', exam.exam_id], queryFn: () => getRegrading(exam.exam_id), enabled: !isDemo });
  const [change, setChange] = useState({ questionId: '', correct: '', excluded: false, passMark: exam.pass_mark, reason: '' });
  const [preview, setPreview] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const selected = questions.find(q => q.question_id === change.questionId);
  const correction = data?.corrections.find(c => c.question_id === change.questionId);

  function edit(next) { setChange(next); setPreview(null); setConfirmed(false); setError(''); setMessage(''); }
  function choose(questionId) {
    const q = questions.find(item => item.question_id === questionId);
    const current = data?.corrections.find(c => c.question_id === questionId);
    edit({ ...change, questionId, correct: current?.correct_option ?? q?.correct_option ?? '', excluded: current?.excluded ?? false, passMark: exam.pass_mark });
  }
  async function run(apply) {
    if (busy || (apply && (!preview || !confirmed))) return;
    if (!selected || (!change.excluded && change.correct === '') || !Number.isInteger(Number(change.passMark)) || Number(change.passMark) < 0 || change.reason.trim().length < 5) {
      setError('Choose a question, a valid answer or exclusion, a qualifying mark, and a reason of at least 5 characters.'); return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await regradeExam(exam.exam_id, change, apply ? preview.signature : null);
      if (apply) {
        setPreview(null); setConfirmed(false);
        setMessage('Regrading applied and recorded. Review the results, then use Publish results to release them.');
        await Promise.all([
          cache.invalidateQueries({ queryKey: ['exams'] }),
          cache.invalidateQueries({ queryKey: ['students-report', exam.exam_id] }),
          cache.invalidateQueries({ queryKey: ['regrading', exam.exam_id] }),
          cache.invalidateQueries({ queryKey: ['institution-reports'] }),
        ]);
      } else { setPreview(result); setConfirmed(false); }
    } catch (err) { setError(err.message || 'Could not regrade this exam.'); setPreview(null); setConfirmed(false); }
    finally { setBusy(false); }
  }

  return <section className="qualify-ops">
    <h2>Question correction and regrading</h2>
    <p>Correct an answer key or exclude a question from scoring. Excluding a question reduces the maximum score. Review the qualifying mark before applying.</p>
    {isDemo ? <p>This workflow requires a connected institution account; it is unavailable in the sample demo.</p> : isPending ? <PageLoader label="Loading correction history…" /> : loadError ? <p role="alert">Could not load corrections: {loadError.message}</p> : <>
      <fieldset disabled={busy} className="integrated-form" style={{ border: 0, padding: 0 }}>
        <legend>Proposed correction</legend>
        <label>Question<select value={change.questionId} onChange={e => choose(e.target.value)}><option value="">Select a question</option>{questions.map((q, i) => <option key={q.question_id} value={q.question_id}>{i + 1}. {q.question_text}</option>)}</select></label>
        {selected && <>
          <p><strong>Current scoring:</strong> {correction?.excluded ? 'Excluded' : selected.options[correction?.correct_option ?? selected.correct_option]} · {selected.marks} marks</p>
          <label>Action<select value={change.excluded ? 'exclude' : 'correct'} onChange={e => edit({ ...change, excluded: e.target.value === 'exclude' })}><option value="correct">Set correct answer / restore question</option><option value="exclude">Exclude question from scoring</option></select></label>
          {!change.excluded && <label>Correct answer<select value={change.correct} onChange={e => edit({ ...change, correct: e.target.value })}>{selected.options.map((option, i) => <option key={i} value={i}>{String.fromCharCode(65 + i)}. {option}</option>)}</select></label>}
          <label>Qualifying mark after regrading<input type="number" min="0" step="1" value={change.passMark} onChange={e => edit({ ...change, passMark: e.target.value })} /></label>
          <label>Reason (required)<textarea minLength={5} maxLength={2000} rows={3} value={change.reason} onChange={e => edit({ ...change, reason: e.target.value })} /></label>
          <button type="button" className="integrated-primary" onClick={() => run(false)}>{busy ? 'Please wait…' : 'Preview revised scores'}</button>
        </>}
      </fieldset>
      {preview && <div className="ops-panel">
        <h3>Review before applying</h3>
        <p>{preview.affected} student results change. Maximum score: {preview.old_total} → {preview.new_total}. Qualifying mark: {preview.old_pass_mark} → {preview.new_pass_mark}.</p>
        <ScoreChanges students={preview.students} />
        {!preview.students.length && <p>No submitted attempts. This correction will still be recorded.</p>}
        <label><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} /> I reviewed these scores. Applying will hide results until they are republished.</label>
        <button type="button" className="integrated-primary" disabled={!confirmed || busy} onClick={() => run(true)}>{busy ? 'Applying…' : 'Apply correction and regrade'}</button>
      </div>}
      <h3>Correction history</h3>
      {!data.history.length && <p>No corrections have been applied.</p>}
      {data.history.map(h => <details className="integrated-item" key={h.id}><summary>Revision {h.revision} · {new Date(h.created_at).toLocaleString()} · {h.actor_label}</summary>
        <p>{h.reason}</p><p>Question: {questions.find(q => q.question_id === h.question_id)?.question_text}</p>
        <p>{h.correction.excluded ? 'Question excluded.' : `Correct answer: option ${Number(h.correction.correct_option) + 1}.`} Maximum score: {h.old_total} → {h.new_total}. Qualifying mark: {h.old_pass_mark} → {h.new_pass_mark}.</p>
        <ScoreChanges students={h.score_changes} />
      </details>)}
      {data.history.length === 20 && <p>Showing the latest 20 corrections. Earlier revisions remain in the audit record.</p>}
    </>}
    {error && <p role="alert" className="ops-error">{error}</p>}
    {message && <p role="status" className="ops-info">{message}</p>}
  </section>;
}
