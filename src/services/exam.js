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

export async function createNewQuestions(questions) {
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