import { AdminAuthPage, PasswordRecoveryPage } from './routeModules';
import AuthCallbackPage from '../../features/auth/pages/AuthCallbackPage';
import StaffFirstPasswordPage from '../../features/auth/pages/StaffFirstPasswordPage';
import InstitutionRegistrationPage from '../../features/institutions/pages/InstitutionRegistrationPage';
import InstitutionActivationPage from '../../features/institutions/pages/InstitutionActivationPage';
const newRegistration = import.meta.env.VITE_INSTITUTION_REGISTRATION_V2 === 'true';
export const authRoutes = [
  { path: '/login', element: <AdminAuthPage key="login" /> },
  { path: '/signup', element: newRegistration ? <InstitutionRegistrationPage /> : <AdminAuthPage key="signup" signup /> },
  { path: '/application-status', element: newRegistration ? <InstitutionRegistrationPage statusOnly /> : <AdminAuthPage key="signup" signup /> },
  { path: '/activate', element: newRegistration ? <InstitutionActivationPage /> : <AdminAuthPage key="login" /> },
  { path: '/forgot-password', element: <PasswordRecoveryPage key="forgot" /> },
  { path: '/reset-password', element: <PasswordRecoveryPage key="reset" reset /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  { path: '/staff/set-password', element: <StaffFirstPasswordPage /> },
];
