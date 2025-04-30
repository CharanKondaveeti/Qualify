import supabase from "./supabase";
import dayjs from "dayjs";

// get loggedin admin details
export const getCurrentAdmin = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unable to fetch user");
  }

  return user;
};


// Get questions for a specific exam
export async function getQuestions(exam_id) {
  let { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("exam_id", exam_id)
    .order("question_id", { ascending: true }); 

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


export async function submitExam(
  examId,
  studentId,
  answers,
  mode = "autosave"
) {
  let updateFields = {
    answers: answers,
  };

  if (mode === "finalsubmit") {
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("question_id, correct_option, marks, negative_marks")
      .eq("exam_id", examId);

    if (questionsError) {
      return { success: false, message: "Failed to fetch questions" };
    }

    let totalMarks = 0;
    questions.forEach((question) => {
      const studentAnswer = answers[question.question_id];
      if (studentAnswer !== undefined) {
        if (studentAnswer === question.correct_option) {
          totalMarks += question.marks;
        }
      }
    });

    updateFields.marks_scored = totalMarks;
    updateFields.exam_status = "submitted";
  }

  const { error: reportError } = await supabase
    .from("studentReport")
    .update(updateFields)
    .eq("exam_id", examId)
    .eq("student_report_id", studentId);

  if (reportError) {
    return { success: false, message: "Failed to submit exam" };
  }

  return {
    success: true,
    message:
      mode === "finalsubmit"
        ? "Exam submitted successfully!"
        : "Answers autosaved successfully.",
  };
}

export const getExamWithStartTime = async (examId, studentId) => {
  try {
    // 1. Fetch exam details
    const { data: examData, error: examError } = await supabase
      .from("exams")
      .select("exam_id, title, course, duration_minutes")
      .eq("exam_id", examId)
      .single();

    if (examError) throw examError;

    // 2. Fetch started_at from studentReport
    const { data: reportData, error: reportError } = await supabase
      .from("studentReport")
      .select("started_at, exam_status")
      .eq("exam_id", examId)
      .eq("student_report_id", studentId)
      .single();


    if (reportError) throw reportError;

    // 3. Combine both
    return {
      ...examData,
      started_at: reportData?.started_at,
      exam_status: reportData?.exam_status,

    };
  } catch (error) {
    console.error("Error fetching exam and started_at:", error);
    return null;
  }
};

export async function startExamNow(studentId) {
  const { data, error } = await supabase
    .from("studentReport")
    .update({
      started_at: new Date().toISOString(),
      exam_status: "in progress",
    })
    .eq("student_report_id", studentId)
    .select("started_at");

  if (error) {
    console.error(error);
    return { success: false };
  }

  return { success: true, started_at: data[0].started_at };
}

export async function updateExamStatuses() {
  try {
    const { data: exams, error } = await supabase.from("exams").select("*");

    if (error) {
      console.error("Failed to fetch exams:", error.message);
      return;
    }

    const updates = [];

    exams.forEach((exam) => {
      const now = dayjs();
      const start = dayjs(exam.scheduled_date);
      const end = start.add(exam.duration_minutes, "minute");

      let newStatus = exam.status;

      if (now.isBefore(start)) {
        newStatus = "upcoming";
      } else if (now.isAfter(end)) {
        newStatus = "completed";
      } else {
        newStatus = "active";
      }

      if (newStatus !== exam.status) {
        updates.push({
          exam_id: exam.exam_id,
          status: newStatus,
        });
      }
    });

    // Batch update exams
    for (const update of updates) {
      await supabase
        .from("exams")
        .update({ status: update.status })
        .eq("exam_id", update.exam_id);
    }

    console.log("Exam statuses updated:", updates);
  } catch (err) {
    console.error("Error updating exam statuses:", err.message);
  }
}

export async function fetchStudentReportsByExamId(examId) {
  const { data, error } = await supabase
    .from("studentReports")
    .select("*")
    .eq("exam_id", examId);

  if (error) {
    console.error("Error fetching student reports:", error.message);
    throw error;
  }

  return data;
}

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
