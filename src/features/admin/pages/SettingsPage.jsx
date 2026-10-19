import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCamera,
  FiCheckCircle,
  FiChevronRight,
  FiArrowRight,
  FiLock,
  FiMail,
  FiShield,
  FiUser,
  FiHome,
  FiLogOut,
  FiTrash2,
  FiSettings,
  FiKey,
} from "react-icons/fi";
import supabase, { isDemo } from "../../../lib/supabase";
import { useAdminWorkspace } from "../context/AdminWorkspaceContext";
import InstitutionBrand from "../../../shared/components/InstitutionBrand";
import {
  updateInstitutionBranding,
  uploadInstitutionLogo,
  deleteInstitutionLogo,
} from "../../../services/institutionService";
import "../styles/settings.css";

export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    user,
    isOwner,
    isSuperAdmin,
    institutionId,
    institutionBranding,
    selectedInstitution,
    refreshBranding,
    refreshWorkspace,
    refreshUser,
  } = useAdminWorkspace();
  const canEditInstitution =
    !isDemo && Boolean(institutionId) && (isOwner || isSuperAdmin);
  const [displayName, setDisplayName] = useState(
    user.user_metadata?.full_name || "",
  );
  const [newEmail, setNewEmail] = useState(user.email || "");
  const [institutionName, setInstitutionName] = useState("");
  const [logoPath, setLogoPath] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [activeSection, setActiveSection] = useState("profile");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const role = isOwner
    ? "Platform Owner"
    : isSuperAdmin
      ? "Institution Super Admin"
      : "Staff Admin";

  useEffect(() => {
    setInstitutionName(
      institutionBranding?.name || selectedInstitution?.name || "",
    );
    setLogoPath(institutionBranding?.logo_path || null);
    setLogoFile(null);
  }, [
    institutionBranding?.name,
    institutionBranding?.logo_path,
    selectedInstitution?.id,
  ]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview("");
      return;
    }
    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  const success = (text) => setFeedback({ type: "success", text });
  const fail = (error) =>
    setFeedback({
      type: "error",
      text: error?.message || "Something went wrong. Please try again.",
    });

  async function run(action, work) {
    if (busy) return;
    setBusy(action);
    setFeedback({ type: "", text: "" });
    try {
      await work();
    } catch (error) {
      fail(error);
    } finally {
      setBusy("");
    }
  }

  function selectLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1024 * 1024 ||
      file.size === 0
    ) {
      fail(new Error("Please choose a PNG, JPG or WebP image under 1 MB."));
      return;
    }
    setLogoFile(file);
    setFeedback({ type: "", text: "" });
  }

  async function saveBranding(event) {
    event.preventDefault();
    if (!canEditInstitution) return;
    const name = institutionName.trim();
    if (name.length < 3 || name.length > 160) {
      fail(new Error("Institution name must be 3–160 characters."));
      return;
    }
    await run("branding", async () => {
      let newPath = null;
      let committed = false;
      try {
        if (logoFile)
          newPath = await uploadInstitutionLogo(institutionId, logoFile);
        const next = await updateInstitutionBranding({
          institutionId,
          name,
          logoPath: newPath || logoPath,
        });
        committed = true;
        setLogoPath(next.logo_path || null);
        setLogoFile(null);
        await Promise.allSettled([refreshWorkspace(), refreshBranding()]);
        success(
          "Institution branding saved. The new logo will also appear on student exam pages.",
        );
        // Best-effort cleanup: only delete the old image after the database commit.
        if (newPath !== logoPath && logoPath)
          deleteInstitutionLogo(logoPath).catch(() => {});
      } catch (error) {
        // Don't leave a new, unused storage object after a failed database update.
        if (newPath && !committed)
          await deleteInstitutionLogo(newPath).catch(() => {});
        throw error;
      }
    });
  }

  async function saveProfile(event) {
    event.preventDefault();
    const name = displayName.trim();
    if (name.length < 2 || name.length > 80) {
      fail(new Error("Display name must be 2–80 characters."));
      return;
    }
    await run("profile", async () => {
      if (isDemo)
        throw new Error("Profile editing is unavailable in demo mode.");
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name },
      });
      if (error) throw error;
      await refreshUser();
      success("Your display name has been updated.");
    });
  }

  async function changeEmail(event) {
    event.preventDefault();
    const email = newEmail.trim();
    if (!email || email === user.email) return;
    await run("email", async () => {
      if (isDemo) throw new Error("Email editing is unavailable in demo mode.");
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      success(
        "Email change requested. Follow the verification email before using the new address.",
      );
    });
  }

  async function changePassword(event) {
    event.preventDefault();
    if (newPassword.length < 8 || newPassword !== confirmPassword) {
      fail(
        new Error(
          "Use at least 8 characters and confirm the same new password.",
        ),
      );
      return;
    }
    await run("password", async () => {
      if (isDemo)
        throw new Error("Password changes are unavailable in demo mode.");
      if (!user.email)
        throw new Error(
          "This account has no password login email. Use the reset-password flow.",
        );
      const { data, error: verifyError } =
        await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
      if (verifyError || data.user?.id !== user.id)
        throw new Error("Current password could not be verified.");
      const { error: changeError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (changeError) throw changeError;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      const { error: signOutError } = await supabase.auth.signOut({
        scope: "global",
      });
      if (signOutError) {
        success("Password updated. Please sign out and sign back in.");
        return;
      }
      navigate("/login", { replace: true });
    });
  }

  async function signOutOtherSessions() {
    await run("sessions", async () => {
      if (isDemo)
        throw new Error("Session management is unavailable in demo mode.");
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      success("Other sessions have been signed out.");
    });
  }

  const avatarLabel = (user.user_metadata?.full_name || user.email || "QA")
    .trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "QA";

  const sections = [
    { id: "profile", label: "My profile", caption: "Your personal details", Icon: FiUser },
    { id: "email", label: "Email address", caption: "Sign-in and recovery", Icon: FiMail },
    { id: "security", label: "Password & security", caption: "Protect your account", Icon: FiShield },
    ...(!isOwner ? [{
      id: "institution", label: "Institution identity",
      caption: "Name and branding", Icon: FiHome,
    }] : []),
  ];

  function chooseSection(id) {
    setActiveSection(id);
    setFeedback({ type: "", text: "" });
  }

  return (
    <section className="qualify-settings">
      <header className="qs-page-header">
        <div className="qs-page-heading">
          <div className="qs-breadcrumb"><FiSettings aria-hidden="true" /> Account <FiChevronRight aria-hidden="true" /> Settings</div>
          <h1>Settings</h1>
          <p>Manage your account, protect your sign-in, and maintain institution identity.</p>
        </div>
        <span className="qs-role-pill"><FiShield aria-hidden="true" /> {role}</span>
      </header>

      <section className="qs-account-overview" aria-label="Signed-in account">
        <span className="qs-account-avatar" aria-hidden="true">{avatarLabel}</span>
        <div className="qs-account-summary">
          <span className="qs-summary-eyebrow">SIGNED-IN ACCOUNT</span>
          <h2>{user.user_metadata?.full_name || user.email || "Qualify administrator"}</h2>
          <p><FiMail aria-hidden="true" /> {user.email || "No email address"}</p>
        </div>
        <div className="qs-account-status">
          <span className="qs-account-status-indicator"><FiCheckCircle aria-hidden="true" /> {user.email_confirmed_at ? "Email verified" : "Account active"}</span>
          <small>Account and sign-in settings</small>
        </div>
      </section>

      <div className="qs-settings-layout">
        <nav className="qs-section-nav" aria-label="Settings sections">
          <div className="qs-nav-caption">SETTINGS MENU</div>
          <div className="qs-nav-items">
            {sections.map(({ id, label, caption, Icon }) => (
              <button key={id} type="button"
                className={activeSection === id ? "qs-nav-item is-current" : "qs-nav-item"}
                aria-pressed={activeSection === id}
                onClick={() => chooseSection(id)}>
                <span className="qs-nav-icon"><Icon aria-hidden="true" /></span>
                <span className="qs-nav-copy"><strong>{label}</strong><small>{caption}</small></span>
                <FiChevronRight className="qs-nav-chevron" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="qs-nav-footer">
            <FiShield aria-hidden="true" />
            <p>Changes to your profile and security are protected by Supabase authentication.</p>
          </div>
        </nav>

        <div className="qs-settings-main" role="region" aria-label="Settings details">
          {feedback.text && (
            <div role={feedback.type === "error" ? "alert" : "status"}
              className={`qs-notice ${feedback.type}`}>
              {feedback.type === "success" ? <FiCheckCircle aria-hidden="true" /> : <FiShield aria-hidden="true" />}
              <span>{feedback.text}</span>
            </div>
          )}

          {activeSection === "profile" && <section className="qs-content-card" aria-labelledby="qs-profile-heading">
            <div className="qs-content-head">
              <span className="qs-section-symbol"><FiUser aria-hidden="true" /></span>
              <div>
                <span className="qs-content-eyebrow">PERSONAL INFORMATION</span>
                <h2 id="qs-profile-heading">My profile</h2>
                <p>Keep your administrator identity up to date across Qualify.</p>
              </div>
            </div>
            <form onSubmit={saveProfile} className="qs-form">
              <div className="qs-form-row">
                <label className="qs-field" htmlFor="setting-name">
                  <span>Display name</span>
                  <input id="setting-name" value={displayName} minLength={2} maxLength={80}
                    autoComplete="name" required disabled={Boolean(busy) || isDemo}
                    onChange={event => setDisplayName(event.target.value)} placeholder="Your full name" />
                  <small>This name is shown to administrators in your workspace.</small>
                </label>
                <label className="qs-field" htmlFor="setting-role">
                  <span>Account role</span>
                  <input id="setting-role" value={role} readOnly className="qs-readonly" />
                  <small>Assigned through your institutional permissions.</small>
                </label>
              </div>
              <div className="qs-form-footer">
                <span><FiShield aria-hidden="true" /> Changes apply to your Qualify account.</span>
                <button className="qs-primary" type="submit" disabled={Boolean(busy) || isDemo}>
                  {busy === "profile" ? "Saving…" : "Save changes"} <FiArrowRight aria-hidden="true" />
                </button>
              </div>
            </form>
          </section>}

          {activeSection === "email" && <section className="qs-content-card" aria-labelledby="qs-email-heading">
            <div className="qs-content-head">
              <span className="qs-section-symbol"><FiMail aria-hidden="true" /></span>
              <div>
                <span className="qs-content-eyebrow">ACCOUNT ADDRESS</span>
                <h2 id="qs-email-heading">Email address</h2>
                <p>Your primary sign-in and account-recovery email.</p>
              </div>
            </div>
            <form onSubmit={changeEmail} className="qs-form">
              <label className="qs-field qs-field-wide" htmlFor="setting-email">
                <span>Account email</span>
                <input id="setting-email" type="email" autoComplete="email" required
                  value={newEmail} onChange={event => setNewEmail(event.target.value)}
                  disabled={Boolean(busy) || isDemo} />
                <small>Changing this address may require confirmation from both your current and new inboxes.</small>
              </label>
              <div className="qs-context-note"><FiShield aria-hidden="true" />
                <p>For security, your email address will only be changed after Supabase verifies the request. Your existing login remains valid until the change is confirmed.</p>
              </div>
              <div className="qs-form-footer">
                <span><FiMail aria-hidden="true" /> Verification may be required.</span>
                <button className="qs-primary" type="submit"
                  disabled={Boolean(busy) || isDemo || newEmail.trim() === user.email}>
                  {busy === "email" ? "Requesting…" : "Request email change"} <FiArrowRight aria-hidden="true" />
                </button>
              </div>
            </form>
          </section>}

          {activeSection === "security" && <div className="qs-security-stack">
            <section className="qs-content-card" aria-labelledby="qs-security-heading">
              <div className="qs-content-head">
                <span className="qs-section-symbol"><FiKey aria-hidden="true" /></span>
                <div>
                  <span className="qs-content-eyebrow">ACCOUNT SECURITY</span>
                  <h2 id="qs-security-heading">Change password</h2>
                  <p>Use a strong password that you do not share with anyone.</p>
                </div>
              </div>
              <form onSubmit={changePassword} className="qs-form">
                <label className="qs-field qs-field-wide" htmlFor="setting-current-password">
                  <span>Current password</span>
                  <input id="setting-current-password" type="password" autoComplete="current-password"
                    value={currentPassword} required disabled={Boolean(busy) || isDemo}
                    onChange={event => setCurrentPassword(event.target.value)} placeholder="Enter current password" />
                </label>
                <div className="qs-form-row">
                  <label className="qs-field" htmlFor="setting-new-password">
                    <span>New password</span>
                    <input id="setting-new-password" type="password" autoComplete="new-password"
                      minLength={8} required value={newPassword}
                      onChange={event => setNewPassword(event.target.value)}
                      disabled={Boolean(busy) || isDemo} placeholder="At least 8 characters" />
                  </label>
                  <label className="qs-field" htmlFor="setting-confirm-password">
                    <span>Confirm new password</span>
                    <input id="setting-confirm-password" type="password" autoComplete="new-password"
                      minLength={8} required value={confirmPassword}
                      onChange={event => setConfirmPassword(event.target.value)}
                      disabled={Boolean(busy) || isDemo} placeholder="Re-enter new password" />
                  </label>
                </div>
                <div className="qs-form-footer">
                  <span><FiLock aria-hidden="true" /> You'll sign in again after updating your password.</span>
                  <button type="submit" className="qs-primary" disabled={Boolean(busy) || isDemo}>
                    {busy === "password" ? "Updating…" : "Update password"} <FiArrowRight aria-hidden="true" />
                  </button>
                </div>
              </form>
            </section>
            <section className="qs-content-card qs-session-card" aria-labelledby="qs-session-heading">
              <div className="qs-session-icon"><FiLogOut aria-hidden="true" /></div>
              <div className="qs-session-copy">
                <h2 id="qs-session-heading">Other signed-in devices</h2>
                <p>Sign out other browsers and devices using this account without leaving your current session.</p>
              </div>
              <button className="qs-outline" type="button" disabled={Boolean(busy) || isDemo} onClick={signOutOtherSessions}>
                {busy === "sessions" ? "Signing out…" : "Sign out other devices"}
              </button>
            </section>
          </div>}

          {activeSection === "institution" && !isOwner && <section className="qs-content-card" aria-labelledby="qs-branding-heading">
            <div className="qs-content-head">
              <span className="qs-section-symbol"><FiHome aria-hidden="true" /></span>
              <div>
                <span className="qs-content-eyebrow">INSTITUTION IDENTITY</span>
                <h2 id="qs-branding-heading">Institution branding</h2>
                <p>Manage the institution name and logo shown in administrator and student experiences.</p>
              </div>
            </div>
            {institutionId ? <form className="qs-form" onSubmit={saveBranding}>
              <div className="qs-brand-preview">
                <span className="qs-brand-label">CURRENT IDENTITY</span>
                {logoPreview ? (
                  <div className="qs-logo-preview"><img src={logoPreview} alt="New institution logo preview" /></div>
                ) : (
                  <InstitutionBrand name={institutionName || selectedInstitution?.name}
                    logoPath={logoPath} subtitle="Institution logo" />
                )}
                <span className="qs-brand-preview-note">{logoFile ? "New logo selected — save to apply" : "Preview of your institution identity"}</span>
              </div>
              {canEditInstitution && <div className="qs-logo-controls">
                <label className="qs-logo-upload" htmlFor="setting-logo">
                  <FiCamera aria-hidden="true" /> Choose logo
                  <input id="setting-logo" type="file" accept="image/png,image/jpeg,image/webp"
                    onChange={selectLogo} disabled={Boolean(busy)} />
                </label>
                {(logoPath || logoFile) && <button type="button" className="qs-logo-remove"
                  disabled={Boolean(busy)} onClick={() => { setLogoPath(null); setLogoFile(null); }}>
                  <FiTrash2 aria-hidden="true" /> Remove logo
                </button>}
                <small>PNG, JPG or WebP · Up to 1 MB · Square images look best.</small>
              </div>}
              <label className="qs-field qs-field-wide" htmlFor="setting-institution">
                <span>Institution display name</span>
                <input id="setting-institution" minLength={3} maxLength={160} required
                  value={institutionName} onChange={event => setInstitutionName(event.target.value)}
                  readOnly={!canEditInstitution} disabled={Boolean(busy)}
                  className={!canEditInstitution ? "qs-readonly" : ""} />
                <small>{canEditInstitution ? "Visible throughout your institution's workspace." : "Only an Institution Super Admin can update institution branding."}</small>
              </label>
              {canEditInstitution && <div className="qs-form-footer">
                <span><FiHome aria-hidden="true" /> Updates will also appear on student exam pages.</span>
                <button className="qs-primary" type="submit" disabled={Boolean(busy)}>
                  {busy === "branding" ? "Saving…" : "Save institution changes"} <FiArrowRight aria-hidden="true" />
                </button>
              </div>}
            </form> : <div className="qs-empty-institution">
              <FiHome aria-hidden="true" />
              <strong>No institution selected</strong>
              <p>Select an institution workspace to view its identity settings.</p>
            </div>}
          </section>}
        </div>
      </div>
    </section>
  );
}
