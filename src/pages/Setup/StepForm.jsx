import { useState } from "react";
import { InlineError } from "../../components/ui/InlineError.jsx";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";

// One step's form: title, fields, inline error and the pinned action bar.
export function StepForm({
  title,
  helper,
  children,
  onNext,
  nextLabel = "Next",
  onSkipAll,
}) {
  const [error, setError] = useState("");
  const { pending, run } = useAsyncAction();
  return (
    <form
      className="setup-step"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        run("next", async () => {
          const result = await onNext();
          if (typeof result === "string") setError(result);
          return result === true;
        });
      }}
    >
      {title}
      {helper && <p className="setup-helper">{helper}</p>}
      <div className="setup-fields">{children}</div>
      <InlineError message={error} />
      <div className="setup-actions">
        {onSkipAll && (
          <button
            type="button"
            className="text-button"
            onClick={() => onSkipAll()}
          >
            Skip setup
          </button>
        )}
        <button
          type="submit"
          className="primary"
          disabled={!!pending}
          aria-busy={pending ? true : undefined}
        >
          {pending ? "Saving…" : nextLabel}
        </button>
      </div>
    </form>
  );
}
