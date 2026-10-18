import { useEffect, useState } from 'react';
import { FiArrowRight, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import {
  getInstitutionAccess, getMyInstitutionApplications, resubmitRejectedInstitution
} from '../../../services/institutionService';
import InstitutionSignupFields from '../components/InstitutionSignupFields';
import { emptyInstitution, validateInstitution } from '../../../services/institutionSignupService';
import '../../auth/styles/admin-auth.css';

const clean = value => value == null ? '' : String(value);

function existingDetails(application) {
  const d = application?.profile_details || {};
  return {
    ...emptyInstitution,
    ...d,
    name: clean(application?.institution_name),
    code: clean(application?.requested_code),
    website: clean(application?.website || d.website),
    details: clean(application?.details),
    directory_source: d.directory_source || 'manual',
    directory_id: clean(d.directory_id),
    directory_name: clean(d.directory_name)
  };
}

function ApplicationDetails({ application }) {
  const p = application.profile_details || {};
  const rows = [
    ['Institution',application.institution_name],
    ['Institution code',application.requested_code],
    ['Category',p.institution_type?.replaceAll('_',' ')],
    ['Official phone',p.official_phone],
    ['Official email',p.official_email],
    ['Alternative phone',p.secondary_phone],
    ['Contact person',p.contact_person],
    ['Address',[p.address_line,p.city,p.district,p.state,p.postal_code].filter(Boolean).join(', ')],
    ['Website',application.website || p.website],
    ['Affiliation',p.affiliation],
    ['Registration number',p.registration_number],
    ['Verification details',application.details]
  ];
  return <div className="qa-application-readonly">
    {rows.filter(([,value])=>value).map(([label,value])=><div key={label} className={
      ['Address','Verification details'].includes(label)?'qa-full':''
    }><span>{label}</span><strong>{value}</strong></div>)}
  </div>;
}

export default function ApplyInstitutionPage() {
  const [applications,setApplications] = useState([]);
  const [approved,setApproved] = useState(false);
  const [loading,setLoading] = useState(true);
  const [editing,setEditing] = useState(false);
  const [form,setForm] = useState({ ...emptyInstitution });
  const [logo,setLogo] = useState(null);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);

  async function reload() {
    const [apps,access]=await Promise.all([
      getMyInstitutionApplications(),getInstitutionAccess()
    ]);
    setApplications(apps || []);
    setApproved(Boolean(access?.platform_owner ||
      (access?.institutions || []).some(m=>m.member_status==='active' && m.institution_status==='active')));
  }
  useEffect(()=>{
    const issue=sessionStorage.getItem('qualify-pending-application-error');
    if(issue){
      sessionStorage.removeItem('qualify-pending-application-error');
      setError('We could not submit the institution application automatically: '+issue);
    }
    reload().catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[]);

  const latest=applications[0] || null;
  const pending=latest?.status==='pending';
  const rejected=latest?.status==='rejected';
  const isApproved=latest?.status==='approved';
  function startCorrection() {
    if(!rejected)return;
    setForm(existingDetails(latest));
    setLogo(null);
    setError('');
    setEditing(true);
  }
  async function resubmit(e) {
    e.preventDefault();
    if(!rejected || busy)return;
    const errorMessage=validateInstitution(form);
    if(errorMessage){setError(errorMessage);return;}
    setBusy(true);setError('');
    try {
      // The server validates every field, requires a verified applicant, and
      // accepts a resubmission only when the latest request was rejected.
      await resubmitRejectedInstitution(form);
      setEditing(false);
      await reload();
    } catch(err){setError(err.message || 'Could not submit the corrections.');}
    finally {setBusy(false);}
  }
  return <main className="adminAuth-container">
    <section className={`adminAuth-card qa-application-card ${editing?'qa-application-edit':''}`}>
      <Link to="/" className="qa-brand">QUALIFY <span>INSTITUTION REGISTRATION</span></Link>
      {loading ? <p role="status" className="qa-subtitle">Loading your application…</p> : latest ? <>
        {!editing && <>
          <div className="qa-auth-icon">{pending?<FiClock/>:rejected?<FiXCircle/>:<FiCheckCircle/>}</div>
          <span className="qa-kicker">APPLICATION STATUS</span>
          <h1>{pending ? 'Institution approval pending' : rejected ? 'Application requires corrections' : 'Institution approved'}</h1>
          <p className="adminAuth-logo-subtext">{pending
            ? 'Your institution details have been submitted successfully. Please wait for the QUALIFY Platform Owner to review them. You do not need to register again.'
            : rejected
              ? 'Your institution request was not approved. Read the feedback below, correct the requested details, and resubmit using this same account.'
              : 'Your institution has been approved. You can now open your workspace.'}</p>
          {rejected && <div className="qa-rejection-feedback">
            <strong>Platform Owner feedback</strong>
            <p>{latest.review_notes || 'No reason was recorded for this earlier rejection. Please check the submitted details before resubmitting.'}</p>
          </div>}
          <ApplicationDetails application={latest}/>
          <div className="qa-application-meta">Submitted {new Date(latest.created_at).toLocaleString('en-IN')}
            {latest.reviewed_at && <span> · Reviewed {new Date(latest.reviewed_at).toLocaleString('en-IN')}</span>}
          </div>
          {rejected && <button type="button" className="adminAuth-button" onClick={startCorrection}>Edit details and resubmit <FiArrowRight/></button>}
          {isApproved && <Link className="qa-application-primary-link" to="/app">Open institution workspace →</Link>}
        </>}
        {editing && <div className="qa-resubmit">
          <span className="qa-kicker">APPLICATION CORRECTION</span>
          <h1>Edit your institution details</h1>
          <div className="qa-rejection-feedback"><strong>Changes requested by Platform Owner</strong>
            <p>{latest.review_notes || 'Review the original application and correct any missing details.'}</p>
          </div>
          <p className="adminAuth-logo-subtext">All available details are prefilled from your last application. Keep the same account; a new pending request will be created after submission.</p>
          <form className="adminAuth-form" onSubmit={resubmit}>
            <InstitutionSignupFields value={form} onChange={setForm} logo={logo} onLogo={setLogo}/>
            <p className="qa-directory-note">For a logo selected during correction, upload it in Institution Settings after approval.</p>
            {error && <p role="alert" className="adminAuth-error">{error}</p>}
            <button className="adminAuth-button" disabled={busy} type="submit">{busy?'Submitting corrections…':'Resubmit for approval'} <FiArrowRight/></button>
            <button type="button" className="qa-application-cancel" onClick={()=>{setEditing(false);setError('');}}>Cancel changes</button>
          </form>
        </div>}
        {!editing && applications.length>1 && <details className="qa-application-history">
          <summary>Previous application history ({applications.length-1})</summary>
          {applications.slice(1).map(a=><div key={a.id} className="qa-application-item">
            <div><strong>{a.institution_name}</strong><small>{a.requested_code} · {new Date(a.created_at).toLocaleDateString('en-IN')}</small>
              {a.review_notes && <p>{a.review_notes}</p>}
            </div><span>{a.status}</span>
          </div>)}
        </details>}
      </> : <>
        <div className="qa-auth-icon"><FiClock/></div>
        <h1>No institution application found</h1>
        <p className="adminAuth-logo-subtext">Institution details are collected when you create your QUALIFY account. If you already registered, sign in with the same verified email.</p>
        <Link className="qa-application-primary-link" to="/signup">Create institution account →</Link>
      </>}
      {!editing && error && <p role="alert" className="adminAuth-error">{error}</p>}
    </section>
  </main>;
}
