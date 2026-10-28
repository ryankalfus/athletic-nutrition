import {
  Apple,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Plus,
  Sunrise,
  WifiOff,
} from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  useStore,
  exportBackup,
  retryLastWrite,
  setSignedOut,
} from "../store.js";
import { AthleteNameSheet } from "../pages/You/AthleteNameSheet.jsx";
import { navigate, useRoute } from "../routing.js";
import { athleteName as nameOf } from "../domain/you.js";
import { Avatar } from "./ui/Avatar.jsx";

const destinations = [
  { id: "today", label: "Today", path: "today", Icon: Sunrise },
  { id: "schedule", label: "Schedule", path: "schedule", Icon: CalendarDays },
  { id: "food", label: "Food", path: "food", Icon: Apple },
  { id: "you", label: "You", path: "you", Icon: CircleUserRound },
];

export function AppNavigation({ active, onNavigate }) {
  const current = active === "weekly" || active === "history" ? "food" : active;
  const activeIndex = destinations.findIndex(({ id }) => id === current);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    let focusViewportHeight = null;
    const updateKeyboardState = () => {
      const target = document.activeElement;
      const textEntry = target?.matches(
        'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]',
      );
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;

      if (!textEntry) {
        focusViewportHeight = null;
        setKeyboardOpen(false);
        return;
      }

      if (focusViewportHeight === null) focusViewportHeight = viewportHeight;
      setKeyboardOpen(viewportHeight < focusViewportHeight * 0.75);
    };
    const updateAfterFocusChange = () =>
      window.requestAnimationFrame(updateKeyboardState);

    document.addEventListener("focusin", updateKeyboardState);
    document.addEventListener("focusout", updateAfterFocusChange);
    window.addEventListener("resize", updateKeyboardState);
    window.visualViewport?.addEventListener("resize", updateKeyboardState);
    updateKeyboardState();

    return () => {
      document.removeEventListener("focusin", updateKeyboardState);
      document.removeEventListener("focusout", updateAfterFocusChange);
      window.removeEventListener("resize", updateKeyboardState);
      window.visualViewport?.removeEventListener("resize", updateKeyboardState);
    };
  }, []);

  return (
    <nav
      className="frame-nav"
      aria-label="Main navigation"
      hidden={keyboardOpen}
      style={{ "--tab-active-offset": String(activeIndex * 100) + "%" }}
    >
      {destinations.map(({ id, label, path, Icon }) => (
        <button
          key={id}
          type="button"
          className="frame-nav-item"
          aria-current={current === id ? "page" : undefined}
          onClick={() => onNavigate(path)}
        >
          <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

// UX-NAV-11: on phones the page's H1 is a large title in the content and the
// top bar is clear until the page scrolls 40 px; then it turns to glass and
// shows `title` (the H1's text) at 17 px. A sub-page's `back` shows a chevron
// with the parent's name ("‹ You"). `action` is a page's main button in the
// phone top bar, drawn as an icon (Schedule's add, 6.9); wider screens show
// the page's own button in its header.
const SCROLLED_AT = 40;

// UX-NAV-13: the browser chrome is paper, or pitch while a field panel
// (Welcome, setup done) is at the top of the screen: it starts within the
// first 64px and has not scrolled away.
const FIELD_PANEL_TOP = 64;

function useThemeColor() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return undefined;
    const update = () => {
      const panel = document
        .querySelector("main .field-panel")
        ?.getBoundingClientRect();
      const atTop = panel && panel.top <= FIELD_PANEL_TOP && panel.bottom > 0;
      const token = atTop ? "--color-pitch" : "--color-paper";
      meta.setAttribute(
        "content",
        getComputedStyle(document.documentElement)
          .getPropertyValue(token)
          .trim(),
      );
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  });
}

// UX-CMP-16: one line under the header on every route while offline.
function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => !!query && window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (!query) return undefined;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}

// UX-NAV-06: a page's floating action (Finish shopping, later Log food) goes
// in the frame's slot, 8px above the tab bar with the bar's side insets.
// Shell writes the slot's height to --float-stack so toasts stack above it
// and the page's bottom padding clears it. From `inlineFrom` px wide the
// action stays where the page put it.
const FloatSlot = createContext(null);

export function FloatingAction({ children, inlineFrom }) {
  const slot = useContext(FloatSlot);
  const inline = useMediaQuery(
    inlineFrom ? `(min-width: ${inlineFrom}px)` : "",
  );
  if (inline) return children;
  return slot ? createPortal(children, slot) : null;
}

function useFloatStack(slot) {
  useEffect(() => {
    if (!slot) return undefined;
    const root = document.documentElement;
    const observer = new ResizeObserver(() =>
      root.style.setProperty("--float-stack", `${slot.offsetHeight}px`),
    );
    observer.observe(slot, { box: "border-box" });
    return () => {
      observer.disconnect();
      root.style.removeProperty("--float-stack");
    };
  }, [slot]);
}

export function Shell({
  children,
  navigation = true,
  footer = false,
  onNavigate,
  title: pageTitle,
  back,
  action,
}) {
  const state = useStore();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > SCROLLED_AT);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  useThemeColor();
  const online = useOnline();
  const [floatSlot, setFloatSlot] = useState(null);
  useFloatStack(floatSlot);
  const [view, , subroute] = useRoute();
  const current = destinations.find(({ id }) => id === view);
  const title =
    pageTitle ||
    current?.label ||
    (view === "notFound" ? "Page not found" : "Food");
  const go = onNavigate || navigate;
  const athleteName = nameOf(state.current);
  const severalAthletes = Object.keys(state.doc?.profiles || {}).length > 1;
  const [addingAthlete, setAddingAthlete] = useState(false);
  // Column width per route (DS-08): Today, Schedule and Food › Log read at
  // 720px and gain a right column at 1200px, the rest of Food uses the 960px
  // grid column, everything else reads at 720px.
  const layout = !navigation
    ? "reading"
    : view === "today" ||
        view === "schedule" ||
        (view === "food" && /^log(\/|$)/.test(subroute || ""))
      ? "wide"
      : view === "food"
        ? "grid"
        : "reading";

  // A11Y-01: the first focusable element. Hash routing owns the URL fragment,
  // so the link focuses the page heading (or main) instead of following #.
  const skip = (event) => {
    event.preventDefault();
    const main = document.getElementById("main-content");
    const target = main?.querySelector("h1") || main;
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
    target.focus();
  };

  return (
    <div
      className={[
        "app-frame",
        navigation && "has-navigation",
        back && "has-back",
        scrolled && "is-scrolled",
        !online && "is-offline",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <a className="skip-link" href="#main-content" onClick={skip}>
        Skip to content
      </a>
      {navigation && (
        <header className="frame-header">
          {back && (
            <button
              type="button"
              className="text-button frame-back"
              aria-label={back.label}
              onClick={back.onClick}
            >
              <ChevronLeft size={24} strokeWidth={1.75} aria-hidden="true" />
              {back.text}
            </button>
          )}
          <div className="frame-brand" aria-label="Nourally">
            <img src="/favicon.svg" width="32" height="32" alt="" />
            <span>nourally</span>
          </div>
          <AppNavigation active={view} onNavigate={go} />
          {action && (
            <button
              type="button"
              className="primary frame-action"
              aria-label={action.label}
              onClick={action.onClick}
            >
              <Plus size={24} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
          {/* IA-14 / COPY-28: with 2+ athletes this opens the chooser
              (Welcome); with one it reads "Add another athlete" (6.13). */}
          <button
            className="frame-athlete"
            type="button"
            onClick={() =>
              severalAthletes ? setSignedOut(true) : setAddingAthlete(true)
            }
            aria-label={
              severalAthletes ? "Switch athlete" : "Add another athlete"
            }
          >
            <Avatar name={athleteName} size="sm" className="frame-avatar" />
            <span className="frame-athlete-name">{athleteName}</span>
            <span className="frame-athlete-switch" aria-hidden="true">
              <ChevronRight size={20} strokeWidth={1.75} />
            </span>
          </button>
          <div className="frame-mobile-title" aria-hidden="true">
            {title}
          </div>
        </header>
      )}
      <main id="main-content" className="shell" data-layout={layout}>
        <p role="status" className="frame-offline">
          {!online && (
            <>
              <WifiOff size={20} strokeWidth={1.75} aria-hidden="true" />
              You're offline. Saved foods and your plan still work.
            </>
          )}
        </p>
        {state.error && (
          <div className="save-error" role="alert">
            {state.error}{" "}
            <button onClick={exportBackup}>Save a backup file</button>
            <button onClick={retryLastWrite}>Try again</button>
          </div>
        )}
        {!navigation && (
          <div className="brand">
            <img src="/favicon.svg" width="40" height="40" alt="" />
            <span>nourally</span>
          </div>
        )}
        <FloatSlot.Provider value={floatSlot}>{children}</FloatSlot.Provider>
      </main>
      {navigation && <div className="frame-float" ref={setFloatSlot} />}
      {addingAthlete && (
        <AthleteNameSheet onClose={() => setAddingAthlete(false)} />
      )}
      {footer && (
        <footer className="frame-footer">
          Saved on this device. Food search uses online food databases.
        </footer>
      )}
    </div>
  );
}
