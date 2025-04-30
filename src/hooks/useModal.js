import { useState } from "react";

const useModal = () => {
  const [modal, setModal] = useState({
    show: false,
    type: "info",
    title: "",
    message: "",
    onConfirm: null,
  });

  const showModal = (type, title, message, onConfirm = null) => {
    setModal({ show: true, type, title, message, onConfirm });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, show: false }));
  };

  return {
    modal,
    showModal,
    closeModal,
  };
};

export default useModal;
