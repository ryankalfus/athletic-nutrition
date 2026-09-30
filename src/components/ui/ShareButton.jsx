import { useState } from "react";
import { Share2 } from "lucide-react";
import { showToast } from "./Toast.jsx";
import {
  SHARE_MESSAGES,
  shareActionLabel,
  shareOrCopy,
} from "../../domain/share.js";

// ADD-06: "Share list" (Web Share) or "Copy list" (clipboard fallback).
// `getText` builds the plain-text list at click time. `iconOnly` draws a 44px
// icon button (a crowded toolbar) and keeps the words for screen readers.
export function ShareButton({
  title,
  getText,
  disabled = false,
  label,
  iconOnly = false,
}) {
  const [busy, setBusy] = useState(false);
  const action = shareActionLabel();
  return (
    <button
      type="button"
      className={`share-button${iconOnly ? " icon-button" : ""}`}
      disabled={disabled || busy}
      aria-label={label ? `${action}: ${label}` : undefined}
      onClick={async () => {
        setBusy(true);
        try {
          const result = await shareOrCopy({ title, text: getText() });
          if (SHARE_MESSAGES[result]) showToast(SHARE_MESSAGES[result]);
        } catch (error) {
          showToast(error.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Share2 size={18} strokeWidth={1.75} aria-hidden="true" />
      {iconOnly ? <span className="sr-only">{action}</span> : action}
    </button>
  );
}
