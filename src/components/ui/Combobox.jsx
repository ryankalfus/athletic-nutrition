import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "./FieldError.jsx";

const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const GAP = 4;
const EDGE = 8;

// Suggestions for what was typed: options that start with it first, then
// options that contain it. Nothing typed shows every option.
export function filterOptions(options, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return options;
  const starts = options.filter((o) => o.toLowerCase().startsWith(q));
  const contains = options.filter(
    (o) => !o.toLowerCase().startsWith(q) && o.toLowerCase().includes(q),
  );
  return [...starts, ...contains];
}

// Places the list under the box, or above it when there is more room there
// (the floor is the screen bottom or the phone tab bar below the box), and
// caps its height to the room it has.
function place(list, box) {
  const spot = box.getBoundingClientRect();
  const tabBar = document.querySelector(".frame-nav");
  const barTop =
    tabBar && getComputedStyle(tabBar).position === "fixed"
      ? tabBar.getBoundingClientRect().top
      : Infinity;
  const floor = Math.min(
    window.innerHeight,
    barTop > spot.bottom ? barTop : Infinity,
  );
  const below = floor - spot.bottom - GAP - EDGE;
  const above = spot.top - GAP - EDGE;
  list.style.maxHeight = "";
  const natural = Math.min(
    list.scrollHeight,
    parseFloat(getComputedStyle(list).maxHeight) || Infinity,
  );
  const up = natural > below && above > below;
  list.style.left = `${spot.left}px`;
  list.style.width = `${spot.width}px`;
  list.style.top = up ? "" : `${spot.bottom + GAP}px`;
  list.style.bottom = up ? `${window.innerHeight - spot.top + GAP}px` : "";
  list.style.maxHeight = `${Math.max(Math.min(natural, up ? above : below), 0)}px`;
}

// Text box with a suggestion list (CMP-17 panel style, A11Y-05): an
// <input role="combobox"> and a role="listbox" popup, with the select
// chevron as a button that opens it. Free text is always allowed; the
// options are only suggestions. Typing filters and opens the list;
// ArrowDown/ArrowUp open it and move through it (wrapping), Enter picks the
// highlighted option, Escape closes the list (and only the list, not an
// enclosing dialog), Tab or a click or tap outside closes it. Focus stays in
// the input (aria-activedescendant); a tap on the chevron opens the list
// without focusing the box, so the phone keyboard does not cover it. The
// list is always in the DOM (aria-controls always points at it) and hidden
// while closed; open, it is a popover in the top layer, so a dialog's scroll
// box never clips it, and it follows the box while open.
// `id`, `field` and every other prop go to the input, so a <label htmlFor>
// names it and <FieldError field> describes it.
export function Combobox({
  id,
  value,
  onChange,
  options,
  listLabel,
  className = "",
  ...inputProps
}) {
  const [open, setOpen] = useState(false);
  // null: show every option (opened from the chevron or arrows); a string:
  // filter by what was typed.
  const [query, setQuery] = useState(null);
  const [active, setActive] = useState(-1);
  // The arrow keys (not the mouse) moved the highlight: show the focus ring.
  const [keyboard, setKeyboard] = useState(false);
  const input = useRef(null);
  const list = useRef(null);
  const root = useRef(null);
  const touch = useRef(false);
  const listId = useId();
  const optionId = (index) => `${listId}-${index}`;
  const text = value || "";
  const shown = query == null ? options : filterOptions(options, query);
  // Typing the one matching option in full leaves nothing to suggest.
  const nothingToAdd =
    query != null && shown.length === 1 && same(shown[0], query);
  const expanded = open && shown.length > 0 && !nothingToAdd;

  useLayoutEffect(() => {
    const node = list.current;
    if (!node?.showPopover) return;
    const isOpen = node.matches(":popover-open");
    if (expanded && !isOpen) node.showPopover();
    else if (!expanded && isOpen) node.hidePopover();
  }, [expanded]);

  useLayoutEffect(() => {
    const node = list.current;
    if (!expanded || !node || !input.current) return undefined;
    const follow = () => place(node, input.current);
    follow();
    window.addEventListener("scroll", follow, { capture: true, passive: true });
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, { capture: true });
      window.removeEventListener("resize", follow);
    };
  }, [expanded, shown.length]);

  // A click or tap outside the box and its list closes it (the box may not
  // have focus after a tap on the chevron, so blur alone is not enough).
  useEffect(() => {
    if (!expanded) return undefined;
    const outside = (event) => {
      if (!root.current?.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [expanded]);

  useLayoutEffect(() => {
    if (expanded && active >= 0)
      list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [expanded, active]);

  const show = (all, highlight) => {
    if (all) setQuery(null);
    setOpen(true);
    setActive(highlight(all ? options : shown));
  };
  const close = () => {
    setOpen(false);
    setQuery(null);
    setActive(-1);
  };
  const pick = (option) => {
    onChange(option);
    close();
  };
  // Opened from the chevron or the arrows with the box holding an option:
  // every option, the current one highlighted.
  const selectedIn = (items) => items.findIndex((o) => same(o, text));
  const onKeyDown = (event) => {
    const { key } = event;
    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      setKeyboard(true);
      if (!expanded) {
        show(query == null || nothingToAdd, (items) => {
          const at = selectedIn(items);
          if (at >= 0 || event.altKey) return at;
          return key === "ArrowDown" ? 0 : items.length - 1;
        });
        return;
      }
      const count = shown.length;
      setActive((index) =>
        key === "ArrowDown" ? (index + 1) % count : (index - 1 + count) % count,
      );
    } else if (key === "Enter" && expanded && active >= 0) {
      event.preventDefault();
      pick(shown[active]);
    } else if (key === "Escape" && expanded) {
      event.preventDefault();
      event.stopPropagation(); // keep an enclosing dialog open
      close();
    } else if (key === "Tab") close();
  };

  return (
    <div className={`combobox ${className}`.trim()} ref={root}>
      <Input
        {...inputProps}
        ref={input}
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={
          expanded && active >= 0 ? optionId(active) : undefined
        }
        autoComplete="off"
        value={text}
        onChange={(event) => {
          onChange(event.target.value);
          setQuery(event.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={close}
      />
      <button
        type="button"
        className="combobox-toggle"
        tabIndex={-1}
        aria-label={listLabel}
        aria-controls={listId}
        aria-expanded={expanded}
        onPointerDown={(event) => {
          touch.current = event.pointerType === "touch";
        }}
        // Keep focus in the box, so its blur does not close the list first.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (!touch.current) input.current?.focus();
          if (expanded) close();
          else show(true, selectedIn);
        }}
      >
        <ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <ul
        ref={list}
        id={listId}
        role="listbox"
        aria-label={listLabel}
        popover="manual"
        hidden={!expanded}
        className={`combobox-list${keyboard ? " keyboard" : ""}`}
      >
        {expanded &&
          shown.map((option, index) => {
            const selected = same(option, text);
            return (
              <li
                key={option}
                id={optionId(index)}
                role="option"
                aria-selected={selected}
                className={index === active ? "active" : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => {
                  setKeyboard(false);
                  setActive(index);
                }}
                onClick={() => pick(option)}
              >
                <span>{option}</span>
                {selected && (
                  <Check size={20} strokeWidth={1.75} aria-hidden="true" />
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}
