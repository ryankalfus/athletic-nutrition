import { Component, StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/dm-sans/wght.css";
import "@fontsource/barlow-semi-condensed/600.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/frame.css";
import "./styles/welcome.css";
import "./styles/today.css";
import "./styles/schedule.css";
import "./styles/food.css";
import "./styles/search.css";
import "./styles/you.css";
import { Shell } from "./components/AppFrame.jsx";
import Dashboard from "./pages/Today/TodayPage.jsx";
import ScheduleCalendar from "./pages/Schedule/SchedulePage.jsx";
import FoodHub from "./components/FoodWorkspace.jsx";
import { ToastProvider } from "./components/ui/Toast.jsx";
import {
  canDeliverReminders,
  reminderCandidates,
  deliverReminders,
  notificationPermission,
} from "./domain/reminders.js";
import YouPage from "./pages/You/YouPage.jsx";
import { AboutPage } from "./pages/You/AboutPage.jsx";
import WelcomePage from "./pages/Welcome/WelcomePage.jsx";
import SetupFlow from "./pages/Setup/SetupFlow.jsx";
import { addHydration, undoHydration } from "./domain/hydration.js";
import { useField, useStore, useSignedOut } from "./store.js";
import { Recovery } from "./components/Profiles.jsx";
import { useRoute } from "./routing.js";

import { getDateKey } from "./domain/timing.js";
import { Skeleton } from "./components/ui/Skeleton.jsx";

function App() {
  const [step] = useField("step");
  const [setupStep] = useField("setupStep");
  const [view, setView, subroute] = useRoute();
  const [todayKey, setTodayKey] = useState(getDateKey);
  const [now, setNow] = useState(new Date());
  const [dailyLogs, setDailyLogs] = useField("dailyLogs");
  const [schedule, setSchedule] = useField("schedule");
  const [schoolSchedule, setSchoolSchedule] = useField("schoolSchedule");
  const [profile, setProfile] = useField("profile");
  const [dayPlans, setDayPlans] = useField("dayPlans");
  const [reminderSettings, setReminderSettings] = useField("reminderSettings");
  const [groceryState, setGroceryState] = useField("groceryState");
  const state = useStore();
  const athleteCount = Object.keys(state.doc.profiles).length;
  const [notificationError, setNotificationError] = useState("");
  // Store-level flag: a profile delete signs out before the next athlete
  // publishes, so this can never be a stale "signed in" copy.
  const signedOut = useSignedOut();
  const onWelcome = signedOut || view === "welcome";
  useEffect(() => {
    let timer;
    const tick = () => {
      setNow(new Date());
      setTodayKey(getDateKey());
      timer = window.setTimeout(tick, 60000 - (Date.now() % 60000));
    };
    timer = window.setTimeout(tick, 60000 - (Date.now() % 60000));
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (onWelcome) return;
    const permission = notificationPermission();
    if (reminderSettings.enabled && permission !== "granted") {
      setReminderSettings((settings) => ({ ...settings, enabled: false }));
      setNotificationError(
        "Reminders are off because this browser does not allow notifications.",
      );
      return;
    }
    if (
      !canDeliverReminders({
        signedOut: onWelcome,
        enabled: reminderSettings.enabled,
        permission,
      })
    )
      return;
    let cancelled = false;
    deliverReminders({
      profileId: state.current.id,
      candidates: reminderCandidates(schedule, reminderSettings, now),
      storage: localStorage,
      notify: (title, options) => new Notification(title, options),
      locks: navigator.locks,
      cancelled: () => cancelled,
    })
      .then(() => {
        if (!cancelled) setNotificationError("");
      })
      .catch(() => {
        if (!cancelled)
          setNotificationError(
            "A browser reminder could not be delivered. Your plans are saved; check notification permissions.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [now, reminderSettings, schedule, todayKey, state.current.id, onWelcome]);

  const todayLog = dailyLogs[todayKey] || { entries: [], water: 0 };

  function setTodayEntries(update) {
    setDailyLogs((logs) => {
      const current = logs[todayKey] || { entries: [] };
      const entries =
        typeof update === "function" ? update(current.entries) : update;
      return { ...logs, [todayKey]: { ...current, entries } };
    });
  }

  function setTodayHydration(amount) {
    setDailyLogs((logs) => ({
      ...logs,
      [todayKey]:
        amount === "undo"
          ? undoHydration(logs[todayKey] || { entries: [], water: 0 })
          : addHydration(logs[todayKey] || { entries: [], water: 0 }, amount),
    }));
  }

  // Welcome and setup (6.1, 6.2): "How Nourally works" opens About without
  // the app navigation; a first visit shows Welcome; setup resumes at its step.
  const firstRun =
    !signedOut && step === "setup" && !setupStep && athleteCount === 1;
  if (view === "you" && subroute === "about" && (signedOut || step === "setup"))
    return <AboutPage standalone onNavigate={setView} />;
  if (signedOut || view === "welcome" || firstRun)
    return <WelcomePage firstRun={firstRun} onNavigate={setView} />;
  if (view === "notFound") return <NotFoundPage onNavigate={setView} />;
  if (step === "setup")
    return <SetupFlow onNavigate={setView} now={now} todayKey={todayKey} />;
  if (view === "you")
    return (
      <YouPage
        subroute={subroute === "ideas" ? "" : subroute}
        onNavigate={setView}
      />
    );
  if (view === "schedule")
    return (
      <ScheduleCalendar
        events={schedule}
        setEvents={setSchedule}
        schoolSchedule={schoolSchedule}
        setSchoolSchedule={setSchoolSchedule}
        todayKey={todayKey}
      />
    );
  if (view === "food")
    return (
      <FoodHub
        now={now}
        groceryState={groceryState}
        setGroceryState={setGroceryState}
        profile={profile}
        setProfile={setProfile}
        events={schedule}
        schoolSchedule={schoolSchedule}
        todayKey={todayKey}
        entries={todayLog.entries}
        setEntries={setTodayEntries}
        dayPlans={dayPlans}
        setDayPlans={setDayPlans}
        onNavigate={setView}
      />
    );
  if (view === "today" || view === "setup")
    return (
      <Dashboard
        now={now}
        todayKey={todayKey}
        events={schedule}
        schoolSchedule={schoolSchedule}
        profile={profile}
        water={todayLog.water || 0}
        setHydration={setTodayHydration}
        dayPlans={dayPlans}
        setDayPlans={setDayPlans}
        notificationError={notificationError}
        reminderSettings={reminderSettings}
        setReminderSettings={setReminderSettings}
        onNavigate={setView}
      />
    );
  return <NotFoundPage onNavigate={setView} />;
}

function NotFoundPage({ onNavigate }) {
  return (
    <Shell>
      <section className="not-found">
        <h1>Page not found</h1>
        <p>That page is not part of Nourally.</p>
        <button className="primary" onClick={() => onNavigate("today")}>
          Go to Today
        </button>
      </section>
    </Shell>
  );
}

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <Recovery message={this.state.error.message} />
    ) : (
      this.props.children
    );
  }
}
function StoreGate() {
  const state = useStore();
  if (state.loading)
    return (
      <main className="shell">
        <Skeleton label="Getting your day ready…" rows={4} />
      </main>
    );
  if (!state.current) return <Recovery message={state.error} />;
  return <App key={state.current.id} />;
}
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <ErrorBoundary>
        <StoreGate />
      </ErrorBoundary>
    </ToastProvider>
  </StrictMode>,
);
