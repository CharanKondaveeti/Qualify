import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getInstitutionApplicationsForReview, reviewInstitutionApplication } from '../../../services/institutionService';
import { useAppDialog } from '../../../shared/components/ConfirmDialogProvider';
import PageLoader from '../../../shared/components/PageLoader';
export default function PlatformApplicationsPage() {
  const { applicationId } = useParams();
  const dialog = useAppDialog();
  const [apps,setApps] = useState(null),[notes,setNotes]=useState({}),[busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
  async function refresh(){setApps(await getInstitutionApplicationsForReview())}
  useEffect(()=>{let mounted=true;getInstitutionApplicationsForReview().then(a=>mounted&&setApps(a)).catch(e=>mounted&&setError(e.message));return()=>{mounted=false}},[]);
  async function decide(a,approve){
    const question=approve?`Approve ${a.institution_name} and appoint its applicant as the first Institutional Super Admin?`:`Reject ${a.institution_name}?`;
    if(!(await dialog.confirm(question,{title:approve?'Approve institution':'Reject application',confirmLabel:approve?'Approve institution':'Reject',danger:!approve})))return;
    setBusy(a.id);setError('');setMessage('');
    try{await reviewInstitutionApplication(a.id,approve,notes[a.id]||'');await refresh();setMessage(approve?'Institution approved.':'Application rejected.');}
    catch(e){setError(e.message)}finally{setBusy('')}
  }
  if(!apps&&!error)return <PageLoader label="Loading applications…" />;
  const shown=applicationId?apps?.filter(a=>a.id===applicationId):apps;
  return <section className="integrated-section"><span className="eyebrow">PLATFORM OWNER</span><h1>{applicationId?'Application review':'Institution applications'}</h1>
    <p className="integrated-muted">Confirm institutional authority independently before appointing the first Super Admin.</p>
    {applicationId&&<Link to="/platform/applications">← All applications</Link>}
    {error&&<p role="alert" className="ops-error">{error}</p>}{message&&<p role="status" className="ops-info">{message}</p>}
    {(shown||[]).map(a=><article className="content-section" key={a.id}><h2>{a.institution_name}</h2><p className="integrated-muted">Applicant: {a.applicant_email} · Code: {a.requested_code}</p>{a.website&&<p>Website: {a.website}</p>}{a.details&&<p>{a.details}</p>}
      {a.profile_details?.institution_type&&<div className="qualify-owner-application-profile" style={{border:"1px solid #e1e8f0",background:"#f8fafc",borderRadius:10,padding:16,margin:"14px 0"}}>
        <h3>Institution details submitted at registration</h3>
        <dl style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,margin:0}}>
          {Object.entries({
            Category:a.profile_details.institution_type?.replaceAll("_"," "),
            "Official phone":a.profile_details.official_phone,
            "Official email":a.profile_details.official_email,
            Address:[a.profile_details.address_line,a.profile_details.city,a.profile_details.district,a.profile_details.state,a.profile_details.postal_code].filter(Boolean).join(", "),
            Affiliation:a.profile_details.affiliation,
            "Registration number":a.profile_details.registration_number,
            "Contact person":a.profile_details.contact_person,
            "Directory source":a.profile_details.directory_source
          }).filter(([,value])=>Boolean(value)).map(([label,value])=><div key={label}><dt style={{fontSize:11,color:"#64748b",marginBottom:4}}>{label}</dt><dd style={{margin:0,fontSize:13,fontWeight:600,overflowWrap:"anywhere"}}>{value}</dd></div>)}
        </dl>
      </div>}
      <label>Verification notes<textarea rows={3} maxLength={1500} value={notes[a.id]||''} onChange={e=>setNotes(v=>({...v,[a.id]:e.target.value}))} /></label>
      <div className="integrated-actions"><button type="button" className="integrated-primary" disabled={Boolean(busy)} onClick={()=>decide(a,true)}>Approve</button><button type="button" className="integrated-danger" disabled={Boolean(busy)} onClick={()=>decide(a,false)}>Reject</button></div>
    </article>)}
    {!shown?.length&&!error&&<div className="content-section">{applicationId?'This request is not pending or does not exist.':'No pending applications.'}</div>}
  </section>;
}
