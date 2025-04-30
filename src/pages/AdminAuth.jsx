import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/adminAuth.css";
import { loginAdmin, signupAdmin } from "../services/admin";

export default function AdminAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      await loginAdmin(email, password);
      navigate("/admin"); 
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    try {
      await signupAdmin(email, password, name);
      alert("Signup successful! Please check your email to confirm.");
      setIsLogin(true); 
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="adminAuth-container">
      <div className="adminAuth-card">
        <h1 className="adminAuth-logo-text">QUALIFY</h1>
        <p className="adminAuth-logo-subtext">
          {isLogin ? "Admin Login" : "Admin Signup"}
        </p>

        <form
          onSubmit={isLogin ? handleLogin : handleSignup}
          className="adminAuth-form"
        >
          {!isLogin && (
            <div className="adminAuth-input-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="adminAuth-input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="adminAuth-input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div className="adminAuth-input-group">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="********"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          {errorMsg && <p className="adminAuth-error">{errorMsg}</p>}

          <button type="submit" className="adminAuth-button">
            {isLogin ? "Sign In" : "Sign Up"}
          </button>

          <p className="signup-link">
            {isLogin ? "Don’t have an account? " : "Already have an account? "}
            <span onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Sign Up" : "Sign In"}
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}
