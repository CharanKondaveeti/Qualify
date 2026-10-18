import supabase, { isDemo } from "../lib/supabase";
import { getInstitutionAccess, resolveWorkspace } from "./institutionService";
import { submitPendingInstitution } from "./institutionSignupService";

export async function getCurrentAdmin(showModal) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!user || error)
    showModal?.("error", "Authentication", "Please sign in again.");
  return user || null;
}

export async function loginAdmin(email, password) {
  // Never authenticate admins against the fake demo client.
  if (isDemo) throw new Error("Please exit demo mode before signing in.");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);

  const user = data.user;

  // Create the application captured during signup only after verified sign-in.
  await submitPendingInstitution();
  const access = await getInstitutionAccess();

  return {
    user,
    destination: resolveWorkspace(access),
  };
}

export async function signupAdmin(email, password, name, institutionApplication = null) {
  if (!email || !password || !name) {
    throw new Error("Name, email and password are required");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, ...(institutionApplication ? { pending_institution_application: institutionApplication } : {}) },
    },
  });

  if (error) throw new Error("Signup failed: " + error.message);

  // No signup action can create a privileged role.
  return data.user;
}

export async function addQuestionToSupabase(question) {
  const { data, error } = await supabase.from("questions").insert([question]);
  if (error) throw error;
  return data;
}

export async function editQuestionInSupabase(question) {
  const { data, error } = await supabase
    .from("questions")
    .update({
      question_text: question.question_text,
      options: question.options,
      correct_option: question.correct_option,
      marks: question.marks,
    })
    .eq("question_id", question.question_id);

  if (error) throw error;
  return data;
}

export async function deleteQuestionFromSupabase(questionId) {
  const { data, error } = await supabase
    .from("questions")
    .delete()
    .eq("question_id", questionId);

  if (error) throw error;
  return data;
}

export async function deleteStudentFromSupabase(studentId) {
  const { data, error } = await supabase.rpc(
    "qualify_admin_delete_registration",
    { p_attempt: studentId },
  );

  if (error) throw error;
  return data;
}

export async function updateStudentInSupabase(reportId, updatedData) {
  const { data, error } = await supabase.rpc(
    "qualify_admin_edit_registration",
    {
      p_attempt: reportId,
      p_name: updatedData.student_name,
      p_email: updatedData.email,
      p_roll: updatedData.roll_no,
    },
  );

  if (error) throw error;
  return data;
}

export async function updateExamInSupabase(examId, updatedData) {
  let query = supabase
    .from("exams")
    .update(updatedData)
    .eq("exam_id", examId);
  if ('timing_mode' in updatedData) query = query.eq('exam_status', 'upcoming');
  const { data, error } = await query.select('exam_id');
  if (error) throw error;
  if (!data?.length) throw new Error('Exam was not updated. It may have started, or your access may have changed.');
  return data;
}
