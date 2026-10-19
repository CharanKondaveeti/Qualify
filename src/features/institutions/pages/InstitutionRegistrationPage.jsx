import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiMail, FiShield, FiTrash2, FiEdit3 } from "react-icons/fi";
import { useAppDialog } from "../../../shared/components/ConfirmDialogProvider";
import InstitutionSignupFields from "../components/InstitutionSignupFields";
import { emptyInstitution, validateInstitution } from "../../../services/institutionSignupService";
import {
  applicantSession,clearApplicantSession,requestRegistrationOtp,verifyRegistrationOtp,
  getRegistrationStatus,submitRegistration,resubmitRegistration,deleteRegistration
} from "../../../services/institutionRegistrationService";
import "../../auth/styles/admin-auth.css";

function editableForm(app,email){
  if(!app)return {...emptyInstitution,official_email:email};
  return {...emptyInstitution,...app.profile_details,name:app.institution_name,
    code:app.requested_code,website:app.website||"",details:app.details||"",
    official_email:email};
}
export default function InstitutionRegistrationPage({statusOnly=false}){
  const dialog=useAppDialog();
  const [stage,setStage]=useState("email");
  const [email,setEmail]=useState("");
  const [challenge,setChallenge]=useState("");
  const [code,setCode]=useState("");
  const [application,setApplication]=useState(null);
  const [form,setForm]=useState({...emptyInstitution});
  const [editing,setEditing]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  async function refresh(){
    const result=await getRegistrationStatus();
    setEmail(result.email);
    setApplication(result.application);
    setForm(editableForm(result.application,result.email));
    setStage(result.application?"status":statusOnly?"empty":"form");
    setEditing(false);
  }
  useEffect(()=>{
    let active=true;
    if(!applicantSession()){setLoading(false);return;}
    getRegistrationStatus().then(result=>{
      if(!active)return;
      setEmail(result.email);setApplication(result.application);
      setForm(editableForm(result.application,result.email));
      setStage(result.application?"status":statusOnly?"empty":"form");
    }).catch(()=>{
      if(active){clearApplicantSession();setStage("email");}
    }).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[statusOnly]);
  async function sendCode(event){
    event.preventDefault();
    if(busy)return;
    setBusy(true);setError("");setMessage("");
    try{
      const result=await requestRegistrationOtp(email.trim().toLowerCase());
      setChallenge(result.challengeId);setCode("");setStage("otp");setMessage(result.message);
    }catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  async function verify(event){
    event.preventDefault();
    if(busy)return;
    setBusy(true);setError("");setMessage("");
    try{
      const result=await verifyRegistrationOtp(challenge,code);
      setEmail(result.email);
      await refresh();
      setMessage("Email verified successfully.");
    }catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  async function save(event){
    event.preventDefault();
    if(busy)return;
    const data={...form,official_email:email,contact_person:""};
    const issue=validateInstitution(data);
    if(issue){setError(issue);return;}
    setBusy(true);setError("");setMessage("");
    try{
      if(editing)await resubmitRegistration(data);
      else await submitRegistration(data);
      await refresh();
      setMessage("Your application is submitted. You will be notified after Platform Owner review.");
    }catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  async function erase(){
    if(busy || !await dialog.confirm(
      "Permanently delete your rejected application and its verification data? This cannot be undone.",
      {title:"Delete application?",confirmLabel:"Delete permanently",cancelLabel:"Cancel",danger:true}
    ))return;
    setBusy(true);setError("");
    try{
      await deleteRegistration();
      clearApplicantSession();setApplication(null);setEmail("");setStage("email");
      setMessage("Application deleted. You can register again with a new verification code.");
    }catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  const rejected=application?.status==="rejected";
  return <main className="adminAuth-container">
    <section className={`adminAuth-card ${stage==="form"||editing?"qa-signup-wide":""}`}>
      <Link to="/" className="qa-brand">QUALIFY <span>INSTITUTION REGISTRATION</span></Link>
      <div className="qa-auth-icon">{stage==="status"?<FiCheckCircle/>:<FiShield/>}</div>
      {loading?<p role="status">Checking registration…</p>:<>
        {stage==="email"&&<>
          <span className="qa-kicker">STEP 1 OF 2</span>
          <h1>Verify your email</h1>
          <p className="adminAuth-logo-subtext">We will send a six-digit code to your email. No Qualify account is created at this stage.</p>
          <form onSubmit={sendCode} className="adminAuth-form">
            <div className="adminAuth-input-group"><label htmlFor="reg-email">Email address</label>
              <div className="qa-input-wrap"><FiMail/><input id="reg-email" type="email" required
                autoComplete="email" placeholder="you@college.edu" value={email}
                onChange={e=>setEmail(e.target.value)}/></div></div>
            <button className="adminAuth-button" type="submit" disabled={busy}>
              {busy?"Sending…":"Send verification code"} <FiArrowRight/>
            </button>
          </form>
        </>}
        {stage==="otp"&&<>
          <span className="qa-kicker">EMAIL VERIFICATION</span>
          <h1>Enter your verification code</h1>
          <p className="adminAuth-logo-subtext">Enter the six-digit code sent to <strong>{email}</strong>. Expires in 10 minutes.</p>
          <form onSubmit={verify} className="adminAuth-form">
            <div className="adminAuth-input-group"><label htmlFor="reg-code">6-digit code</label>
              <input id="reg-code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}"
                maxLength={6} required value={code} placeholder="000000" onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}/></div>
            <button className="adminAuth-button" type="submit" disabled={busy||code.length!==6}>
              {busy?"Verifying…":"Verify email"} <FiCheckCircle/>
            </button>
            <button className="qa-button-secondary" type="button" onClick={()=>{setStage("email");setCode("");setError("");}}>Change email / resend code</button>
          </form>
        </>}
        {stage==="empty"&&<>
          <h1>Email verified</h1>
          <p className="adminAuth-logo-subtext">There is no application for {email}.</p>
          <Link className="qa-application-primary-link" to="/signup">Start institution registration</Link>
        </>}
        {(stage==="form"||editing)&&<>
          <span className="qa-kicker">STEP 2 OF 2 — EMAIL VERIFIED</span>
          <h1>{editing?"Correct your application":"Register your institution"}</h1>
          <p className="adminAuth-logo-subtext"><FiCheckCircle style={{verticalAlign:"middle",color:"#168257"}}/> Verified email: <strong>{email}</strong>.
            Your account will be created only after Platform Owner approval.</p>
          {editing&&application?.review_notes&&<p className="qa-rejection-feedback"><strong>Review feedback:</strong> {application.review_notes}</p>}
          <form className="adminAuth-form" onSubmit={save}>
            <InstitutionSignupFields value={form} onChange={setForm} showLogo={false}/>
            <small className="qa-directory-note">You may upload the institution logo after approval from your workspace settings.</small>
            <button className="adminAuth-button" type="submit" disabled={busy}>
              {busy?"Submitting…":editing?"Resubmit for review":"Submit application"} <FiArrowRight/>
            </button>
            {editing&&<button type="button" className="qa-button-secondary" onClick={()=>{setEditing(false);setForm(editableForm(application,email));setError("");}}>
              Cancel editing
            </button>}
          </form>
        </>}
        {stage==="status"&&!editing&&application&&<>
          <span className="qa-kicker">APPLICATION STATUS</span>
          <h1>{application.status==="pending"?"Awaiting Platform Owner approval":rejected?"Application requires corrections":"Institution approved"}</h1>
          <p className="adminAuth-logo-subtext">Institution: <strong>{application.institution_name}</strong><br/>
            Verified applicant email: <strong>{email}</strong></p>
          {rejected&&<>
            <div className="qa-rejection-feedback"><strong>Platform Owner feedback</strong><p>{application.review_notes||"Review your submitted details."}</p></div>
            <div className="qa-registration-actions">
              <button type="button" className="adminAuth-button" onClick={()=>{setEditing(true);setError("");}} disabled={busy}>
                <FiEdit3/> Edit and resubmit
              </button>
              <button type="button" className="qa-button-secondary qa-registration-danger" onClick={erase} disabled={busy}>
                <FiTrash2/> Delete application
              </button>
            </div>
          </>}
          {application.status==="approved"&&<p className="qa-success">
            Your institution is approved. Check your email for the one-time activation link to set your password.
          </p>}
          {application.status==="pending"&&<p className="qa-success">Your application has been received. No Supabase Auth account has been created yet.</p>}
        </>}
        {error&&<p className="adminAuth-error" role="alert">{error}</p>}
        {message&&<p className="qa-success" role="status"><FiCheckCircle/>{message}</p>}
      </>}
      <p className="signup-link">Already approved? <Link to="/login">Sign in</Link> · <Link to="/application-status">Application status</Link></p>
    </section>
  </main>;
}
