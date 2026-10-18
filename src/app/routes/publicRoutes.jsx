import { Navigate } from 'react-router-dom';
import { LandingPage, ApplyInstitutionPage } from './routeModules';
import InstitutionGate from '../../features/institutions/components/InstitutionGate';
export const publicRoutes = [
  { path: '/', element: <LandingPage /> },
  // Preserve old bookmarks but no longer serve a separate Features page.
  { path: '/features', element: <Navigate to="/#features" replace /> },
  { path: '/institutions/apply', element: <InstitutionGate workspaceOnly><ApplyInstitutionPage /></InstitutionGate> },
  { path: '/institutions/application-status', element: <InstitutionGate><ApplyInstitutionPage /></InstitutionGate> },
];
