import React, { useEffect, useState } from "react";

const QuestionTable = ({ questions }) => {
  const [processedQuestions, setProcessedQuestions] = useState([]);

  useEffect(() => {
    if (!questions) return;

    const processed = questions.map((q) => {
      const correctOption =
        q.options && q.correct_option !== undefined
          ? q.options[q.correct_option] 
          : "N/A";

      return {
        id: q.question_id,
        text: q.question_text,
        correctOption,
        correctAnswers: "",
        incorrectAnswers: "",
      };
    });

    setProcessedQuestions(processed);
  }, [questions]);

  return (
    <div className="exam-report-questions-table">
      <div className="exam-report-table-wrapper">
        <table className="exam-report-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>Correct Option</th>
              {/* <th>Correct Answers</th>
              <th>Incorrect Answers</th> */}
            </tr>
          </thead>

          <tbody>
            {processedQuestions.map((question) => {
              return (
                <tr key={question.id} className="exam-report-table-row">
                  <td>{question.text}</td>
                  <td>{question.correctOption}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuestionTable;
