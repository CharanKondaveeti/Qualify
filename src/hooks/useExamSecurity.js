import { useEffect } from "react";

function useExamSecurity(isSubmitted, showModal) {
  useEffect(() => {
    const disableContextMenu = (e) => e.preventDefault();

    const blockKeys = (e) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
        (e.ctrlKey && e.key === "U")
      ) {
        e.preventDefault();
        if (showModal) {
          showModal(
            "warning",
            "Action Blocked",
            "Developer tools are disabled during the exam."
          );
        }
      }
    };

    const disableCopyPaste = (e) => e.preventDefault();

    window.addEventListener("contextmenu", disableContextMenu);
    document.addEventListener("keydown", blockKeys);
    document.addEventListener("copy", disableCopyPaste);
    document.addEventListener("paste", disableCopyPaste);

    return () => {
      window.removeEventListener("contextmenu", disableContextMenu);
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("copy", disableCopyPaste);
      document.removeEventListener("paste", disableCopyPaste);
    };
  }, [isSubmitted, showModal]);
}

export default useExamSecurity;
