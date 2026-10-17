import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import supabase from '../../../lib/supabase';
import { getInstitutionAccess, resolveWorkspace } from '../../../services/institutionService';
import PageLoader from '../../../shared/components/PageLoader';
export default function WorkspaceEntry({account=false}) {
  const [target,setTarget] = useState('');
  const [error,setError] = useState('');
  useEffect(()=>{let active=true;(async()=>{
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user) {if(active)setTarget('/login');return;}
    const access=await getInstitutionAccess();
    if(active) {
      const target=resolveWorkspace(access);
      setTarget(account && target.startsWith('/app/i/') ? target.replace(/\/exams$/, '/settings') : target);
    }
  })().catch(e=>active&&setError(e.message));return()=>{active=false};},[account]);
  if(error) return <div className="portal-message" role="alert">{error}</div>;
  return target ? <Navigate to={target} replace /> : <PageLoader fullPage label="Opening your workspace…" />;
}
