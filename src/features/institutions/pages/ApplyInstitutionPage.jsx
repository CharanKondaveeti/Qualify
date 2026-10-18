import { useEffect, useState } from 'react';
import { FiArrowRight, FiHome, FiCheckCircle, FiFileText } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { applyForInstitution, getInstitutionAccess, getMyInstitutionApplications } from '../../../services/institutionService';
import '../../auth/styles/admin-auth.css';

export default function ApplyInstitutionPage() {
  const [form, setForm] = useState({ name: '', code: '', website: '', details: '' });
  const [applications, setApplications] = useState([]);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [apps, access] = await Promise.all([getMyInstitutionApplications(), getInstitutionAccess()]);
    setApplications(apps || []);
    setApproved(Boolean(access?.platform_owner || (access?.institutions || []).some(m => m.member_status === 'active' && m.institution_status === 'active')));
  }
  useEffect(() => {
    const issue = sessionStorage.getItem("qualify-pending-application-error");
    if (issue) {
      sessionStorage.removeItem("qualify-pending-application-error");
      setError(`Your institution application could not be submitted automatically: ${issue}. Review your details and try again.`);
    }
    reload().catch(e => setError(e.message)).finally(() => setLoading(false));
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
  const submitted = applications.find(a => a.status === 'pending') || applications.find(a => a.status === 'approved');
  const hasRejected = applications.some(a => a.status === 'rejected');
  return <main className="adminAuth-container"><section className="adminAuth-card qa-application-card">
    <Link to="/" className="qa-brand">QUALIFY <span>INSTITUTION ONBOARDING</span></Link>
    {loading ? <p className="qa-subtitle" role="status">Loading your institution application…</p> : submitted ? (
      <div className="qa-application-status" role="status">
        <div className="qa-auth-icon"><FiCheckCircle /></div>
        <span className="qa-kicker">INSTITUTION REGISTRATION</span>
        <h1>{submitted.status === 'pending' ? 'Institution approval pending' : 'Institution approved'}</h1>
        <p className="adminAuth-logo-subtext">{submitted.status === 'pending'
          ? 'Your registration has been submitted. Please wait while the QUALIFY Platform Owner verifies your institution. You do not need to submit the form again.'
          : 'Your institution has been approved. You can open your institution workspace.'}</p>
        <div className="qa-application-readonly">
          <div><span>Institution name</span><strong>{submitted.institution_name}</strong></div>
          <div><span>Institution code</span><strong>{submitted.requested_code}</strong></div>
          <div><span>Status</span><strong>{submitted.status === 'pending' ? 'Pending Platform Owner review' : 'Approved'}</strong></div>
          {submitted.profile_details?.institution_type && <div><span>Institution type</span><strong>{submitted.profile_details.institution_type.replaceAll('_', ' ')}</strong></div>}
          {submitted.profile_details?.official_phone && <div><span>Institution phone</span><strong>{submitted.profile_details.official_phone}</strong></div>}
          {submitted.profile_details?.official_email && <div><span>Institution email</span><strong>{submitted.profile_details.official_email}</strong></div>}
          {submitted.profile_details?.address_line && <div className="qa-full"><span>Address</span><strong>{[submitted.profile_details.address_line,submitted.profile_details.city,submitted.profile_details.district,submitted.profile_details.state,submitted.profile_details.postal_code].filter(Boolean).join(', ')}</strong></div>}
          {submitted.website && <div className="qa-full"><span>Website</span><strong>{submitted.website}</strong></div>}
          {submitted.details && <div className="qa-full"><span>Verification details</span><strong>{submitted.details}</strong></div>}
          {submitted.review_notes && <div className="qa-full"><span>Review notes</span><strong>{submitted.review_notes}</strong></div>}
          <div className="qa-full"><span>Submitted</span><strong>{new Date(submitted.created_at).toLocaleString()}</strong></div>
        </div>
        {submitted.status === 'approved' && <p className="qa-success"><FiCheckCircle /><Link to="/app">Open your QUALIFY workspace →</Link></p>}
        <button type="button" className="qa-button-secondary" onClick={() => { setLoading(true);reload().catch(e=>setError(e.message)).finally(()=>setLoading(false)); }}>Refresh application status</button>
        {error && <p role="alert" className="adminAuth-error">{error}</p>}
        <div className="qa-bottom-links"><Link to="/login">Back to sign in</Link></div>
      </div>
    ) : <>
    <div className="qa-auth-icon"><FiHome /></div>
    <span className="qa-kicker">INSTITUTION REGISTRATION</span>
    <h1>{hasRejected ? 'Submit a new application' : 'Apply for institutional access'}</h1>
    <p className="adminAuth-logo-subtext">Submit your institution's official details for manual verification. Submitting does not create an administrator role.</p>
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
    <div className="qa-bottom-links"><Link to="/login">Back to sign in</Link></div>
    </>}
  </section></main>;
}
