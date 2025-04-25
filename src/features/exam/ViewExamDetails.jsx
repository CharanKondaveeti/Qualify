import "./css/viewExamDetails.css";

import { useLocation } from "react-router-dom";
import ExamHeader from "../../ui/ExamHeader";
import ExamRegistryLink from "../uicomponents/ExamRegistryLink";
import UpcomingExamNotice from "../uicomponents/UpcomingExamNotice";
import UpcomingExamDetails from "./UpcomingExamDetails";
import SummaryGrid from "../../ui/SummaryGrid";
import PerformanceOverview from "../../ui/PerformanceOverview";
import AccordionSection from "../../ui/AccordionSection";
import StudentTable from "../../ui/StudentTable";
import QuestionTable from "../../ui/QuestionTable";
import { useEffect, useState } from "react";
import { getQuestions, getStudentsReport } from "../../services/admin";

function ViewExamDetails() {
  const location = useLocation();
  const exam = location.state?.exam;
    const [questions, setQuestions] = useState([]);
    const [students, setStudents] = useState([]);

      useEffect(() => {
        fetchQuestions();
        fetchStudentReports();
      }, [exam.exam_id]);
    
      const fetchQuestions = async () => {
        try {
          const response = await getQuestions(exam.exam_id);
          setQuestions(response);
        } catch (error) {
          console.error("Error fetching questions:", error);
        }
      };
    
      const fetchStudentReports = async () => {
        try {
          const studentData = await getStudentsReport(exam.exam_id);
          setStudents(studentData);
        } catch (error) {
          console.error("Error fetching student data:", error);
        }
      };

  return (
    <div className="view-exam-details">
      <ExamHeader exam={exam} />
      {exam.status === "upcoming" && <ExamRegistryLink examId={exam.exam_id} />}
      {exam.status === "upcoming" && <UpcomingExamNotice />}
      {exam.status === "upcoming" && (
        <UpcomingExamDetails students={students} questions={questions} setQuestions={setQuestions} examId={exam.exam_id} />
      )}
      {exam.status !== "upcoming" && <SummaryGrid />}
      {exam.status === "active" && <PerformanceOverview />}
      {exam.status !== "upcoming" && <StudentTable students={students} />}
      {exam.status !== "upcoming" && <QuestionTable questions={questions}/>}
    </div>
  );
}

export default ViewExamDetails;
