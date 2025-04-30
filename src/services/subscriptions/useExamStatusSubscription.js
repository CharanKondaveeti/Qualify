import { useEffect } from "react";
import supabase from "../supabase";

export function useExamStatusSubscription(examId, setStudentExamDetails) {
  useEffect(() => {
    const channel = supabase
      .channel("exam-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "exams",
          filter: `exam_id=eq.${examId}`,
        },
        (payload) => {
          const newStatus = payload.new.exam_status;

          setStudentExamDetails((prev) => ({
            ...prev,
            exam_status: newStatus,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [examId, setStudentExamDetails]);
}
