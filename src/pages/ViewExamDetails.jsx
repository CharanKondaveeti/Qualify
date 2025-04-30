import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ExamRegistryLink from "../components/ExamRegistryLink";
import UpcomingExamNotice from "../components/UpcomingExamNotice";
import StudentQuesTab from "../components/studetns_questions";
import SummaryGrid from "../components/SummaryGrid";
import ExamHeader from "../components/ExamHeader";
import { useParams } from "react-router-dom";
import { getExams, getQuestions } from "../services/exam";
import { getStudentsReport } from "../services/student";
import "./css/viewExamDetailss.css";

function ViewExamDetails() {
  const { examId } = useParams(); 
  const {
    data: exams = [],
  } = useQuery({ queryKey: ["exams"], queryFn: getExams });
  const exam = exams?.find((e) => e.exam_id === examId);
  console.log("Exams data:", exam);
  const [passMark, setPassMark] = useState(exam?.pass_mark || 0);

  const {
    data: questions = [],
  } = useQuery({
    queryKey: ["questions", exam?.exam_id],
    queryFn: () => getQuestions(exam.exam_id),
    enabled: !!exam?.exam_id,
  });

  const {
    data: students = [],
  } = useQuery({
    queryKey: ["students-report", exam?.exam_id],
    queryFn: () => getStudentsReport(exam.exam_id),
    enabled: !!exam?.exam_id,
  });

  const isUpcoming = exam?.exam_status === "upcoming";
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
          examStatus={exam?.exam_status}
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
