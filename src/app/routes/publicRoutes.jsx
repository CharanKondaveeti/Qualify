import { Navigate } from 'react-router-dom';
import { LandingPage } from './routeModules';
export const publicRoutes = [
  { path: '/', element: <LandingPage /> },
  // Preserve old bookmarks but no longer serve a separate Features page.
  { path: '/features', element: <Navigate to="/#features" replace /> },
  { path: '/institutions/apply', element: <Navigate to="/signup" replace /> },
  { path: '/institutions/application-status', element: <Navigate to="/application-status" replace /> },
];
