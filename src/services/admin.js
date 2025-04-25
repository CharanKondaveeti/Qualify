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

// Insert exam data
export async function createExamInSupabase(exam) {
  console.log("exam supabase", exam);
  try {
    const { data, error } = await supabase.from("exams").insert([exam]).select("exam_id"); 

    if (error) {
      throw new Error(`Failed to insert exam: ${error.message}`);
    }

    return data; 
  } catch (error) {
    console.error("Error creating exam:", error);
    throw new Error("Failed to create exam");
  }
}

export async function createExam(examDetails) {
  try {
    const { data, error } = await supabase
      .from("exams")
      .insert([examDetails])
      .single();

    if (error) {
      throw new Error(`Failed to create exam: ${error.message}`);
    }

    return data.id; // exam_id
  } catch (error) {
    console.error("Error creating exam:", error);
    throw new Error("Failed to create exam");
  }
}

// Insert questions data
export async function createQuestionsInSupabase(questions) {
  try {
    const { data, error } = await supabase.from("questions").insert(questions);

    if (error) {
      throw new Error(`Failed to insert questions: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error creating questions:", error);
    throw new Error("Failed to create questions");
  }
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

export const deleteExam = async (examId) => {
  try {
    if (!examId) {
      throw new Error("Invalid exam ID");
    }

    const { data, error } = await supabase
      .from("exams")
      .delete()
      .eq("exam_id", examId);

    if (error) {
      throw new Error(error.message);
    }

    const { error: questionsError } = await supabase
      .from("questions")
      .delete()
      .eq("exam_id", examId);

    if (questionsError) {
      throw new Error(questionsError.message);
    }

    console.log("Questions related to the exam have been deleted.");
  } catch (error) {
    console.error("Error deleting exam:", error);
    throw error;
  }
};

export const editStudentInSupabase = async (studentId, updatedData) => {
  const { data, error } = await supabase
    .from("studentReport")
    .update(updatedData)
    .eq("id", studentId);

  if (error) {
    console.error("Error updating student:", error);
    throw error;
  }
  return data;
};

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