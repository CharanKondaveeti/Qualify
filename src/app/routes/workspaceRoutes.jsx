import { Navigate } from 'react-router-dom';
import { DashboardPage, AdminStartPage, ExamsPage, CreateExamPage, ExamDetailsPage, QuestionBankPage, CalendarPage, ReportsPage, TeamPage, SettingsPage } from './routeModules';
import AdminRouteGuard from '../../features/admin/components/AdminRouteGuard';
import WorkspaceEntry from '../../features/admin/components/WorkspaceEntry';
const protectedPage = (perm, page) => <AdminRouteGuard permission={perm}>{page}</AdminRouteGuard>;
export const workspaceRoutes = [
  { path: '/app', element: <WorkspaceEntry /> },
  { path: '/app/i/:institutionId', element: <DashboardPage />, children: [
    { index: true, element: <AdminStartPage /> },
    { path: 'exams', element: protectedPage('exams', <ExamsPage />) },
    { path: 'exams/new', element: protectedPage('exams', <CreateExamPage />) },
    { path: 'exams/:examId', element: <Navigate to="students" replace /> },
    { path: 'exams/:examId/:tab', element: protectedPage('exams', <ExamDetailsPage />) },
    { path: 'question-banks', element: protectedPage('exams', <QuestionBankPage />) },
    { path: 'calendar', element: protectedPage('exams', <CalendarPage />) },
    { path: 'reports', element: protectedPage('exams', <ReportsPage />) },
    { path: 'team', element: protectedPage('institutionAdmin', <TeamPage />) },
    { path: 'team/invitations', element: protectedPage('institutionAdmin', <TeamPage />) },
    { path: 'settings', element: <SettingsPage /> },
  ] },
  { path: '/app/account', element: <WorkspaceEntry account /> },
];
