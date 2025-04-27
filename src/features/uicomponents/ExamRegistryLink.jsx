function ExamRegistryLink({examId}) {
  return (
    <div className="registry-link">
      <span>
        Exam Registry Link:
        <code>{`http://localhost:5173/register/exam/${examId}`}</code>
      </span>
      <button
        onClick={() => {
          navigator.clipboard.writeText(
            `http://localhost:5173/register/exam/${examId}`
          );
        }}
        className="copy-btn"
        title="Copy to clipboard"
      >
        📋
      </button>
    </div>
  );
}

export default ExamRegistryLink;