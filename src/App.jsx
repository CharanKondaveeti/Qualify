import React from "react";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

// Pages
import LoginPage from "./pages/LoginPage";
import StudentLogin from "./pages/StudentLogin";
import AdminAuth from "./pages/AdminAuth";

// Student Features
import ExamBoard from "./features/student/ExamBoard";
import ExamRegistration from "./features/student/ExamRegistration";

// Admin Features
import AdminDashboard from "./features/admin/AdminDashBoard";
import AdminHomePage from "./features/admin/AdminHomepage";
import ExamsTab from "./features/admin/ExamsTab";
import CalendarTab from "./features/admin/CalenderTab";
import StudentsTab from "./features/admin/StudentsTab";
import { Provider } from "react-redux";
import { store } from "./store";

// Create router
const router = createBrowserRouter([
  // Public Routes
  { path: "/", element: <LoginPage /> },
  { path: "/login", element: <LoginPage /> },

  // Student Routes
  { path: "/student-login", element: <StudentLogin /> },
  { path: "/examBoard", element: <ExamBoard /> },
  { path: "/register/exam/:examId", element: <ExamRegistration /> },

  // Admin Routes
  { path: "/admin-login", element: <AdminAuth /> },
  {
    path: "/admin",
    element: <AdminHomePage />,
    children: [
      { index: true, element: <Navigate to="dashboard" /> },
      { path: "dashboard", element: <AdminDashboard /> },
      { path: "exams", element: <ExamsTab /> },
      { path: "calender", element: <CalendarTab /> },
      { path: "students", element: <StudentsTab /> },
    ],
  },
]);

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <div className="app-container">
          <RouterProvider router={router} />
        </div>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
