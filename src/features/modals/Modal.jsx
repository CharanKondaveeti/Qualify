import React from "react";
import { FiX } from "react-icons/fi";
import "./css/modal.css";

const Modal = ({ show, type, title, message, onClose, onConfirm }) => {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal-container ${type}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          {/* {type !== "submit" && (
            <button onClick={onClose} className="modal-close">
              <FiX />
            </button>
          )} */}
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          {type === "submit" ? (
            <>
              <button onClick={onConfirm} className="modal-confirm">
                Confirm
              </button>
              <button onClick={onClose} className="modal-cancel">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={onClose} className="modal-ok">
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
