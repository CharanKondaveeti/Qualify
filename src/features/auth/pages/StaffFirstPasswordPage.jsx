import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiLock, FiShield, FiCheckCircle } from "react-icons/fi";
import supabase from "../../../lib/supabase";
import { completeStaffFirstPassword } from "../../../services/staffOnboardingService";
import "../styles/admin-auth.css";

export default function StaffFirstPasswordPage() {
  const navigate=useNavigate();
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [done,setDone]=useState(false);
  async function save(e) {
    e.preventDefault();
    setError("");
    if(password!==confirm) {setError("Passwords do not match.");return;}
    if(password.length<12||!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password)||!/[^A-Za-z0-9]/.test(password)){
      setError("Use at least 12 characters, including uppercase, lowercase, a number and a symbol.");return;
    }
    setBusy(true);
    try {
      await completeStaffFirstPassword(password);
      // Re-authenticate using the new password to refresh all claims and sessions.
      await supabase.auth.signOut();
      setDone(true);
    } catch(ex) {setError(ex.message||"Unable to change password.");}
    finally {setBusy(false);}
  }
  return <main className="adminAuth-container">
    <section className="adminAuth-card" aria-labelledby="first-password-title">
      <Link to="/" className="qa-brand">QUALIFY <span>STAFF ACCESS</span></Link>
      <div className="qa-auth-icon"><FiShield /></div>
      <h1 id="first-password-title">{done?"Password changed":"Change your temporary password"}</h1>
      {done ? <><p className="qa-success"><FiCheckCircle />Your new password is saved and Staff Admin access is active.</p>
        <button className="adminAuth-button" onClick={()=>navigate("/login",{replace:true})}>Continue to sign in</button>
      </> : <>
        <p className="adminAuth-logo-subtext">For security, your temporary password must be replaced before you can access your institution workspace.</p>
        <form className="adminAuth-form" onSubmit={save}>
          <div className="adminAuth-input-group"><label htmlFor="new-staff-pass">New permanent password</label>
            <div className="qa-input-wrap"><FiLock/><input id="new-staff-pass" type="password" autoComplete="new-password"
              required minLength={12} value={password} onChange={e=>setPassword(e.target.value)}/></div></div>
          <div className="adminAuth-input-group"><label htmlFor="repeat-staff-pass">Confirm new password</label>
            <div className="qa-input-wrap"><FiLock/><input id="repeat-staff-pass" type="password" autoComplete="new-password"
              required minLength={12} value={confirm} onChange={e=>setConfirm(e.target.value)}/></div></div>
          {error&&<p className="adminAuth-error" role="alert">{error}</p>}
          <button className="adminAuth-button" type="submit" disabled={busy}>{busy?"Updating password…":"Set permanent password"}</button>
        </form>
      </>}
    </section>
  </main>;
}
