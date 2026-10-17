import OptionEditor from "../components/OptionEditor";

export default function EditQuestionModal({
  editingQuestion,
  setEditingQuestion,
  handleSave,
  markingMode = "custom",
}) {
  return (
    <div
      className="editor-modal"
      role="dialog"
      aria-modal="true"
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target.tagName === "INPUT") {
          event.preventDefault();
        }
      }}
    >
      <div className="modal-content">
        <h4>Edit Question</h4>

        <div className="form-group">
          <label>Question Text</label>
          <input
            type="text"
            value={editingQuestion.question_text}
            onChange={(e) =>
              setEditingQuestion({
                ...editingQuestion,
                question_text: e.target.value,
              })
            }
          />
        </div>

        <div className="form-group">
          <label>Options</label>
          <OptionEditor
            options={editingQuestion.options}
            correctOption={editingQuestion.correct_option}
            onOptionChange={(i, val) => {
              const options = [...editingQuestion.options];
              options[i] = val;

              setEditingQuestion({
                ...editingQuestion,
                options,
              });
            }}
            onCorrectSelect={(i) =>
              setEditingQuestion({
                ...editingQuestion,
                correct_option: i,
              })
            }
          />
        </div>

        <div className="form-group">
          <label htmlFor="edit-question-marks">Marks for this Question</label>

          <input
            id="edit-question-marks"
            type="number"
            min="1"
            step="1"
            value={editingQuestion.marks ?? ""}
            readOnly={markingMode === "automatic"}
            onChange={(e) =>
              setEditingQuestion({
                ...editingQuestion,
                marks: e.target.value,
              })
            }
          />

          {markingMode === "automatic" && (
            <small>
              Calculated from Total Marks. Select Custom marking to change this
              value.
            </small>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => setEditingQuestion(null)}
          >
            Cancel
          </button>

          <button type="button" className="save-btn" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
