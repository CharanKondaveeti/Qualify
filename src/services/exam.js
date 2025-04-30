import supabase from "./supabase";

export async function getExams() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not logged in or unable to fetch user.");
  }

  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("created_by", user.id);

  if (error) {
    throw new Error("Exams could not be loaded");
  }

  return data;
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
    throw new error("Error deleting exam:", error);
  }
};
  
export async function createNewExam(exam) {
  try {
    const { data, error } = await supabase.from("exams").insert([exam]).select("exam_id"); 

    if (error) {
      throw new Error(`Failed to insert exam: ${error.message}`);
    }

    return data; 
  } catch (error) {
    throw new Error("Failed to create exam");
  }
}

export async function uploadExamQuestions(questions) {
  try {
    const { data, error } = await supabase.from("questions").insert(questions);

    if (error) {
      throw new Error(`Failed to insert questions: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw new Error("Failed to create questions");
  }
}

export async function createExamWithQuestions(exam, questions, showModal) {
  try {
    // 1. Insert exam
    const { data: examData, error: examError } = await supabase
      .from("exams")
      .insert([exam])
      .select("exam_id");

    if (examError || !examData || !examData[0]) {
      throw new Error("Failed to create exam");
    }

    const examId = examData[0].exam_id;
    console.log("Exam created with ID:", examId);

    // 2. Attach exam_id to all questions and remove question_id if it exists
    const questionsWithExamId = questions.map(({ question_id, ...q }) => ({
      ...q,
      exam_id: examId,
    }));

    console.log("Questions with exam_id:", questionsWithExamId);

    // 3. Insert questions
    const { error: questionError } = await supabase
      .from("questions")
      .insert(questionsWithExamId);

    if (questionError) {
      throw new Error("Failed to upload questions");
    }

    return { success: true, examId };
  } catch (err) {
    showModal?.("error", "Error", err.message || "Something went wrong");
    return { success: false };
  }
}


// 4. Get Questions for an exam
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

export async function submitExam(examId, studentId, answers, mode) {
  let updateFields = {
    answers: answers,
  };

  if (mode === "finalsubmit") {
    // const { data: questions, error: questionsError } = await supabase
    //   .from("questions")
    //   .select("question_id, correct_option, marks, negative_marks")
    //   .eq("exam_id", examId);

    // if (questionsError) {
    //   return { success: false, message: "Failed to fetch questions" };
    // }

    let totalMarks = 0;
    // questions.forEach((question) => {
    //   const studentAnswer = answers[question.question_id];
    //   if (studentAnswer !== undefined) {
    //     if (studentAnswer === question.correct_option) {
    //       totalMarks += question.marks;
    //     }
    //   }
    // });

    updateFields.marks_scored = totalMarks;
    updateFields.student_status = "submitted";
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

export const getStudentExamDetails = async (examId, studentId) => {
  try {
    // 1. Fetch exam details
    const { data: examData, error: examError } = await supabase
      .from("exams")
      .select(
        "exam_id, title, course, duration_minutes, exam_status, scheduled_date"
      )
      .eq("exam_id", examId)
      .single();

    if (examError) throw examError;

    // 2. Fetch started_at from studentReport
    const { data: reportData, error: reportError } = await supabase
      .from("studentReport")
      .select("student_name, roll_no, started_at, student_status,  email")
      .eq("exam_id", examId)
      .eq("student_report_id", studentId)
      .single();

    if (reportError) throw reportError;
    return {
      ...examData,
      started_at: reportData?.started_at,
      student_status: reportData?.student_status,
      studentName: reportData?.student_name,
      rollNo: reportData?.roll_no,
      email: reportData?.email,
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
      student_status: "in progress",
    })
    .eq("student_report_id", studentId)
    .select("started_at");

  if (error) {
    console.error(error);
    return { success: false };
  }

  return { success: true, started_at: data[0].started_at };
}

export async function updatePassMark(examId, passMark) {
  const { error } = await supabase
    .from("exams")
    .update({ pass_mark: Number(passMark) })
    .eq("exam_id", examId);

  if (error) {
    alert("Failed to update pass mark!");
    return;
  }
}