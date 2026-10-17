import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLoader from "../../../shared/components/PageLoader";
import { resetDemoStudentAttempt } from "../../../lib/demoClient";

export default function DemoStudentEntry() {
  const navigate = useNavigate();

  useEffect(() => {
    resetDemoStudentAttempt();
    navigate("/demo/student/exam", { replace: true });
  }, [navigate]);

  return <PageLoader />;
}
