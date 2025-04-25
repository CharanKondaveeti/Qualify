// LoginPage.js
import React from "react";
import { Link } from "react-router-dom";
import "./css/loginPage.css";

export default function LoginPage() {
  return (
    <div className="loginpage-container">
      <div className="loginpage-header">
        <div className="loginpage-logo">
          <h1 className="loginpage-logo-text">QUALIFY</h1>
        </div>
        <h1 className="loginpage-title">Examination Portal</h1>
        <p className="loginpage-subtitle">
          Prove your knowledge, achieve excellence
        </p>
      </div>

      <div className="loginpage-cards">
        <div className="loginpage-card loginpage-student-card">
          <div className="loginpage-card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </div>
          <h2>Student Login</h2>
          <p>Access your exams, results, and learning dashboard</p>
          <Link
            to="/student-login"
            className="loginpage-button loginpage-student-button"
          >
            Enter Exam Hall
          </Link>
        </div>

        <div className="loginpage-card loginpage-admin-card">
          <div className="loginpage-card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11V11.99z" />
            </svg>
          </div>
          <h2>Admin Login</h2>
          <p>Manage examinations, questions, and student results</p>
          <Link
            to="/admin-login"
            className="loginpage-button loginpage-admin-button"
          >
            Access Exam Panel
          </Link>
        </div>
      </div>

      <div className="loginpage-footer">
        <p>
          Ready to <span className="loginpage-highlight">qualify</span> your
          future?
        </p>
      </div>
    </div>
  );
}
