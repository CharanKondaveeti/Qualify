import { Navigate, useParams, useLocation } from 'react-router-dom';
import { useAdminWorkspace } from '../context/AdminWorkspaceContext';
import { isDemo } from '../../../lib/supabase';
import PageLoader from '../../../shared/components/PageLoader';
export default function AdminRouteGuard({permission,children}) {
  const w=useAdminWorkspace(); const {institutionId}=useParams(); const loc=useLocation();
  if (isDemo) return children;
  if (institutionId && w.institutionId !== institutionId) return <PageLoader label="Checking institution access…" />;
  const can = permission==='platformOwner' ? w.isOwner
    : permission==='institutionAdmin' ? (w.isOwner || w.isSuperAdmin)
    : permission==='exams' ? w.canUseExams : false;
  if (can && (permission==='platformOwner' ? loc.pathname.startsWith('/platform/') : !loc.pathname.startsWith('/platform/'))) return children;
  return <Navigate to={w.isOwner ? '/platform/institutions' : w.canUseExams ? `/app/i/${w.institutionId}/exams` : '/institutions/apply'} replace />;
}
