import { isConfigured, isDemo } from '../../../lib/supabase';
import { useEffect, useState } from 'react';
import { FiArrowRight, FiCheckCircle, FiLock, FiMail, FiShield, FiUser } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/admin-auth.css';
import { loginAdmin, signupAdmin } from '../../../services/adminService';

export default function AdminAuthPage({ signup = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(!signup);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setErrorMsg(''); setSuccess('');
    try {
      if (!isConfigured) throw new Error('Configure Supabase before signing in.');
      const { destination } = await loginAdmin(email.trim(), password);
      const next = new URLSearchParams(window.location.search).get('next');
      const safeInvite = next?.startsWith('/invitations') && !next.startsWith('//');
      // A dialog checks the verified user's invitations on their destination page.
      navigate(safeInvite ? next : destination, { replace: true });
    } catch (error) { setErrorMsg(error.message || 'Unable to sign in.'); }
    finally { setBusy(false); }
  }

  async function handleSignup(e) {
    e.preventDefault(); if (busy) return;
    setErrorMsg(''); setSuccess('');
    if (password !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }
    if (password.length < 8) { setErrorMsg('Use a password of at least 8 characters.'); return; }
    setBusy(true);
    try {
      await signupAdmin(email.trim(), password, name.trim());
      setSuccess('Account created. Verify your email using the message from Supabase, then sign in. Any staff invitation for this address will appear automatically.');
      setIsLogin(true); setPassword(''); setConfirmPassword('');
    } catch (error) { setErrorMsg(error.message || 'Could not create account.'); }
    finally { setBusy(false); }
  }

  if (isDemo) return <div className="portal-message">Switching to secure Supabase login…</div>;
  return <main className="adminAuth-container">
    <section className="adminAuth-card" aria-labelledby="auth-title">
      <h1 className="qa-brand">QUALIFY <span>EXAMINATION PLATFORM</span></h1>
      <h1 id="auth-title">{isLogin ? 'Welcome' : 'Create your account'}</h1>
      <p className="adminAuth-logo-subtext">{isLogin ? 'Sign in to continue to your institutional workspace.' : 'Create an account to apply for an institution or accept a staff invitation.'}</p>
      <form className="adminAuth-form" onSubmit={isLogin ? handleLogin : handleSignup}>
        {!isLogin && <div className="adminAuth-input-group"><label htmlFor="auth-name">Full name</label><div className="qa-input-wrap"><FiUser /><input id="auth-name" type="text" autoComplete="name" placeholder="Your full name" value={name} maxLength={120} onChange={e=>setName(e.target.value)} required /></div></div>}
        <div className="adminAuth-input-group"><label htmlFor="auth-email">Email address</label><div className="qa-input-wrap"><FiMail /><input id="auth-email" type="email" autoComplete="email" placeholder="you@institution.edu" value={email} onChange={e => setEmail(e.target.value)} required /></div></div>
        <div className="adminAuth-input-group"><div className="qa-label-line"><label htmlFor="auth-password">Password</label>{isLogin && <Link to="/forgot-password">Forgot password?</Link>}</div><div className="qa-input-wrap"><FiLock /><input id="auth-password" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} minLength={isLogin ? undefined : 8} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required /></div></div>
        {!isLogin && <div className="adminAuth-input-group"><label htmlFor="auth-confirm">Confirm password</label><div className="qa-input-wrap"><FiLock /><input id="auth-confirm" type="password" autoComplete="new-password" minLength={8} placeholder="Confirm your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div></div>}
        {errorMsg && <p role="alert" className="adminAuth-error">{errorMsg}</p>}
        {success && <p role="status" className="qa-success"><FiCheckCircle />{success}</p>}
        <button className="adminAuth-button" type="submit" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'} <FiArrowRight /></button>
      </form>
      <p className="signup-link">{isLogin ? 'New to QUALIFY?' : 'Already have an account?'} <Link to={isLogin ? '/signup' : '/login'}>{isLogin ? 'Create account' : 'Sign in'}</Link></p>
      <div className="qa-auth-footer"><span>Registering an institution?</span><Link to="/institutions/apply">Apply for institutional access →</Link></div>
    </section>
  </main>;
}
