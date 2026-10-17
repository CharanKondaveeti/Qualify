import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

function QuestionHeader({
  currentQuestionIndex,
  totalQuestions,
  questionMarks,
  handleQuestionNavigation,
}) {
  return (
    <div className="question-header">
      <div className="question-header__details">
        <h2 className="question-counter">Question {currentQuestionIndex + 1} of {totalQuestions}</h2>
        {Number.isFinite(Number(questionMarks)) && Number(questionMarks) > 0 && (
          <span className="question-marks">{Number(questionMarks)} {Number(questionMarks) === 1 ? "mark" : "marks"}</span>
        )}
      </div>
      <div className="question-nav-buttons">
        <button type="button" onClick={() => handleQuestionNavigation("prev")} disabled={currentQuestionIndex === 0}>
          <FiChevronLeft aria-hidden="true" /> Previous
        </button>
        <button type="button" className="question-nav-buttons__next" onClick={() => handleQuestionNavigation("next")} disabled={currentQuestionIndex === totalQuestions - 1}>
          Next <FiChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default QuestionHeader;
