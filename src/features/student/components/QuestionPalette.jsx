function QuestionPalette({
  progressPercentage,
  questions,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  answers,
  flags = {},
  handleSubmit,
  isSubmitted,
  answeredCount,
}) {
  return (
    <aside className="question-palette" aria-label="Question navigation">
      <div className="question-palette__heading">
        <h2>Question Palette</h2>
        <p>{answeredCount} of {questions.length} answered</p>
      </div>
      <div className="progress-bar" role="progressbar" aria-label="Questions answered" aria-valuenow={answeredCount} aria-valuemin={0} aria-valuemax={questions.length}>
        <div className="progress-fill" style={{ width: `${progressPercentage}%` }} />
      </div>
      <div className="question-palette__legend" aria-label="Question status legend">
        <span><i className="question-palette__key current" />Current</span>
        <span><i className="question-palette__key unanswered" />Not answered</span>
        <span><i className="question-palette__key answered" />Answered</span>
        <span><i className="question-palette__key review" />Marked for review</span>
      </div>
      <div className="question-grid">
        {questions.map((q, index) => {
          const selected = currentQuestionIndex === index;
          const answered = answers[q.question_id] !== undefined && answers[q.question_id] !== null;
          const marked = Boolean(flags[q.question_id]);
          return (
            <button
              key={q.question_id}
              type="button"
              className={`question-number ${selected ? "current" : ""} ${answered ? "answered" : ""} ${marked ? "review" : ""}`}
              onClick={() => setCurrentQuestionIndex(index)}
              aria-current={selected ? "step" : undefined}
              aria-label={`Question ${index + 1}${answered ? ", answered" : ", not answered"}${marked ? ", marked for review" : ""}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <div className="question-palette__bottom">
        <p className="question-palette__hint">Use the palette or Previous / Next to move between questions.</p>
        <button type="button" onClick={handleSubmit} className="submit-button" disabled={isSubmitted}>
          Submit Exam
        </button>
      </div>
    </aside>
  );
}

export default QuestionPalette;
