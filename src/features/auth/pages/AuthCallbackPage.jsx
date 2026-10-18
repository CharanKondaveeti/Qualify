import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import supabase from '../../../lib/supabase';
import { getInstitutionAccess, resolveWorkspace } from '../../../services/institutionService';
import PageLoader from '../../../shared/components/PageLoader';
import { submitPendingInstitution } from '../../../services/institutionSignupService';
export default function AuthCallbackPage(){
  const [target,setTarget]=useState(''); const [error,setError]=useState('');
  useEffect(()=>{let current=true;(async()=>{
    // SDK processes URL fragments/PKCE redirects; getSession awaits initialization.
    const {data,error:authError}=await supabase.auth.getSession();
    if(authError) throw authError;
    if(!data?.session) { if(current)setTarget('/login'); return; }
    try { await submitPendingInstitution(); } catch (err) {
      sessionStorage.setItem("qualify-pending-application-error", err.message);
    }
    const access=await getInstitutionAccess();
    if(current)setTarget(resolveWorkspace(access));
  })().catch(e=>current&&setError(e.message));return()=>{current=false};},[]);
  if(error) return <main className="portal-message" role="alert"><h1>Could not finish signing in</h1><p>{error}</p><a href="/login">Return to sign in</a></main>;
  return target?<Navigate to={target} replace/>:<PageLoader fullPage label="Verifying your account…" />;
}
