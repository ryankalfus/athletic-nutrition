import { TimeField } from "../../components/ui/TimeField.jsx";
import {
  FieldError,
  useFieldInvalid,
} from "../../components/ui/FieldError.jsx";

// Field groups shared by the school day editor, the activity sheet and setup
// steps 2 and 3 (ONB-02).

const DAYS = [
  ["S", 0, "Sunday"],
  ["M", 1, "Monday"],
  ["T", 2, "Tuesday"],
  ["W", 3, "Wednesday"],
  ["T", 4, "Thursday"],
  ["F", 5, "Friday"],
  ["S", 6, "Saturday"],
];

export function WeekdayPicker({ legend, value, onToggle, field }) {
  const invalid = useFieldInvalid(field);
  return (
    <fieldset {...invalid}>
      <legend>{legend}</legend>
      <div className="school-weekdays">
        {DAYS.map(([label, day, name]) => (
          <button
            type="button"
            key={day}
            aria-label={name}
            aria-pressed={value.includes(day)}
            onClick={() => onToggle(day)}
          >
            {label}
          </button>
        ))}
      </div>
      <FieldError field={field} />
    </fieldset>
  );
}

export function TimeRange({
  startLabel,
  endLabel,
  start,
  end,
  onStart,
  onEnd,
  className = "school-date-fields",
  field,
  startField,
  endField,
}) {
  const both = useFieldInvalid(field);
  const startOnly = useFieldInvalid(startField);
  const endOnly = useFieldInvalid(endField);
  return (
    <>
      {/* Start and end sit side by side at every width (UX-CMP-09). */}
      <div className={`${className} time-pair`}>
        <TimeField
          label={startLabel}
          required
          value={start}
          onChange={onStart}
          {...both}
          {...startOnly}
        />
        <TimeField
          label={endLabel}
          required
          value={end}
          onChange={onEnd}
          {...both}
          {...endOnly}
        />
      </div>
      <FieldError field={[field, startField, endField].filter(Boolean)} />
    </>
  );
}

export const toggleDay = (days, day) =>
  days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
