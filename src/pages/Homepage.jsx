import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import "./css/adminDashboard.css";
import supabase from "../services/supabase";

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
  const [activeTab, setActiveTab] = useState("exams");
  const [adminName, setAdminName] = useState(""); 
  const navigate = useNavigate();

  // ✅ Check if user is logged in and fetch name
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/admin-login");
      } else {
        const user = data.session.user;
        // Get name from user_metadata or email fallback
        setAdminName(user.user_metadata?.full_name || user.email);
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/admin-login");
        } else {
          const user = session.user;
          setAdminName(user.user_metadata?.full_name || user.email);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  // ✅ Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-login");
  };

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
            to="exams"
            className={`nav-item ${activeTab === "exams" ? "active" : ""}`}
            onClick={() => setActiveTab("exams")}
          >
            <FiBook className="nav-icon" />
            <span className="nav-text">Exams</span>
          </Link>
          <Link
            to="calendar"
            className={`nav-item ${activeTab === "calendar" ? "active" : ""}`}
            onClick={() => setActiveTab("calendar")}
          >
            <FiCalendar className="nav-icon" />
            <span className="nav-text">Calendar</span>
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
          <button onClick={handleLogout} className="logout-btn">
            <FiLogOut className="nav-icon" />
            <span className="nav-text">Logout</span>
          </button>
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
              <span>{adminName || "Admin"}</span>
            </div>
          </div>
        </header>

        <div className="content-wrapper">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
