import supabase from "../lib/supabase";

const IMAGE_KEY = "qualify-signup-logo";
const TYPES = ["school","junior_college","engineering_college","degree_college","polytechnic","university","medical_pharmacy","coaching","other"];

export const institutionTypes = [
  ["school","School"], ["junior_college","Junior / Intermediate College"],
  ["engineering_college","Engineering College"], ["degree_college","Degree College"],
  ["polytechnic","Polytechnic / Diploma"], ["university","University"],
  ["medical_pharmacy","Medical / Pharmacy"], ["coaching","Coaching / Training"], ["other","Other"]
];

export const emptyInstitution = {
  name: "", code: "", institution_type: "", official_phone: "", official_email: "",
  secondary_phone: "", contact_person: "", address_line: "", state: "",
  district: "", city: "", postal_code: "", website: "",
  affiliation: "", registration_number: "", directory_source: "manual",
  directory_id: "", directory_name: "", details: ""
};

export function validateInstitution(form) {
  if ((form.name || "").trim().length < 3) return "Enter your official institution name.";
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(form.code || "")) return "Institution code must be 3–40 lowercase letters, numbers or hyphens.";
  if (!TYPES.includes(form.institution_type)) return "Select your institution type.";
  if (!/^[+0-9][0-9 ()-]{7,19}$/.test(form.official_phone || "")) return "Enter a valid phone number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.official_email || "")) return "Enter the official institution email.";
  if ((form.address_line || "").trim().length < 8) return "Enter the complete street address.";
  if (["state","district","city"].some(k => (form[k] || "").trim().length < 2)) return "Enter the state, district and city.";
  if (!/^[1-9][0-9]{5}$/.test(form.postal_code || "")) return "Enter a valid six-digit Indian PIN code.";
  if (form.website && !/^https?:\/\//i.test(form.website)) return "Website must begin with https:// or http://.";
  return "";
}

export async function searchInstitutionDirectory(query, type) {
  if (!query || query.trim().length < 3) return [];
  const { data, error } = await supabase.rpc("qualify_find_institutions", {
    p_query: query.trim().slice(0,80), p_type: type || null
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data : [];
}

export async function submitPendingInstitution() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email_confirmed_at) return null;
  const form = user.user_metadata?.pending_institution_application;
  if (!form || typeof form !== "object") return null;
  const { data, error: submitError } = await supabase.rpc("qualify_submit_pending_signup_institution");
  if (submitError) throw new Error(submitError.message);
  return data;
}

// Preserve the optional signup logo in this browser through email verification.
// It is never placed in public Auth metadata, JWTs, or localStorage.
function logoDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) { reject(new Error("Browser storage unavailable")); return; }
    const req = indexedDB.open(IMAGE_KEY, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("logo");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function stageSignupLogo(file) {
  if (!file) return;
  if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 1048576 || file.size === 0)
    throw new Error("Logo must be PNG, JPG or WebP under 1 MB.");
  const db = await logoDB();
  return new Promise((resolve,reject) => {
    const tx = db.transaction("logo","readwrite");
    tx.objectStore("logo").put(file,"pending");
    tx.oncomplete = () => {db.close();resolve(true);};
    tx.onerror = () => {db.close();reject(tx.error);};
  });
}
export async function getStagedSignupLogo() {
  const db = await logoDB();
  return new Promise((resolve,reject) => {
    const tx = db.transaction("logo","readonly");
    const req = tx.objectStore("logo").get("pending");
    req.onsuccess = () => {db.close();resolve(req.result || null);};
    req.onerror = () => {db.close();reject(req.error);};
  });
}
export async function clearStagedSignupLogo() {
  const db = await logoDB();
  return new Promise((resolve,reject) => {
    const tx = db.transaction("logo","readwrite");
    tx.objectStore("logo").delete("pending");
    tx.oncomplete = () => {db.close();resolve();};
    tx.onerror = () => {db.close();reject(tx.error);};
  });
}
