import { AdminAuthPage, PasswordRecoveryPage } from './routeModules';
import AuthCallbackPage from '../../features/auth/pages/AuthCallbackPage';
import StaffFirstPasswordPage from '../../features/auth/pages/StaffFirstPasswordPage';
import InstitutionRegistrationPage from '../../features/institutions/pages/InstitutionRegistrationPage';
import InstitutionActivationPage from '../../features/institutions/pages/InstitutionActivationPage';
export const authRoutes = [
  { path: '/login', element: <AdminAuthPage key="login" /> },
  { path: '/signup', element: <InstitutionRegistrationPage /> },
  { path: '/application-status', element: <InstitutionRegistrationPage statusOnly /> },
  { path: '/activate', element: <InstitutionActivationPage /> },
  { path: '/forgot-password', element: <PasswordRecoveryPage key="forgot" /> },
  { path: '/reset-password', element: <PasswordRecoveryPage key="reset" reset /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  { path: '/staff/set-password', element: <StaffFirstPasswordPage /> },
];
