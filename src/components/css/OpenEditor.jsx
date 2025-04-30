const OptionEditor = ({
  options,
  correctOption,
  onOptionChange,
  onCorrectSelect,
}) => {
  return options.map((opt, i) => (
    <div key={i} className="option-edit">
      <input
        type="text"
        value={opt}
        onChange={(e) => onOptionChange(i, e.target.value)}
      />
      <button
        className={`option-select ${i === correctOption ? "selected" : ""}`}
        onClick={(e) => {
          e.preventDefault();
          onCorrectSelect(i);
        }}
      >
        Correct
      </button>
    </div>
  ));
};

export default OptionEditor;