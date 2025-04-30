import { useQuery } from "@tanstack/react-query";
import { getExamWithStartTime, getQuestions } from "./admin";

export function useExamDetails(examId, studentId) {
  return useQuery({
    queryKey: ["examDetails", examId, studentId],
    queryFn: () => getExamWithStartTime(examId, studentId),
    enabled: !!examId && !!studentId,
  });
}

export function useQuestions(examId) {
  return useQuery({
    queryKey: ["questions", examId],
    queryFn: () => getQuestions(examId),
    enabled: !!examId,
  });
}