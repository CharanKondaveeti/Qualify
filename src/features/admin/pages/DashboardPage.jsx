import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  NavLink,
  Outlet,
  useBlocker,
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
import { publishStagedInstitutionLogo } from "../../../services/institutionSignupService";
import { staffSetupStatus } from "../../../services/staffOnboardingService";
import { useAppDialog } from "../../../shared/components/ConfirmDialogProvider";
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
  const dialog = useAppDialog();
  const signingOutRef = useRef(false);

  // Browser history Back/Forward is deliberate in a signed-in workspace.
  // Regular menu links and buttons stay immediate; these are PUSH/REPLACE.
  const historyBlocker = useBlocker(
    ({ currentLocation, nextLocation, historyAction }) =>
      !isDemo &&
      Boolean(user) &&
      historyAction === "POP" &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search ||
        currentLocation.hash !== nextLocation.hash),
  );
  const historyBlockerRef = useRef(historyBlocker);
  const dialogRef = useRef(dialog);

  useEffect(() => {
    historyBlockerRef.current = historyBlocker;
    dialogRef.current = dialog;
  }, [historyBlocker, dialog]);

  useEffect(() => {
    if (historyBlocker.state !== "blocked") return;
    let disposed = false;
    dialogRef.current.confirm(
      "Are you sure you want to leave this page? You will remain signed in unless you sign out.",
      { title: "Leave this page?", confirmLabel: "Continue" },
    ).then((approved) => {
      if (disposed) return;
      if (approved) historyBlockerRef.current.proceed();
      else historyBlockerRef.current.reset();
    });
    return () => { disposed = true; };
    // The dialog must open only once per blocked history transition.
  }, [historyBlocker.state]);

  // Browsers require their own (browser-controlled) warning for reloads,
  // closing the tab, and going to another origin. Custom text is not supported.
  useEffect(() => {
    if (isDemo || !user) return;
    const warnBeforeUnload = (event) => {
      if (signingOutRef.current) return;
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [user]);

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
      if(!isDemo && await staffSetupStatus()) {navigate("/staff/set-password",{replace:true});return;}
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
    if (isDemo || isPlatformArea || !institutionId) {
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
  }, [institutionId, isPlatformArea]);

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

  // A logo chosen during institution registration is staged locally while
  // ownership is pending. Publish it automatically after Platform Owner approval.
  const logoPublishAttempted = useRef(new Set());
  useEffect(() => {
    const requestedCode = user?.user_metadata?.pending_institution_application?.code;
    // Never transfer a staged logo to a different institution on a shared account.
    if (isDemo || !isSuperAdmin || !institutionId || !user?.email ||
        !requestedCode || selectedInstitution?.code !== requestedCode ||
        logoPublishAttempted.current.has(institutionId)) return;
    logoPublishAttempted.current.add(institutionId);
    publishStagedInstitutionLogo(institutionId, user.email)
      .then(published => {if (published) refreshBranding();})
      .catch(err => console.warn("Signup logo can be uploaded from Settings:",err.message));
  }, [institutionId,isSuperAdmin,selectedInstitution?.code,user?.email,user?.user_metadata?.pending_institution_application?.code,refreshBranding]);


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
    signingOutRef.current = true;
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      cache.clear();
      navigate("/", { replace: true });
    } catch (e) {
      signingOutRef.current = false;
      setError(e.message || "Could not sign out. Please try again.");
    }
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
  const logoDestination = isPlatformArea
    ? "/platform/institutions"
    : canUseExams
      ? `${base}/exams`
      : isOwner
        ? "/platform/institutions"
        : `${base}/settings`;
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
                to={logoDestination}
                className="logo"
                aria-label="QUALIFY Examinations"
                title="Back to Examinations"
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
                name={isPlatformArea ? "QUALIFY Platform" : (
                  institutionBranding?.name || selectedInstitution?.name ||
                  (isDemo ? "Demo institution" : "Institution workspace")
                )}
                logoPath={isPlatformArea ? null : institutionBranding?.logo_path}
                subtitle={isPlatformArea ? "Platform administration" : "Examination Portal"}
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
