import { Navigate } from 'react-router-dom';
import { useAdminWorkspace } from '../context/AdminWorkspaceContext';
export default function ManagerAccessGuard({ children, ownerOnly = false }) {
  const { canManageTeam, isOwner, canUseExams } = useAdminWorkspace();
  return (ownerOnly ? isOwner : canManageTeam) ? children : <Navigate to={canUseExams ? '/app' : '/app/account'} replace />;
}
