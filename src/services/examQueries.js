// Admin-only question queries. Student pages MUST use secureExamService RPCs.
import { useQuery } from '@tanstack/react-query';
import { getQuestions } from './examService';
export function useAdminQuestions(examId) {
  return useQuery({queryKey:['questions',examId],queryFn:()=>getQuestions(examId),enabled:!!examId});
}
