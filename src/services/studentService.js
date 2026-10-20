import supabase from "../lib/supabase";

export async function getStudentsReport(exam_id) {
  const { data, error } = await supabase
    .from("studentReport")
    .select("student_report_id,exam_id,student_name,email,roll_no,student_status,started_at,deadline,submitted_at,marks_scored,last_seen_at,time_bonus_minutes,created_at")
    .eq("exam_id", exam_id);

  if (error) {
    throw new Error("Student report could not be loaded: " + error.message);
  }

  return data;
}
