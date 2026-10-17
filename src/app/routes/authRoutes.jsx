import { AdminAuthPage, PasswordRecoveryPage } from './routeModules';
import AuthCallbackPage from '../../features/auth/pages/AuthCallbackPage';
export const authRoutes = [
  { path: '/login', element: <AdminAuthPage key="login" /> },
  { path: '/signup', element: <AdminAuthPage key="signup" signup /> },
  { path: '/forgot-password', element: <PasswordRecoveryPage key="forgot" /> },
  { path: '/reset-password', element: <PasswordRecoveryPage key="reset" reset /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
];
