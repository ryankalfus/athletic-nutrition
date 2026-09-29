import { Component, StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { LabelCheck } from "./components/ui/LabelCheck.jsx";
import {
  canDeliverReminders,
  reminderCandidates,
  deliverReminders,
  notificationPermission,
} from "./domain/reminders.js";
import YouPage from "./pages/You/YouPage.jsx";
import { SportField } from "./pages/You/SportField.jsx";
import { normalizeSport } from "./domain/sport.js";
import { DIET_CHOICES, FOOD_SOURCES } from "./domain/you.js";
import { lowCostOn } from "./domain/ranking.js";
import { addHydration, undoHydration } from "./domain/hydration.js";
import {
  useField,
  useStore,
  changeData,
  useSignedOut,
  setSignedOut,
} from "./store.js";
import { LocalProfileEntry, Recovery } from "./components/Profiles.jsx";
import { useRoute } from "./routing.js";
import { formatDate } from "./format.js";

import { getDateKey, addDays } from "./domain/timing.js";
import { EmptyState } from "./components/ui/EmptyState.jsx";
import { Skeleton } from "./components/ui/Skeleton.jsx";
import { ChipGroup } from "./components/ui/SelectionControls.jsx";

function App() {
  const [step] = useField("step");
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

  // First-run setup only; You saves each sheet in place (YOU-06).
  function saveProfile(nextProfile) {
    changeData((data) => {
      data.profile = nextProfile;
      data.step = "dashboard";
    }).then((ok) => {
      if (ok) setView("today");
    });
  }

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

  function finishAccountEntry() {
    setSignedOut(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("signedOut");
    window.history.replaceState({}, "", url);
    setView("today");
  }
  if (signedOut) return <LocalProfileEntry onComplete={finishAccountEntry} />;
  if (view === "welcome")
    return <LocalProfileEntry onComplete={finishAccountEntry} />;
  if (view === "notFound") return <NotFoundPage onNavigate={setView} />;
  if (step === "setup")
    return <ProfileSetup profile={profile} onSave={saveProfile} />;
  if (view === "you")
    return (
      <YouPage
        subroute={subroute === "ideas" ? "" : subroute}
        onNavigate={setView}
      />
    );
  if (view === "food" && subroute === "log/week")
    return (
      <WeeklyProgress
        dailyLogs={dailyLogs}
        todayKey={todayKey}
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
  if (view === "today")
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

// First-run setup. P1-11 replaces it with the schedule-first SetupFlow; the
// You page no longer reuses this form (YOU-01).
function ProfileSetup({ profile, onSave }) {
  const [draft, setDraft] = useState(profile);
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  useEffect(() => {
    const warn = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function toggleList(key, value) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }

  return (
    <Shell navigation={false}>
      <section className="intro split-intro">
        <div>
          <h1>
            School to sport,
            <br />
            <em>without the guesswork.</em>
          </h1>
        </div>
        <div className="profile-intro-side">
          <p className="intro-copy">
            Nourally turns your schedule, food access, budget, and dietary needs
            into a practical next step—not a rigid prescription.
          </p>
        </div>
      </section>
      <section className="card profile-card">
        <h2>Food needs & access</h2>
        <p className="muted">
          These details stay on this device and only filter the examples you
          see.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const next = { ...draft, sport: normalizeSport(draft.sport) };
            setDraft(next);
            onSave(next);
          }}
        >
          <label>
            First name <span className="optional-label">Optional</span>
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="First name"
            />
          </label>
          <SportField
            value={draft.sport}
            onChange={(sport) => setDraft({ ...draft, sport })}
          />
          <label className="check-row">
            <input
              type="checkbox"
              checked={lowCostOn(draft)}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  lowCostIdeas: event.target.checked,
                  budget: event.target.checked ? "save" : "standard",
                })
              }
            />
            Keep ideas low-cost
          </label>
          <ChipGroup
            legend="Dietary needs"
            options={DIET_CHOICES}
            selected={draft.dietaryNeeds}
            onToggle={(value) => toggleList("dietaryNeeds", value)}
          />
          <LabelCheck />
          {[
            ["nutFree", "Nut-free"],
            ["glutenFree", "Gluten-free"],
            ["dairyFree", "Dairy-free"],
          ]
            .filter(([id]) => draft.dietaryNeeds.includes(id))
            .map(([id, label]) => (
              <p role="status" key={id}>
                Your earlier {label} choice no longer filters foods. Review each
                label and discuss allergy needs with a qualified professional.
              </p>
            ))}
          <ChipGroup
            legend="Food you can usually access"
            options={FOOD_SOURCES}
            selected={draft.foodSources}
            onToggle={(value) => toggleList("foodSources", value)}
          />
          <label className="check-row">
            <input
              type="checkbox"
              checked={draft.familyPrep}
              onChange={(event) =>
                setDraft({ ...draft, familyPrep: event.target.checked })
              }
            />
            <span>
              A parent or guardian can sometimes help pack or prep food.
            </span>
          </label>
          <button
            className="primary"
            type="submit"
            disabled={!draft.foodSources.length}
          >
            Save and see today
          </button>
        </form>
      </section>
    </Shell>
  );
}

function WeeklyProgress({ dailyLogs, todayKey, onNavigate }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date(`${todayKey}T12:00:00`);
  const weekStart = addDays(today, -6 + weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const key = getDateKey(date);
    const log = dailyLogs[key] || { entries: [], water: 0 };
    return {
      date,
      key,
      checkIns: log.entries.length,
      hasEntries: log.entries.length > 0,
      water: log.water || 0,
    };
  });
  const weeklyCheckIns = days.reduce((sum, day) => sum + day.checkIns, 0);
  const weeklyWater = days.reduce((sum, day) => sum + day.water, 0);
  const loggedDays = days.filter((day) => day.hasEntries).length;
  const hydrationDays = days.filter((day) => day.water > 0).length;
  const range = `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(days[0].date)} – ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(days[6].date)}`;
  const maxCheckIns = Math.max(...days.map((item) => item.checkIns), 4);
  const maxWater = Math.max(...days.map((item) => item.water), 64);

  return (
    <Shell>
      <section className="dashboard-head weekly-head">
        <div>
          <h1 className="page-title">Food</h1>
        </div>
      </section>
      <nav className="food-sections" aria-label="Food workspace">
        {[
          ["ideas", "Ideas"],
          ["home", "At home"],
          ["groceries", "Groceries"],
          ["log", "Log"],
        ].map(([path, label]) => (
          <button
            key={path}
            aria-current={path === "log" ? "page" : undefined}
            className={path === "log" ? "active" : ""}
            onClick={() => onNavigate(`food/${path}`)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="log-page">
        <h2>Week</h2>
        <section className="week-toolbar">
          <button
            className="week-arrow"
            onClick={() => setWeekOffset((offset) => offset - 1)}
            aria-label="Previous seven days"
          >
            <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <div>
            <strong>{weekOffset === 0 ? "Last 7 days" : range}</strong>
            <span>{range}</span>
          </div>
          <button
            className="week-arrow"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset((offset) => Math.min(offset + 1, 0))}
            aria-label="Next seven days"
          >
            <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </section>
        <section className="weekly-stats">
          <article className="card weekly-stat">
            <span>Food check-ins</span>
            <strong>{weeklyCheckIns}</strong>
            <small>this period</small>
          </article>
          <article className="card weekly-stat">
            <span>Days with a food log</span>
            <strong>
              {loggedDays}
              <i>/7</i>
            </strong>
            <small>days</small>
          </article>
          <article className="card weekly-stat">
            <span>Hydration check-ins</span>
            <strong>
              {hydrationDays}
              <i>/7</i>
            </strong>
            <small>days</small>
          </article>
          <article className="card weekly-stat">
            <span>Water logged</span>
            <strong>{weeklyWater}</strong>
            <small>oz total</small>
          </article>
        </section>
        <section className="card weekly-chart-card">
          <div className="chart-heading">
            <div>
              <h2>
                {weeklyCheckIns} <small>foods logged this week</small>
              </h2>
            </div>
            <div className="chart-key">
              <span>
                <i className="key-fill" /> Check-ins
              </span>
            </div>
          </div>
          <div className="weekly-chart">
            {days.map((day) => (
              <div
                className={`chart-day${day.key === todayKey ? " today" : ""}`}
                key={day.key}
              >
                <div className="bar-value">{day.checkIns || "—"}</div>
                <div className="bar-track">
                  <span
                    style={{
                      height: `${Math.min((day.checkIns / maxCheckIns) * 100, 100)}%`,
                    }}
                  />
                </div>
                <strong>
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                  }).format(day.date)}
                </strong>
                <small>{day.date.getDate()}</small>
              </div>
            ))}
          </div>
          {weeklyCheckIns === 0 && (
            <EmptyState>
              Use food check-ins to notice where busy days make fueling harder.
            </EmptyState>
          )}
        </section>
        <section className="card weekly-water-card">
          <div className="chart-heading">
            <div>
              <h2>
                {weeklyWater.toLocaleString()}{" "}
                <small>oz logged over 7 days</small>
              </h2>
            </div>
          </div>
          <div className="water-week">
            {days.map((day) => (
              <div
                className={`water-day${day.key === todayKey ? " today" : ""}`}
                key={day.key}
              >
                <div className="water-day-label">
                  <strong>
                    {new Intl.DateTimeFormat("en-US", {
                      weekday: "short",
                    }).format(day.date)}
                  </strong>
                  <span>{day.water} oz</span>
                </div>
                <div>
                  <span
                    style={{
                      width: `${Math.min((day.water / maxWater) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="table-wrap">
          <table>
            <caption>No entry means nothing was logged.</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Food check-ins</th>
                <th scope="col">Water logged</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.key}>
                  <th scope="row">{formatDate(day.key)}</th>
                  <td>{dailyLogs[day.key] ? day.checkIns : "Not logged"}</td>
                  <td>
                    {dailyLogs[day.key]?.waterEntries?.length || day.water > 0
                      ? `${day.water} oz`
                      : "Not logged"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="weekly-safety">
          This is a record of what you logged. It is not a score.
        </p>
      </div>
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
