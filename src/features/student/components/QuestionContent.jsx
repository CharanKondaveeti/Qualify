function QuestionContent({
  currentQuestion,
  answers,
  handleAnswerChange,
  isSubmitted,
}) {
  return (
    <section className="question-content" aria-label="Current question">
      <h3>{currentQuestion.question_text}</h3>
      <div className="options-list">
        {currentQuestion.options.map((option, index) => {
          const isSelected = answers[currentQuestion.question_id] === index;
          return (
            <button
              type="button"
              disabled={isSubmitted}
              aria-pressed={isSelected}
              key={index}
              className={`option-item ${isSelected ? "selected" : ""}`}
              onClick={() => !isSubmitted && handleAnswerChange(currentQuestion.question_id, index)}
            >
              <span className="option-selector" aria-hidden="true">
                <span className={`option-circle ${isSelected ? "selected" : ""}`} />
              </span>
              <span className="option-text">{option}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default QuestionContent;
