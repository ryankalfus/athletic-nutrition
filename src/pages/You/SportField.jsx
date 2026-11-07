import { useId } from "react";
import { SPORT_SUGGESTIONS } from "../../domain/sport.js";
import { FieldError } from "../../components/ui/FieldError.jsx";
import { Combobox } from "../../components/ui/Combobox.jsx";

export function SportField({
  value,
  onChange,
  required = false,
  pushed = false,
}) {
  const id = useId();
  // Field, then its error (DS-13): the message sits right under the box it
  // describes. Any sport can be typed; the list only suggests common ones.
  // No helper line: it described the system, not the field (UX-COPY-05).
  return (
    <div className="field">
      <label htmlFor={id}>
        Sport {!required && <span className="optional-label">Optional</span>}
      </label>
      <Combobox
        pushed={pushed}
        id={id}
        field="sport"
        value={value || ""}
        onChange={onChange}
        options={SPORT_SUGGESTIONS}
        listLabel="Sport suggestions"
        maxLength={40}
        aria-required={required || undefined}
        placeholder="e.g. Soccer"
      />
      <FieldError field="sport" />
    </div>
  );
}
