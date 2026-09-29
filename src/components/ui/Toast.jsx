import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function showToast(message, undo, action) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("nourally:toast", { detail: { message, undo, action } }),
  );
}

export function useToast() {
  return showToast;
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    const onToast = (event) => setToast({ ...event.detail, id: Date.now() });
    const clear = () => setToast(null);
    window.addEventListener("nourally:toast", onToast);
    window.addEventListener("hashchange", clear);
    return () => {
      window.removeEventListener("nourally:toast", onToast);
      window.removeEventListener("hashchange", clear);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(
      () => setToast(null),
      toast.undo ? 10000 : 6000,
    );
    return () => window.clearTimeout(timer);
  }, [toast]);
  return (
    <>
      {children}
      {toast && (
        <div className="app-toast" role="status">
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action.onClick();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
          {toast.undo && (
            <button
              type="button"
              onClick={async () => {
                let ok = false;
                try {
                  ok = await toast.undo();
                } catch {
                  ok = false;
                }
                setToast({
                  message: ok
                    ? "Undone."
                    : "This changed again, so it could not be undone.",
                  id: Date.now(),
                });
              }}
            >
              Undo
            </button>
          )}
          <button
            className="toast-dismiss"
            type="button"
            aria-label="Dismiss message"
            onClick={() => setToast(null)}
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
