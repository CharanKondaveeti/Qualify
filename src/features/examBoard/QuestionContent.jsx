function QuestionContent({
  currentQuestion,
  answers,
  handleAnswerChange,
  isSubmitted,
}) {
  return (
    <div className="question-content">
      <h3>{currentQuestion.question_text}</h3>
      <div className="options-list">
        {currentQuestion.options.map((option, index) => {
          const isSelected = answers[currentQuestion.question_id] === index + 1;

          return (
            <div
              key={index}
              className={`option-item ${isSelected ? "selected" : ""}`}
              onClick={() =>
                !isSubmitted &&
                handleAnswerChange(currentQuestion.question_id, index + 1)
              }
            >
              <div className="option-selector">
                <div
                  className={`option-circle ${isSelected ? "selected" : ""}`}
                ></div>
              </div>
              <div className="option-text">{option}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default QuestionContent;
