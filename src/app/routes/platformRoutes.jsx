import { Navigate } from 'react-router-dom';
import { DashboardPage, InstitutionsPage, SettingsPage } from './routeModules';
import AdminRouteGuard from '../../features/admin/components/AdminRouteGuard';
import PlatformApplicationsPage from '../../features/admin/pages/PlatformApplicationsPage';
import PlatformInstitutionPage from '../../features/admin/pages/PlatformInstitutionPage';
export const platformRoutes = [{ path: '/platform', element: <DashboardPage />, children: [
  { index: true, element: <Navigate to="institutions" replace /> },
  { path: 'institutions/:institutionId', element: <AdminRouteGuard permission="platformOwner"><PlatformInstitutionPage /></AdminRouteGuard> },
  { path: 'institutions', element: <AdminRouteGuard permission="platformOwner"><InstitutionsPage /></AdminRouteGuard> },
  { path: 'applications/:applicationId', element: <AdminRouteGuard permission="platformOwner"><PlatformApplicationsPage /></AdminRouteGuard> },
  { path: 'applications', element: <AdminRouteGuard permission="platformOwner"><PlatformApplicationsPage /></AdminRouteGuard> },
  { path: 'settings', element: <AdminRouteGuard permission="platformOwner"><SettingsPage /></AdminRouteGuard> },
]}];
