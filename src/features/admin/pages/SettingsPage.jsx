import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCamera,
  FiCheckCircle,
  FiLock,
  FiMail,
  FiShield,
  FiUser,
  FiHome,
  FiLogOut,
  FiTrash2,
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

  return (
    <section className="qualify-settings">
      <header className="qualify-settings-title">
        <span className="qualify-settings-eyebrow">YOUR WORKSPACE</span>
        <h1>Settings</h1>
        <p>Manage your profile, account security and institution identity.</p>
      </header>

      {feedback.text && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`qualify-settings-message ${feedback.type}`}
        >
          {feedback.type === "success" ? <FiCheckCircle /> : <FiShield />}
          {feedback.text}
        </div>
      )}

      <div className="qualify-settings-grid">
        <div className="qualify-settings-stack">
          <section className="qualify-settings-panel">
            <div className="qualify-settings-panel-title">
              <span className="qualify-settings-icon">
                <FiUser />
              </span>
              <div>
                <h2>My profile</h2>
                <p>Your personal administrator details</p>
              </div>
            </div>
            <form onSubmit={saveProfile} className="qualify-settings-form">
              <label htmlFor="setting-name">Display name</label>
              <input
                id="setting-name"
                value={displayName}
                maxLength={80}
                minLength={2}
                required
                disabled={Boolean(busy) || isDemo}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <label htmlFor="setting-role">Account role</label>
              <input
                id="setting-role"
                readOnly
                value={role}
                className="qualify-settings-readonly"
              />
              <div className="qualify-settings-actions">
                <button type="submit" disabled={Boolean(busy) || isDemo}>
                  {busy === "profile" ? "Saving…" : "Save profile"}
                </button>
              </div>
            </form>
          </section>

          <section className="qualify-settings-panel">
            <div className="qualify-settings-panel-title">
              <span className="qualify-settings-icon">
                <FiLock />
              </span>
              <div>
                <h2>Security</h2>
                <p>Keep your account safe</p>
              </div>
            </div>
            <form className="qualify-settings-form" onSubmit={changePassword}>
              <h3>Change password</h3>
              <label htmlFor="setting-current-password">Current password</label>
              <input
                id="setting-current-password"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={Boolean(busy) || isDemo}
              />
              <label htmlFor="setting-new-password">New password</label>
              <input
                id="setting-new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={Boolean(busy) || isDemo}
              />
              <label htmlFor="setting-confirm-password">
                Confirm new password
              </label>
              <input
                id="setting-confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={Boolean(busy) || isDemo}
              />
              <div className="qualify-settings-actions">
                <button disabled={Boolean(busy) || isDemo}>
                  {busy === "password" ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
            <div className="qualify-settings-subsection">
              <FiShield />
              <div>
                <strong>Other devices</strong>
                <p>Sign out any other device currently using your account.</p>
              </div>
              <button
                className="qualify-settings-secondary"
                type="button"
                disabled={Boolean(busy) || isDemo}
                onClick={signOutOtherSessions}
              >
                <FiLogOut /> Sign out others
              </button>
            </div>
          </section>
        </div>

        <div className="qualify-settings-stack">
          <section className="qualify-settings-panel">
            <div className="qualify-settings-panel-title">
              <span className="qualify-settings-icon">
                <FiMail />
              </span>
              <div>
                <h2>Email address</h2>
                <p>Used to sign in and recover your account</p>
              </div>
            </div>
            <form className="qualify-settings-form" onSubmit={changeEmail}>
              <label htmlFor="setting-email">Account email</label>
              <input
                id="setting-email"
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                disabled={Boolean(busy) || isDemo}
              />
              <p className="qualify-settings-hint">
                Changing your email may require confirmation from your current
                and new addresses.
              </p>
              <div className="qualify-settings-actions">
                <button
                  disabled={
                    Boolean(busy) || isDemo || newEmail.trim() === user.email
                  }
                >
                  {busy === "email" ? "Requesting…" : "Change email"}
                </button>
              </div>
            </form>
          </section>

          {!isOwner && <section className="qualify-settings-panel">
            <div className="qualify-settings-panel-title">
              <span className="qualify-settings-icon">
                <FiHome />
              </span>
              <div>
                <h2>Institution identity</h2>
                <p>
                  Shared branding for your institution's administrators and
                  students
                </p>
              </div>
            </div>
            {institutionId ? (
              <form className="qualify-settings-form" onSubmit={saveBranding}>
                <div className="qualify-settings-brand-preview">
                  {logoPreview ? (
                    <span className="qualify-settings-logo-preview">
                      <img
                        src={logoPreview}
                        alt="New institution logo preview"
                      />
                    </span>
                  ) : (
                    <InstitutionBrand
                      name={institutionName || selectedInstitution?.name}
                      logoPath={logoPath}
                      subtitle="Institution logo"
                    />
                  )}
                </div>
                {canEditInstitution && (
                  <div className="qualify-settings-logo-controls">
                    <label
                      className="qualify-settings-upload"
                      htmlFor="setting-logo"
                    >
                      <FiCamera /> Choose logo
                      {/* Keep the file input inside its visible label so
                          browser focus never scrolls to the dashboard origin. */}
                      <input
                        id="setting-logo"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={selectLogo}
                        disabled={Boolean(busy)}
                      />
                    </label>
                    {(logoPath || logoFile) && (
                      <button
                        type="button"
                        className="qualify-settings-remove"
                        disabled={Boolean(busy)}
                        onClick={() => {
                          setLogoPath(null);
                          setLogoFile(null);
                        }}
                      >
                        <FiTrash2 /> Remove logo
                      </button>
                    )}
                  </div>
                )}
                <p className="qualify-settings-hint">
                  PNG, JPG or WebP · maximum 1 MB · square images look best.
                </p>
                <label htmlFor="setting-institution">
                  Institution display name
                </label>
                <input
                  id="setting-institution"
                  minLength={3}
                  maxLength={160}
                  required
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  readOnly={!canEditInstitution}
                  disabled={Boolean(busy)}
                  className={
                    !canEditInstitution ? "qualify-settings-readonly" : ""
                  }
                />
                {canEditInstitution ? (
                  <div className="qualify-settings-actions">
                    <button disabled={Boolean(busy)}>
                      {busy === "branding"
                        ? "Saving…"
                        : "Save institution changes"}
                    </button>
                  </div>
                ) : (
                  <p className="qualify-settings-hint">
                    Only your Institution Super Admin can edit institution
                    branding.
                  </p>
                )}
              </form>
            ) : (
              <p className="qualify-settings-hint">No institution selected.</p>
            )}
          </section>}
        </div>
      </div>
    </section>
  );
}
