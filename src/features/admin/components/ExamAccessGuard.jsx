import { Navigate } from 'react-router-dom';
import { useAdminWorkspace } from '../context/AdminWorkspaceContext';
export default function ExamAccessGuard({ children }) {
  const { canUseExams, isOwner } = useAdminWorkspace();
  return canUseExams ? children : <Navigate replace to={isOwner ? '/platform/institutions' : '/institutions/apply'} />;
}
