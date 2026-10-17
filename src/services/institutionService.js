// src/services/institutionService.js

import supabase from "../lib/supabase";

// ==============================
// SUPABASE RPC HELPER
// ==============================

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// ==============================
// INSTITUTION ACCESS
// ==============================

export const getInstitutionAccess = () => rpc("qualify_my_institution_access");

// ==============================
// INSTITUTION APPLICATIONS
// ==============================

export const applyForInstitution = ({
  name,
  code,
  website = null,
  details = null,
}) =>
  rpc("qualify_apply_institution", {
    p_name: name,
    p_code: code,
    p_website: website,
    p_details: details,
  });

export async function getMyInstitutionApplications() {
  const { data, error } = await supabase
    .from("institution_applications")
    .select(
      "id,institution_name,requested_code,status,created_at,review_notes,reviewed_at,institution_id",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data ?? [];
}

export async function getInstitutionApplicationsForReview() {
  const { data, error } = await supabase
    .from("institution_applications")
    .select(
      "id,applicant_email,institution_name,requested_code,website,details,status,created_at,review_notes",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return data ?? [];
}

export const reviewInstitutionApplication = (
  applicationId,
  approve,
  notes = null,
) =>
  rpc("qualify_review_institution_application", {
    p_application: applicationId,
    p_approve: approve,
    p_notes: notes,
  });

// ==============================
// PLATFORM OWNER
// ==============================

export const createInstitutionAsPlatformOwner = ({
  name,
  code,
  superAdminEmail,
}) =>
  rpc("qualify_owner_create_institution", {
    p_name: name,
    p_code: code,
    p_super_email: superAdminEmail,
  });

export const listPlatformInstitutions = () =>
  rpc("qualify_owner_list_institutions");

export const setInstitutionStatus = (id, status) =>
  rpc("qualify_owner_set_institution_status", {
    p_institution: id,
    p_status: status,
  });

// ==============================
// SUPER ADMIN MANAGEMENT
// ==============================

export const addInstitutionSuperAdmin = (institutionId, email) =>
  rpc("qualify_institution_add_super", {
    p_institution: institutionId,
    p_email: email,
  });

// ==============================
// INSTITUTION STAFF MANAGEMENT
// ==============================

export const listInstitutionMembers = (id) =>
  rpc("qualify_list_institution_members", {
    p_institution: id,
  });

export const manageInstitutionMember = (institutionId, userId, role, status) =>
  rpc("qualify_manage_institution_member", {
    p_institution: institutionId,
    p_user: userId,
    p_role: role,
    p_status: status,
  });

export const createStaffInvitation = (institutionId, email, role) =>
  rpc("qualify_invite_institution_staff", {
    p_institution: institutionId,
    p_email: email,
    p_role: role,
  });

export const listStaffInvitations = (institutionId) =>
  rpc("qualify_list_institution_invites", {
    p_institution: institutionId,
  });

export const revokeStaffInvitation = (id) =>
  rpc("qualify_revoke_institution_invite", {
    p_invite: id,
  });

export const acceptStaffInvitation = (token) =>
  rpc("qualify_accept_institution_invite", {
    p_token: token,
  });

// ==============================
// VERIFIED STAFF INVITATIONS — TWO-STAGE APPROVAL
// ==============================

// Saves an invitation against the recipient email; never returns a bearer token.
export const requestStaffInvitation = (institutionId, email, name = "") =>
  rpc("qualify_request_staff_invitation", {
    p_institution: institutionId,
    p_email: email.trim(),
    p_name: name.trim() || null,
  });

// Optional notification endpoint: requires a deployed Edge Function and email provider.
// The invitation is valid even if the notification service is unavailable.
export async function sendStaffInvitationNotice(institutionId, invitationId) {
  const { data, error } = await supabase.functions.invoke("qualify-send-staff-invite", {
    body: { institutionId, invitationId },
  });
  if (error) return { sent: false, message: "Email notification service is not configured or unavailable." };
  return data?.sent ? { sent: true } : { sent: false, message: data?.message || "Email notification not sent." };
}

// Supabase checks the verified email of the current auth.uid() server-side.
export const listMyPendingStaffInvitations = () =>
  rpc("qualify_my_pending_staff_invites");

// Recipient only asks for approval; this does NOT create institution access.
export const getMyAwaitingStaffApproval = () =>
  rpc("qualify_my_staff_invite_status");

export const respondToStaffInvitation = (invitationId, accept) =>
  rpc("qualify_respond_staff_invite", {
    p_invite: invitationId,
    p_accept: Boolean(accept),
  });

// A current Super Admin must verify the employee out of band before approving.
export const confirmStaffInvitation = (invitationId, approve) =>
  rpc("qualify_confirm_staff_invite", {
    p_invite: invitationId,
    p_approve: Boolean(approve),
  });

// ==============================
// WORKSPACE NAVIGATION
// ==============================

// Actual permissions are enforced
// by Supabase database policies and RPCs.

export function resolveWorkspace(access) {
  if (access?.platform_owner) return '/platform/institutions';
  const member = (access?.institutions || []).find(i =>
    i.member_status === 'active' && i.institution_status === 'active');
  if (member) return `/app/i/${encodeURIComponent(member.institution_id)}/exams`;
  return '/institutions/apply';
}

// ==============================
// INSTITUTION BRANDING
// ==============================

export const INSTITUTION_LOGO_BUCKET = "qualify-institution-logos";

// Fetch institution name and logo.

export const getInstitutionBranding = (institutionId) =>
  rpc("qualify_institution_branding", {
    p_institution: institutionId,
  });

// Update institution name and logo.
// Permission verification happens
// inside the Supabase RPC.

export const updateInstitutionBranding = ({ institutionId, name, logoPath }) =>
  rpc("qualify_update_institution_branding", {
    p_institution: institutionId,
    p_name: name,
    p_logo_path: logoPath || null,
  });

// Get institution branding for
// a student-facing exam page.

export const getPublicExamBranding = async (examId) =>
  rpc("qualify_public_exam_branding", {
    p_exam: examId,
  });

// ==============================
// GET INSTITUTION LOGO URL
// ==============================

export function institutionLogoUrl(path) {
  if (!path || typeof path !== "string") {
    return "";
  }

  // Reject external and invalid paths.
  const validPath = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpe?g|webp)$/;

  if (!validPath.test(path)) {
    return "";
  }

  const { data } = supabase.storage
    .from(INSTITUTION_LOGO_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

// ==============================
// UPLOAD INSTITUTION LOGO
// ==============================

export async function uploadInstitutionLogo(institutionId, file) {
  const validInstitutionId = /^[0-9a-f-]{36}$/;

  if (!validInstitutionId.test(institutionId)) {
    throw new Error("Choose an institution.");
  }

  const supportedTypes = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };

  if (!file || !supportedTypes[file.type]) {
    throw new Error("Upload a PNG, JPG or WebP image.");
  }

  // Maximum allowed file size: 1 MB.
  if (!file.size || file.size > 1024 * 1024) {
    throw new Error("Logo must be under 1 MB.");
  }

  const extension = supportedTypes[file.type];

  const path = `${institutionId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(INSTITUTION_LOGO_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

// ==============================
// DELETE INSTITUTION LOGO
// ==============================

export async function deleteInstitutionLogo(path) {
  if (!path) return;

  const { error } = await supabase.storage
    .from(INSTITUTION_LOGO_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(error.message);
  }
}
