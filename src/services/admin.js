import supabase from "./supabase";

// Get all exams
export async function getExams() {
  let { data, error } = await supabase.from("exams").select("*");
  if (error) {
    throw new Error("Exams could not be loaded");
  }
  return data;
}

// Get questions for a specific exam
export async function getQuestions(exam_id) {
  let { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("exam_id", exam_id);

  if (error) {
    throw new Error("Questions could not be loaded: " + error.message);
  }

  return data;
}

// Get students' report for a specific exam
export async function getStudentsReport(exam_id) {
  let { data, error } = await supabase
    .from("studentReport")
    .select("*")
    .eq("exam_id", exam_id);

  if (error) {
    throw new Error("Student report could not be loaded: " + error.message);
  }

  return data;
}

// Admin login function
export async function loginAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(error); 
    throw new Error("Invalid email or password");
  }

  const user = data.user;

  const { data: profile, error: profileError } = await supabase
    .from("admins")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile.role !== "admin") {
    throw new Error("Access denied: Not an admin");
  }

  return user;
}

// Admin signup function
export async function signupAdmin(email, password, name) {
  if (!email || !password || !name) {
    throw new Error("Email, password, and name are required");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error("Signup failed: " + error.message);
  }

  const { user } = data;

  const { error: adminError } = await supabase
    .from("admins")
    .insert([{ id: user.id, email, role: "admin" }]);

  if (adminError) {
    throw new Error(
      "Failed to insert admin into admins table: " + adminError.message
    );
  }

  return user;
}