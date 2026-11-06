import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import MonthGrid from "../../pages/Schedule/MonthGrid.jsx";
import { useFieldInvalid } from "./FieldError.jsx";
import { addDays, getDateKey } from "../../domain/timing.js";
import { formatDate } from "../../format.js";

const GAP = 4;
const EDGE = 8;
const dateOf = (key) => new Date(`${key}T12:00:00`);
const monthOf = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

// From 768px the picker is a popover under the button (above it when there
// is more room there); on phones the stylesheet makes it a bottom sheet.
function place(panel, button) {
  if (!window.matchMedia("(min-width: 768px)").matches) {
    panel.style.left = panel.style.top = "";
    return;
  }
  const spot = button.getBoundingClientRect();
  const size = panel.getBoundingClientRect();
  const below = window.innerHeight - spot.bottom - GAP - EDGE;
  const up = size.height > below && spot.top > below;
  panel.style.left = `${Math.max(EDGE, Math.min(spot.left, window.innerWidth - size.width - EDGE))}px`;
  panel.style.top = `${Math.max(EDGE, up ? spot.top - GAP - size.height : spot.bottom + GAP)}px`;
}

// The field's box (border, fill, focus and invalid borders) is a wrapper, so
// the button inside is not an outlined button (R13).
const FieldBox = ({ icon, children }) =>
  icon ? children : <div className="date-field-box">{children}</div>;

// DateField (UX-CMP-09): a labelled button showing the app's date ("Tue,
// Oct 13") that opens the month grid: a bottom sheet on phones, a popover
// from 768px. `value` and `onChange` use "YYYY-MM-DD" ("" for none). Days
// outside `min`/`max` are disabled. A field that is not `required` offers
// "Clear date". Arrow keys move through the grid, Enter picks, Escape closes
// only the picker. With `icon`, the button is a 44px icon button named by
// `label` (Log's day picker). The picker is named "Choose a date", never
// after the field, so a label lookup finds only the button.
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  required = false,
  field,
  icon = false,
  placeholder = "Choose a date",
  id: idProp,
  className = "",
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const invalid = useFieldInvalid(field);
  const button = useRef(null);
  const panel = useRef(null);
  const [open, setOpen] = useState(false);
  const todayKey = getDateKey(new Date());
  const start = () => {
    const key = value || todayKey;
    if (min && key < min) return min;
    if (max && key > max) return max;
    return key;
  };
  const [pending, setPending] = useState(start);
  const [monthCursor, setMonthCursor] = useState(() =>
    monthOf(dateOf(pending)),
  );
  const gridStart = addDays(monthCursor, -monthCursor.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) =>
    addDays(gridStart, index),
  );

  // The browser closes the popover on Escape or a click outside; keep the
  // state in step and hand focus back to the button.
  useEffect(() => {
    const node = panel.current;
    if (!node) return undefined;
    const onToggle = (event) => {
      const isOpen = event.newState === "open";
      setOpen(isOpen);
      if (
        !isOpen &&
        (node.contains(document.activeElement) ||
          !document.activeElement ||
          document.activeElement === document.body)
      )
        button.current?.focus();
    };
    node.addEventListener("toggle", onToggle);
    return () => node.removeEventListener("toggle", onToggle);
  }, []);

  useLayoutEffect(() => {
    const node = panel.current;
    if (!open || !node || !button.current) return undefined;
    const follow = () => place(node, button.current);
    follow();
    node.querySelector(`[data-key="${pending}"]`)?.focus();
    window.addEventListener("resize", follow);
    window.addEventListener("scroll", follow, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", follow);
      window.removeEventListener("scroll", follow, { capture: true });
    };
  }, [open]);

  const show = () => {
    const key = start();
    setPending(key);
    setMonthCursor(monthOf(dateOf(key)));
    panel.current?.showPopover?.();
  };
  const close = () => panel.current?.hidePopover?.();
  const text = value
    ? formatDate(value, { year: value.slice(0, 4) !== todayKey.slice(0, 4) })
    : placeholder;

  return (
    <div
      className={`${icon ? "date-field date-field-icon" : "field date-field"} ${className}`.trim()}
    >
      {!icon && (
        <label id={`${id}-label`} htmlFor={id}>
          {label}
        </label>
      )}
      <FieldBox icon={icon}>
        <button
          ref={button}
          type="button"
          id={id}
          className={icon ? "icon-button" : "date-field-button"}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={icon ? label : undefined}
          aria-labelledby={icon ? undefined : `${id}-label ${id}-value`}
          {...invalid}
          onClick={() => (open ? close() : show())}
        >
          {!icon && (
            <span
              id={`${id}-value`}
              className={value ? undefined : "date-field-placeholder"}
            >
              {text}
            </span>
          )}
          <CalendarDays size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </FieldBox>
      <div
        ref={panel}
        popover="auto"
        role="dialog"
        aria-label="Choose a date"
        className="date-popover"
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          // Close only the picker, not the sheet it sits in.
          event.preventDefault();
          event.stopPropagation();
          close();
        }}
      >
        {open && (
          <>
            <MonthGrid
              monthCursor={monthCursor}
              setMonthCursor={setMonthCursor}
              calendarDays={calendarDays}
              todayKey={todayKey}
              selectedKey={pending}
              selectDay={(date) => {
                setPending(getDateKey(date));
                setMonthCursor(monthOf(date));
              }}
              onPick={(date) => {
                onChange(getDateKey(date));
                close();
              }}
              min={min}
              max={max}
            />
            {!required && value && (
              <button
                type="button"
                className="text-button date-clear"
                onClick={() => {
                  onChange("");
                  close();
                }}
              >
                Clear date
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
