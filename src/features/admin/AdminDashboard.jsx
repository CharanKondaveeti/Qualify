import React, { useState } from "react";
import { Link } from "react-router-dom";
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

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Sample data
  const stats = [
    {
      title: "Total Students",
      value: "2,453",
      icon: <FiUsers />,
      color: "#4A6BFF",
    },
    { title: "Active Exams", value: "12", icon: <FiBook />, color: "#00C896" },
    {
      title: "Pending Results",
      value: "84",
      icon: <FiBarChart2 />,
      color: "#FF6B6B",
    },
    {
      title: "New Messages",
      value: "23",
      icon: <FiMessageSquare />,
      color: "#FF8E53",
    },
  ];

  const recentExams = [
    {
      id: 1,
      name: "Midterm Mathematics",
      date: "2023-06-15",
      status: "Active",
    },
    { id: 2, name: "Final Physics", date: "2023-06-20", status: "Upcoming" },
    { id: 3, name: "Chemistry Quiz", date: "2023-06-10", status: "Completed" },
    { id: 4, name: "Biology Test", date: "2023-06-05", status: "Completed" },
  ];

  const recentStudents = [
    {
      id: 1,
      name: "Alex Johnson",
      email: "alex@university.edu",
      lastActive: "2 hours ago",
    },
    {
      id: 2,
      name: "Sarah Williams",
      email: "sarah@university.edu",
      lastActive: "1 day ago",
    },
    {
      id: 3,
      name: "Michael Brown",
      email: "michael@university.edu",
      lastActive: "3 days ago",
    },
    {
      id: 4,
      name: "Emily Davis",
      email: "emily@university.edu",
      lastActive: "1 week ago",
    },
  ];

  return (
    <div
      className={`admin-dashboard ${sidebarOpen ? "" : "sidebar-collapsed"}`}
    >
      {/* Main Content */}
      <div className="main-content">
        {/* Dashboard Content */}
        <div className="content-wrapper">
          <h1 className="page-title">Dashboard Overview</h1>

          {/* Stats Cards */}
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div className="stat-card" key={index}>
                <div
                  className="stat-icon"
                  style={{
                    backgroundColor: `${stat.color}20`,
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </div>
                <div className="stat-info">
                  <h3>{stat.value}</h3>
                  <p>{stat.title}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Exams */}
          <div className="content-section">
            <div className="section-header">
              <h2>Recent Exams</h2>
              <Link to="#" className="view-all">
                View All
              </Link>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Exam Name</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExams.map((exam) => (
                    <tr key={exam.id}>
                      <td>{exam.name}</td>
                      <td>{exam.date}</td>
                      <td>
                        <span
                          className={`status-badge ${exam.status.toLowerCase()}`}
                        >
                          {exam.status}
                        </span>
                      </td>
                      <td>
                        <button className="action-btn">Manage</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Students */}
          <div className="content-section">
            <div className="section-header">
              <h2>Recent Students</h2>
              <Link to="#" className="view-all">
                View All
              </Link>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Last Active</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudents.map((student) => (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td>{student.lastActive}</td>
                      <td>
                        <button className="action-btn">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
