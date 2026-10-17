import { useAppDialog } from '../../../shared/components/ConfirmDialogProvider';
import { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiClock, FiMail, FiRefreshCw, FiShield, FiUserCheck, FiUsers, FiX } from 'react-icons/fi';
import { useAdminWorkspace } from '../context/AdminWorkspaceContext';
import {
  addInstitutionSuperAdmin, confirmStaffInvitation, listInstitutionMembers,
  listStaffInvitations, manageInstitutionMember, requestStaffInvitation, sendStaffInvitationNotice,
  revokeStaffInvitation,
} from '../../../services/institutionService';
import '../styles/operations.css';
import '../styles/staff-invitations.css';

const nameForRole = (role) => role === 'institution_super_admin' ? 'Super Admin' : 'Staff Admin';
const niceDate = (value) => value ? new Date(value).toLocaleString() : '—';
const niceStatus = (status) => ({
  pending: 'Awaiting recipient', awaiting_confirmation: 'Awaiting your confirmation',
  accepted: 'Active', declined: 'Declined', revoked: 'Revoked', expired: 'Expired',
}[status] || status);

export default function TeamPage() {
  const { institutionId, selectedInstitution, isOwner, isSuperAdmin } = useAdminWorkspace();
  const dialog = useAppDialog();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState('');
  const [personName, setPersonName] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const canManage = isOwner || isSuperAdmin;

  async function load(id) {
    const [people, invitations] = await Promise.all([listInstitutionMembers(id), listStaffInvitations(id)]);
    setMembers(people || []);
    setInvites(invitations || []);
  }
  useEffect(() => {
    setError(''); setMessage(''); setMembers([]); setInvites([]);
    if (!institutionId || !canManage) return;
    let alive = true;
    Promise.all([listInstitutionMembers(institutionId), listStaffInvitations(institutionId)])
      .then(([people, invitations]) => { if (alive) { setMembers(people || []); setInvites(invitations || []); } })
      .catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [institutionId, canManage]);

  async function act(job, success) {
    setBusy(true); setError(''); setMessage('');
    try {
      await job(); await load(institutionId); if (success) setMessage(success);
      return true;
    } catch (e) {
      setError(e.message || 'Action failed.');
      return false;
    } finally { setBusy(false); }
  }

  async function sendInvitation(e) {
    e.preventDefault();
    const saved = await act(async () => {
      const id = await requestStaffInvitation(institutionId, email, personName);
      const notice = await sendStaffInvitationNotice(institutionId, id);
      setMessage(notice.sent
        ? 'Invitation saved and notification emailed. Staff access still requires your final identity confirmation.'
        : `Invitation saved, but ${notice.message} Ask the recipient to register or sign in with this email; you will approve access after they accept.`);
    }, '');
    if (saved) { setEmail(''); setPersonName(''); }
  }

  const visible = useMemo(() => members.filter(m =>
    `${m.name || ''} ${m.email || ''} ${m.role}`.toLowerCase().includes(search.toLowerCase())), [members, search]);
  const awaiting = invites.filter(i => i.status === 'awaiting_confirmation');
  const otherInvites = invites.filter(i => i.status !== 'awaiting_confirmation');

  return <section className="integrated-section qualify-team">
    <span className="eyebrow">INSTITUTION ADMINISTRATION</span>
    <div className="qualify-team-heading">
      <div><h1>Staff management</h1><p className="integrated-muted">{selectedInstitution ? `${selectedInstitution.name} · ${members.length} members` : 'Choose an institution to manage.'}</p></div>
      {institutionId && canManage && <button className="qt-outline" disabled={busy} onClick={() => act(() => load(institutionId), 'Staff information refreshed.')}><FiRefreshCw /> Refresh</button>}
    </div>
    {error && <p className="ops-error" role="alert">{error}</p>}
    {message && <p className="ops-info" role="status">{message}</p>}
    {!institutionId || !canManage ? <div className="content-section">Super Admin access is required for staff management.</div> : <>
      <div className="qualify-team-top">
        <div className="content-section qt-panel">
          <div className="qt-panel-heading"><FiMail /><div><h2>Invite Staff Admin</h2><p>Enter the intended staff member's details carefully.</p></div></div>
          <form className="qt-form" onSubmit={sendInvitation}>
            <label>Staff member's name<input type="text" maxLength={120} required value={personName} onChange={e => setPersonName(e.target.value)} placeholder="Full name" /></label>
            <label>Work email<input type="email" required autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} placeholder="faculty@institution.edu" /></label>
            <p className="qt-hint"><FiShield /> An invitation does not grant access. The recipient verifies their email, accepts, and waits for your final confirmation.</p>
            <button className="integrated-primary" type="submit" disabled={busy || !email || !personName.trim()}>{busy ? 'Please wait…' : 'Create staff invitation'}</button>
          </form>
        </div>
        <div className="content-section qt-panel qt-review-panel">
          <div className="qt-panel-heading"><FiUserCheck /><div><h2>Pending final approval <span className="qt-count">{awaiting.length}</span></h2><p>Confirm identity independently before enabling access.</p></div></div>
          {awaiting.length === 0 ? <div className="qt-empty"><FiCheck /><strong>No approvals waiting</strong><span>Accepted invitations will appear here.</span></div> :
            <div className="qt-approval-list">{awaiting.map(inv => <div className="qt-approval" key={inv.id}>
              <div><strong>{inv.intended_name || 'Invited staff member'}</strong><span>{inv.verified_email || inv.email}</span><small>Accepted {niceDate(inv.accepted_at)}</small></div>
              <p>Check this person's identity against your institution's staff records. A verified email does not establish employment.</p>
              <div className="qt-buttons">
                <button type="button" className="qt-danger" disabled={busy} onClick={async () => { if (await dialog.confirm(`Reject staff access for ${inv.email}?`)) act(() => confirmStaffInvitation(inv.id, false), 'Staff access rejected.'); }}><FiX /> Reject</button>
                <button type="button" className="qt-primary" disabled={busy} onClick={async () => { if (await dialog.confirm(`Have you independently verified that ${inv.email} belongs to the intended staff member? Approve Staff Admin access?`)) act(() => confirmStaffInvitation(inv.id, true), 'Staff Admin access activated.'); }}><FiCheck /> Confirm & activate</button>
              </div>
            </div>)}</div>}
        </div>
      </div>
      {isOwner && <div className="content-section qt-owner"><div><h2>Appoint Institutional Super Admin</h2><p className="integrated-muted">Platform Owner only. This is separate from Staff Admin invitations.</p></div>
        <form onSubmit={async e => { e.preventDefault(); const saved = await act(() => addInstitutionSuperAdmin(institutionId, verifiedEmail), 'Super Admin appointed.'); if (saved) setVerifiedEmail(''); }}>
          <input type="email" placeholder="Verified QUALIFY email" value={verifiedEmail} onChange={e => setVerifiedEmail(e.target.value)} required />
          <button className="qt-outline" disabled={busy}>Appoint Super Admin</button>
        </form></div>}
      <div className="content-section qt-panel">
        <div className="integrated-section-head"><div><h2><FiUsers /> Institution staff ({members.length})</h2><p className="integrated-muted">Manage existing authorized institution members.</p></div>
          <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff" aria-label="Search staff" /></div>
        <div className="table-container"><table className="data-table"><thead><tr><th>Staff</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {visible.map(m => <tr key={m.user_id}><td>{m.name || m.email}<small className="integrated-muted">{m.name && m.email}</small></td><td>{nameForRole(m.role)}</td><td><span className={`qt-status qt-${m.status}`}>{m.status}</span></td>
            <td><div className="integrated-actions">
              {isOwner && <button className="action-btn" disabled={busy} onClick={async () => { if (await dialog.confirm(`Change role for ${m.email}?`)) act(() => manageInstitutionMember(institutionId,m.user_id,m.role === 'staff_admin' ? 'institution_super_admin' : 'staff_admin',m.status), 'Role updated.'); }}>{m.role === 'staff_admin' ? 'Promote' : 'Demote'}</button>}
              <button className={m.status === 'active' ? 'integrated-danger' : 'action-btn'} disabled={busy} onClick={async () => { if (await dialog.confirm(`${m.status === 'active' ? 'Suspend' : 'Reactivate'} ${m.email}?`)) act(() => manageInstitutionMember(institutionId,m.user_id,m.role,m.status === 'active' ? 'suspended' : 'active'), 'Staff status updated.'); }}>{m.status === 'active' ? 'Suspend' : 'Reactivate'}</button>
            </div></td></tr>)}
          {!visible.length && <tr><td colSpan={4}>No staff found.</td></tr>}
        </tbody></table></div>
      </div>
      <div className="content-section qt-panel">
        <div className="qt-panel-heading"><FiClock /><div><h2>Invitation history</h2><p>Invitations are valid for seven days. You can revoke pending invitations.</p></div></div>
        <div className="qt-invites">{otherInvites.length === 0 && <p className="integrated-muted">No other invitations.</p>}
          {otherInvites.map(inv => <div className="qt-invite-row" key={inv.id}>
            <div><strong>{inv.intended_name || inv.email}</strong><small>{inv.email}</small></div>
            <span className={`qt-status qt-${inv.status}`}>{niceStatus(inv.status)}</span>
            <span className="qt-time">{niceDate(inv.created_at)}</span>
            {inv.status === 'pending' && <button className="qt-danger" disabled={busy} onClick={async () => { if (await dialog.confirm(`Revoke invitation to ${inv.email}?`)) act(() => revokeStaffInvitation(inv.id), 'Invitation revoked.'); }}>Revoke</button>}
          </div>)}
        </div>
      </div>
    </>}
  </section>;
}
