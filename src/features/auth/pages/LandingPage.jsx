import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiBarChart2,
  FiBookOpen,
  FiCheckCircle,
  FiChevronDown,
  FiClipboard,
  FiFileText,
  FiHelpCircle,
  FiHome,
  FiLayers,
  FiMenu,
  FiPlayCircle,
  FiPlus,
  FiSettings,
  FiShield,
  FiUsers,
  FiX,
} from "react-icons/fi";
import "../styles/landing-page.css";

/**
 * Public institutional homepage. Candidate entry intentionally stays on
 * private exam URLs; the student access services/routes are not changed here.
 * The dashboard below is a static product illustration, not production data.
 */
const showcaseExams = [
  {
    title: "Midterm Assessment",
    course: "Computer Science",
    date: "16 Oct 2026",
    time: "2:30 PM",
    students: 48,
    status: "Active",
  },
  {
    title: "Unit Test 01",
    course: "Mathematics",
    date: "22 Oct 2026",
    time: "10:00 AM",
    students: 62,
    status: "Upcoming",
  },
  {
    title: "Final Examination",
    course: "Electronics",
    date: "28 Oct 2026",
    time: "9:00 AM",
    students: 0,
    status: "Draft",
  },
];

const capabilities = [
  {
    Icon: FiBookOpen,
    name: "Examination creation",
    detail: "Configure papers, timing, marks and question randomization.",
    color: "blue",
  },
  {
    Icon: FiUsers,
    name: "Student management",
    detail: "Manage registrations and monitor ongoing examinations.",
    color: "green",
  },
  {
    Icon: FiBarChart2,
    name: "Results & reporting",
    detail: "Review submissions and publish results after completion.",
    color: "purple",
  },
  {
    Icon: FiShield,
    name: "Role-based security",
    detail: "Platform, institution and staff permissions remain separated.",
    color: "orange",
  },
  {
    Icon: FiClipboard,
    name: "Question banks",
    detail: "Organize reusable questions and import examination questions.",
    color: "blue",
  },
  {
    Icon: FiCheckCircle,
    name: "Controlled staff access",
    detail: "Verify staff email ownership before granting account access.",
    color: "green",
  },
];

function QualifyBrand() {
  return (
    <Link to="/" className="qhome-brand" aria-label="QUALIFY home">
      <span className="qhome-brand-icon" aria-hidden="true">
        <FiBookOpen />
      </span>
      <span>QUALIFY</span>
    </Link>
  );
}

function DashboardPreview() {
  return (
    <div
      className="qhome-showcase"
      aria-label="Illustrative preview of a QUALIFY administrator workspace"
    >
      <div className="qhome-preview-frame">
        <aside className="qhome-preview-sidebar" aria-hidden="true">
          <strong className="qhome-preview-sidebar-brand">QUALIFY</strong>
          <span className="qhome-preview-side-item qhome-preview-side-active">
            <FiHome /> Examinations
          </span>
          <span className="qhome-preview-side-item">
            <FiClipboard /> Questions
          </span>
          <span className="qhome-preview-side-item">
            <FiUsers /> Students
          </span>
          <span className="qhome-preview-side-item">
            <FiBarChart2 /> Results
          </span>
          <span className="qhome-preview-side-separator" />
          <span className="qhome-preview-side-item">
            <FiLayers /> Institution
          </span>
          <span className="qhome-preview-side-item">
            <FiSettings /> Settings
          </span>
        </aside>
        <div className="qhome-preview-main">
          <div className="qhome-preview-topline">
            <span className="qhome-preview-sample">SAMPLE WORKSPACE</span>
            <span className="qhome-preview-institution">
              <FiBookOpen /> ABC College
            </span>
            <span className="qhome-preview-user">
              <span className="qhome-preview-avatar">A</span> Admin{" "}
              <FiChevronDown />
            </span>
          </div>
          <div className="qhome-preview-inner">
            <div className="qhome-preview-heading">
              <div>
                <h2>Examinations</h2>
                <p>Create, manage and monitor your assessments.</p>
              </div>
              <span className="qhome-preview-create">
                <FiPlus /> Create exam
              </span>
            </div>
            <div className="qhome-preview-metrics">
              <div className="qhome-preview-metric">
                <span className="qhome-preview-metric-icon blue">
                  <FiFileText />
                </span>
                <div>
                  <strong>12</strong>
                  <span>Total exams</span>
                </div>
              </div>
              <div className="qhome-preview-metric">
                <span className="qhome-preview-metric-icon green">
                  <FiUsers />
                </span>
                <div>
                  <strong>248</strong>
                  <span>Registrations</span>
                </div>
              </div>
              <div className="qhome-preview-metric">
                <span className="qhome-preview-metric-icon purple">
                  <FiBarChart2 />
                </span>
                <div>
                  <strong>8</strong>
                  <span>Completed exams</span>
                </div>
              </div>
            </div>
            <div className="qhome-preview-table-wrap">
              <table className="qhome-preview-table">
                <thead>
                  <tr>
                    <th scope="col">Title</th>
                    <th scope="col">Course</th>
                    <th scope="col">Date &amp; time</th>
                    <th scope="col">Students</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {showcaseExams.map((exam) => (
                    <tr key={exam.title}>
                      <td className="qhome-preview-exam-title">{exam.title}</td>
                      <td>{exam.course}</td>
                      <td>
                        {exam.date}
                        <small>{exam.time}</small>
                      </td>
                      <td>{exam.students}</td>
                      <td>
                        <span
                          className={`qhome-preview-status qhome-preview-status-${exam.status.toLowerCase()}`}
                        >
                          {exam.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div className="qhome-preview-note">
        <FiShield aria-hidden="true" /> Product illustration only — not live
        examination records.
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="qhome">
      <header className="qhome-topbar">
        <div className="qhome-container qhome-nav-inner">
          <QualifyBrand />
          <button
            className="qhome-menu-button"
            type="button"
            aria-controls="qhome-site-nav"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? (
              <FiX aria-hidden="true" />
            ) : (
              <FiMenu aria-hidden="true" />
            )}
          </button>
          <nav
            id="qhome-site-nav"
            aria-label="Main navigation"
            className={`qhome-nav ${menuOpen ? "qhome-nav-open" : ""}`}
          >
            <a href="#features" onClick={closeMenu}>
              Features
            </a>
            <a href="#how-it-works" onClick={closeMenu}>
              How it works
            </a>
            <Link to="/demo" onClick={closeMenu}>
              Demo
            </Link>
            <a href="#help" onClick={closeMenu}>
              Help
            </a>
            <Link
              to="/login"
              className="qhome-nav-signin qhome-mobile-signin"
              onClick={closeMenu}
            >
              Sign in <FiArrowRight aria-hidden="true" />
            </Link>
          </nav>
          <div className="qhome-nav-actions">
            <span className="qhome-nav-trust">
              <FiShield aria-hidden="true" /> Secure examination platform
            </span>
            <Link to="/login" className="qhome-nav-signin">
              Sign in <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="qhome-hero" aria-labelledby="qhome-hero-title">
          <div className="qhome-container qhome-hero-grid">
            <div className="qhome-hero-copy">
              <div className="qhome-eyebrow">
                <span className="qhome-eyebrow-line" /> EXAMINATION MANAGEMENT
                FOR INSTITUTIONS
              </div>
              <h1 id="qhome-hero-title">
                A better way to manage every examination.
              </h1>
              <p className="qhome-hero-description">
                Create assessments, organize questions, monitor student
                participation and publish results — all in one secure,
                purpose-built workspace.
              </p>
              <div className="qhome-primary-actions">
                <Link
                  className="qhome-button qhome-button-primary"
                  to="/institutions/apply"
                >
                  <FiBookOpen aria-hidden="true" /> Register your institution{" "}
                  <FiArrowRight
                    className="qhome-button-arrow"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  className="qhome-button qhome-button-secondary"
                  to="/demo"
                >
                  <FiPlayCircle aria-hidden="true" /> Explore interactive demo{" "}
                  <FiArrowRight
                    className="qhome-button-arrow"
                    aria-hidden="true"
                  />
                </Link>
              </div>
              <p className="qhome-existing">
                Already registered?{" "}
                <Link to="/login">
                  Sign in to your institution workspace{" "}
                  <FiArrowRight aria-hidden="true" />
                </Link>
              </p>
              <div
                className="qhome-confidence"
                aria-label="Key platform capabilities"
              >
                <span>
                  <FiShield aria-hidden="true" /> Controlled access
                </span>
                <span>
                  <FiUsers aria-hidden="true" /> Multi-institution ready
                </span>
                <span>
                  <FiCheckCircle aria-hidden="true" /> Structured exam workflows
                </span>
              </div>
            </div>
            <DashboardPreview />
          </div>
        </section>

        <section
          className="qhome-features"
          id="features"
          aria-labelledby="qhome-features-title"
        >
          <div className="qhome-container qhome-features-grid">
            <div className="qhome-features-intro">
              <span className="qhome-eyebrow">
                QUALIFY EXAMINATION PLATFORM
              </span>
              <h2 id="qhome-features-title">
                Built for serious institutional examinations.
              </h2>
            </div>
            {capabilities.map(({ Icon, name, detail, color }) => (
              <article className="qhome-feature-card" key={name}>
                <span
                  className={`qhome-feature-icon qhome-feature-icon-${color}`}
                >
                  <Icon aria-hidden="true" />
                </span>
                <h3>{name}</h3>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="qhome-process"
          id="how-it-works"
          aria-labelledby="qhome-process-title"
        >
          <div className="qhome-container">
            <div className="qhome-process-heading">
              <span className="qhome-eyebrow">HOW IT WORKS</span>
              <h2 id="qhome-process-title">From preparation to results in one workspace.</h2>
            </div>
            <div className="qhome-process-grid">
              <article className="qhome-process-step">
                <span className="qhome-process-number">01</span>
                <h3>Prepare the exam</h3>
                <p>Create papers from your question bank and set timing and access rules.</p>
              </article>
              <article className="qhome-process-step">
                <span className="qhome-process-number">02</span>
                <h3>Manage candidates</h3>
                <p>Register students, send private exam links and monitor participation.</p>
              </article>
              <article className="qhome-process-step">
                <span className="qhome-process-number">03</span>
                <h3>Review results</h3>
                <p>Evaluate submitted answers and publish results when the exam is complete.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="qhome-next" aria-label="Get started with QUALIFY">
          <div className="qhome-container">
            <div className="qhome-next-grid">
              <div className="qhome-next-card">
                <span className="qhome-next-icon">
                  <FiBookOpen aria-hidden="true" />
                </span>
                <div>
                  <h3>New to QUALIFY?</h3>
                  <p>
                    Apply to register your institution. Workspace access begins
                    after approval.
                  </p>
                  <Link to="/institutions/apply">
                    Register institution <FiArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <div className="qhome-next-card">
                <span className="qhome-next-icon">
                  <FiPlayCircle aria-hidden="true" />
                </span>
                <div>
                  <h3>Experience the platform</h3>
                  <p>
                    Explore sample admin tools or try an example student exam.
                  </p>
                  <Link to="/demo">
                    Open interactive demo <FiArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <div className="qhome-next-card" id="help">
                <span className="qhome-next-icon">
                  <FiHelpCircle aria-hidden="true" />
                </span>
                <div>
                  <h3>Need help getting started?</h3>
                  <p>
                    New institutions apply first; existing admins can sign in
                    directly.
                  </p>
                  <a href="#features">
                    See platform features <FiArrowRight aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="qhome-footer">
        <div className="qhome-container qhome-footer-inner">
          <span>© {new Date().getFullYear()} QUALIFY</span>
          <span>Examination management for institutions</span>
          <div>
            <a href="#features">Features</a>
            <Link to="/demo">Demo</Link>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
