import { useStore, exportBackup, initializeStore } from "../store.js";
export function Shell({ children, eyebrow = "NOURALLY / DAILY NUTRITION" }) {
  const state = useStore();
  return (
    <main className="shell">
      {state.error && (
        <div className="save-error" role="alert">
          {state.error} <button onClick={exportBackup}>Export backup</button>
          <button onClick={initializeStore}>Retry</button>
        </div>
      )}
      <div className="brand">
        <span className="brand-mark">↗</span>
        <span>nourally</span>
      </div>
      <div className="eyebrow">{eyebrow}</div>
      {children}
      <footer>
        Your ally from school to sport <span>·</span> Your data stays on this
        device
      </footer>
    </main>
  );
}

export function AppNavigation({ active, onNavigate }) {
  const tabs = [
    ["today", "Today"],
    ["food", "Food"],
    ["calendar", "Schedule"],
    ["weekly", "Weekly"],
    ["history", "History"],
    ["profile", "Profile"],
  ];
  const button = ([id, label]) => (
    <button
      className={`text-button${active === id ? " active-nav" : ""}`}
      aria-current={active === id ? "page" : undefined}
      onClick={() => onNavigate(id)}
      key={id}
    >
      {label}
    </button>
  );
  return (
    <nav className="app-tabs" aria-label="Nourally sections">
      {tabs.slice(0, 3).map(button)}
      <span className="desktop-tabs">{tabs.slice(3).map(button)}</span>
      <details className="mobile-more">
        <summary>
          {["weekly", "history", "profile"].includes(active)
            ? tabs.find(([id]) => id === active)[1]
            : "More"}
        </summary>
        <div>{tabs.slice(3).map(button)}</div>
      </details>
    </nav>
  );
}
