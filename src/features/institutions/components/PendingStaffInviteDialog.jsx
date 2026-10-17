import { useEffect, useState } from 'react';
import { FiHome, FiCheckCircle, FiShield, FiX } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import {
  listMyPendingStaffInvitations, respondToStaffInvitation,
} from '../../../services/institutionService';
import '../styles/invite-dialog.css';

/** A verified-email invitation prompt. No membership is granted here. */
export default function PendingStaffInviteDialog() {
  const location = useLocation();
  const [invitations, setInvitations] = useState([]);
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    // The legacy/manual invitation screen already contains its own controls.
    if (location.pathname === '/invitations') return;
    let active = true;
    listMyPendingStaffInvitations().then(items => {
      if (active) setInvitations(items || []);
    }).catch(() => { /* Silent failure here must never block normal admin login. */ });
    return () => { active = false; };
  }, [location.pathname]);

  const item = invitations[0];
  if (!visible || (!item && !message)) return null;

  async function respond(accept) {
    if (!item || busy) return;
    setBusy(true); setError('');
    try {
      await respondToStaffInvitation(item.id, accept);
      setInvitations(current => current.filter(inv => inv.id !== item.id));
      setMessage(accept
        ? 'Request accepted. Staff access is not active yet. Your Super Admin must independently verify your identity and approve your request.'
        : 'Invitation declined. No institution access has been granted.');
    } catch (e) { setError(e.message || 'Unable to respond to invitation.'); }
    finally { setBusy(false); }
  }

  return <div className="qi-backdrop" role="presentation">
    <section className="qi-dialog" role="dialog" aria-modal="true" aria-label="Staff administration invitation">
      <button type="button" className="qi-close" aria-label="Close invitation" onClick={() => setVisible(false)}><FiX /></button>
      <div className="qi-icon">{message ? <FiCheckCircle /> : <FiHome />}</div>
      <h2>{message ? 'Invitation updated' : 'You have an institution invitation'}</h2>
      <p className="qi-subtitle">{message || 'Review the verified-email invitation before requesting Staff Admin access.'}</p>
      {item && <>
        <dl className="qi-details"><dt>Institution</dt><dd>{item.institution_name}</dd><dt>Role</dt><dd>Staff Admin</dd><dt>Invited email</dt><dd>{item.invited_email}</dd>{item.intended_name && <><dt>Staff name on invite</dt><dd>{item.intended_name}</dd></>}</dl>
        <p className="qi-advice"><FiShield /> Acceptance is only a request. Your Super Admin must verify your identity and give final approval.</p>
      </>}
      {error && <p className="qi-error" role="alert">{error}</p>}
      <div className="qi-actions">{item ? <><button disabled={busy} className="qi-secondary" onClick={() => respond(false)}>Decline</button><button disabled={busy} className="qi-primary" onClick={() => respond(true)}>{busy ? 'Please wait…' : 'Accept invitation'}</button></> : <button className="qi-primary" onClick={() => { setMessage(''); if (!invitations.length) setVisible(false); }}>Continue</button>}</div>
    </section>
  </div>;
}
