import { FiEdit2 } from "react-icons/fi";

function UpcomingExamNotice() {
  return (
       <div className="exam-report-edit-section">
                  <div className="exam-report-edit-header">
                    <FiEdit2 className="exam-report-edit-icon" />
                    <h2 className="exam-report-edit-title">Edit Exam</h2>
                  </div>
                  <p className="exam-report-edit-description">
                    This exam hasn't started yet. You can modify questions and
                    settings.
                  </p>
                </div>
  );
}

export default UpcomingExamNotice;