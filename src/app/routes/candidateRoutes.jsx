import { ExamPage, ExamRegistrationPage, ResultsPage } from './routeModules';
import CandidateInstructionsPage from '../../features/student/pages/CandidateInstructionsPage';
import CandidateSubmittedPage from '../../features/student/pages/CandidateSubmittedPage';
export const candidateRoutes = [
  { path:'/join/:examId', element: <ExamRegistrationPage /> },
  { path:'/candidate/exams/:examId/instructions', element: <CandidateInstructionsPage /> },
  { path:'/candidate/exams/:examId/attempts/:studentId', element: <ExamPage /> },
  { path:'/candidate/attempts/:studentId/submitted', element: <CandidateSubmittedPage /> },
  { path:'/candidate/results/:studentId', element: <ResultsPage /> },
];
