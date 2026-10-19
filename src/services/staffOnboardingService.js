import supabase from "../lib/supabase";

export async function staffSetupStatus() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;
  const { data, error } = await supabase.from("qualify_staff_first_login")
    .select("institution_id,completed_at").eq("user_id",user.id).maybeSingle();
  if (error) throw new Error(error.message);
  return data && !data.completed_at ? data : null;
}

async function staffAction(action, argumentsObject = {}) {
  const { data, error } = await supabase.functions.invoke("qualify-staff-onboarding", {
    body: { action, ...argumentsObject },
  });
  if (error) {
    const payload = await error.context?.json?.().catch(() => null);
    throw new Error(payload?.error || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const sendStaffOtp = (institutionId, email, name) =>
  staffAction("request", { institutionId, email, name });
export const verifyStaffOtp = (institutionId, inviteId, otp) =>
  staffAction("verify", { institutionId, inviteId, otp });
export const cancelStaffOtpInvite = (institutionId, inviteId) =>
  staffAction("cancel", { institutionId, inviteId });
export const listStaffOtpInvites = (institutionId) =>
  staffAction("list", { institutionId });
export const completeStaffFirstPassword = (password) =>
  staffAction("complete_password", { password });

// Institution Super Admin only: permanently remove scoped Staff Admin Auth account.
export const removeInstitutionStaff = (institutionId, staffId) =>
  staffAction("remove", { institutionId, staffId });
