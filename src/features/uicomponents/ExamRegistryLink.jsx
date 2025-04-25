function ExamRegistryLink({examId}) {
  return (
    <div className="registry-link">
      <span>
        Exam Registry Link:
        <code>{`https://yourdomain.com/exam/register/${examId}`}</code>
      </span>
      <button
        onClick={() => {
          navigator.clipboard.writeText(
            `https://yourdomain.com/exam/register/${examId}`
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