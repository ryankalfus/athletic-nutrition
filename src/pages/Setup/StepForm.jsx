import { useState } from "react";
import { FieldErrors, FormError } from "../../components/ui/FieldError.jsx";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";

// One step's form: title, fields, inline error and the pinned action bar.
// onNext returns true, a message about the form, or { message, field } for
// an error shown under that field (A11Y-09).
export function StepForm({
  title,
  helper,
  children,
  onNext,
  nextLabel = "Next",
  onSkipAll,
}) {
  const [error, setError] = useState(null);
  const { pending, run } = useAsyncAction();
  return (
    <form
      className="setup-step"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        run("next", async () => {
          const result = await onNext();
          if (result && result !== true) setError(result);
          return result === true;
        });
      }}
    >
      {title}
      {helper && <p className="setup-helper">{helper}</p>}
      <FieldErrors error={error}>
        <div className="setup-fields">{children}</div>
        <FormError />
      </FieldErrors>
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
