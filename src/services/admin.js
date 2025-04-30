import supabase from "./supabase";
import dayjs from "dayjs";

export const getCurrentAdmin = async (showModal) => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    showModal("error", "Error", "Unable to get user. Please login again.");
    return null;
  }

  return user;
};

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
  console.log("Logged in user:", user);

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


// Add new question
export async function addQuestionToSupabase(question) {
  try {
    const { data, error } = await supabase.from("questions").insert([question]);

    if (error) {
      throw new Error(`Failed to add question: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error adding question:", error);
    throw new Error("Failed to add question");
  }
}

// Edit existing question
export async function editQuestionInSupabase(question) {
  try {
    const { data, error } = await supabase
      .from("questions")
      .update({
        question_text: question.question_text,
        options: question.options,
        correct_option: question.correct_option,
        marks: question.marks,
      })
      .eq("question_id", question.question_id);

    if (error) {
      throw new Error(`Failed to update question: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error updating question:", error);
    throw new Error("Failed to update question");
  }
}

// Delete question
export async function deleteQuestionFromSupabase(question_id) {
  try {
    const { data, error } = await supabase
      .from("questions")
      .delete()
      .eq("question_id", question_id);

    if (error) {
      throw new Error(`Failed to delete question: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error deleting question:", error);
    throw new Error("Failed to delete question");
  }
}

export const deleteStudentFromSupabase = async (studentId) => {
  console.log("Deleting student with ID:", studentId);
  const { data, error } = await supabase
    .from("studentReport")
    .delete()
    .eq("student_report_id", studentId);

  if (error) {
    console.error("Error deleting student:", error);
    throw error;
  }
  return data;
};

export const updateStudentInSupabase = async (studentReportId, updatedData) => {
  console.log(
    "Updating student with ID:",
    studentReportId,
    "with data:",
    updatedData
  );

  const { data, error } = await supabase
    .from("studentReport")
    .update(updatedData)
    .eq("student_report_id", studentReportId);

  if (error) {
    console.error("Error updating student:", error);
    throw error;
  }
   return data;
};

export async function updateExamInSupabase(examId, updatedData) {
  const { data, error } = await supabase
    .from("exams")
    .update(updatedData)
    .eq("exam_id", examId);

  if (error) {
    console.error("Failed to update exam:", error.message);
    throw error;
  }

  return data;
}
