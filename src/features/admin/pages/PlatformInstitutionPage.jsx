import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listPlatformInstitutions, listInstitutionMembers } from '../../../services/institutionService';
import PageLoader from '../../../shared/components/PageLoader';
export default function PlatformInstitutionPage(){
 const {institutionId}=useParams(); const [institution,setInstitution]=useState(null),[members,setMembers]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let alive=true;setLoading(true);Promise.all([listPlatformInstitutions(),listInstitutionMembers(institutionId)]).then(([rows,people])=>{if(!alive)return;setInstitution(rows.find(x=>x.id===institutionId)||null);setMembers(people||[])}).catch(e=>{if(alive)setError(e.message)}).finally(()=>alive&&setLoading(false));return()=>{alive=false}},[institutionId]);
 if(loading)return <PageLoader label="Loading institution…"/>;
 return <section className="integrated-section"><Link to="/platform/institutions">← All institutions</Link>{error?<p role="alert" className="ops-error">{error}</p>:!institution?<div className="content-section"><h1>Institution not found</h1><p>This institution is unavailable or you do not have access.</p></div>:<>
  <span className="eyebrow">PLATFORM OVERSIGHT</span><h1>{institution.name}</h1><p className="integrated-muted">Institution code: {institution.code} · Status: {institution.status}</p>
  <div className="exam-summary"><div><strong>{members.length}</strong><span>Members</span></div><div><strong>{members.filter(m=>m.role==='institution_super_admin'&&m.status==='active').length}</strong><span>Active Super Admins</span></div></div>
  <div className="content-section"><h2>Institution members</h2><p className="integrated-muted">The platform owner may inspect memberships. Staff invitations and approvals are managed in this institution's workspace.</p>
  <div className="table-container"><table className="data-table"><thead><tr><th>Staff</th><th>Role</th><th>Status</th></tr></thead><tbody>{members.map(m=><tr key={m.user_id}><td>{m.name || m.email}</td><td>{m.role==='institution_super_admin'?'Super Admin':'Staff Admin'}</td><td>{m.status}</td></tr>)}</tbody></table></div>
  <Link className="action-btn" to={`/app/i/${encodeURIComponent(institutionId)}/team`}>Manage institution staff →</Link></div>
 </>}</section>;
}
