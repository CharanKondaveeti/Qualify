import OptionEditor from "../components/OptionEditor";

export default function AddNewModal({
  newQuestion,
  setNewQuestion,
  setIsAddModalOpen,
  handleAddClick,
  markingMode = "custom",
}) {
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target.tagName === "INPUT") {
          event.preventDefault();
        }
      }}
    >
      <div className="modal-content">
        <h4>Add New Question</h4>

        <div className="form-group">
          <label>Question Text</label>
          <input
            type="text"
            value={newQuestion.question_text}
            onChange={(e) =>
              setNewQuestion({
                ...newQuestion,
                question_text: e.target.value,
              })
            }
          />
        </div>

        <div className="form-group">
          <label>Options</label>
          <OptionEditor
            options={newQuestion.options}
            correctOption={newQuestion.correct_option}
            onOptionChange={(i, val) => {
              const options = [...newQuestion.options];
              options[i] = val;

              setNewQuestion({
                ...newQuestion,
                options,
              });
            }}
            onCorrectSelect={(i) =>
              setNewQuestion({
                ...newQuestion,
                correct_option: i,
              })
            }
          />
        </div>

        <div className="form-group">
          <label htmlFor="new-question-marks">Marks for this Question</label>

          {markingMode === "custom" ? (
            <input
              id="new-question-marks"
              type="number"
              min="1"
              step="1"
              value={newQuestion.marks ?? ""}
              onChange={(e) =>
                setNewQuestion({
                  ...newQuestion,
                  marks: e.target.value,
                })
              }
            />
          ) : (
            <p>Marks are assigned automatically from the exam's Total Marks.</p>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => setIsAddModalOpen(false)}
          >
            Cancel
          </button>

          <button type="button" className="add-btn" onClick={handleAddClick}>
            Add Question
          </button>
        </div>
      </div>
    </div>
  );
}
