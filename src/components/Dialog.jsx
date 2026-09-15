import { useEffect, useRef } from "react";
export function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    const previous = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="app-dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" aria-label={`Close ${title}`} onClick={onClose}>
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
