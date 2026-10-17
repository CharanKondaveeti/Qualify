import { Navigate } from 'react-router-dom';
import { useAdminWorkspace } from '../context/AdminWorkspaceContext';
import { isDemo } from '../../../lib/supabase';
export default function AdminStartPage(){const {institutionId,canUseExams,isOwner}=useAdminWorkspace();return <Navigate to={isDemo ? '/demo/admin/exams' : canUseExams ? `/app/i/${institutionId}/exams` : isOwner ? '/platform/institutions' : '/institutions/apply'} replace/>;}
