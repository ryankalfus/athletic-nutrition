import {
  Apple,
  CalendarDays,
  ChevronLeft,
  CircleUserRound,
  Sunrise,
} from "lucide-react";
import { useStore, exportBackup, retryLastWrite } from "../store.js";
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
  return (
    <nav className="frame-nav" aria-label="Main navigation">
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

// `title` and `back` replace the phone top bar's page name with a sub-page's
// own ("This device" with a chevron back to You), so the page does not repeat
// its name and back link below the bar (6.14). `action` is a page's main
// button in the phone top bar (Schedule's "+ Add", 6.9); wider screens show
// the page's own copy in its header.
export function Shell({
  children,
  navigation = true,
  footer = true,
  onNavigate,
  title: pageTitle,
  back,
  action,
}) {
  const state = useStore();
  const [view, , subroute] = useRoute();
  const current = destinations.find(({ id }) => id === view);
  const title =
    pageTitle ||
    current?.label ||
    (view === "notFound" ? "Page not found" : "Food");
  const go = onNavigate || navigate;
  const athleteName = nameOf(state.current);
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
    <div className={`app-frame${navigation ? " has-navigation" : ""}`}>
      <a className="skip-link" href="#main-content" onClick={skip}>
        Skip to content
      </a>
      {navigation && (
        <header className="frame-header">
          {back && (
            <button
              type="button"
              className="icon-button frame-back"
              aria-label={back.label}
              onClick={back.onClick}
            >
              <ChevronLeft size={24} strokeWidth={1.75} aria-hidden="true" />
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
              onClick={action.onClick}
            >
              {action.label}
            </button>
          )}
          <button
            className="frame-athlete"
            type="button"
            onClick={() => go("you")}
            aria-label="Switch athlete"
          >
            <Avatar name={athleteName} size="sm" className="frame-avatar" />
            <span className="frame-athlete-name">{athleteName}</span>
            <span className="frame-athlete-switch">Switch</span>
          </button>
          <div className="frame-mobile-title" aria-hidden="true">
            {title}
          </div>
        </header>
      )}
      <main id="main-content" className="shell" data-layout={layout}>
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
        {children}
      </main>
      {footer && (
        <footer className="frame-footer">
          Saved on this device. Food search uses online food databases.
        </footer>
      )}
    </div>
  );
}
