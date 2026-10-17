import { Link, Navigate } from 'react-router-dom';
import { DashboardPage, ExamsPage, ExamDetailsPage, QuestionBankPage, CreateExamPage, ExamPage, ResultsPage } from './routeModules';
import DemoLandingPage from '../../features/demo/pages/DemoLandingPage';
import DemoOnly from '../../features/demo/components/DemoOnly';
import DemoQuestionBankPage from '../../features/demo/pages/DemoQuestionBankPage';
import DemoStudentEntry from "../../features/demo/pages/DemoStudentEntry";
export const demoRoutes = [
  { path: "/demo", element: <DemoLandingPage /> },
  {
    path: "/demo/admin",
    element: (
      <DemoOnly>
        <DashboardPage />
      </DemoOnly>
    ),
    children: [
      { index: true, element: <Navigate to="exams" replace /> },
      { path: "exams", element: <ExamsPage /> },
      { path: "exams/new", element: <CreateExamPage /> },
      { path: "exams/:examId", element: <Navigate to="students" replace /> },
      { path: "exams/:examId/:tab", element: <ExamDetailsPage /> },
      { path: "question-banks", element: <DemoQuestionBankPage /> },
    ],
  },
  {
    path: "/demo/student",
    element: <DemoStudentEntry />,
  },
  {
    path: "/demo/student",
    element: <DemoStudentEntry />,
  },
  {
    path: "/demo/student/exam",
    element: (
      <DemoOnly>
        <ExamPage demoExamId="demo-active" demoStudentId="demo-student" />
      </DemoOnly>
    ),
  },
  {
    path: "/demo/student/result",
    element: (
      <DemoOnly>
        <ResultsPage demoStudentId="demo-student" />
      </DemoOnly>
    ),
  },
];
