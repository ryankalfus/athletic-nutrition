import { useId } from "react";
import { SPORT_SUGGESTIONS } from "../../domain/sport.js";
import { FieldError } from "../../components/ui/FieldError.jsx";
import { Combobox } from "../../components/ui/Combobox.jsx";

export function SportField({ value, onChange, required = false }) {
  const id = useId();
  // Field, then its error, then the hint (DS-13): the message sits right
  // under the box it describes. Any sport can be typed; the list only
  // suggests common ones.
  return (
    <div className="field">
      <label htmlFor={id}>
        Sport {!required && <span className="optional-label">Optional</span>}
      </label>
      <Combobox
        id={id}
        field="sport"
        value={value || ""}
        onChange={onChange}
        options={SPORT_SUGGESTIONS}
        listLabel="Sport suggestions"
        maxLength={40}
        aria-required={required || undefined}
        aria-describedby="sport-hint"
        placeholder="e.g. Soccer"
      />
      <FieldError field="sport" />
      <span id="sport-hint" className="muted field-hint">
        New activities are named after it, like “Soccer practice”.
      </span>
    </div>
  );
}
