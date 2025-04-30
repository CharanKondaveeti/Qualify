import { useState } from "react";

const useModal = () => {
  const [modal, setModal] = useState({
    show: false,
    type: "info", // 'info' | 'success' | 'error' | 'submit'
    title: "",
    message: "",
    onConfirm: null,
  });

  const showModal = (type, title, message, onConfirm = null) => {
    setModal({ show: true, type, title, message, onConfirm });
  };

  // const closeModal = () => setModal({ ...modal, show: false });

  return {
    modal,
    showModal,
    // closeModal,
  };
};

export default useModal;
