import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiCheckCircle, FiLock, FiShield } from "react-icons/fi";
import { activateRegistration } from "../../../services/institutionRegistrationService";
import "../../auth/styles/admin-auth.css";
export default function InstitutionActivationPage(){
  const navigate=useNavigate();
  // Read the secret once from the fragment, then immediately remove it from the address bar.
  const [token]=useState(()=>{
    const hash=new URLSearchParams(window.location.hash.slice(1));
    const value=hash.get("token")||"";
    return value;
  });
  useEffect(()=>{
    window.history.replaceState(window.history.state,"",window.location.pathname+window.location.search);
  },[]);
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState(false);
  async function activate(e){
    e.preventDefault();if(busy)return;
    if(password!==confirm){setError("Passwords do not match");return;}
    setBusy(true);setError("");
    try{await activateRegistration(token,password);setSuccess(true);}
    catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  return <main className="adminAuth-container">
    <section className="adminAuth-card">
      <Link to="/" className="qa-brand">QUALIFY <span>SUPER ADMIN ACTIVATION</span></Link>
      <div className="qa-auth-icon"><FiShield/></div>
      {success?<><h1>Account activated</h1>
        <p className="qa-success"><FiCheckCircle/>Your password is saved. You can sign in as your institution's Super Admin.</p>
        <button className="adminAuth-button" type="button" onClick={()=>navigate("/login",{replace:true})}>Continue to sign in</button>
      </>:!token?<><h1>Activation link missing</h1><p className="adminAuth-logo-subtext">Open the one-time link sent after your institution was approved.</p>
        <Link to="/login">Back to sign in</Link></>:<>
        <h1>Activate your Super Admin account</h1>
        <p className="adminAuth-logo-subtext">Set a permanent password. Your activation link works only once and expires after 48 hours.</p>
        <form onSubmit={activate} className="adminAuth-form">
          <div className="adminAuth-input-group"><label htmlFor="activation-password">New password</label>
            <div className="qa-input-wrap"><FiLock/><input type="password" id="activation-password" required
              minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></div></div>
          <div className="adminAuth-input-group"><label htmlFor="activation-confirm">Confirm password</label>
            <div className="qa-input-wrap"><FiLock/><input type="password" id="activation-confirm" required
              minLength={12} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></div></div>
          <small className="qa-directory-note">Use at least 12 characters, including uppercase and lowercase letters, a number and a symbol.</small>
          {error&&<p className="adminAuth-error" role="alert">{error}</p>}
          <button className="adminAuth-button" type="submit" disabled={busy}>{busy?"Activating…":"Activate account"}</button>
        </form>
      </>}
    </section>
  </main>;
}
