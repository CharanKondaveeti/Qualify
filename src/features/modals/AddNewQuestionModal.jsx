import OptionEditor from "../../ui/css/OpenEditor";

function AddNewModal({
  newQuestion,
  setNewQuestion,
  setIsAddModalOpen,
  handleAddClick,
}) {
  return (
    <div className="modal-overlay">
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
              const newOptions = [...newQuestion.options];
              newOptions[i] = val;
              setNewQuestion({ ...newQuestion, options: newOptions });
            }}
            onCorrectSelect={(i) =>
              setNewQuestion({ ...newQuestion, correct_option: i })
            }
          />
        </div>
        <button className="add-btn" onClick={handleAddClick}>
          Add Question
        </button>
        <button className="cancel-btn" onClick={() => setIsAddModalOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default AddNewModal;
