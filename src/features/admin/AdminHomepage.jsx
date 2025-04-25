import React, { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import "./css/AdminDashboard.css";

// Icons
import {
  FiUsers,
  FiBook,
  FiBarChart2,
  FiSettings,
  FiCalendar,
  FiMessageSquare,
  FiLogOut,
  FiMenu,
  FiX,
  FiBell,
  FiSearch,
} from "react-icons/fi";

export default function AdminHomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div
      className={`admin-dashboard ${sidebarOpen ? "" : "sidebar-collapsed"}`}
    >
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2 className="logo">QUALIFY</h2>
          <button
            className="toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>

        <nav className="nav-menu">
          <Link
            to="dashboard"
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <FiBarChart2 className="nav-icon" />
            <span className="nav-text">Dashboard</span>
          </Link>
          <Link
            to="students"
            className={`nav-item ${activeTab === "students" ? "active" : ""}`}
            onClick={() => setActiveTab("students")}
          >
            <FiUsers className="nav-icon" />
            <span className="nav-text">Students</span>
          </Link>
          <Link
            to="exams"
            className={`nav-item ${activeTab === "exams" ? "active" : ""}`}
            onClick={() => setActiveTab("exams")}
          >
            <FiBook className="nav-icon" />
            <span className="nav-text">Exams</span>
          </Link>
          <Link
            to="calender"
            className={`nav-item ${activeTab === "calendar" ? "active" : ""}`}
            onClick={() => setActiveTab("calendar")}
          >
            <FiCalendar className="nav-icon" />
            <span className="nav-text">Calendar</span>
          </Link>
          <Link
            to="messages"
            className={`nav-item ${activeTab === "messages" ? "active" : ""}`}
            onClick={() => setActiveTab("messages")}
          >
            <FiMessageSquare className="nav-icon" />
            <span className="nav-text">Messages</span>
          </Link>
          <Link
            to="settings"
            className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <FiSettings className="nav-icon" />
            <span className="nav-text">Settings</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <Link to="/logout" className="logout-btn">
            <FiLogOut className="nav-icon" />
            <span className="nav-text">Logout</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Navigation */}
        <header className="top-nav">
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input type="text" placeholder="Search..." />
          </div>
          <div className="nav-right">
            <button className="notification-btn">
              <FiBell />
              <span className="badge">5</span>
            </button>
            <div className="user-profile">
              <img
                src="https://randomuser.me/api/portraits/men/32.jpg"
                alt="Admin"
              />
              <span>Admin User</span>
            </div>
          </div>
        </header>

        {/* Render Content Based on Active Menu Item */}
        <div className="content-wrapper">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
