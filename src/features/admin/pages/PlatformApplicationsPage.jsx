import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiFileText, FiSearch, FiXCircle } from 'react-icons/fi';
import { getInstitutionApplicationsForReview, reviewInstitutionApplication } from '../../../services/institutionService';
import { useAppDialog } from '../../../shared/components/ConfirmDialogProvider';
import PageLoader from '../../../shared/components/PageLoader';
import './platform-applications.css';

const FILTERS = [
  { id: 'pending', label: 'Pending review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

function Details({ application }) {
  const p = application.profile_details || {};
  const info = [
    ['Institution name', application.institution_name],
    ['Institution code', application.requested_code],
    ['Institution type', p.institution_type?.replaceAll('_', ' ')],
    ['Applicant email', application.applicant_email],
    ['Official phone', p.official_phone],
    ['Official email', p.official_email],
    ['Secondary phone', p.secondary_phone],
    ['Contact person', p.contact_person],
    ['Street address', p.address_line],
    ['City / town', p.city],
    ['District', p.district],
    ['State / UT', p.state],
    ['PIN code', p.postal_code],
    ['Website', application.website || p.website],
    ['Affiliation / board / university', p.affiliation],
    ['Registration / affiliation number', p.registration_number],
    ['Directory source', p.directory_source],
    ['Directory name', p.directory_name],
    ['Directory reference', p.directory_id],
  ];
  return <>
    <h3 className="qa-review-subhead">Submitted institution details</h3>
    <dl className="qa-review-details">
      {info.filter(([, value]) => value != null && String(value).trim()).map(([label, value]) =>
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      )}
    </dl>
    {application.details && <div className="qa-review-note"><strong>Applicant's verification notes</strong><p>{application.details}</p></div>}
    {!p.institution_type && <p className="integrated-muted">This older application was submitted before the detailed registration form was introduced.</p>}
  </>;
}

export default function PlatformApplicationsPage() {
  const { applicationId } = useParams();
  const dialog = useAppDialog();
  const [apps, setApps] = useState(null);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function refresh() {
    const rows = await getInstitutionApplicationsForReview();
    setApps(rows);
  }
  useEffect(() => {
    let mounted = true;
    getInstitutionApplicationsForReview()
      .then(rows => { if (mounted) setApps(rows); })
      .catch(err => { if (mounted) setError(err.message); });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => (apps || []).filter(app =>
    app.status === tab &&
    [app.institution_name, app.requested_code, app.applicant_email, app.profile_details?.city]
      .filter(Boolean).join(' ').toLowerCase().includes(search.trim().toLowerCase())
  ), [apps, tab, search]);

  const selected = applicationId
    ? apps?.find(app => app.id === applicationId)
    : filtered.find(app => app.id === selectedId) || filtered[0];
  const counts = Object.fromEntries(FILTERS.map(f =>
    [f.id, (apps || []).filter(a => a.status === f.id).length]
  ));

  async function decide(app, approve) {
    const reason = (notes[app.id] || '').trim();
    if (!approve && reason.length < 5) {
      setError('Write a clear rejection reason (at least five characters) so the applicant knows what to correct.');
      return;
    }
    const ok = await dialog.confirm(
      approve
        ? `Approve ${app.institution_name} and appoint the applicant as its first Super Admin?`
        : `Reject ${app.institution_name}? Your written feedback will be shown to the applicant.`,
      { title: approve ? 'Approve institution' : 'Reject application',
        confirmLabel: approve ? 'Approve institution' : 'Reject with feedback', danger: !approve }
    );
    if (!ok) return;
    setBusy(app.id); setError(''); setMessage('');
    try {
      await reviewInstitutionApplication(app.id, approve, reason);
      await refresh();
      setTab(approve ? 'approved' : 'rejected');
      setSelectedId(app.id);
      setMessage(approve
        ? 'Institution approved and the applicant was appointed Super Admin.'
        : 'Application rejected. The feedback is now visible to the applicant.');
    } catch (err) { setError(err.message); }
    finally { setBusy(''); }
  }

  if (!apps && !error) return <PageLoader label="Loading institution applications…" />;
  return <section className="integrated-section qa-owner-review">
    <span className="eyebrow">PLATFORM OWNER</span>
    <div className="qa-review-heading">
      <div>
        <h1>Institution applications</h1>
        <p className="integrated-muted">Review the full submitted details, independently verify the institution, then approve or reject with feedback.</p>
      </div>
    </div>
    {applicationId && <Link className="qa-review-back" to="/platform/applications">← All applications</Link>}
    {error && <p className="ops-error" role="alert">{error}</p>}
    {message && <p className="ops-info" role="status">{message}</p>}
    {!applicationId && <div className="qa-review-toolbar">
      <div className="qa-review-tabs" role="group" aria-label="Application status">
        {FILTERS.map(f => <button type="button" key={f.id}
          className={tab === f.id ? 'is-active' : ''}
          aria-pressed={tab === f.id} onClick={() => { setTab(f.id); setSelectedId(''); setError(''); }}>
          {f.label} <span>{counts[f.id]}</span>
        </button>)}
      </div>
      <div className="qa-review-search"><FiSearch/><input type="search"
        placeholder="Search institution or applicant" aria-label="Search applications"
        value={search} onChange={event => setSearch(event.target.value)} /></div>
    </div>}
    <div className={applicationId ? 'qa-review-layout qa-review-single' : 'qa-review-layout'}>
      {!applicationId && <aside className="qa-review-list" aria-label="Applications">
        {filtered.map(app => <button type="button" key={app.id}
          className={selected?.id === app.id ? 'qa-review-item is-selected' : 'qa-review-item'}
          onClick={() => { setSelectedId(app.id); setMessage(''); setError(''); }}>
          <strong>{app.institution_name}</strong>
          <small>{app.applicant_email}</small>
          <span>{new Date(app.created_at).toLocaleDateString('en-IN')} · {app.requested_code}</span>
        </button>)}
        {!filtered.length && <p className="qa-review-empty">No {tab} applications{search ? ' match your search.' : '.'}</p>}
      </aside>}
      <div className="qa-review-panel">
        {!selected ? <div className="qa-review-empty">
          {applicationId ? 'This application does not exist or could not be found.' : 'Select an application to see its details.'}
        </div> : <>
          <div className="qa-review-panel-header">
            <div>
              <h2>{selected.institution_name}</h2>
              <span className={`qa-review-state qa-state-${selected.status}`}>
                {selected.status === 'pending' ? <FiClock/> : selected.status === 'approved' ? <FiCheckCircle/> : <FiXCircle/>}
                {selected.status === 'pending' ? 'Pending review' : selected.status === 'approved' ? 'Approved' : 'Rejected'}
              </span>
            </div>
            <small>Submitted {new Date(selected.created_at).toLocaleString('en-IN')}</small>
          </div>
          <Details application={selected}/>
          {selected.status !== 'pending' ? <div className="qa-review-note qa-review-decision">
            <strong>{selected.status === 'rejected' ? 'Rejection feedback' : 'Owner review notes'}</strong>
            <p>{selected.review_notes || (selected.status === 'rejected'
              ? 'No feedback was saved for this older decision.'
              : 'No additional notes.')}</p>
            {selected.reviewed_at && <small>Reviewed {new Date(selected.reviewed_at).toLocaleString('en-IN')}</small>}
          </div> : <div className="qa-review-decision-form">
            <label htmlFor="owner-review-feedback">Owner review feedback {selected.status === 'pending' && <small>(required when rejecting)</small>}</label>
            <textarea id="owner-review-feedback" rows={3} maxLength={1500}
              placeholder="State which document or detail needs correction if rejecting…"
              value={notes[selected.id] || ''}
              onChange={event => setNotes(old => ({ ...old, [selected.id]: event.target.value }))} />
            <div className="qa-review-actions">
              <button type="button" className="integrated-primary" disabled={Boolean(busy)}
                onClick={() => decide(selected, true)}>Approve institution</button>
              <button type="button" className="integrated-danger" disabled={Boolean(busy)}
                onClick={() => decide(selected, false)}>Reject with feedback</button>
            </div>
            <p className="integrated-muted">Approving creates institutional access; rejecting keeps the application in review history.</p>
          </div>}
        </>}
      </div>
    </div>
  </section>;
}
