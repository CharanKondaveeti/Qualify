import { Link } from 'react-router-dom';
import { useAppDialog } from '../../../shared/components/ConfirmDialogProvider';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createInstitutionAsPlatformOwner, getInstitutionApplicationsForReview,
  listPlatformInstitutions, reviewInstitutionApplication, setInstitutionStatus } from '../../../services/institutionService';
import { useAdminWorkspace } from '../context/AdminWorkspaceContext';
import '../styles/operations.css';

export default function InstitutionsPage() {
  const navigate = useNavigate();
  const dialog = useAppDialog();
  const { setInstitutionId, refreshWorkspace } = useAdminWorkspace();
  const [institutions,setInstitutions] = useState([]);
  const [applications,setApplications] = useState([]);
  const [form,setForm] = useState({name:'',code:'',superAdminEmail:''});
  const [notes,setNotes] = useState({});
  const [search,setSearch] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  async function load() {
    const [rows,apps] = await Promise.all([listPlatformInstitutions(),getInstitutionApplicationsForReview()]);
    setInstitutions(rows||[]);setApplications(apps||[]);
  }
  useEffect(()=>{load().catch(e=>setError(e.message));},[]);
  async function act(job,success) {
    setBusy(true);setError('');setMessage('');
    try {await job();await load();await refreshWorkspace();setMessage(success);}
    catch(e){setError(e.message||'Unable to save changes.');}
    finally{setBusy(false);}
  }
  const visible = institutions.filter(i=>`${i.name} ${i.code}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="integrated-section">
    <span className="eyebrow">PLATFORM OWNER</span><h1>Institutions</h1>
    <p className="integrated-muted">Approve college registrations and appoint institution Super Admins. This uses the protected QUALIFY platform workspace.</p>
    {error&&<p className="ops-error" role="alert">{error}</p>}{message&&<p className="ops-info" role="status">{message}</p>}
    <div className="exam-summary">{[['Total institutions',institutions.length],['Active',institutions.filter(i=>i.status==='active').length],['Pending applications',applications.length]].map(([name,value])=><div key={name}><strong>{value}</strong><span>{name}</span></div>)}</div>
    <div className="integrated-grid">
      <div className="content-section"><h2>Create institution</h2><p className="integrated-muted">The first Super Admin must already have a verified Qualify account.</p>
        <form className="integrated-form" onSubmit={e=>{e.preventDefault();act(()=>createInstitutionAsPlatformOwner(form),'Institution created.');}}>
          <label>Institution name<input required minLength={3} maxLength={160} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label>Unique code<input required minLength={3} pattern="[a-z0-9][a-z0-9-]{2,39}" value={form.code} onChange={e=>setForm({...form,code:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')})}/></label>
          <label>Verified Super Admin email<input required type="email" value={form.superAdminEmail} onChange={e=>setForm({...form,superAdminEmail:e.target.value})}/></label>
          <button className="integrated-primary" disabled={busy}>Create institution</button>
        </form>
      </div>
      <div className="content-section"><h2>Verification requests ({applications.length})</h2>
        <div className="integrated-scroll">{applications.length===0&&<p className="integrated-muted">No pending applications.</p>}{applications.map(app=><article className="integrated-item" key={app.id}>
          <h3>{app.institution_name}</h3><p><strong>{app.requested_code}</strong> · {app.applicant_email}</p>
          {app.website&&<p className="integrated-muted">Website: {app.website}</p>}{app.details&&<p>{app.details}</p>}
          <p className="integrated-muted">Submitted {new Date(app.created_at).toLocaleString()}</p>
          <label>Verification notes<textarea maxLength={1500} rows={2} value={notes[app.id]||''} onChange={e=>setNotes({...notes,[app.id]:e.target.value})}/></label>
          <div className="integrated-actions"><button disabled={busy} className="integrated-primary" onClick={async ()=>{if(await dialog.confirm('Approve this institution and appoint the applicant as its Super Admin?'))act(()=>reviewInstitutionApplication(app.id,true,notes[app.id]||''),'Application approved.');}}>Approve</button>
          <button disabled={busy} className="integrated-danger" onClick={async ()=>{if(await dialog.confirm('Reject this application?'))act(()=>reviewInstitutionApplication(app.id,false,notes[app.id]||''),'Application rejected.');}}>Reject</button></div>
        </article>)}</div>
      </div>
    </div>
    <div className="content-section"><div className="integrated-section-head"><h2>Registered institutions</h2><input type="search" aria-label="Search institutions" placeholder="Search by name or code" value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <div className="table-container"><table className="data-table"><thead><tr><th>Institution</th><th>Code</th><th>Staff</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {visible.map(i=><tr key={i.id}><td><Link to={`/platform/institutions/${i.id}`}>{i.name}</Link></td><td>{i.code}</td><td>{i.member_count}</td><td>{i.status}</td><td><div className="integrated-actions"><button className="action-btn" onClick={()=>{setInstitutionId(i.id);navigate(`/app/i/${i.id}/team`);}}>Manage staff</button><button className={i.status==='active'?'integrated-danger':'action-btn'} disabled={busy} onClick={async ()=>{if(await dialog.confirm(`${i.status==='active'?'Suspend':'Activate'} ${i.name}?`))act(()=>setInstitutionStatus(i.id,i.status==='active'?'suspended':'active'),'Institution status updated.');}}>{i.status==='active'?'Suspend':'Activate'}</button></div></td></tr>)}
        {!visible.length&&<tr><td colSpan={5}>No institutions found.</td></tr>}
      </tbody></table></div>
    </div>
  </section>;
}
