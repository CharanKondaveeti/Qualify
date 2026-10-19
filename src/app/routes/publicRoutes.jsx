import { Navigate } from 'react-router-dom';
import { LandingPage, ApplyInstitutionPage } from './routeModules';
import InstitutionGate from '../../features/institutions/components/InstitutionGate';
const newRegistration = import.meta.env.VITE_INSTITUTION_REGISTRATION_V2 === 'true';
export const publicRoutes = [
  { path: '/', element: <LandingPage /> },
  // Preserve old bookmarks but no longer serve a separate Features page.
  { path: '/features', element: <Navigate to="/#features" replace /> },
  { path: '/institutions/apply', element: newRegistration ? <Navigate to="/signup" replace /> : <InstitutionGate workspaceOnly><ApplyInstitutionPage /></InstitutionGate> },
  { path: '/institutions/application-status', element: newRegistration ? <Navigate to="/application-status" replace /> : <InstitutionGate><ApplyInstitutionPage /></InstitutionGate> },
];
