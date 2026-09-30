import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { retryLastWrite, useStore } from "../store.js";
import { InlineError } from "./ui/InlineError.jsx";
import { Button, IconButton } from "./ui/Button.jsx";

const DialogClose = createContext(null);
const TABBABLE =
  'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])';

// The guarded close of the nearest Dialog: asks "Discard changes?" first when
// the dialog is dirty. Use it for Cancel buttons inside a sheet.
export const useDialogClose = () => useContext(DialogClose);

// For a form inside a Dialog: reports whether `snapshot` (any string of the
// form's values) changed since the first render, so the parent can pass
// `dirty` to its Dialog (DS-15).
export function useReportDirty(snapshot, onDirty) {
  const initial = useRef(snapshot);
  const dirty = snapshot !== initial.current;
  useEffect(() => {
    onDirty?.(dirty);
  }, [dirty]);
  return dirty;
}

export function DialogCancel({ children = "Cancel", ...props }) {
  const close = useDialogClose();
  return (
    <Button {...props} onClick={close}>
      {children}
    </Button>
  );
}

// Modal dialog and phone bottom sheet (CMP-04, DS-15, A11Y-04). showModal()
// makes the page inert, so Tab stays inside; initial focus goes to
// `initialFocusRef` or the first field; the heading names the dialog; closing
// returns focus to the control that opened it. With `dirty`, Escape, × and
// Cancel ask "Discard changes?" before closing, and leaving the page warns.
export function Dialog({
  title,
  onClose,
  children,
  initialFocusRef,
  className = "",
  dirty = false,
  discardMessage = "Your changes aren't saved yet.",
}) {
  const ref = useRef(null);
  const titleId = useId();
  const { error } = useStore();
  const [asking, setAsking] = useState(false);
  const latest = useRef({ dirty, onClose });
  latest.current = { dirty, onClose };
  const requestClose = () => {
    if (latest.current.dirty) setAsking(true);
    else latest.current.onClose();
  };
  useEffect(() => {
    const node = ref.current;
    const previous = document.activeElement;
    node.showModal();
    (
      initialFocusRef?.current ||
      node.querySelector(
        "input:not([type=hidden]), select, textarea, button:not([aria-label^='Close'])",
      )
    )?.focus();
    return () => {
      node.close();
      // Only return focus to a control that is still on screen (a nested
      // confirm closes with its parent dialog).
      if (previous?.isConnected && !previous.closest("dialog:not([open])"))
        previous.focus();
    };
  }, []);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return (
    <dialog
      ref={ref}
      className={`app-dialog ${className}`.trim()}
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        // showModal() makes the page inert but lets Tab reach the browser's
        // own controls; wrap it so focus stays in the dialog (A11Y-04).
        if (e.key !== "Tab" || e.target.closest("dialog") !== e.currentTarget)
          return;
        const stops = [...e.currentTarget.querySelectorAll(TABBABLE)].filter(
          (node) =>
            node.tabIndex >= 0 &&
            node.closest("dialog") === e.currentTarget &&
            node.getClientRects().length > 0,
        );
        const first = stops[0];
        const last = stops.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        if (!asking) requestClose();
      }}
    >
      <DialogClose.Provider value={requestClose}>
        <header>
          <h2 id={titleId}>{title}</h2>
          <IconButton
            label={`Close ${title}`}
            icon={X}
            onClick={requestClose}
          />
        </header>
        <InlineError message={error} onRetry={retryLastWrite} />
        {children}
      </DialogClose.Provider>
      {asking && (
        <DiscardDialog
          message={discardMessage}
          onKeep={() => setAsking(false)}
          onDiscard={() => {
            setAsking(false);
            latest.current.onClose();
          }}
        />
      )}
    </dialog>
  );
}

// Portaled to <body> so the confirm is not a child of the sheet: the sheet's
// body margins (.app-dialog > *) never reach it, and it opens as its own
// bottom sheet (phones) or centered dialog.
function DiscardDialog({ message, onKeep, onDiscard }) {
  return createPortal(
    <Dialog title="Discard changes?" onClose={onKeep}>
      <p>{message}</p>
      <div className="confirm-actions">
        <Button onClick={onKeep}>Keep editing</Button>
        <Button variant="destructive" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </Dialog>,
    document.body,
  );
}
