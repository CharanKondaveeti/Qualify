function QuestionPalette({
  progressPercentage,
  questions,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  answers,
  handleSubmit,
  isSubmitted,
  answeredCount,
}) {
  return (
    <div className="question-palette">
      <h3>Question Palette</h3>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progressPercentage}%` }}
        ></div>
        <div className="progress-text">
          {answeredCount}/{questions.length} answered
        </div>
      </div>
      <div className="question-grid">
        {questions.map((q, index) => (
          <button
            key={q.question_id}
            className={`question-number ${
              currentQuestionIndex === index ? "current" : ""
            } ${answers[q.question_id] !== undefined ? "answered" : ""}`}
            onClick={() => setCurrentQuestionIndex(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        className="submit-button"
        disabled={isSubmitted}
      >
        Submit Exam
      </button>
    </div>
  );
}

export default QuestionPalette;