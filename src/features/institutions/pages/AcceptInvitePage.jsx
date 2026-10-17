import PageLoader from '../../../shared/components/PageLoader';
import { useEffect, useState } from 'react';
import { FiCheckCircle, FiMail, FiShield, FiUserCheck, FiXCircle } from 'react-icons/fi';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  acceptStaffInvitation, listMyPendingStaffInvitations, respondToStaffInvitation,
} from '../../../services/institutionService';
import '../../auth/styles/admin-auth.css';

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [invitations, setInvitations] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    listMyPendingStaffInvitations()
      .then(data => { if (mounted) setInvitations(data || []); })
      .catch(err => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  async function respond(id, accept) {
    setBusy(true); setError(''); setMessage('');
    try {
      if (token && id === 'legacy') {
        if (!accept) throw new Error('Contact your Super Admin to decline an old invitation link.');
        await acceptStaffInvitation(token);
      } else {
        await respondToStaffInvitation(id, accept);
        setInvitations(previous => previous.filter(inv => inv.id !== id));
      }
      setMessage(accept
        ? 'Invitation accepted. Staff Admin access is NOT yet active. Your Super Admin must independently verify your identity and approve it.'
        : 'Invitation declined. No staff access has been granted.');
    } catch (err) { setError(err.message || 'Unable to process invitation.'); }
    finally { setBusy(false); }
  }

  return <main className="adminAuth-container qa-invitation-page">
    <section className="adminAuth-card qa-invitation-card">
      <Link to="/" className="qa-brand">QUALIFY <span>INSTITUTION ACCESS</span></Link>
      <div className="qa-invitation-icon"><FiMail /></div>
      <h1>Institution invitation</h1>
      <p className="qa-subtitle">An institution has requested to add you as a Staff Admin. Review the invitation before proceeding.</p>
      {error && <p role="alert" className="adminAuth-error">{error}</p>}
      {message && <div className="qa-success"><FiCheckCircle /><p>{message}</p></div>}
      {loading ? <PageLoader label="Checking invitations…" /> : <>
        {invitations.map(inv => <div key={inv.id} className="qa-invitation">
          <div className="qa-invitation-details"><span>Institution</span><strong>{inv.institution_name}</strong><span>Assigned role</span><strong>Staff Admin</strong><span>Invited email</span><strong>{inv.invited_email}</strong>{inv.intended_name && <><span>Intended staff name</span><strong>{inv.intended_name}</strong></>}</div>
          <div className="qa-security-line"><FiShield /> Accepting only requests access. Your Super Admin must confirm your identity before activation.</div>
          <div className="qa-invitation-actions">
            <button type="button" className="qa-button-secondary" disabled={busy} onClick={() => respond(inv.id, false)}><FiXCircle /> Decline</button>
            <button type="button" className="adminAuth-button" disabled={busy} onClick={() => respond(inv.id, true)}><FiUserCheck /> {busy ? 'Please wait…' : 'Accept invitation'}</button>
          </div>
        </div>)}
        {token && /^[a-f0-9]{64}$/.test(token) && !message && <div className="qa-invitation">
          <p>You've opened a legacy invitation link. Your verified account email must match the email originally invited.</p>
          <button className="adminAuth-button" type="button" disabled={busy} onClick={() => respond('legacy', true)}>Accept old invitation (approval still required)</button>
        </div>}
        {!invitations.length && !token && !message && <div className="qa-invitation-empty"><FiCheckCircle /><strong>No pending invitations</strong><p>Ask your Super Admin to check the spelling of your email if you expected an invitation.</p></div>}
      </>}
      <div className="qa-bottom-links"><Link to="/institutions/application-status">Application status</Link><Link to="/app">Go to dashboard</Link></div>
    </section>
  </main>;
}
