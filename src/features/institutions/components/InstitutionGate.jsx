import PageLoader from "../../../shared/components/PageLoader";
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import supabase, { isDemo } from '../../../lib/supabase';
import { getInstitutionAccess } from '../../../services/institutionService';
import PendingStaffInviteDialog from './PendingStaffInviteDialog';

export default function InstitutionGate({ role = 'any', workspaceOnly = false, children }) {
  const [result, setResult] = useState(null);
  const location = useLocation();
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) { if (active) setResult({ state: 'login' }); return; }
      try {
        const access = await getInstitutionAccess();
        if (active) setResult({ state: 'ready', access, user });
      } catch (err) {
        if (active) setResult({ state: 'error', message: err.message });
      }
    })();
    return () => { active = false; };
  }, [location.pathname, location.search, location.hash]);
  if (isDemo) return <div className="portal-message">Open this page outside the demo to access your institution.</div>;
  if (!result) return <PageLoader fullPage label="Checking your account…" />;
  if (result.state === 'login') {
    const next = location.pathname === '/invitations'
      ? `?next=${encodeURIComponent(location.pathname + location.search)}` : '';
    return <Navigate to={`/login${next}`} replace />;
  }
  if (result.state === 'error') return <div className="portal-message" role="alert">{result.message}<p>Confirm Phase 1 SQL was installed before Phase 2.</p></div>;
  if (workspaceOnly && result.access.platform_owner) return <Navigate to="/platform/institutions" replace />;
  if (workspaceOnly && (result.access.institutions || []).some(i =>
    i.member_status === 'active' && i.institution_status === 'active'
  )) return <Navigate to="/app" replace />;
  if (role === 'owner' && !result.access.platform_owner) return <Navigate to="/app" replace />;
  if (role === 'member' && !result.access.platform_owner && !(result.access.institutions || []).some(i =>
    i.member_status === 'active' && i.institution_status === 'active')) return <Navigate to="/institutions/apply" replace />;
  return <>{location.pathname !== '/invitations' && <PendingStaffInviteDialog />}{children}</>;
}
