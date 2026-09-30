import { SPORT_SUGGESTIONS } from "../../domain/sport.js";
import { FieldError, Input } from "../../components/ui/FieldError.jsx";

export function SportField({ value, onChange, required = false }) {
  // Field, then its error, then the hint (DS-13): the message sits right
  // under the box it describes.
  return (
    <div className="field">
      <label>
        Sport {!required && <span className="optional-label">Optional</span>}
        <Input
          field="sport"
          className="suggest-input"
          value={value || ""}
          list="sport-suggestions"
          maxLength={40}
          autoComplete="off"
          aria-required={required || undefined}
          aria-describedby="sport-hint"
          onChange={(event) => onChange(event.target.value)}
          placeholder="e.g. Soccer"
        />
        <datalist id="sport-suggestions">
          {SPORT_SUGGESTIONS.map((sport) => (
            <option key={sport} value={sport} />
          ))}
        </datalist>
      </label>
      <FieldError field="sport" />
      <span id="sport-hint" className="muted field-hint">
        New activities are named after it, like “Soccer practice”.
      </span>
    </div>
  );
}
