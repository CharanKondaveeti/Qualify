import { useEffect, useState } from 'react';
import { FiArrowRight, FiKey, FiLock, FiMail, FiCheckCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import supabase, { isConfigured, recoveryMarker } from '../../../lib/supabase';
import { resetExam } from '../../../store/newExamSlice';
import '../styles/admin-auth.css';

export default function PasswordRecoveryPage({ reset = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [ready, setReady] = useState(!reset);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const cache = useQueryClient();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!reset) return;
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (mounted && event === 'PASSWORD_RECOVERY') { setReady(true); setError(''); }
    });
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      let marker;
      try { marker = JSON.parse(sessionStorage.getItem(recoveryMarker)); } catch { /* invalid markers expire */ }
      if (!sessionError && data.session && marker?.user === data.session.user.id && Date.now() - marker.at < 3600000) setReady(true);
      else setError('This password-reset link is missing or expired. Request a new link below.');
    }).catch(() => { if (mounted) setError('Could not verify the reset link. Please request another.'); });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [reset]);

  async function submit(event) {
    event.preventDefault();
    if (busy || done) return;
    setError(''); setMessage('');
    if (!isConfigured) { setError('Password recovery is not configured. Contact your administrator.'); return; }
    if (reset && (!ready || password.length < 8 || password !== confirmation)) {
      setError(!ready ? 'Open a valid reset link first.' : password.length < 8 ? 'Use at least 8 characters.' : 'Passwords do not match.'); return;
    }
    setBusy(true);
    try {
      if (reset) {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        sessionStorage.removeItem(recoveryMarker);
        sessionStorage.removeItem('qualify-demo');
        setPassword(''); setConfirmation(''); setDone(true);
        cache.clear(); dispatch(resetExam());
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
        setMessage(signOutError ? 'Password updated. Sign out of other devices when possible, then sign in with your new password.' : 'Password updated. Sign in with your new password.');
      } else {
        const { error: sendError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (sendError) throw sendError;
        setDone(true);
        setMessage('If an account matches this email, a password-reset link will arrive shortly. Check your spam folder too.');
      }
    } catch (err) { setError(err.message || 'Could not complete password recovery. Try again.'); }
    finally { setBusy(false); }
  }
  return <main className="adminAuth-container"><section className="adminAuth-card">
    <Link to="/" className="qa-brand">QUALIFY <span>ACCOUNT SECURITY</span></Link>
    <div className="qa-auth-icon">{reset ? <FiLock /> : <FiKey />}</div>
    <span className="qa-kicker">SECURE ACCOUNT RECOVERY</span>
    <h1>{reset ? 'Set a new password' : 'Reset your password'}</h1>
    <p className="adminAuth-logo-subtext">{reset ? 'Choose a new password for your QUALIFY account.' : 'Enter your account email and we will send a secure password-reset link.'}</p>
    <form className="adminAuth-form" onSubmit={submit}>
      {!done && (!reset ? <div className="adminAuth-input-group"><label htmlFor="recovery-email">Email address</label><div className="qa-input-wrap"><FiMail /><input id="recovery-email" type="email" autoComplete="email" placeholder="you@institution.edu" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></div></div> : ready && <>
        <div className="adminAuth-input-group"><label htmlFor="new-password">New password</label><div className="qa-input-wrap"><FiLock /><input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></div></div>
        <div className="adminAuth-input-group"><label htmlFor="confirm-password">Confirm password</label><div className="qa-input-wrap"><FiLock /><input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} /></div></div>
      </>)}
      {error && <p role="alert" className="adminAuth-error">{error}</p>}
      {message && <p role="status" className="qa-success"><FiCheckCircle />{message}</p>}
      {!done && ready && <button className="adminAuth-button" disabled={busy}>{busy ? 'Please wait…' : reset ? 'Update password' : 'Send reset link'} <FiArrowRight /></button>}
    </form>
    {reset && !done && <p><Link to="/forgot-password">Request a new reset link</Link></p>}
    <p className="signup-link"><Link to="/login">← Back to sign in</Link></p>
  </section></main>;
}
