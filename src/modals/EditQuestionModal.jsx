import OptionEditor from "../components/css/OpenEditor";

function EditQuestionModal({ editingQuestion, setEditingQuestion, handleSave }) {
  return (
    <div className="editor-modal">
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
              const updatedOptions = [...editingQuestion.options];
              updatedOptions[i] = val;
              setEditingQuestion({
                ...editingQuestion,
                options: updatedOptions,
              });
            }}
            onCorrectSelect={(i) =>
              setEditingQuestion({ ...editingQuestion, correct_option: i })
            }
          />
        </div>
        <div className="modal-actions">
          <button
            className="cancel-btn"
            onClick={() => setEditingQuestion(null)}
          >
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditQuestionModal;
