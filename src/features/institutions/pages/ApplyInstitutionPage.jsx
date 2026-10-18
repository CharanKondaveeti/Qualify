import { useEffect, useState } from 'react';
import { FiArrowRight, FiHome, FiCheckCircle, FiFileText } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { applyForInstitution, getInstitutionAccess, getMyAwaitingStaffApproval, getMyInstitutionApplications } from '../../../services/institutionService';
import '../../auth/styles/admin-auth.css';

export default function ApplyInstitutionPage() {
  const [form, setForm] = useState({ name: '', code: '', website: '', details: '' });
  const [applications, setApplications] = useState([]);
  const [approved, setApproved] = useState(false);
  const [awaiting, setAwaiting] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [apps, access, pendingApproval] = await Promise.all([getMyInstitutionApplications(), getInstitutionAccess(), getMyAwaitingStaffApproval()]);
    setAwaiting(pendingApproval || []);
    setApplications(apps || []);
    setApproved(Boolean(access?.platform_owner || (access?.institutions || []).some(m => m.member_status === 'active' && m.institution_status === 'active')));
  }
  useEffect(() => {
    const issue = sessionStorage.getItem("qualify-pending-application-error");
    if (issue) {
      sessionStorage.removeItem("qualify-pending-application-error");
      setError(`Your institution application could not be submitted automatically: ${issue}. Review your details and try again.`);
    }
    reload().catch(e => setError(e.message));
  }, []);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await applyForInstitution(form);
      await reload();
      setMessage('Your application has been submitted. The Platform Owner will review it before granting access.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <main className="adminAuth-container"><section className="adminAuth-card qa-application-card">
    <Link to="/" className="qa-brand">QUALIFY <span>INSTITUTION ONBOARDING</span></Link>
    <div className="qa-auth-icon"><FiHome /></div>
    <span className="qa-kicker">INSTITUTION REGISTRATION</span>
    <h1>Apply for institutional access</h1>
    <p className="adminAuth-logo-subtext">Submit your institution's official details for manual verification. Submitting does not create an administrator role.</p>
    {awaiting.map((item, idx) => <p key={`${item.institution_name}-${idx}`} className="qa-success"><FiCheckCircle />Staff invitation accepted for {item.institution_name}. Waiting for Super Admin confirmation; no access has been activated.</p>)}
    {approved && <p className="qa-success"><FiCheckCircle /><Link to="/app">Your account has an approved workspace — open dashboard →</Link></p>}
    {error && <p role="alert" className="adminAuth-error">{error}</p>}
    {message && <p role="status" className="qa-success"><FiCheckCircle />{message}</p>}
    <form className="adminAuth-form" onSubmit={submit}>
      <div className="qa-application-grid">
        <div className="adminAuth-input-group"><label htmlFor="inst-name">Institution name</label><input id="inst-name" type="text" minLength={3} maxLength={160} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full registered institution name" required /></div>
        <div className="adminAuth-input-group"><label htmlFor="inst-code">Institution code</label><input id="inst-code" type="text" minLength={3} maxLength={40} pattern="[a-z0-9][a-z0-9-]{2,39}" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="e.g. north-college" required /></div>
        <div className="adminAuth-input-group qa-wide"><label htmlFor="inst-site">Official website (optional)</label><input id="inst-site" type="url" maxLength={500} value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://college.edu" /></div>
        <div className="adminAuth-input-group qa-wide"><label htmlFor="inst-details">Verification details (optional)</label><textarea id="inst-details" rows={3} maxLength={1500} value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} placeholder="Your role, department, and information to help verify the institution" /></div>
      </div>
      <div className="qa-security-line" style={{padding:'4px 0'}}><FiFileText /> The Platform Owner reviews all applications. No institution permissions are issued automatically.</div>
      <button className="adminAuth-button" disabled={busy}>{busy ? 'Submitting…' : 'Submit application for review'} <FiArrowRight /></button>
    </form>
    <div className="qa-application-history"><h3>Your institution applications</h3>
      {!applications.length ? <p className="qa-subtitle">You have not submitted an application yet.</p> : applications.map(a => <div key={a.id} className="qa-application-item"><div><strong>{a.institution_name}</strong><small>{a.requested_code}{a.review_notes ? ` · ${a.review_notes}` : ''}</small></div><span>{a.status}</span></div>)}
    </div>
    <div className="qa-bottom-links"><Link to="/login">Back to sign in</Link><Link to="/invitations">Check staff invitations</Link></div>
  </section></main>;
}
