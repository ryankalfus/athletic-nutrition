import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { retryLastWrite, useStore } from "../store.js";
import { InlineError } from "./ui/InlineError.jsx";

export function Dialog({
  title,
  onClose,
  children,
  initialFocusRef,
  className = "",
}) {
  const ref = useRef(null);
  const titleId = useId();
  const { error } = useStore();
  useEffect(() => {
    const node = ref.current;
    const previous = document.activeElement;
    node.showModal();
    (
      initialFocusRef?.current ||
      node.querySelector(
        "input, select, textarea, button:not([aria-label^='Close'])",
      )
    )?.focus();
    return () => {
      node.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`app-dialog ${className}`.trim()}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={`Close ${title}`}
          onClick={onClose}
        >
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </header>
      <InlineError message={error} onRetry={retryLastWrite} />
      {children}
    </dialog>
  );
}
