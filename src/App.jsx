import React from "react";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import "./App.css";
import {QueryClientProvider } from "@tanstack/react-query";
import { store } from "./store/index"; 
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ToastContainer } from "react-toastify";


// Authentication
import LoginPage from "./pages/LoginPage";
import AdminAuth from "./pages/AdminAuth";

// Tabs
import HomePage from "./pages/Homepage";
import CalendarTab from "./pages/CalenderTab";
import ExamsTab from "./pages/ExamsTab";

// Student Features
import ExamBoard from "./pages/ExamBoard";
import ExamRegistration from "./pages/ExamRegistration";

// Admin Features
import CreateNewExam from "./pages/CreateNewExam";
import { Provider } from "react-redux";
import ViewExamDetails from "./pages/ViewExamDetails";
import queryClient from "./services/queryClient";

// Create router
const router = createBrowserRouter([
  // Public Routes
  { path: "/", element: <LoginPage /> },
  { path: "/login", element: <LoginPage /> },

  // Student Routes
  { path: "/exams/:examId/student/:studentId", element: <ExamBoard /> },
  { path: "/register/exam/:examId", element: <ExamRegistration /> },
  // Admin Routes
  { path: "/admin-login", element: <AdminAuth /> },
  {
    path: "/admin",
    element: <HomePage />,
    children: [
      { index: true, element: <Navigate to="exams" /> },
      {
        path: "exams",
        element: <ExamsTab />,
        children: [{ path: "create", element: <CreateNewExam /> }],
      },
      { path: "calendar", element: <CalendarTab /> },
      { path: "exam/create", element: <CreateNewExam /> },
      {
        path: "exams/:examId",
        element: <ViewExamDetails />,
      },
    ],
  },
]);

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <div className="app-container">
          <RouterProvider router={router} />
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
