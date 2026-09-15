import { Component, StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./refinement.css";
import { Shell, AppNavigation } from "./components/AppFrame.jsx";
import FoodHub, { FoodLog } from "./components/FoodWorkspace.jsx";
import { Dialog } from "./components/Dialog.jsx";
import { ingredientsForMeal } from "./domain/food.js";
import { reminderCandidates, deliverReminders } from "./domain/reminders.js";
import { planMeal } from "./domain/plans.js";
import { uid } from "./domain/storage.js";
import { addHydration, undoHydration } from "./domain/hydration.js";
import { useField, useStore, changeData, exportBackup } from "./store.js";
import {
  ProfileManager,
  LocalProfileEntry,
  Recovery,
} from "./components/Profiles.jsx";
import { useRoute } from "./routing.js";

import {
  getDateKey,
  addDays,
  timeToMinutes,
  formatClock,
  eventsForDate,
  tomorrowPrepTasks,
  getFuelingGuidance,
} from "./domain/timing.js";

function App() {
  const [step] = useField("step");
  const [view, setView] = useRoute();
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
  const [signedOut, setSignedOut] = useState(
    () =>
      new URLSearchParams(window.location.search).get("signedOut") === "1" ||
      sessionStorage.getItem("nourally-signed-out") === "1",
  );
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
      setTodayKey(getDateKey());
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (
      !reminderSettings.enabled ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
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
  }, [now, reminderSettings, schedule, todayKey, state.current.id]);

  const todayLog = dailyLogs[todayKey] || { entries: [], water: 0 };

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
    sessionStorage.removeItem("nourally-signed-out");
    setSignedOut(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("signedOut");
    window.history.replaceState({}, "", url);
  }
  if (signedOut) return <LocalProfileEntry onComplete={finishAccountEntry} />;
  if (step === "setup")
    return <ProfileSetup profile={profile} onSave={saveProfile} />;
  if (view === "profile")
    return (
      <>
        <ProfileSetup
          profile={profile}
          onSave={saveProfile}
          onNavigate={setView}
          tabbed
        />
        <ProfileManager
          onSignOut={() => {
            sessionStorage.setItem("nourally-signed-out", "1");
            setSignedOut(true);
          }}
        />
      </>
    );
  if (view === "history")
    return (
      <History dailyLogs={dailyLogs} todayKey={todayKey} onNavigate={setView} />
    );
  if (view === "weekly")
    return (
      <WeeklyProgress
        dailyLogs={dailyLogs}
        todayKey={todayKey}
        onNavigate={setView}
      />
    );
  if (view === "calendar")
    return (
      <ScheduleCalendar
        events={schedule}
        setEvents={setSchedule}
        schoolSchedule={schoolSchedule}
        setSchoolSchedule={setSchoolSchedule}
        todayKey={todayKey}
        onNavigate={setView}
      />
    );
  if (view === "food" || view === "groceries")
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
}

function ProfileSetup({ profile, onSave, onNavigate, tabbed = false }) {
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
  const navigate = (next) => {
    if (!dirty || window.confirm("Discard unsaved profile changes?"))
      onNavigate(next);
  };
  const needs = [
    ["vegetarian", "Vegetarian"],
    ["vegan", "Vegan"],
    ["dairyFree", "Dairy-free"],
    ["glutenFree", "Gluten-free"],
    ["nutFree", "Nut-free"],
  ];
  const sources = [
    ["packed", "Packed from home"],
    ["cafeteria", "School cafeteria"],
    ["home", "Home kitchen"],
    ["store", "Nearby store"],
  ];

  function toggleList(key, value) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }

  return (
    <Shell eyebrow="NOURALLY / YOUR REAL DAY">
      <section className="intro split-intro">
        <div>
          <p className="kicker">FUELING THAT FITS REAL LIFE</p>
          <h1>
            School to sport,
            <br />
            <em>without the guesswork.</em>
          </h1>
        </div>
        <div className="profile-intro-side">
          {tabbed && <AppNavigation active="profile" onNavigate={navigate} />}
          <p className="intro-copy">
            Nourally turns your schedule, food access, budget, and dietary needs
            into a practical next step—not a rigid prescription.
          </p>
        </div>
      </section>
      <section className="card profile-card">
        <div className="section-label">SET YOUR FOOD REALITY</div>
        <h2>Set what works in real life.</h2>
        <p className="muted">
          These details stay on this device and only filter the examples you
          see.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(draft);
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
          <fieldset className="choice-field">
            <legend>Usual food budget</legend>
            <div className="choice-grid three">
              {[
                ["save", "Save where possible"],
                ["standard", "Everyday"],
                ["flexible", "Flexible"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  aria-pressed={draft.budget === value}
                  className={draft.budget === value ? "selected" : ""}
                  onClick={() => setDraft({ ...draft, budget: value })}
                  key={value}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="choice-field">
            <legend>Dietary needs</legend>
            <div className="choice-grid">
              {needs.map(([value, label]) => (
                <button
                  type="button"
                  className={
                    draft.dietaryNeeds.includes(value) ? "selected" : ""
                  }
                  aria-pressed={draft.dietaryNeeds.includes(value)}
                  onClick={() => toggleList("dietaryNeeds", value)}
                  key={value}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="choice-field">
            <legend>Food you can usually access</legend>
            <div className="choice-grid">
              {sources.map(([value, label]) => (
                <button
                  type="button"
                  className={
                    draft.foodSources.includes(value) ? "selected" : ""
                  }
                  aria-pressed={draft.foodSources.includes(value)}
                  onClick={() => toggleList("foodSources", value)}
                  key={value}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
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
            {tabbed ? "Save changes" : "Save and see today"} <span>→</span>
          </button>
        </form>
        <p className="safety-note">
          <strong>Educational guidance only.</strong> Nourally offers practical
          examples, not calorie prescriptions or medical advice. Allergies,
          medical conditions, eating concerns, and individualized needs should
          be discussed with a qualified professional and a parent or guardian.
        </p>
      </section>
    </Shell>
  );
}

function Dashboard({
  notificationError,
  now,
  todayKey,
  events,
  schoolSchedule,
  profile,
  water,
  setHydration,
  dayPlans,
  setDayPlans,
  reminderSettings,
  setReminderSettings,
  onNavigate,
}) {
  const [reminderStatus, setReminderStatus] = useState("");
  const guidance = useMemo(
    () =>
      getFuelingGuidance({ now, todayKey, events, schoolSchedule, profile }),
    [now, todayKey, events, schoolSchedule, profile],
  );
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
  const todayEvents = eventsForDate(events, todayKey);
  const tomorrowKey = getDateKey(addDays(new Date(`${todayKey}T12:00:00`), 1));
  const tomorrowEvents = eventsForDate(events, tomorrowKey);
  const earlyTomorrow = tomorrowEvents.find(
    (event) => timeToMinutes(event.startTime) <= 600,
  );
  const todayPlan = dayPlans[todayKey] || [];
  const tomorrowPlan = dayPlans[tomorrowKey] || [];
  const primaryIdea = guidance.ideas[0] || null;
  const { current } = useStore();
  const activePlan = current.data.mealPlans.find(
    (p) => p.date === todayKey && p.status !== "logged",
  );
  const activeIngredients = activePlan
    ? ingredientsForMeal(
        activePlan.template,
        current.data.groceryState.pantry,
        todayKey,
      )
    : [];
  const needsIngredients = activeIngredients.some((i) => !i.sufficient);
  const needsPrep =
    activePlan &&
    todayPlan.some((t) => t.owners?.includes(activePlan.id) && !t.done);
  const nextLabel = activePlan
    ? needsIngredients
      ? "Review missing ingredients"
      : needsPrep
        ? "Finish meal preparation"
        : "Log what you ate"
    : primaryIdea
      ? `Plan ${primaryIdea.name}`
      : "Review food access";
  const nextAction = () => {
    if (!activePlan) {
      if (primaryIdea) pickIdea(primaryIdea);
      else onNavigate("food/meals");
    } else if (!needsIngredients && needsPrep) {
      const target = document.querySelector(".prep-checklist");
      target?.scrollIntoView({ behavior: "instant", block: "center" });
      target?.querySelector("button")?.focus({ preventScroll: true });
    } else onNavigate(needsIngredients ? "food/meals" : "food/log");
  };
  const timeline = [
    ...(guidance.schoolToday
      ? [
          {
            id: "school",
            type: "school",
            title: schoolSchedule.name,
            startTime: schoolSchedule.startTime,
            endTime: schoolSchedule.endTime,
          },
        ]
      : []),
    ...todayEvents,
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));

  function addPlanTasks(dateKey, tasks) {
    setDayPlans((plans) => {
      const current = plans[dateKey] || [];
      const newTasks = tasks
        .filter((task) => !current.some((item) => item.label === task.label))
        .map((task, index) => ({
          ...task,
          id: `${Date.now()}-${index}`,
          done: false,
        }));
      return { ...plans, [dateKey]: [...current, ...newTasks] };
    });
  }

  function pickIdea(idea) {
    changeData((data) => planMeal(data, idea, todayKey, guidance));
  }

  function togglePlanTask(dateKey, id) {
    setDayPlans((plans) => ({
      ...plans,
      [dateKey]: (plans[dateKey] || []).map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    }));
  }

  function removePlanTask(dateKey, id) {
    setDayPlans((plans) => ({
      ...plans,
      [dateKey]: (plans[dateKey] || []).filter((item) => item.id !== id),
    }));
  }

  async function enableReminders() {
    if (typeof Notification === "undefined") {
      setReminderStatus("Browser notifications are not available here.");
      return;
    }
    let permission;
    try {
      permission = await Notification.requestPermission();
    } catch {
      setReminderStatus(
        "Notification permission could not be requested. Check browser settings.",
      );
      return;
    }
    if (permission === "granted") {
      setReminderSettings((settings) => ({ ...settings, enabled: true }));
      setReminderStatus("Reminders are on while Nourally is open.");
    } else {
      setReminderSettings((settings) => ({ ...settings, enabled: false }));
      setReminderStatus("Notifications were not allowed in this browser.");
    }
  }

  return (
    <Shell eyebrow="NOURALLY / TODAY">
      <section className="dashboard-head today-head">
        <div>
          <p className="kicker">TODAY · {date.toUpperCase()}</p>
          <h1>{profile.name ? `Today, ${profile.name}` : "Today"}</h1>
        </div>
        <AppNavigation active="today" onNavigate={onNavigate} />
      </section>
      {!events.length && !profile.restDays?.includes(todayKey) && (
        <div className="setup-notice">
          <p>Add sports for activity-based reminders, or confirm a rest day.</p>
          <button onClick={() => onNavigate("calendar")}>Set schedule</button>
          <button
            onClick={() =>
              changeData((data) => {
                data.profile.restDays = [
                  ...(data.profile.restDays || []),
                  todayKey,
                ];
              })
            }
          >
            Today is a rest day
          </button>
        </div>
      )}
      <section className="today-command">
        <article className="action-hero">
          <div className="action-hero-top">
            <span className="step-badge">NEXT RECOMMENDED ACTION</span>
            <strong>{guidance.timing}</strong>
          </div>
          <div>
            <span className="context-pill">{guidance.label}</span>
            <h2>{guidance.title}</h2>
            <details className="guidance-details">
              <summary>Why this action?</summary>
              <p>{guidance.explanation}</p>
            </details>
          </div>
          <div className="action-hero-actions">
            <button className="action-primary" onClick={nextAction}>
              {nextLabel}
              <span>→</span>
            </button>
            <button
              className="action-secondary"
              onClick={() => onNavigate("calendar")}
            >
              View full schedule
            </button>
          </div>
        </article>
      </section>
      <section className="today-timeline-layout">
        <aside className="card day-plan-card">
          <div className="section-label">TODAY’S TIMELINE</div>
          <h2 className="section-title">School to sport</h2>
          {timeline.length ? (
            <div className="mini-timeline">
              {timeline.map((event) => (
                <div className={event.type} key={event.id}>
                  <span>{formatClock(event.startTime)}</span>
                  <i />
                  <div>
                    <strong>{event.title}</strong>
                    <small>
                      {event.type === "school"
                        ? `Lunch ${formatClock(schoolSchedule.lunchStartTime)}`
                        : `${event.type}${event.location === "away" ? " · away" : ""}`}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="timeline-empty">
              <span>＋</span>
              <h3>
                {profile.restDays?.includes(todayKey)
                  ? "Rest day"
                  : "Add today’s schedule."}
              </h3>
              <p>
                {profile.restDays?.includes(todayKey)
                  ? "No sport planned today. Keep meals and snacks regular."
                  : "Add school and sports to connect food to your day."}
              </p>
              <button
                className="primary small"
                onClick={() => onNavigate("calendar")}
              >
                Open calendar <span>→</span>
              </button>
            </div>
          )}
          <div className="prep-callout">
            <span>
              {guidance.travelMode
                ? "TRAVEL · PACK BEFORE YOU GO"
                : guidance.event
                  ? "ACTIVITY HANDOFF"
                  : "TODAY’S FOOD WINDOW"}
            </span>
            <p>
              {guidance.travelMode
                ? "Choose shelf-stable options, pack water, and avoid relying on an unfamiliar away venue."
                : profile.familyPrep
                  ? "Share the packing list with whoever can help before the busy part of the day."
                  : "Set aside the next snack or meal before the busy part of the day."}
            </p>
          </div>
        </aside>
      </section>
      <section className="planning-layout today-only">
        <PrepChecklist
          title="PACK + PREP"
          dateLabel="Today’s preparation"
          items={todayPlan}
          empty="Choose a meal in Food. Nourally will turn it into clear packing and preparation steps."
          onToggle={(id) => togglePlanTask(todayKey, id)}
          onRemove={(id) => removePlanTask(todayKey, id)}
        />
      </section>
      <HydrationTracker
        water={water}
        setHydration={setHydration}
        guidance={guidance}
      />
      {earlyTomorrow && (
        <article className="card tomorrow-card">
          <div className="section-label">PREPARE TONIGHT</div>
          {earlyTomorrow ? (
            <>
              <div className="tomorrow-event">
                <span>{formatClock(earlyTomorrow.startTime)} tomorrow</span>
                <h2>{earlyTomorrow.title}</h2>
                <p>
                  {earlyTomorrow.location === "away" ||
                  earlyTomorrow.location === "travel"
                    ? `Early travel day · ${earlyTomorrow.travelMinutes || 0} min travel`
                    : "Early activity · make the morning easier tonight"}
                </p>
              </div>
              {
                <button
                  className="primary small"
                  onClick={() =>
                    addPlanTasks(tomorrowKey, tomorrowPrepTasks(earlyTomorrow))
                  }
                >
                  Build / restore tomorrow’s list <span>→</span>
                </button>
              }
              <PrepChecklist
                compact
                title="TOMORROW’S CHECKLIST"
                dateLabel="Tomorrow"
                items={tomorrowPlan}
                empty="Build the list to set out food, water, and gear."
                onToggle={(id) => togglePlanTask(tomorrowKey, id)}
                onRemove={(id) => removePlanTask(tomorrowKey, id)}
              />
            </>
          ) : null}
        </article>
      )}
      {notificationError && <p role="alert">{notificationError}</p>}
      <section className="card reminder-card">
        <div>
          <div className="section-label">TIMELY REMINDERS</div>
          <h2>
            {reminderSettings.enabled
              ? "Fueling reminders are active."
              : "Turn on pre-activity reminders."}
          </h2>
          <p>
            Nourally uses the schedule above to send the next useful prompt
            while the app is open.
          </p>
          {reminderStatus && (
            <span className="reminder-status">{reminderStatus}</span>
          )}
        </div>
        <div className="reminder-controls">
          {reminderSettings.enabled ? (
            <button
              className="reminder-toggle on"
              onClick={() =>
                setReminderSettings((settings) => ({
                  ...settings,
                  enabled: false,
                }))
              }
            >
              <span /> Reminders on
            </button>
          ) : (
            <button className="reminder-toggle" onClick={enableReminders}>
              <span /> Turn on
            </button>
          )}
          <label>
            Lead time
            <select
              value={reminderSettings.leadMinutes}
              onChange={(event) =>
                setReminderSettings((settings) => ({
                  ...settings,
                  leadMinutes: Number(event.target.value),
                }))
              }
            >
              <option value="30">30 min before</option>
              <option value="60">60 min before</option>
              <option value="90">90 min before</option>
            </select>
          </label>
          <label className="check-row reminder-check">
            <input
              type="checkbox"
              checked={reminderSettings.eveningPrep}
              onChange={(event) =>
                setReminderSettings((settings) => ({
                  ...settings,
                  eveningPrep: event.target.checked,
                }))
              }
            />
            <span>Evening preparation reminder for early events</span>
          </label>
        </div>
      </section>
    </Shell>
  );
}

function PrepChecklist({
  title,
  dateLabel,
  items,
  empty,
  onToggle,
  onRemove,
  compact = false,
}) {
  const completed = items.filter((item) => item.done).length;
  return (
    <article className={`card prep-checklist${compact ? " compact" : ""}`}>
      <div className="checklist-head">
        <div>
          <div className="section-label">{title}</div>
          <h2>
            {dateLabel}{" "}
            <small>
              {items.length
                ? `${completed}/${items.length} ready`
                : "nothing added yet"}
            </small>
          </h2>
        </div>
        {items.length > 0 && (
          <span className="checklist-count">
            {Math.round((completed / items.length) * 100)}%
          </span>
        )}
      </div>
      {items.length ? (
        <div className="checklist-items">
          {items.map((item) => (
            <div className={item.done ? "done" : ""} key={item.id}>
              <button
                className="task-check"
                onClick={() => onToggle(item.id)}
                aria-pressed={item.done}
                aria-label={`${item.done ? "Mark incomplete" : "Mark complete"}: ${item.label}`}
              >
                {item.done ? "✓" : ""}
              </button>
              <span>
                <i>{item.kind}</i>
                {item.label}
              </span>
              <button
                className="task-remove"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.label}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="checklist-empty">{empty}</p>
      )}
    </article>
  );
}

function ScheduleCalendar({
  events,
  setEvents,
  schoolSchedule,
  setSchoolSchedule,
  todayKey,
  onNavigate,
}) {
  const today = new Date(`${todayKey}T12:00:00`);
  const schoolYearStart =
    today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [monthCursor, setMonthCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [showForm, setShowForm] = useState(false);
  const [calendarMode, setCalendarMode] = useState(() =>
    window.innerWidth < 700 ? "agenda" : "month",
  );
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState("practice");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("17:30");
  const [intensity, setIntensity] = useState("medium");
  const [location, setLocation] = useState("home");
  const [travelMinutes, setTravelMinutes] = useState("0");
  const [repeatMode, setRepeatMode] = useState("once");
  const [repeatWeekdays, setRepeatWeekdays] = useState([today.getDay()]);
  const [repeatEndDate, setRepeatEndDate] = useState(
    getDateKey(addDays(today, 84)),
  );
  const [formError, setFormError] = useState("");
  const [schoolName, setSchoolName] = useState(
    schoolSchedule?.name || "School",
  );
  const [schoolStartDate, setSchoolStartDate] = useState(
    schoolSchedule?.startDate || `${schoolYearStart}-08-15`,
  );
  const [schoolEndDate, setSchoolEndDate] = useState(
    schoolSchedule?.endDate || `${schoolYearStart + 1}-06-15`,
  );
  const [schoolStartTime, setSchoolStartTime] = useState(
    schoolSchedule?.startTime || "08:00",
  );
  const [schoolEndTime, setSchoolEndTime] = useState(
    schoolSchedule?.endTime || "15:00",
  );
  const [schoolWeekdays, setSchoolWeekdays] = useState(
    schoolSchedule?.weekdays || [1, 2, 3, 4, 5],
  );
  const [lunchStartTime, setLunchStartTime] = useState(
    schoolSchedule?.lunchStartTime || "11:30",
  );
  const [lunchEndTime, setLunchEndTime] = useState(
    schoolSchedule?.lunchEndTime || "12:00",
  );
  const [morningSnackTime, setMorningSnackTime] = useState(
    schoolSchedule?.morningSnackTime || "",
  );
  const [afternoonSnackTime, setAfternoonSnackTime] = useState(
    schoolSchedule?.afternoonSnackTime || "",
  );
  const [commuteMinutes, setCommuteMinutes] = useState(
    String(schoolSchedule?.commuteMinutes ?? 20),
  );
  const [foodAccess, setFoodAccess] = useState(
    schoolSchedule?.foodAccess || {
      cafeteria: true,
      refrigerator: false,
      microwave: false,
      eatInClass: false,
    },
  );
  const [schoolError, setSchoolError] = useState("");
  const monthStart = new Date(
    monthCursor.getFullYear(),
    monthCursor.getMonth(),
    1,
  );
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) =>
    addDays(gridStart, index),
  );
  const selectedDate = new Date(`${selectedKey}T12:00:00`);
  const selectedEvents = getEventsForDay(selectedDate);
  const selectedSchoolCanceled =
    schoolSchedule?.enabled &&
    isConfiguredSchoolDay(selectedDate) &&
    schoolSchedule.excludedDates?.includes(selectedKey);

  function isConfiguredSchoolDay(date) {
    if (
      !schoolSchedule ||
      getDateKey(date) < schoolSchedule.startDate ||
      getDateKey(date) > schoolSchedule.endDate
    )
      return false;
    return schoolSchedule.weekdays.includes(date.getDay());
  }

  function getSchoolEvent(date) {
    const key = getDateKey(date);
    if (
      !schoolSchedule?.enabled ||
      !isConfiguredSchoolDay(date) ||
      schoolSchedule.excludedDates?.includes(key)
    )
      return null;
    return {
      id: `school-${key}`,
      date: key,
      type: "school",
      title: schoolSchedule.name,
      startTime: schoolSchedule.startTime,
      endTime: schoolSchedule.endTime,
      intensity: "school day",
      recurring: true,
    };
  }

  function getEventsForDay(date) {
    const key = getDateKey(date);
    const dayEvents = eventsForDate(events, key);
    const schoolEvent = getSchoolEvent(date);
    return (schoolEvent ? [...dayEvents, schoolEvent] : dayEvents).sort(
      (a, b) => a.startTime.localeCompare(b.startTime),
    );
  }

  function formatTime(value) {
    if (!/^\d{2}:\d{2}$/.test(value || "")) return "Time TBD";
    const [hours, minutes] = value.split(":").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(2000, 0, 1, hours, minutes));
  }

  function formatDuration(start, end) {
    if (!/^\d{2}:\d{2}$/.test(start || "") || !/^\d{2}:\d{2}$/.test(end || ""))
      return "Duration not set";
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);
    const minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) return `${remainder} min`;
    return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
  }

  function resetForm(resetKey = selectedKey) {
    setEditingId(null);
    setType("practice");
    setTitle("");
    setStartTime("16:00");
    setEndTime("17:30");
    setIntensity("medium");
    setLocation("home");
    setTravelMinutes("0");
    setRepeatMode("once");
    setRepeatWeekdays([new Date(`${resetKey}T12:00:00`).getDay()]);
    setRepeatEndDate(getDateKey(addDays(new Date(`${resetKey}T12:00:00`), 84)));
    setFormError("");
    setShowForm(false);
  }

  function selectDay(date) {
    const key = getDateKey(date);
    setSelectedKey(key);
    if (
      date.getMonth() !== monthCursor.getMonth() ||
      date.getFullYear() !== monthCursor.getFullYear()
    ) {
      setMonthCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    resetForm(key);
  }

  function goToToday() {
    setSelectedKey(todayKey);
    setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    resetForm(todayKey);
  }

  function saveEvent(event) {
    event.preventDefault();
    if (endTime <= startTime) {
      setFormError(
        "End time must be later than start time on the same day. Overnight events are not supported.",
      );
      return;
    }
    if (
      !Number.isFinite(Number(travelMinutes)) ||
      Number(travelMinutes) < 0 ||
      Number(travelMinutes) > 360
    ) {
      setFormError("Travel time must be between 0 and 360 minutes.");
      return;
    }
    if (repeatMode === "weekly" && !repeatWeekdays.length) {
      setFormError("Choose at least one repeat day.");
      return;
    }
    if (repeatMode === "weekly" && repeatEndDate < selectedKey) {
      setFormError(
        "The repeat end date must be on or after the first activity.",
      );
      return;
    }
    const overlap = eventsForDate(events, selectedKey).find(
      (e) =>
        e.id !== editingId && startTime < e.endTime && endTime > e.startTime,
    );
    if (
      overlap &&
      !window.confirm(`This overlaps ${overlap.title}. Save anyway?`)
    )
      return;
    if (Number(travelMinutes) > timeToMinutes(startTime)) {
      setFormError(
        "Travel cannot begin on the previous day. Adjust the start or travel time.",
      );
      return;
    }
    const existingEvent = events.find((item) => item.id === editingId);
    const scheduledEvent = {
      id: editingId || uid(),
      type,
      title: title.trim() || type[0].toUpperCase() + type.slice(1),
      startTime,
      endTime,
      intensity,
      location,
      travelMinutes: Number(travelMinutes || 0),
      ...(repeatMode === "weekly"
        ? {
            recurrence: {
              startDate:
                editingId && existingEvent?.recurrence
                  ? existingEvent.recurrence.startDate
                  : selectedKey,
              endDate: repeatEndDate,
              weekdays: [...repeatWeekdays].sort(),
              excludedDates: existingEvent?.recurrence?.excludedDates || [],
            },
          }
        : { date: selectedKey }),
    };
    setEvents((current) =>
      editingId
        ? current.map((item) => (item.id === editingId ? scheduledEvent : item))
        : [...current, scheduledEvent],
    );
    resetForm();
  }

  function editEvent(event) {
    setEditingId(event.id);
    setType(event.type);
    setTitle(event.title);
    setStartTime(event.startTime);
    setEndTime(event.endTime);
    setIntensity(event.intensity);
    setLocation(event.location || "home");
    setTravelMinutes(String(event.travelMinutes || 0));
    setRepeatMode(event.recurrence ? "weekly" : "once");
    setRepeatWeekdays(
      event.recurrence?.weekdays || [
        new Date(`${event.date}T12:00:00`).getDay(),
      ],
    );
    setRepeatEndDate(
      event.recurrence?.endDate ||
        getDateKey(addDays(new Date(`${event.date}T12:00:00`), 84)),
    );
    setFormError("");
    setShowForm(true);
  }

  function deleteEvent(id) {
    const target = events.find((e) => e.id === id);
    if (
      !window.confirm(
        target?.recurrence
          ? `Delete the entire ${target.title} series, including all dates?`
          : `Delete ${target?.title}?`,
      )
    )
      return;
    setEvents((current) => current.filter((event) => event.id !== id));
    if (editingId === id) resetForm();
  }

  function skipRecurringOccurrence(event) {
    setEvents((current) =>
      current.map((item) =>
        item.id === event.id
          ? {
              ...item,
              recurrence: {
                ...item.recurrence,
                excludedDates: [
                  ...new Set([
                    ...(item.recurrence?.excludedDates || []),
                    selectedKey,
                  ]),
                ],
              },
            }
          : item,
      ),
    );
  }

  function toggleRepeatDay(day) {
    setRepeatWeekdays((days) =>
      days.includes(day) ? days.filter((item) => item !== day) : [...days, day],
    );
  }

  function saveSchoolSchedule(event) {
    event.preventDefault();
    if (schoolEndDate < schoolStartDate) {
      setSchoolError("The school year must end after it starts.");
      return;
    }
    if (schoolEndTime <= schoolStartTime) {
      setSchoolError("The school day must end after it starts.");
      return;
    }
    if (!schoolWeekdays.length) {
      setSchoolError("Choose at least one school day.");
      return;
    }
    if (
      lunchEndTime <= lunchStartTime ||
      lunchStartTime < schoolStartTime ||
      lunchEndTime > schoolEndTime
    ) {
      setSchoolError(
        "Lunch must fit inside the school day and end after it starts.",
      );
      return;
    }
    if (
      [morningSnackTime, afternoonSnackTime].some(
        (time) => time && (time < schoolStartTime || time > schoolEndTime),
      )
    ) {
      setSchoolError("Optional snack times must fall inside the school day.");
      return;
    }
    const parsedCommuteMinutes = Number(commuteMinutes);
    if (
      !Number.isFinite(parsedCommuteMinutes) ||
      parsedCommuteMinutes < 0 ||
      parsedCommuteMinutes > 180
    ) {
      setSchoolError("Commute time must be between 0 and 180 minutes.");
      return;
    }
    setSchoolSchedule({
      enabled: true,
      name: schoolName.trim() || "School",
      startDate: schoolStartDate,
      endDate: schoolEndDate,
      startTime: schoolStartTime,
      endTime: schoolEndTime,
      weekdays: [...schoolWeekdays].sort(),
      lunchStartTime,
      lunchEndTime,
      morningSnackTime,
      afternoonSnackTime,
      commuteMinutes: parsedCommuteMinutes,
      foodAccess,
      excludedDates: schoolSchedule?.excludedDates || [],
    });
    setSchoolError("");
    setShowSchoolForm(false);
  }

  function openSchoolForm() {
    if (schoolSchedule) {
      setSchoolName(schoolSchedule.name);
      setSchoolStartDate(schoolSchedule.startDate);
      setSchoolEndDate(schoolSchedule.endDate);
      setSchoolStartTime(schoolSchedule.startTime);
      setSchoolEndTime(schoolSchedule.endTime);
      setSchoolWeekdays(schoolSchedule.weekdays);
      setLunchStartTime(schoolSchedule.lunchStartTime || "11:30");
      setLunchEndTime(schoolSchedule.lunchEndTime || "12:00");
      setMorningSnackTime(schoolSchedule.morningSnackTime || "");
      setAfternoonSnackTime(schoolSchedule.afternoonSnackTime || "");
      setCommuteMinutes(String(schoolSchedule.commuteMinutes ?? 20));
      setFoodAccess(
        schoolSchedule.foodAccess || {
          cafeteria: true,
          refrigerator: false,
          microwave: false,
          eatInClass: false,
        },
      );
    }
    setSchoolError("");
    setShowSchoolForm(true);
    resetForm();
  }

  function toggleSchoolDay(day) {
    setSchoolWeekdays((days) =>
      days.includes(day) ? days.filter((item) => item !== day) : [...days, day],
    );
  }

  function toggleFoodAccess(option) {
    setFoodAccess((access) => ({ ...access, [option]: !access[option] }));
  }

  function toggleSchoolSchedule() {
    if (!schoolSchedule) {
      openSchoolForm();
      return;
    }
    setSchoolSchedule((current) => ({ ...current, enabled: !current.enabled }));
  }

  function cancelSchoolDay(dateKey) {
    setSchoolSchedule((current) => ({
      ...current,
      excludedDates: [...new Set([...(current.excludedDates || []), dateKey])],
    }));
  }

  function restoreSchoolDay(dateKey) {
    setSchoolSchedule((current) => ({
      ...current,
      excludedDates: (current.excludedDates || []).filter(
        (date) => date !== dateKey,
      ),
    }));
  }

  return (
    <Shell eyebrow="NOURALLY / CALENDAR">
      <section className="calendar-head">
        <div>
          <p className="kicker">SCHOOL + TRAINING SCHEDULE</p>
          <h1>Schedule</h1>
        </div>
        <div className="page-head-tools">
          <AppNavigation active="calendar" onNavigate={onNavigate} />
          <button className="school-button" onClick={openSchoolForm}>
            ▤ School
          </button>
        </div>
      </section>
      {(schoolSchedule || showSchoolForm) && (
        <section className="card school-schedule-card">
          <div className="school-schedule-summary">
            <div>
              <div className="section-label">SCHOOL CALENDAR</div>
              <h2>{schoolSchedule?.name || "Set your school schedule"}</h2>
              {schoolSchedule && (
                <>
                  <p>
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(
                      new Date(`${schoolSchedule.startDate}T12:00:00`),
                    )}{" "}
                    –{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(
                      new Date(`${schoolSchedule.endDate}T12:00:00`),
                    )}{" "}
                    · {formatTime(schoolSchedule.startTime)}–
                    {formatTime(schoolSchedule.endTime)}
                  </p>
                  {schoolSchedule.lunchStartTime && (
                    <p className="school-food-summary">
                      Lunch {formatTime(schoolSchedule.lunchStartTime)}–
                      {formatTime(schoolSchedule.lunchEndTime)} ·{" "}
                      {schoolSchedule.commuteMinutes ?? 20} min commute
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="school-summary-actions">
              {schoolSchedule && (
                <button
                  className={`school-toggle ${schoolSchedule.enabled ? "on" : ""}`}
                  onClick={toggleSchoolSchedule}
                  aria-pressed={schoolSchedule.enabled}
                >
                  <span />
                  {schoolSchedule.enabled ? "Shown" : "Hidden"}
                </button>
              )}
              <button
                className="text-button"
                onClick={() =>
                  showSchoolForm ? setShowSchoolForm(false) : openSchoolForm()
                }
              >
                {showSchoolForm ? "Close" : schoolSchedule ? "Edit" : "Set up"}
              </button>
            </div>
          </div>
          {showSchoolForm && (
            <form className="school-form" onSubmit={saveSchoolSchedule}>
              <label>
                School name
                <input
                  value={schoolName}
                  onChange={(event) => setSchoolName(event.target.value)}
                  placeholder="School"
                />
              </label>
              <div className="school-date-fields">
                <label>
                  School year starts
                  <input
                    required
                    type="date"
                    value={schoolStartDate}
                    onChange={(event) => setSchoolStartDate(event.target.value)}
                  />
                </label>
                <label>
                  School year ends
                  <input
                    required
                    type="date"
                    value={schoolEndDate}
                    onChange={(event) => setSchoolEndDate(event.target.value)}
                  />
                </label>
              </div>
              <div className="school-date-fields">
                <label>
                  School starts
                  <input
                    required
                    type="time"
                    value={schoolStartTime}
                    onChange={(event) => setSchoolStartTime(event.target.value)}
                  />
                </label>
                <label>
                  School ends
                  <input
                    required
                    type="time"
                    value={schoolEndTime}
                    onChange={(event) => setSchoolEndTime(event.target.value)}
                  />
                </label>
              </div>
              <fieldset>
                <legend>School days</legend>
                <div className="school-weekdays">
                  {[
                    ["S", 0],
                    ["M", 1],
                    ["T", 2],
                    ["W", 3],
                    ["T", 4],
                    ["F", 5],
                    ["S", 6],
                  ].map(([label, day]) => (
                    <button
                      type="button"
                      aria-label={
                        [
                          "Sunday",
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                          "Saturday",
                        ][day]
                      }
                      aria-pressed={schoolWeekdays.includes(day)}
                      className={schoolWeekdays.includes(day) ? "selected" : ""}
                      onClick={() => toggleSchoolDay(day)}
                      key={day}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="school-food-section">
                <div>
                  <div className="section-label">FOOD WINDOWS & ACCESS</div>
                  <p>
                    Tell Nourally what is realistically available during your
                    school day.
                  </p>
                </div>
                <div className="school-date-fields">
                  <label>
                    Lunch starts
                    <input
                      required
                      type="time"
                      value={lunchStartTime}
                      onChange={(event) =>
                        setLunchStartTime(event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Lunch ends
                    <input
                      required
                      type="time"
                      value={lunchEndTime}
                      onChange={(event) => setLunchEndTime(event.target.value)}
                    />
                  </label>
                </div>
                <div className="school-date-fields">
                  <label>
                    Morning snack <span>Optional</span>
                    <input
                      type="time"
                      value={morningSnackTime}
                      onChange={(event) =>
                        setMorningSnackTime(event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Afternoon snack <span>Optional</span>
                    <input
                      type="time"
                      value={afternoonSnackTime}
                      onChange={(event) =>
                        setAfternoonSnackTime(event.target.value)
                      }
                    />
                  </label>
                </div>
                <label>
                  Commute from school
                  <input
                    type="number"
                    min="0"
                    max="180"
                    step="5"
                    value={commuteMinutes}
                    onChange={(event) => setCommuteMinutes(event.target.value)}
                  />
                  <small>
                    Minutes from school to home, practice, or your usual next
                    stop.
                  </small>
                </label>
                <fieldset>
                  <legend>Food access at school</legend>
                  <div className="food-access-options">
                    {[
                      ["cafeteria", "Cafeteria"],
                      ["refrigerator", "Refrigerator"],
                      ["microwave", "Microwave"],
                      ["eatInClass", "Can eat in class"],
                    ].map(([option, label]) => (
                      <button
                        type="button"
                        className={foodAccess[option] ? "selected" : ""}
                        aria-pressed={Boolean(foodAccess[option])}
                        onClick={() => toggleFoodAccess(option)}
                        key={option}
                      >
                        <span>{foodAccess[option] ? "✓" : "+"}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
              {schoolError && <p className="schedule-error">{schoolError}</p>}
              <button className="primary" type="submit">
                Save school schedule <span>→</span>
              </button>
            </form>
          )}
        </section>
      )}
      <div className="agenda-date-strip">
        <label>
          Selected date
          <input
            type="date"
            value={selectedKey}
            onChange={(e) => {
              if (e.target.value)
                selectDay(new Date(`${e.target.value}T12:00:00`));
            }}
          />
        </label>
        <button
          aria-pressed={calendarMode === "agenda"}
          onClick={() => setCalendarMode("agenda")}
        >
          Agenda
        </button>
        <button
          aria-pressed={calendarMode === "month"}
          onClick={() => setCalendarMode("month")}
        >
          Month
        </button>
      </div>
      <section
        className={`calendar-layout ${calendarMode === "agenda" ? "agenda-mode" : ""}`}
      >
        {calendarMode === "month" && (
          <div className="card month-calendar">
            <div className="calendar-toolbar">
              <div className="calendar-month-controls">
                <button
                  onClick={() =>
                    setMonthCursor(
                      new Date(
                        monthCursor.getFullYear(),
                        monthCursor.getMonth() - 1,
                        1,
                      ),
                    )
                  }
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <button
                  onClick={() =>
                    setMonthCursor(
                      new Date(
                        monthCursor.getFullYear(),
                        monthCursor.getMonth() + 1,
                        1,
                      ),
                    )
                  }
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
              <h2>
                {new Intl.DateTimeFormat("en-US", {
                  month: "long",
                  year: "numeric",
                }).format(monthCursor)}
              </h2>
              <button className="today-button" onClick={goToToday}>
                Today
              </button>
            </div>
            <div className="weekday-row">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {calendarDays.map((date) => {
                const key = getDateKey(date);
                const dayEvents = getEventsForDay(date);
                const outsideMonth = date.getMonth() !== monthCursor.getMonth();
                return (
                  <button
                    type="button"
                    className={`calendar-day${outsideMonth ? " outside" : ""}${key === todayKey ? " today" : ""}${key === selectedKey ? " selected" : ""}`}
                    key={key}
                    onClick={() => selectDay(date)}
                    aria-label={new Intl.DateTimeFormat("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }).format(date)}
                  >
                    <span className="day-number">{date.getDate()}</span>
                    <span className="day-events">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          className={`calendar-event-chip ${event.type}`}
                          key={event.occurrenceId || event.id}
                        >
                          <i />
                          {event.title}
                        </span>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="more-events">
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <aside className="card day-agenda">
          <div className="agenda-head">
            <div>
              <span>
                {new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
                  selectedDate,
                )}
              </span>
              <strong>
                {new Intl.DateTimeFormat("en-US", {
                  month: "long",
                  day: "numeric",
                }).format(selectedDate)}
              </strong>
            </div>
            <button
              className="primary small"
              onClick={() => {
                setShowSchoolForm(false);
                showForm ? resetForm() : setShowForm(true);
              }}
            >
              {showForm ? "Cancel" : "+ Add"}
            </button>
          </div>
          {showForm && (
            <Dialog
              title={
                editingId
                  ? events.find((e) => e.id === editingId)?.recurrence
                    ? "Edit series — changes affect every occurrence"
                    : "Edit activity"
                  : "Add activity"
              }
              onClose={resetForm}
            >
              <form className="schedule-form" onSubmit={saveEvent}>
                <label>
                  Activity type
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                  >
                    <option value="workout">Workout</option>
                    <option value="practice">Practice</option>
                    <option value="game">Game</option>
                  </select>
                </label>
                <label>
                  Activity name
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={type[0].toUpperCase() + type.slice(1)}
                  />
                </label>
                <div className="time-fields">
                  <label>
                    Starts
                    <input
                      required
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                    />
                  </label>
                  <label>
                    Ends
                    <input
                      required
                      type="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                    />
                  </label>
                </div>
                <fieldset>
                  <legend>Activity level</legend>
                  <div className="intensity-options">
                    {["low", "medium", "high"].map((level) => (
                      <button
                        type="button"
                        aria-pressed={intensity === level}
                        className={intensity === level ? "selected" : ""}
                        onClick={() => setIntensity(level)}
                        key={level}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Location</legend>
                  <div className="intensity-options">
                    <button
                      type="button"
                      aria-pressed={location === "home"}
                      className={location === "home" ? "selected" : ""}
                      onClick={() => setLocation("home")}
                    >
                      Home / local
                    </button>
                    <button
                      type="button"
                      aria-pressed={location === "away"}
                      className={location === "away" ? "selected" : ""}
                      onClick={() => setLocation("away")}
                    >
                      Away
                    </button>
                    <button
                      type="button"
                      aria-pressed={location === "travel"}
                      className={location === "travel" ? "selected" : ""}
                      onClick={() => setLocation("travel")}
                    >
                      Travel day
                    </button>
                  </div>
                </fieldset>
                <label>
                  Travel time
                  <input
                    type="number"
                    min="0"
                    max="360"
                    step="5"
                    value={travelMinutes}
                    onChange={(event) => setTravelMinutes(event.target.value)}
                  />
                  <small>
                    Minutes each way. This helps Nourally favor packable
                    choices.
                  </small>
                </label>
                <fieldset>
                  <legend>Repeat</legend>
                  <div className="intensity-options">
                    <button
                      type="button"
                      aria-pressed={repeatMode === "once"}
                      className={repeatMode === "once" ? "selected" : ""}
                      onClick={() => setRepeatMode("once")}
                    >
                      One time
                    </button>
                    <button
                      type="button"
                      aria-pressed={repeatMode === "weekly"}
                      className={repeatMode === "weekly" ? "selected" : ""}
                      onClick={() => setRepeatMode("weekly")}
                    >
                      Every week
                    </button>
                  </div>
                </fieldset>
                {repeatMode === "weekly" && (
                  <div className="repeat-settings">
                    <fieldset>
                      <legend>Repeat on</legend>
                      <div className="school-weekdays">
                        {[
                          ["S", 0],
                          ["M", 1],
                          ["T", 2],
                          ["W", 3],
                          ["T", 4],
                          ["F", 5],
                          ["S", 6],
                        ].map(([label, day]) => (
                          <button
                            type="button"
                            aria-label={
                              [
                                "Sunday",
                                "Monday",
                                "Tuesday",
                                "Wednesday",
                                "Thursday",
                                "Friday",
                                "Saturday",
                              ][day]
                            }
                            aria-pressed={repeatWeekdays.includes(day)}
                            className={
                              repeatWeekdays.includes(day) ? "selected" : ""
                            }
                            onClick={() => toggleRepeatDay(day)}
                            key={day}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <label>
                      Repeat through
                      <input
                        required
                        type="date"
                        min={selectedKey}
                        value={repeatEndDate}
                        onChange={(event) =>
                          setRepeatEndDate(event.target.value)
                        }
                      />
                      <small>
                        You can skip an individual day later without deleting
                        the series.
                      </small>
                    </label>
                  </div>
                )}
                {formError && <p className="schedule-error">{formError}</p>}
                <button className="primary" type="submit">
                  {editingId ? "Save changes" : "Add to calendar"}{" "}
                  <span>→</span>
                </button>
              </form>
            </Dialog>
          )}
          {events
            .filter((e) => e.recurrence?.excludedDates?.includes(selectedKey))
            .map((e) => (
              <div className="school-canceled" key={e.id}>
                <span>
                  {e.title} · skipped on {selectedKey}
                </span>
                <button
                  onClick={() =>
                    setEvents((list) =>
                      list.map((item) =>
                        item.id === e.id
                          ? {
                              ...item,
                              recurrence: {
                                ...item.recurrence,
                                excludedDates:
                                  item.recurrence.excludedDates.filter(
                                    (date) => date !== selectedKey,
                                  ),
                              },
                            }
                          : item,
                      ),
                    )
                  }
                >
                  Restore this day
                </button>
              </div>
            ))}
          {!showForm && (
            <>
              {selectedSchoolCanceled && (
                <div className="school-canceled">
                  <span>School canceled for this day.</span>
                  <button onClick={() => restoreSchoolDay(selectedKey)}>
                    Restore
                  </button>
                </div>
              )}
              {selectedEvents.length ? (
                <div className="agenda-events">
                  {selectedEvents.map((event) => (
                    <article
                      className={`agenda-event ${event.type}`}
                      key={event.occurrenceId || event.id}
                    >
                      <div className="event-time">
                        <strong>{formatTime(event.startTime)}</strong>
                        <span>{formatTime(event.endTime)}</span>
                      </div>
                      <div className="event-details">
                        <span>
                          {event.type}
                          {event.recurring
                            ? " · recurring school day"
                            : event.recurringSeries
                              ? ` · weekly series through ${event.recurrence.endDate}`
                              : ` · ${event.intensity} activity`}
                        </span>
                        <h3>{event.title}</h3>
                        <p>
                          {formatDuration(event.startTime, event.endTime)}
                          {!event.recurring && event.location
                            ? ` · ${event.location === "home" ? "local" : event.location}${event.travelMinutes ? ` · ${event.travelMinutes} min travel` : ""}`
                            : ""}
                        </p>
                      </div>
                      <div className="event-actions">
                        {event.recurring ? (
                          <>
                            <button onClick={openSchoolForm}>
                              Edit schedule
                            </button>
                            <button
                              className="danger"
                              onClick={() => cancelSchoolDay(selectedKey)}
                              aria-label={`Cancel school on ${selectedKey}`}
                            >
                              Cancel this day
                            </button>
                          </>
                        ) : event.recurringSeries ? (
                          <>
                            <button
                              onClick={() => editEvent(event)}
                              aria-label={`Edit ${event.title} series`}
                            >
                              Edit series
                            </button>
                            <button
                              onClick={() => skipRecurringOccurrence(event)}
                              aria-label={`Skip ${event.title} on ${selectedKey}`}
                            >
                              Skip this day
                            </button>
                            <button
                              className="danger"
                              onClick={() => deleteEvent(event.id)}
                              aria-label={`Delete ${event.title} series`}
                            >
                              Delete series
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => editEvent(event)}
                              aria-label={`Edit ${event.title}`}
                            >
                              Edit
                            </button>
                            <button
                              className="danger"
                              onClick={() => deleteEvent(event.id)}
                              aria-label={`Delete ${event.title}`}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                !selectedSchoolCanceled && (
                  <div className="agenda-empty">
                    <span>＋</span>
                    <h3>Nothing scheduled.</h3>
                    <p>
                      Add a workout, practice, or game—or set your school
                      schedule.
                    </p>
                  </div>
                )
              )}
            </>
          )}
        </aside>
      </section>
    </Shell>
  );
}

function HydrationTracker({ water, setHydration, guidance }) {
  const { current } = useStore();
  const latestEntry = [
    ...(current.data.dailyLogs[getDateKey()]?.waterEntries || []),
  ]
    .reverse()
    .find((entry) => !entry.undone);
  function addWater(amount) {
    setHydration(amount);
  }

  return (
    <section className="card hydration-card">
      <div className="hydration-copy">
        <div className="section-label">HYDRATION CHECK-IN</div>
        <div className="water-title">
          <div className="water-icon">◒</div>
          <div>
            <h2>
              {water.toLocaleString()} <small>oz logged today</small>
            </h2>
            <p>
              {guidance.event
                ? `Bring fluids for ${guidance.event.title}. Sip regularly and follow your team or clinician’s plan.`
                : "Keep water available and drink regularly through the day."}
            </p>
          </div>
        </div>
      </div>
      <div className="hydration-actions">
        <div className="water-quick-add">
          {[8, 12, 16, 24].map((amount) => (
            <button key={amount} onClick={() => addWater(amount)}>
              +{amount} oz
            </button>
          ))}
        </div>
        <div className="water-secondary">
          <button onClick={() => setHydration("undo")} disabled={!latestEntry}>
            Undo last entry
          </button>
          <span>
            {latestEntry ? `Last entry: ${latestEntry.amount} oz · ` : ""}No
            prescribed target
          </span>
        </div>
      </div>
    </section>
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

  let streak = 0;
  let streakDate = new Date(today);
  if (!(dailyLogs[todayKey]?.entries?.length > 0))
    streakDate = addDays(streakDate, -1);
  while (dailyLogs[getDateKey(streakDate)]?.entries?.length > 0) {
    streak += 1;
    streakDate = addDays(streakDate, -1);
  }

  return (
    <Shell eyebrow="NOURALLY / WEEKLY PROGRESS">
      <section className="dashboard-head weekly-head">
        <div>
          <p className="kicker">YOUR SEVEN-DAY VIEW</p>
          <h1>Weekly</h1>
        </div>
        <AppNavigation active="weekly" onNavigate={onNavigate} />
      </section>
      <section className="week-toolbar">
        <button
          className="week-arrow"
          onClick={() => setWeekOffset((offset) => offset - 1)}
          aria-label="Previous seven days"
        >
          ←
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
          →
        </button>
      </section>
      <section className="weekly-stats">
        <article className="card weekly-stat">
          <span>Food check-ins</span>
          <strong>{weeklyCheckIns}</strong>
          <small>this period</small>
        </article>
        <article className="card weekly-stat">
          <span>Days reflected</span>
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
          <span>Current logging streak</span>
          <strong>{streak}</strong>
          <small>{streak === 1 ? "day" : "days"}</small>
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
            <div className="section-label">FOOD CHECK-INS BY DAY</div>
            <h2>
              {weeklyCheckIns} <small>moments captured over 7 days</small>
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
                {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
                  day.date,
                )}
              </strong>
              <small>{day.date.getDate()}</small>
            </div>
          ))}
        </div>
        {weeklyCheckIns === 0 && (
          <p className="chart-empty">
            Use food check-ins to notice where busy days make fueling harder.
          </p>
        )}
      </section>
      <section className="card weekly-water-card">
        <div className="chart-heading">
          <div>
            <div className="section-label">HYDRATION BY DAY</div>
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
          <caption>
            Daily records for this period. Blank means not logged, not zero
            intake.
          </caption>
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
                <th scope="row">{day.key}</th>
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
        These summaries show what you logged; they do not grade intake or set a
        medical target.
      </p>
    </Shell>
  );
}

function History({ dailyLogs, todayKey, onNavigate }) {
  const [date, setDate] = useState(todayKey);
  return (
    <Shell eyebrow="NOURALLY / HISTORY">
      <section className="dashboard-head">
        <h1>History</h1>
        <AppNavigation active="history" onNavigate={onNavigate} />
      </section>
      <div className="section-toolbar">
        <label>
          Review date
          <input
            type="date"
            max={todayKey}
            value={date}
            onChange={(e) => {
              if (e.target.value && e.target.value <= todayKey)
                setDate(e.target.value);
            }}
          />
        </label>
        <button onClick={exportBackup}>Export records</button>
      </div>
      <p>
        {dailyLogs[date]?.waterEntries?.length || dailyLogs[date]?.water > 0
          ? `${dailyLogs[date].water || 0} oz water logged`
          : "No water check-in for this day."}
      </p>
      <FoodLog key={date} date={date} />
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
      <main className="shell" role="status">
        Opening your saved profile…
      </main>
    );
  if (!state.current) return <Recovery message={state.error} />;
  return <App key={state.current.id} />;
}
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <StoreGate />
    </ErrorBoundary>
  </StrictMode>,
);
