import { SPORT_SUGGESTIONS } from "../../domain/sport.js";

export function SportField({ value, onChange, required = false }) {
  return (
    <label>
      Sport {!required && <span className="optional-label">Optional</span>}
      <input
        value={value || ""}
        list="sport-suggestions"
        maxLength={40}
        autoComplete="off"
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
  );
}
