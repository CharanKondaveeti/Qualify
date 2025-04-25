import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./css/StudentLogin.css";

export default function StudentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ email, password, rememberMe });
  };

  return (
    <div className="studentLoginContainer">
      <div className="studentLoginCard">
        <div className="studentLoginHeader">
          <div className="studentLoginLogo">
            <h1 className="studentLoginLogoText">QUALIFY</h1>
            <p className="studentLoginLogoSubtext">
              Student Examination Portal
            </p>
          </div>
          <h2>Welcome Back, Student!</h2>
          <p>Enter your credentials to access your exams</p>
        </div>

        <form onSubmit={handleSubmit} className="studentLoginForm">
          <div className="studentLoginInputGroup">
            <label htmlFor="email">Student Email</label>
            <div className="studentLogin-inputContainer">
              <svg className="studentLoginInputIcon" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
              <input
                type="email"
                id="email"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="studentLoginInputGroup">
            <label htmlFor="password">Password</label>
            <div className="studentLogin-inputContainer">
              <svg className="studentLoginInputIcon" viewBox="0 0 24 24">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="studentLoginOptions">
            <label className="studentLoginRememberMe">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
              />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="studentLoginForgotPassword">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="studentLoginButton">
            Sign In
          </button>

          <p className="studentLoginSignupLink">
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
