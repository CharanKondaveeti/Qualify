import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  FiBook,
  FiBookOpen,
  FiCalendar,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiLayers,
  FiUsers,
  FiGrid,
  FiBarChart2,
} from "react-icons/fi";
import supabase, { isDemo } from "../../../lib/supabase";
import {
  getInstitutionAccess,
  getInstitutionBranding,
  listPlatformInstitutions,
} from "../../../services/institutionService";
import InstitutionBrand from "../../../shared/components/InstitutionBrand";
import PendingStaffInviteDialog from "../../institutions/components/PendingStaffInviteDialog";
import {
  AdminWorkspaceContext,
  activeMemberships,
  workspaceStorageKey,
} from "../context/AdminWorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { resetExam } from "../../../store/newExamSlice";
import "../styles/dashboard.css";
import "../styles/integrated-admin.css";
import PageLoader from "../../../shared/components/PageLoader";
import { resetDemoData } from "../../../lib/demoClient";

export default function DashboardPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [institutionId, setInstitutionIdState] = useState(isDemo ? "demo" : "");
  const [institutionBranding, setInstitutionBranding] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { institutionId: routeInstitutionId } = useParams();
  const isPlatformArea = location.pathname.startsWith("/platform");
  const cache = useQueryClient();
  const dispatch = useDispatch();

  const refreshAccess = useCallback(
    async (userId, retainSelection = true) => {
      if (isDemo) return;
      const nextAccess = await getInstitutionAccess();
      const memberships = activeMemberships(nextAccess);
      const ownerInstitutions = nextAccess.platform_owner
        ? await listPlatformInstitutions()
        : [];
      const options = nextAccess.platform_owner
        ? ownerInstitutions.map((i) => ({
            id: i.id,
            name: i.name,
            code: i.code,
            status: i.status,
          }))
        : memberships.map((i) => ({
            id: i.institution_id,
            name: i.institution_name,
            code: i.institution_code,
            status: i.institution_status,
          }));
      setAccess(nextAccess);
      setInstitutions(options);
      const preferred = retainSelection
        ? sessionStorage.getItem(workspaceStorageKey(userId))
        : null;
      const picked =
        options.find((i) => i.id === routeInstitutionId) ||
        options.find((i) => i.id === preferred) ||
        options.find((i) =>
          memberships.some((m) => m.institution_id === i.id),
        ) ||
        options[0];
      const selectedId = picked?.id || "";
      setInstitutionIdState(selectedId);
      if (selectedId)
        sessionStorage.setItem(workspaceStorageKey(userId), selectedId);
      if (!nextAccess.platform_owner && memberships.length === 0) {
        navigate("/institutions/apply", { replace: true });
      } else if (routeInstitutionId && routeInstitutionId !== selectedId) {
        // A typed/guessed institution ID must never switch the authenticated context.
        navigate(
          nextAccess.platform_owner
            ? "/platform/institutions"
            : `/app/i/${selectedId}/exams`,
          { replace: true },
        );
      }
    },
    [navigate, routeInstitutionId],
  );

  useEffect(() => {
    let mounted = true;
    async function initialize() {
      const result = await supabase.auth.getUser();
      if (!mounted) return;
      if (!result.data?.user || result.error) {
        navigate("/login", { replace: true });
        return;
      }
      setUser(result.data.user);
      if (!isDemo) await refreshAccess(result.data.user.id);
    }
    initialize().catch((e) => {
      if (mounted)
        setError(e.message || "Could not verify your institution membership.");
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && event === "SIGNED_OUT") {
        cache.clear();
        navigate("/login", { replace: true });
      }
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [navigate, cache, refreshAccess]);

  // Reload branding whenever the institution changes (also updated after saving settings).
  const refreshBranding = useCallback(async () => {
    if (isDemo || !institutionId) {
      setInstitutionBranding(null);
      return;
    }
    setInstitutionBranding(null);
    try {
      const brand = await getInstitutionBranding(institutionId);
      setInstitutionBranding(brand);
    } catch {
      setInstitutionBranding(null);
    }
  }, [institutionId]);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  const membership = useMemo(
    () =>
      (access?.institutions || []).find(
        (i) =>
          i.institution_id === institutionId &&
          i.member_status === "active" &&
          i.institution_status === "active",
      ),
    [access, institutionId],
  );
  const selectedInstitution = institutions.find((i) => i.id === institutionId);
  const isOwner = Boolean(access?.platform_owner);
  const canUseExams = isDemo || Boolean(membership);
  const isSuperAdmin = membership?.role === "institution_super_admin";
  const canManageTeam = !isDemo && (isOwner || isSuperAdmin);

  const setInstitutionId = useCallback(
    (nextId) => {
      if (!institutions.some((i) => i.id === nextId) || !user) return;
      setInstitutionIdState(nextId);
      sessionStorage.setItem(workspaceStorageKey(user.id), nextId);
      // Erase cached institution-specific records on every tenant switch.
      cache.clear();
      dispatch(resetExam());
      navigate(`/app/i/${encodeURIComponent(nextId)}/exams`);
    },
    [institutions, user, cache, dispatch, navigate],
  );

  async function logout() {
    await supabase.auth.signOut();
    cache.clear();
    navigate("/", { replace: true });
  }
  if (error)
    return (
      <div className="portal-message" role="alert">
        <p>{error}</p>
        <button onClick={logout}>Sign out</button>
      </div>
    );
  if (!user || (!isDemo && !access))
    return <PageLoader fullPage label="Opening your workspace…" />;

  const context = {
    user,
    access,
    institutions,
    institutionId,
    selectedInstitution,
    membership,
    isOwner,
    isSuperAdmin,
    canUseExams,
    canManageTeam,
    setInstitutionId,
    institutionBranding,
    refreshBranding,
    refreshUser: async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUser(data.user);
    },
    refreshWorkspace: () => refreshAccess(user.id),
  };
  const base = isDemo
    ? "/demo/admin"
    : `/app/i/${encodeURIComponent(institutionId)}`;
  const nav = isDemo
    ? [
        [base + "/exams", "Examinations", FiBook],
        [base + "/question-banks", "Question bank", FiLayers],
      ]
    : isPlatformArea
      ? [
          ["/platform/institutions", "Institutions", FiGrid],
          ["/platform/applications", "Applications", FiUsers],
          ["/platform/settings", "Settings", FiSettings],
        ]
      : [
          ...(canUseExams
            ? [
                [base + "/exams", "Examinations", FiBook],
                [base + "/question-banks", "Question bank", FiLayers],
                [base + "/calendar", "Calendar", FiCalendar],
                [base + "/reports", "Reports", FiBarChart2],
              ]
            : []),
          ...(canManageTeam
            ? [[base + "/team", "Staff management", FiUsers]]
            : []),
          [base + "/settings", "Settings", FiSettings],
          ...(isOwner
            ? [["/platform/institutions", "Platform management", FiGrid]]
            : []),
        ];

  return (
    <AdminWorkspaceContext.Provider value={context}>
      {!isDemo && <PendingStaffInviteDialog />}
      <div
        className={`admin-dashboard ${collapsed ? "sidebar-collapsed" : ""}`}
      >
        <aside className="sidebar" aria-label="QUALIFY workspace sidebar">
          <div className="sidebar-panel">
            <div className="sidebar-header">
              <NavLink
                to="/"
                className="logo"
                aria-label="QUALIFY home"
                title="QUALIFY home"
              >
                <span className="sidebar-logo-wordmark">QUALIFY</span>
                <span className="sidebar-logo-mark" aria-hidden="true">
                  <FiBookOpen />
                </span>
              </NavLink>
              <button
                type="button"
                aria-label={
                  collapsed ? "Expand navigation" : "Collapse navigation"
                }
                aria-expanded={!collapsed}
                title={collapsed ? "Expand navigation" : "Collapse navigation"}
                className="toggle-btn"
                onClick={() => setCollapsed((value) => !value)}
              >
                <FiMenu aria-hidden="true" />
              </button>
            </div>
            <nav className="nav-menu" aria-label="Workspace navigation">
              {nav.map(([path, label, Icon], index) => (
                <div className="sidebar-nav-group" key={path}>
                  {(label === "Staff management" ||
                    label === "Settings" ||
                    label === "Platform management") &&
                    (index === 0 ||
                      ![
                        "Staff management",
                        "Settings",
                        "Platform management",
                      ].includes(nav[index - 1][1])) && (
                      <div className="sidebar-nav-divider" aria-hidden="true" />
                    )}
                  <NavLink
                    aria-label={label}
                    title={collapsed ? label : undefined}
                    to={path}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? "active" : ""}`
                    }
                  >
                    {createElement(Icon, {
                      className: "nav-icon",
                      "aria-hidden": true,
                    })}
                    <span className="nav-text">{label}</span>
                  </NavLink>
                </div>
              ))}
            </nav>
            <div className="sidebar-footer">
              <button
                type="button"
                title="Sign out"
                aria-label="Sign out"
                className="logout-btn"
                onClick={logout}
              >
                <FiLogOut className="nav-icon" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </aside>
        <main className="main-content">
          <header className="top-nav workspace-top-nav">
            <div className="integrated-top-left workspace-heading">
              <InstitutionBrand
                name={
                  institutionBranding?.name ||
                  selectedInstitution?.name ||
                  (isDemo
                    ? "Demo institution"
                    : isPlatformArea
                      ? "QUALIFY Platform"
                      : "Institution workspace")
                }
                logoPath={institutionBranding?.logo_path}
                subtitle="Examination Portal"
              />
            </div>
            <div className="user-profile workspace-profile">
              {!isDemo && institutions.length > 1 && !isPlatformArea && (
                <label className="workspace-institution-switch">
                  Institution{" "}
                  <select
                    aria-label="Switch institution"
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                  >
                    {institutions.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <span className="integrated-role">
                <span className="workspace-role-dot" />
                {isOwner
                  ? "Platform Owner"
                  : isSuperAdmin
                    ? "Super Admin"
                    : "Staff Admin"}
              </span>
              <span className="avatar workspace-avatar">
                {(user.user_metadata?.full_name || user.email || "A")
                  .charAt(0)
                  .toUpperCase()}
              </span>
              <span className="workspace-user-name">
                {user.user_metadata?.full_name || user.email}
              </span>
            </div>
          </header>
          <div className="content-wrapper">
            {isDemo && (
              <div className="demo-banner">
                <span>
                  <strong>Live demo</strong> · Sample data, saved in this
                  browser
                </span>
                <div className="qualify-demo-actions">
                  <NavLink to="/demo/student/exam">Try student view →</NavLink>
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => {
                      resetDemoData();
                      window.location.reload();
                    }}
                  >
                    Reset demo
                  </button>
                </div>
              </div>
            )}
            {!isDemo && !selectedInstitution && isOwner && (
              <div className="ops-panel">
                Create your first institution from the Institutions tab.
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </AdminWorkspaceContext.Provider>
  );
}
