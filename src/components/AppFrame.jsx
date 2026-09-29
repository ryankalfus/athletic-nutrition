import { Apple, CalendarDays, CircleUserRound, Sunrise } from "lucide-react";
import { useStore, exportBackup, retryLastWrite } from "../store.js";
import { navigate, useRoute } from "../routing.js";

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

export function Shell({
  children,
  navigation = true,
  footer = true,
  onNavigate,
}) {
  const state = useStore();
  const [view] = useRoute();
  const current = destinations.find(({ id }) => id === view);
  const title =
    current?.label || (view === "notFound" ? "Page not found" : "Food");
  const go = onNavigate || navigate;
  const athleteName =
    state.current?.data?.profile?.name || state.current?.name || "Athlete";
  // Column width per route (DS-08): Today and Schedule gain a right column at
  // 1200px, Food uses the 960px grid column, everything else reads at 720px.
  const layout = !navigation
    ? "reading"
    : view === "today" || view === "schedule"
      ? "wide"
      : view === "food"
        ? "grid"
        : "reading";

  return (
    <div className={`app-frame${navigation ? " has-navigation" : ""}`}>
      {navigation && (
        <header className="frame-header">
          <div className="frame-brand" aria-label="Nourally">
            <img src="/favicon.svg" width="32" height="32" alt="" />
            <span>nourally</span>
          </div>
          <AppNavigation active={view} onNavigate={go} />
          <button
            className="frame-athlete"
            type="button"
            onClick={() => go("you")}
            aria-label="Switch athlete"
          >
            <span className="frame-avatar" aria-hidden="true">
              {athleteName.charAt(0).toUpperCase()}
            </span>
            <span className="frame-athlete-name">{athleteName}</span>
          </button>
          <div className="frame-mobile-title" aria-hidden="true">
            {title}
          </div>
        </header>
      )}
      <main id="main-content" className="shell" data-layout={layout}>
        {state.error && (
          <div className="save-error" role="alert">
            {state.error} <button onClick={exportBackup}>Export backup</button>
            <button onClick={retryLastWrite}>Try again</button>
          </div>
        )}
        {!navigation && (
          <div className="brand">
            <img src="/favicon.svg" width="32" height="32" alt="" />
            <span>nourally</span>
          </div>
        )}
        {children}
        {footer && (
          <footer>
            Saved on this device. Food search uses online food databases.
          </footer>
        )}
      </main>
    </div>
  );
}
