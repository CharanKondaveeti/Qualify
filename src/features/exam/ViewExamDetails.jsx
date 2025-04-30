import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ExamHeader from "../../ui/ExamHeader";
import ExamRegistryLink from "../../components/ExamRegistryLink";
import UpcomingExamNotice from "../../components/UpcomingExamNotice";
import StudentQuesTab from "./studetns_questions";
import SummaryGrid from "../../ui/SummaryGrid";
import { getQuestions, getStudentsReport } from "../../services/admin";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import "./css/viewExamDetailss.css";

function ViewExamDetails() {
  const { examId } = useParams(); 
  const queryClient = useQueryClient();
  const cachedExams = queryClient.getQueryData(["exams"]);
  const exam = cachedExams?.find((e) => e.exam_id === examId);
  const [passMark, setPassMark] = useState(exam?.pass_mark);

  const {
    data: questions = [],
    isLoading: loadingQuestions,
    isError: errorQuestions,
  } = useQuery({
    queryKey: ["questions", exam?.exam_id],
    queryFn: () => getQuestions(exam.exam_id),
    enabled: !!exam?.exam_id,
  });

  const {
    data: students = [],
    isLoading: loadingStudents,
    isError: errorStudents,
  } = useQuery({
    queryKey: ["students-report", exam?.exam_id],
    queryFn: () => getStudentsReport(exam.exam_id),
    enabled: !!exam?.exam_id,
  });

  const isUpcoming = exam?.status === "upcoming";
  const isPastOrOngoing = !isUpcoming;

  return (
    <div className="view-exam-details">
      <ExamHeader exam={exam} />

      {isUpcoming && (
        <>
          <ExamRegistryLink examId={exam.exam_id} />
          <UpcomingExamNotice />
        </>
      )}

      {isPastOrOngoing && (
        <SummaryGrid
          examStatus={exam.status}
          students={students}
          exam={exam}
          passMark={passMark}
        />
      )}

      <StudentQuesTab
        students={students}
        questions={questions}
        examId={exam.exam_id}
        exam={exam}
        passMark={passMark}
        setPassMark={setPassMark}
      />
    </div>
  );
}

export default ViewExamDetails;
