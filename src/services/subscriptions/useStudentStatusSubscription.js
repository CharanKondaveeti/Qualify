import { useEffect } from "react";
import supabase from "../supabase";

export function useStudentStatusSubscription(
  examId,
  studentId,
  setStudentExamDetails
) {
  useEffect(() => {
    const channel = supabase
      .channel("student-status-channel")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "studentReport",
          filter: `exam_id=eq.${examId}`,
        },
        (payload) => {
          const updatedRow = payload.new;
          if (updatedRow.student_report_id === studentId) {

            setStudentExamDetails((prev) => ({
              ...prev,
              student_status: updatedRow.exam_status,
              marks_scored: updatedRow.marks_scored,
              answers: updatedRow.answers,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [examId, studentId, setStudentExamDetails]);
}
