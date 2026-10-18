import { useEffect, useMemo, useState } from "react";
import { FiClock, FiMail, FiRefreshCw, FiShield, FiUsers, FiCheckCircle, FiX } from "react-icons/fi";
import { useAppDialog } from "../../../shared/components/ConfirmDialogProvider";
import { useAdminWorkspace } from "../context/AdminWorkspaceContext";
import {
  addInstitutionSuperAdmin, listInstitutionMembers, manageInstitutionMember,
} from "../../../services/institutionService";
import { listStaffOtpInvites, sendStaffOtp, verifyStaffOtp } from "../../../services/staffOnboardingService";
import "../styles/operations.css";
import "../styles/staff-invitations.css";

export default function TeamPage() {
  const { institutionId, selectedInstitution, isOwner, isSuperAdmin }=useAdminWorkspace();
  const dialog=useAppDialog();
  const [members,setMembers]=useState([]);
  const [invites,setInvites]=useState([]);
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [otp,setOtp]=useState("");
  const [selectedInvite,setSelectedInvite]=useState("");
  const [verifiedEmail,setVerifiedEmail]=useState("");
  const [search,setSearch]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const canManage=isOwner||isSuperAdmin;

  async function load() {
    if(!institutionId) return;
    const [people,otpInvites]=await Promise.all([
      listInstitutionMembers(institutionId),
      isSuperAdmin ? listStaffOtpInvites(institutionId) : Promise.resolve({items:[]}),
    ]);
    setMembers(people||[]);
    setInvites(otpInvites?.items||[]);
  }
  useEffect(()=>{
    setError("");setMessage("");setMembers([]);setInvites([]);
    if(!canManage||!institutionId)return;
    let active=true;
    Promise.all([
      listInstitutionMembers(institutionId),
      isSuperAdmin ? listStaffOtpInvites(institutionId) : Promise.resolve({items:[]})
    ]).then(([people,list])=>{if(active){setMembers(people||[]);setInvites(list?.items||[]);}})
      .catch(err=>{if(active)setError(err.message);});
    return()=>{active=false;};
  },[institutionId,canManage,isSuperAdmin]);

  async function act(action,success) {
    setBusy(true);setError("");setMessage("");
    try {
      const result=await action();
      await load();
      setMessage(result?.message||success||"Completed.");
      return result||true;
    } catch(err){setError(err.message||"Action failed.");return null;}
    finally{setBusy(false);}
  }
  async function send(e) {
    e.preventDefault();
    const result=await act(()=>sendStaffOtp(institutionId,email.trim(),name.trim()),
      "A verification OTP has been emailed to the staff member.");
    if(result){setSelectedInvite(result.id);setOtp("");}
  }
  async function verify(e) {
    e.preventDefault();
    const result=await act(()=>verifyStaffOtp(institutionId,selectedInvite,otp),
      "The staff account has been prepared.");
    if(result){setOtp("");setSelectedInvite("");setName("");setEmail("");}
  }
  const visible=useMemo(()=>members.filter(m=>
    (String(m.name||"")+" "+String(m.email||"")+" "+String(m.role||""))
      .toLowerCase().includes(search.toLowerCase())),[members,search]);
  const pending=invites.filter(i=>i.status==="pending"&&new Date(i.expires_at).getTime()>Date.now());
  return <section className="integrated-section qualify-team">
    <span className="eyebrow">INSTITUTION ADMINISTRATION</span>
    <div className="qualify-team-heading">
      <div><h1>Staff management</h1><p className="integrated-muted">
        {selectedInstitution ? selectedInstitution.name+" · "+members.length+" staff members" : "Choose an institution."}
      </p></div>
      <button className="qt-outline" disabled={busy||!institutionId} onClick={()=>act(load,"Staff records updated.")}><FiRefreshCw/> Refresh</button>
    </div>
    {error&&<p className="ops-error" role="alert">{error}</p>}
    {message&&<p className="ops-info" role="status">{message}</p>}
    {!institutionId||!canManage ? <div className="content-section">Institution Super Admin access is required.</div> : <>
      {isSuperAdmin&&<div className="qualify-team-top">
        <div className="content-section qt-panel">
          <div className="qt-panel-heading"><FiMail/><div><h2>Invite Staff Admin</h2>
            <p>Send a six-digit email verification code. Your staff member shares the code with you.</p>
          </div></div>
          <form className="qt-form" onSubmit={send}>
            <label>Staff member's full name
              <input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Full name"/>
            </label>
            <label>Staff member's email
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="faculty@institution.edu"/>
            </label>
            <p className="qt-hint"><FiShield/> Codes are valid for 10 minutes, with five verification attempts and a resend cooldown. A staff member does not register separately.</p>
            <button className="integrated-primary" type="submit" disabled={busy||!email||!name.trim()}>
              {busy?"Please wait…":"Send verification OTP"}
            </button>
          </form>
        </div>
        <div className="content-section qt-panel">
          <div className="qt-panel-heading"><FiCheckCircle/><div><h2>Verify staff OTP</h2>
            <p>Enter the OTP received by the staff member. Only Super Admins can verify it.</p></div></div>
          <form className="qt-form" onSubmit={verify}>
            <label>Pending invitation
              <select required value={selectedInvite} onChange={e=>setSelectedInvite(e.target.value)}
                className="qt-input-select">
                <option value="">Select pending staff</option>
                {pending.map(i=><option key={i.id} value={i.id}>{i.staff_name} — {i.invited_email}</option>)}
              </select>
            </label>
            <label>Six-digit verification code
              <input required type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}"
                maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/[^0-9]/g,""))}
                placeholder="Enter OTP"/>
            </label>
            <p className="qt-hint"><FiShield/> New staff receive a temporary password by email. Their permissions activate only after they change it on first login. Existing users keep their passwords.</p>
            <button className="integrated-primary" type="submit" disabled={busy||!selectedInvite||otp.length!==6}>
              {busy?"Verifying…":"Verify OTP & provision staff"}
            </button>
          </form>
        </div>
      </div>}
      {isOwner&&<div className="content-section qt-owner"><div><h2>Appoint Institutional Super Admin</h2>
        <p className="integrated-muted">Platform Owner only. Separate from Staff Admin onboarding.</p></div>
        <form onSubmit={async e=>{e.preventDefault();const ok=await act(
          ()=>addInstitutionSuperAdmin(institutionId,verifiedEmail),"Institution Super Admin appointed."
        );if(ok)setVerifiedEmail("");}}>
          <input type="email" required placeholder="Verified QUALIFY email" value={verifiedEmail} onChange={e=>setVerifiedEmail(e.target.value)}/>
          <button className="qt-outline" disabled={busy}>Appoint Super Admin</button>
        </form></div>}
      <div className="content-section qt-panel">
        <div className="integrated-section-head"><div><h2><FiUsers/> Institution staff ({members.length})</h2>
          <p className="integrated-muted">Manage verified and active institution staff accounts.</p></div>
          <input aria-label="Search staff" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search staff"/>
        </div>
        <div className="table-container"><table className="data-table"><thead>
          <tr><th>Staff</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {visible.map(m=><tr key={m.user_id}><td>{m.name||m.email}
            <small className="integrated-muted">{m.name&&m.email}</small></td>
            <td>{m.role==="institution_super_admin"?"Super Admin":"Staff Admin"}</td>
            <td><span className={"qt-status qt-"+m.status}>{m.status}</span></td><td>
            <div className="integrated-actions">
              {isOwner&&<button className="action-btn" disabled={busy} onClick={async()=>{
                if(await dialog.confirm("Change role for "+m.email+"?"))await act(()=>
                manageInstitutionMember(institutionId,m.user_id,m.role==="staff_admin"?"institution_super_admin":"staff_admin",m.status),
                "Role changed.");
              }}>{m.role==="staff_admin"?"Promote":"Demote"}</button>}
              <button className={m.status==="active"?"integrated-danger":"action-btn"} disabled={busy} onClick={async()=>{
                if(await dialog.confirm((m.status==="active"?"Suspend ":"Reactivate ")+m.email+"?"))await act(()=>
                manageInstitutionMember(institutionId,m.user_id,m.role,m.status==="active"?"suspended":"active"),
                "Staff status updated.");
              }}>{m.status==="active"?"Suspend":"Reactivate"}</button>
            </div></td></tr>)}
            {!visible.length&&<tr><td colSpan={4}>No institution staff members found.</td></tr>}
          </tbody></table></div>
      </div>
      {isSuperAdmin&&<div className="content-section qt-panel">
        <div className="qt-panel-heading"><FiClock/><div><h2>Verification history</h2>
          <p>Recently requested OTPs and staff provisioning status.</p></div></div>
        <div className="qt-invites">
          {invites.length===0&&<p className="integrated-muted">No verification requests yet.</p>}
          {invites.map(inv=><div className="qt-invite-row" key={inv.id}>
            <div><strong>{inv.staff_name}</strong><small>{inv.invited_email}</small></div>
            <span className={"qt-status qt-"+inv.status}>{inv.status}</span>
            <span className="qt-time">{new Date(inv.created_at).toLocaleString()}</span>
            {inv.status==="pending"&&<button type="button" className="qt-outline" onClick={()=>setSelectedInvite(inv.id)}>Enter OTP</button>}
          </div>)}
        </div>
      </div>}
    </>}
  </section>;
}
