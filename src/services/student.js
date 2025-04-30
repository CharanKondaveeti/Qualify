import supabase from "./supabase";

export async function getStudentsReport(exam_id) {
  const { data, error } = await supabase
    .from("studentReport")
    .select("*")
    .eq("exam_id", exam_id);

  if (error) {
    throw new Error("Student report could not be loaded: " + error.message);
  }

  return data;
}
