import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiCheck, FiClock, FiMoreHorizontal, FiSearch, FiShield,
  FiUserPlus, FiUsers, FiX,
} from "react-icons/fi";
import { useAppDialog } from "../../../shared/components/ConfirmDialogProvider";
import { useAdminWorkspace } from "../context/AdminWorkspaceContext";
import {
  addInstitutionSuperAdmin, listInstitutionMembers, manageInstitutionMember,
} from "../../../services/institutionService";
import {
  cancelStaffOtpInvite, listStaffOtpInvites, sendStaffOtp, verifyStaffOtp,
} from "../../../services/staffOnboardingService";
import "../styles/operations.css";
import "../styles/staff-invitations.css";

const tabs = [
  ["all", "All staff"], ["active", "Active"], ["pending", "Pending"],
  ["suspended", "Suspended"],
];

const inviteState = (invite, now) => (
  invite.status === "pending" && new Date(invite.expires_at).getTime() <= now
    ? "expired" : invite.status
);
const statusLabel = {
  active: "Active", suspended: "Suspended", pending: "Pending OTP",
  provisioned: "Awaiting first login", expired: "Expired",
  cancelled: "Cancelled", superseded: "Replaced",
  failed: "Failed", verified: "Verified", provisioning: "Processing",
};
const roleLabel = role => role === "institution_super_admin" ? "Super Admin" : "Staff Admin";

function initials(name) {
  return (name || "Staff").trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join("");
}

export default function TeamPage() {
  const { institutionId, selectedInstitution, isOwner, isSuperAdmin } = useAdminWorkspace();
  const dialog = useAppDialog();
  const canManage = isOwner || isSuperAdmin;
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [menuId, setMenuId] = useState(null);
  const [modal, setModal] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    if (!institutionId || !canManage) return;
    const [people, otpInvites] = await Promise.all([
      listInstitutionMembers(institutionId),
      isSuperAdmin ? listStaffOtpInvites(institutionId) : Promise.resolve({ items: [] }),
    ]);
    setMembers(people || []);
    setInvites(otpInvites?.items || []);
    setNow(Date.now());
  }, [institutionId, canManage, isSuperAdmin]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMembers([]);
    setInvites([]);
    setModal(null);
    setSearch("");
    setTab("all");
    setMessage("");
    setError("");
    if (!institutionId || !canManage) {
      setLoading(false);
      return undefined;
    }
    Promise.all([
      listInstitutionMembers(institutionId),
      isSuperAdmin ? listStaffOtpInvites(institutionId) : Promise.resolve({ items: [] }),
    ]).then(([people, otpInvites]) => {
      if (!active) return;
      setMembers(people || []);
      setInvites(otpInvites?.items || []);
    }).catch(e => {
      if (active) setError(e.message || "Unable to load staff.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [institutionId, canManage, isSuperAdmin]);

  useEffect(() => {
    if (!modal) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = event => {
      if (event.key === "Escape" && !busy) setModal(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [modal, busy]);

  useEffect(() => {
    if (!menuId) return undefined;
    const closeMenu = event => {
      if (!event.target.closest(".qt-action-wrap")) setMenuId(null);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [menuId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function run(action, success) {
    if (busy) return null;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await action();
      await load();
      setMessage(result?.message || success);
      return result || { success: true };
    } catch (e) {
      setError(e.message || "Action failed. Try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  function openInvite() {
    setError("");
    setFullName("");
    setEmail("");
    setOtp("");
    setModal({ type: "invite" });
    setMenuId(null);
  }

  async function submitInvite(e) {
    e.preventDefault();
    if (!isSuperAdmin || !fullName.trim() || !email.trim()) return;
    const result = await run(
      () => sendStaffOtp(institutionId, email.trim(), fullName.trim()),
      "Verification code sent."
    );
    if (result?.id) {
      setOtp("");
      setModal({
        type: "verify",
        invite: { id: result.id, staff_name: fullName.trim(), invited_email: email.trim() },
      });
      setTab("pending");
    }
  }

  function openVerify(invite) {
    setError("");
    setOtp("");
    setModal({ type: "verify", invite });
    setMenuId(null);
  }

  async function submitVerify(e) {
    e.preventDefault();
    if (!isSuperAdmin || otp.length !== 6 || !modal?.invite) return;
    const result = await run(
      () => verifyStaffOtp(institutionId, modal.invite.id, otp),
      "Staff OTP verified."
    );
    if (result) {
      setOtp("");
      setModal(null);
      setTab("all");
    }
  }

  async function resend(invite) {
    setMenuId(null);
    const result = await run(
      () => sendStaffOtp(institutionId, invite.invited_email, invite.staff_name),
      "New verification OTP sent."
    );
    if (result?.id) {
      setOtp("");
      setModal({ type: "verify", invite: { ...invite, id: result.id } });
      setTab("pending");
    }
  }

  async function cancel(invite) {
    setMenuId(null);
    if (!await dialog.confirm(
      "Cancel the verification for " + invite.invited_email + "? The OTP will stop working.",
      { title: "Cancel staff invitation?", confirmLabel: "Cancel invitation", danger: true }
    )) return;
    const result = await run(
      () => cancelStaffOtpInvite(institutionId, invite.id),
      "Invitation cancelled."
    );
    if (result) setTab("pending");
  }

  async function changeMember(member, action) {
    setMenuId(null);
    const changingRole = action === "promote" || action === "demote";
    if (changingRole && !isOwner) return;
    const newRole = changingRole
      ? action === "promote" ? "institution_super_admin" : "staff_admin"
      : member.role;
    const newStatus = changingRole ? member.status :
      action === "suspend" ? "suspended" : "active";
    if (!await dialog.confirm(
      (changingRole ? (action === "promote" ? "Promote " : "Demote ") : (action === "suspend" ? "Suspend " : "Reactivate ")) + member.email + "?",
      { title: changingRole ? "Change staff role?" : "Change staff access?",
        confirmLabel: changingRole ? "Change role" : action === "suspend" ? "Suspend staff" : "Reactivate",
        danger: action === "suspend" || action === "demote" }
    )) return;
    await run(
      () => manageInstitutionMember(institutionId, member.user_id, newRole, newStatus),
      "Staff updated."
    );
  }

  async function submitOwner(e) {
    e.preventDefault();
    if (!isOwner || !ownerEmail.trim()) return;
    const result = await run(
      () => addInstitutionSuperAdmin(institutionId, ownerEmail.trim()),
      "Super Admin appointed."
    );
    if (result) { setOwnerEmail(""); setModal(null); }
  }

  const memberEmails = useMemo(
    () => new Set(members.map(m => String(m.email || "").toLowerCase())),
    [members]
  );
  const pendingInvites = useMemo(() => invites.filter(invite => {
    const state = inviteState(invite, now);
    return state === "pending" ||
      (state === "provisioned" && !memberEmails.has(invite.invited_email.toLowerCase()));
  }), [invites, memberEmails, now]);
  const rows = useMemo(() => {
    const staffRows = members.map(member => ({
      kind: "member", key: "member-" + member.user_id,
      name: member.name || member.email, email: member.email,
      role: roleLabel(member.role), status: member.status,
      member,
    }));
    const invitationRows = pendingInvites.map(invite => ({
      kind: "invite", key: "invite-" + invite.id,
      name: invite.staff_name, email: invite.invited_email,
      role: "Staff Admin", status: inviteState(invite, now),
      invite,
    }));
    const source = [...staffRows, ...invitationRows];
    return source.filter(row => {
      if (tab === "active" && row.status !== "active") return false;
      if (tab === "pending" && !["pending", "provisioned"].includes(row.status)) return false;
      if (tab === "suspended" && row.status !== "suspended") return false;
      const haystack = [row.name, row.email, row.role, statusLabel[row.status] || row.status].join(" ").toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [members, pendingInvites, tab, search, now]);

  const activeCount = members.filter(m => m.status === "active").length;
  const pendingCount = pendingInvites.length;

  return (
    <section className="integrated-section qualify-team">
      <div className="qt-header">
        <div>
          <span className="eyebrow">INSTITUTION ADMINISTRATION</span>
          <h1>Team Management</h1>
          <p className="integrated-muted">{selectedInstitution?.name || "Institution"} · Manage staff access and invitations</p>
        </div>
        <div className="qt-header-actions">
          {isOwner && <button type="button" className="qt-outline" onClick={() => { setModal({ type: "owner" }); setMenuId(null); }}>
            <FiShield aria-hidden="true" /> Appoint Super Admin
          </button>}
          {isSuperAdmin && <button type="button" className="qt-primary" onClick={openInvite}>
            <FiUserPlus aria-hidden="true" /> Add staff
          </button>}
        </div>
      </div>

      {error && <p className="ops-error" role="alert">{error}</p>}
      {message && <p className="ops-info" role="status">{message}</p>}
      {!institutionId || !canManage ? (
        <div className="qt-card qt-empty">Institution Super Admin or Platform Owner access is required.</div>
      ) : (
        <>
          <div className="qt-overview">
            <div className="qt-stat"><strong>{members.length + pendingCount}</strong><span>Total staff</span></div>
            <div className="qt-stat"><strong>{activeCount}</strong><span>Active staff</span></div>
            <div className="qt-stat"><strong>{pendingCount}</strong><span>Pending setup</span></div>
          </div>
          <div className="qt-card qt-directory">
            <div className="qt-directory-toolbar">
              <div className="qt-tabs" role="tablist" aria-label="Staff filter">
                {tabs.filter(([id]) => isSuperAdmin || id !== "pending").map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={tab === id}
                    className={tab === id ? "qt-tab is-active" : "qt-tab"}
                    onClick={() => { setTab(id); setMenuId(null); }}>{label}{id === "pending" && pendingCount > 0 ? " (" + pendingCount + ")" : ""}</button>
                ))}
              </div>
              <label className="qt-search">
                <FiSearch aria-hidden="true" />
                <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                  aria-label="Search team" placeholder="Search name or email" />
              </label>
            </div>
            <div className="qt-table-scroll">
              <table className="qt-table">
                <thead><tr><th>Staff member</th><th>Role</th><th>Status</th><th>Details</th><th className="qt-action-heading">Actions</th></tr></thead>
                <tbody>
                  {!loading && rows.map(row => (
                    <tr key={row.key}>
                      <td><div className="qt-person">
                        <span className="qt-avatar" aria-hidden="true">{initials(row.name)}</span>
                        <div><strong>{row.name}</strong><small>{row.email}</small></div>
                      </div></td>
                      <td>{row.role}</td>
                      <td><span className={"qt-status qt-" + row.status}>{statusLabel[row.status] || row.status}</span></td>
                      <td className="qt-row-detail">
                        {row.kind === "member" ? "Institution member" :
                          row.status === "pending" ? "Expires " + new Date(row.invite.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) :
                          row.status === "provisioned" ? "Password setup required" :
                          new Date(row.invite.created_at).toLocaleDateString()}
                      </td>
                      <td className="qt-actions">
                        {(row.kind === "member" || row.status === "pending" || row.status === "expired") ? (
                          <div className="qt-action-wrap">
                            <button type="button" className="qt-more" disabled={busy}
                              aria-label={"Actions for " + row.name} aria-expanded={menuId === row.key}
                              onClick={() => setMenuId(menuId === row.key ? null : row.key)}>
                              <FiMoreHorizontal aria-hidden="true" />
                            </button>
                            {menuId === row.key && <div className="qt-action-menu">
                              {row.kind === "member" ? (
                                <>
                                  {isOwner && <button type="button" onClick={() => changeMember(row.member, row.member.role === "staff_admin" ? "promote" : "demote")}>
                                    {row.member.role === "staff_admin" ? "Promote to Super Admin" : "Demote to Staff Admin"}
                                  </button>}
                                  <button type="button" onClick={() => changeMember(row.member, row.member.status === "active" ? "suspend" : "reactivate")}>
                                    {row.member.status === "active" ? "Suspend access" : "Reactivate access"}
                                  </button>
                                </>
                              ) : (
                                <>
                                  {row.status === "pending" && <button type="button" onClick={() => openVerify(row.invite)}>Verify OTP</button>}
                                  <button type="button" onClick={() => resend(row.invite)}>Resend OTP</button>
                                  <button type="button" className="qt-menu-danger" onClick={() => cancel(row.invite)}>Cancel invitation</button>
                                </>
                              )}
                            </div>}
                          </div>
                        ) : <span className="qt-no-action">—</span>}
                      </td>
                    </tr>
                  ))}
                  {loading && <tr><td colSpan={5} className="qt-table-empty">Loading team…</td></tr>}
                  {!loading && !rows.length && <tr><td colSpan={5} className="qt-table-empty">
                    {search ? "No staff match your search." : tab === "pending" ? "No pending staff invitations." : "No staff found."}
                  </td></tr>}
                </tbody>
              </table>
            </div>
            <div className="qt-table-footer"><FiUsers aria-hidden="true" /> {rows.length} record{rows.length === 1 ? "" : "s"}
            </div>
          </div>
        </>
      )}

      {modal && <div className="qt-dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setModal(null); }}>
        <section className="qt-dialog" role="dialog" aria-modal="true"
          aria-labelledby="qt-dialog-title">
          <div className="qt-dialog-top">
            <div>
              <h2 id="qt-dialog-title">
                {modal.type === "invite" ? "Add Staff Admin" : modal.type === "verify" ? "Verify staff email" : "Appoint Super Admin"}
              </h2>
              <p>{modal.type === "invite" ? "Send a verification code to the staff member." :
                modal.type === "verify" ? modal.invite?.invited_email :
                  "Platform Owner only · existing verified Qualify account"}</p>
            </div>
            <button className="qt-dialog-close" type="button" disabled={busy} aria-label="Close" onClick={() => setModal(null)}><FiX /></button>
          </div>

          {error && <p className="ops-error qt-dialog-error" role="alert">{error}</p>}
          {modal.type === "invite" && <form onSubmit={submitInvite} className="qt-dialog-form">
            <label>Full name<input required maxLength={120} autoFocus value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Staff member's name" /></label>
            <label>Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@institution.edu" /></label>
            <p className="qt-dialog-note"><FiClock aria-hidden="true" /> OTP expires after 10 minutes.</p>
            <div className="qt-dialog-actions">
              <button type="button" className="qt-outline" disabled={busy} onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="qt-primary" disabled={busy || fullName.trim().length < 2 || !email.trim()}>{busy ? "Sending…" : "Send OTP"}</button>
            </div>
          </form>}

          {modal.type === "verify" && <form onSubmit={submitVerify} className="qt-dialog-form">
            <label>6-digit verification code
              <input required autoFocus type="text" inputMode="numeric" autoComplete="one-time-code"
                pattern="[0-9]{6}" maxLength={6} value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000" className="qt-otp-input" />
            </label>
            <p className="qt-dialog-note"><FiCheck aria-hidden="true" /> Enter the code received by {modal.invite?.staff_name}.</p>
            <div className="qt-dialog-actions">
              <button type="button" className="qt-outline" disabled={busy} onClick={() => setModal(null)}>Close</button>
              <button type="submit" className="qt-primary" disabled={busy || otp.length !== 6}>{busy ? "Verifying…" : "Verify OTP"}</button>
            </div>
          </form>}

          {modal.type === "owner" && <form onSubmit={submitOwner} className="qt-dialog-form">
            <label>Verified account email
              <input type="email" required autoFocus value={ownerEmail}
                onChange={e => setOwnerEmail(e.target.value)}
                placeholder="admin@institution.edu" />
            </label>
            <div className="qt-dialog-actions">
              <button type="button" className="qt-outline" disabled={busy} onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="qt-primary" disabled={busy || !ownerEmail.trim()}>{busy ? "Saving…" : "Appoint Super Admin"}</button>
            </div>
          </form>}
        </section>
      </div>}
    </section>
  );
}
