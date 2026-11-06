import { useEffect, useId, useRef, useState } from "react";
import { Combobox } from "./Combobox.jsx";
import { formatTimeInput, parseTime, timeOptions } from "../../format.js";

const OPTIONS = timeOptions(15);

// TimeField (UX-CMP-09): a labelled time box on the accessible Combobox. It
// shows the app's format ("4:00 PM", never "04:00 PM"), suggests times every
// 15 minutes and accepts what is typed ("4:10p", "4p", "16:00"). `value` and
// `onChange` use "HH:MM"; text that is not a time yet reports "" so the
// form's own "Choose a start time." error covers it. On blur the box shows
// the saved time again. `label` may hold an Optional tag. The chevron and the
// list are named "Suggested times", never after the field, so a label lookup
// ("Starts") finds only the box.
export function TimeField({
  label,
  value,
  onChange,
  field,
  id: idProp,
  className = "",
  ...props
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const [text, setText] = useState(() => formatTimeInput(value));
  const editing = useRef(false);
  useEffect(() => {
    if (!editing.current) setText(formatTimeInput(value));
  }, [value]);
  return (
    <div className={`field time-field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <Combobox
        {...props}
        id={id}
        field={field}
        value={text}
        options={OPTIONS}
        listLabel="Suggested times"
        inputMode="text"
        onFocus={() => {
          editing.current = true;
        }}
        onChange={(next) => {
          setText(next);
          onChange(parseTime(next) ?? "");
        }}
        onBlur={() => {
          editing.current = false;
          setText(formatTimeInput(value));
        }}
      />
    </div>
  );
}
