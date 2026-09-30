import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

// Row menu (CMP-17, A11Y-05): a 44 px "…" button[aria-haspopup=menu] that
// opens a role="menu" list. Enter, Space or ArrowDown opens on the first item,
// ArrowUp on the last; ArrowDown/ArrowUp wrap, Home/End jump; Escape closes
// and returns focus to the button; Tab or a click outside closes it.
// items: [{ label, onSelect, disabled?, danger?, separated?, key? }]; falsy
// items are skipped so callers can write `cond && { … }`. `separated` draws a
// divider above the item (before Remove). The panel opens upward when it
// would cross the bottom of the screen or the phone tab bar, and closes when
// the page scrolls, so it never floats over the sticky bars.
export function Menu({ label, items, className = "" }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState("first");
  const [up, setUp] = useState(false);
  const panel = useRef(null);
  const root = useRef(null);
  const trigger = useRef(null);
  const menuId = useId();
  const list = items.filter(Boolean);
  const enabled = () => [
    ...(root.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') ||
      []),
  ];

  useLayoutEffect(() => {
    if (!open || !panel.current || !trigger.current) return;
    const box = panel.current.getBoundingClientRect();
    const tabBar = document.querySelector(".frame-nav");
    const floor =
      tabBar && getComputedStyle(tabBar).position === "fixed"
        ? tabBar.getBoundingClientRect().top
        : window.innerHeight;
    const above = trigger.current.getBoundingClientRect().top;
    setUp(box.bottom > floor && above - box.height > 0);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const choices = enabled();
    (start === "last" ? choices.at(-1) : choices[0])?.focus({
      preventScroll: true,
    });
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const scrolled = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", scrolled, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", scrolled);
    };
  }, [open]);

  const show = (from) => {
    setStart(from);
    setUp(false);
    setOpen(true);
  };
  const close = (refocus) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };
  const onTriggerKey = (event) => {
    if (["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      show("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      show("last");
    }
  };
  const onMenuKey = (event) => {
    const choices = enabled();
    const index = choices.indexOf(document.activeElement);
    const move = {
      ArrowDown: (index + 1) % choices.length,
      ArrowUp: (index - 1 + choices.length) % choices.length,
      Home: 0,
      End: choices.length - 1,
    }[event.key];
    if (move !== undefined) {
      event.preventDefault();
      choices[move]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation(); // keep an enclosing dialog open
      close(true);
    } else if (event.key === "Tab") close(false);
  };

  return (
    <div className={`row-menu ${className}`.trim()} ref={root}>
      <button
        ref={trigger}
        type="button"
        className="row-menu-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : show("first"))}
        onKeyDown={onTriggerKey}
      >
        <MoreHorizontal size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={panel}
          id={menuId}
          role="menu"
          aria-label={label}
          className={`row-menu-items${up ? " opens-up" : ""}`}
          onKeyDown={onMenuKey}
        >
          {list.map((item) => (
            <button
              key={item.key || item.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={
                [item.danger && "danger", item.separated && "separated"]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              disabled={item.disabled}
              onClick={() => {
                close(true);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
