import { LandingPage, ApplyInstitutionPage, AcceptInvitePage } from './routeModules';
import FeaturesPage from '../../features/auth/pages/FeaturesPage';
import InstitutionGate from '../../features/institutions/components/InstitutionGate';
export const publicRoutes = [
  { path: '/', element: <LandingPage /> },
  { path: '/features', element: <FeaturesPage /> },
  { path: '/institutions/apply', element: <InstitutionGate workspaceOnly><ApplyInstitutionPage /></InstitutionGate> },
  { path: '/institutions/application-status', element: <InstitutionGate><ApplyInstitutionPage /></InstitutionGate> },
  { path: '/invitations', element: <InstitutionGate><AcceptInvitePage /></InstitutionGate> },
];
