import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

function QuestionHeader({
  currentQuestionIndex,
  totalQuestions,
  handleQuestionNavigation,
}) {
  return (
    <div className="question-header">
      <span className="question-counter">
        Question {currentQuestionIndex + 1} of {totalQuestions}
      </span>
      <div className="question-nav-buttons">
        <button
          onClick={() => handleQuestionNavigation("prev")}
          disabled={currentQuestionIndex === 0}
        >
          <FiChevronLeft /> Previous
        </button>
        <button
          onClick={() => handleQuestionNavigation("next")}
          disabled={currentQuestionIndex === totalQuestions - 1}
        >
          Next <FiChevronRight />
        </button>
      </div>
    </div>
  );
}

export default QuestionHeader;
