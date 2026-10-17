import { useId } from 'react';
import '../styles/exam-timing.css';

export default function ExamTimingFields({ value, onChange, disabled = false }) {
  const id = useId();
  const change = (field, next) => onChange({ ...value, [field]: next });
  return <fieldset className="exam-timing-fields" disabled={disabled}>
    <legend>Exam timing</legend>
    <div className="exam-timing-modes">
      <label><input type="radio" name={`${id}-mode`} value="time" checked={value.mode === 'time'} onChange={() => change('mode', 'time')} />
        <span><strong>Time-based</strong><small>One start and closing time for everyone. Late arrivals get the remaining time.</small></span>
      </label>
      <label><input type="radio" name={`${id}-mode`} value="duration" checked={value.mode === 'duration'} onChange={() => change('mode', 'duration')} />
        <span><strong>Duration-based</strong><small>Each student gets the full duration after they begin.</small></span>
      </label>
    </div>
    {value.mode === 'time' ? <label className="exam-timing-input" htmlFor={`${id}-end`}>Exam closes at
      <input id={`${id}-end`} type="datetime-local" required value={value.endAt} onChange={e => change('endAt', e.target.value)} />
      <small>All attempts end at this time. Individual time extensions are unavailable.</small>
    </label> : <div className="exam-timing-modes">
      <label className="exam-timing-input" htmlFor={`${id}-duration`}>Minutes per student
        <input id={`${id}-duration`} type="number" min="1" step="1" required value={value.durationMinutes} onChange={e => change('durationMinutes', e.target.value)} />
      </label>
      <label className="exam-timing-input" htmlFor={`${id}-entry`}>Allow starts within (minutes)
        <input id={`${id}-entry`} type="number" min="1" max="180" step="1" required value={value.entryMinutes} onChange={e => change('entryMinutes', e.target.value)} />
        <small>Measured from the scheduled opening time. Starting later does not reduce a student's duration.</small>
      </label>
    </div>}
  </fieldset>;
}
