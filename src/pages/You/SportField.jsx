import { SPORT_SUGGESTIONS } from "../../domain/sport.js";
import { FieldError, Input } from "../../components/ui/FieldError.jsx";

export function SportField({ value, onChange, required = false }) {
  return (
    <>
      <label>
        Sport {!required && <span className="optional-label">Optional</span>}
        <Input
          field="sport"
          value={value || ""}
          list="sport-suggestions"
          maxLength={40}
          autoComplete="off"
          aria-required={required || undefined}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Soccer"
        />
        <datalist id="sport-suggestions">
          {SPORT_SUGGESTIONS.map((sport) => (
            <option key={sport} value={sport} />
          ))}
        </datalist>
        <span className="muted field-hint">
          New activities are named after it, like “Soccer practice”.
        </span>
      </label>
      <FieldError field="sport" />
    </>
  );
}
