function ExamModal({ modal, confirmSubmit , closeModal, isSubmitting }) {
  return (
    modal.show && (
      <div className="modal-overlay">
        <div className={`modal-container ${modal.type}`}>
          <div className="modal-header">
            <h3>{modal.title}</h3>
            {modal.type !== "submit" && (
              <button onClick={closeModal} className="modal-close">
                <FiX />
              </button>
            )}
          </div>

          <div className="modal-body">
            <p>{modal.message}</p>
          </div>

          <div className="modal-footer">
            {modal.type === "submit" ? (
              <>
                <button
                  onClick={confirmSubmit}
                  className="modal-confirm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="button-spinner">
                      <div className="spinner" />
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    "Confirm Submit"
                  )}
                </button>

                <button
                  onClick={closeModal}
                  className="modal-cancel"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={closeModal} className="modal-ok">
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    )
  );
}

export default ExamModal;