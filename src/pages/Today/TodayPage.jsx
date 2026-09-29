import TonightCard from "./TonightCard.jsx";
import WaterRow from "./WaterRow.jsx";
import PackPrep from "./PackPrep.jsx";
import DayRail from "./DayRail.jsx";
import { useState } from "react";
import { advanceCompletedMoment } from "../../domain/ranking.js";
import NowCard from "./NowCard.jsx";
import { Shell } from "../../components/AppFrame.jsx";
import { Dialog } from "../../components/Dialog.jsx";
import { useStore, changeData } from "../../store.js";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";
import {
  getFuelingGuidance,
  eventsForDate,
  formatClock,
  timeToMinutes,
  withSportTitles,
} from "../../domain/timing.js";
import { eveningPlan, mergeTomorrowTasks } from "../../domain/tonight.js";
import { ingredientsForMeal, missingGroceries } from "../../domain/food.js";
import {
  planMeal,
  markPlanPacked,
  logPlanAsEaten,
  intendedEatTime,
} from "../../domain/plans.js";
import { addHydration } from "../../domain/hydration.js";
import { uid } from "../../domain/storage.js";
import { formatDate, formatPlanStatus, formatTime } from "../../format.js";
import {
  availabilityLabel,
  buildRailRows,
  foodMomentLine,
} from "../../domain/dayRail.js";
import ContextPrompt from "./ContextPrompt.jsx";

export default function TodayPage({
  now,
  todayKey,
  onNavigate,
  notificationError,
}) {
  const { current } = useStore();
  const data = current.data;
  const { pending, run } = useAsyncAction();
  const [chosen, setChosen] = useState(null);
  const [why, setWhy] = useState(false);
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState("");
  const [showTasks, setShowTasks] = useState(false);
  const [openPlanId, setOpenPlanId] = useState(null);
  const guidance = advanceCompletedMoment(
    getFuelingGuidance({
      now,
      todayKey,
      events: data.schedule,
      schoolSchedule: data.schoolSchedule,
      profile: data.profile,
      pantry: data.groceryState.pantry,
      favorites: data.favorites,
    }),
    data,
    todayKey,
  );
  const events = withSportTitles(
    eventsForDate(data.schedule, todayKey),
    data.profile.sport,
  );
  const plan = data.mealPlans.find(
    (p) =>
      p.date === todayKey &&
      p.status !== "eaten" &&
      p.eventId === (guidance.event?.id || null) &&
      (p.moment === "recovery") === (guidance.moment === "recovery"),
  );
  const idea =
    plan?.template ||
    guidance.allIdeas.find((i) => i.id === chosen) ||
    guidance.ideas[0];
  const ingredients = idea
    ? ingredientsForMeal(idea, data.groceryState.pantry, todayKey)
    : [];
  const missing = ingredients.filter((i) => !i.sufficient);
  const tasks = data.dayPlans[todayKey] || [];
  const done = tasks.filter((t) => t.done).length;
  const tonight = eveningPlan({
    now,
    todayKey,
    events: data.schedule,
    schoolSchedule: data.schoolSchedule,
    profile: data.profile,
    dayPlans: data.dayPlans,
  });
  const next = tonight.events[0];
  const write = (key, reduce, message) =>
    run(key, () => changeData(reduce, message));
  const water = (n) =>
    write(
      "water",
      (d) => {
        d.dailyLogs[todayKey] = addHydration(
          d.dailyLogs[todayKey] || { entries: [], water: 0 },
          n,
        );
      },
      `Added ${n} oz water.`,
    );
  const buildTomorrow = () =>
    write(
      "tomorrow",
      (d) => {
        d.dayPlans[tonight.tomorrowKey] = mergeTomorrowTasks(
          d.dayPlans[tonight.tomorrowKey],
          tonight.toAdd,
          uid,
        );
      },
      "Tomorrow’s list is ready.",
    );
  const openTonight = () =>
    document
      .getElementById("tonight-title")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  const createPlan = () =>
    write(
      "plan",
      (d) => planMeal(d, idea, todayKey, guidance),
      // changeData attaches Undo to this toast (TODAY-01 "Plan this").
      intendedEatTime(guidance)
        ? `Planned for ${formatTime(intendedEatTime(guidance))}.`
        : `${idea.name} is planned.`,
    );
  const primary = () => {
    if (guidance.state === "setup") return onNavigate("schedule?add=practice");
    if (guidance.state === "during") return water(8);
    if (guidance.state === "evening")
      return tonight.built ? openTonight() : buildTomorrow();
    if (["no_sport", "rest"].includes(guidance.state))
      return onNavigate(`food/ideas?moment=${next ? "tomorrow" : "now"}`);
    if (
      ["before_school", "travel"].includes(guidance.state) &&
      (!plan || !missing.length)
    ) {
      if (!plan) return createPlan();
      document
        .getElementById("pack-prep")
        ?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!plan) return createPlan();
    if (missing.length)
      return write(
        "groceries",
        (d) => {
          d.groceryState.items.push(
            ...missingGroceries(ingredients, d.groceryState.items),
          );
        },
        "Added missing items to groceries.",
      );
    if (plan.status === "packed")
      return write(
        "log",
        (d) => logPlanAsEaten(d, plan.id, now),
        "Logged what you ate.",
      );
    return write("pack", (d) => markPlanPacked(d, plan.id), "Marked packed.");
  };
  const early =
    plan?.status === "packed" &&
    timeToMinutes(plan.eatAt) > now.getHours() * 60 + now.getMinutes();
  const action =
    guidance.state === "setup"
      ? "Add practice"
      : guidance.state === "during"
        ? "+8 oz water"
        : guidance.state === "evening"
          ? tonight.built
            ? "Open tomorrow’s list"
            : "Build tomorrow’s list"
          : ["rest", "no_sport"].includes(guidance.state)
            ? next
              ? "Plan tomorrow"
              : "Choose a snack"
            : ["before_school", "travel"].includes(guidance.state) &&
                (!plan || !missing.length)
              ? "Open packing list"
              : !plan
                ? "Plan this"
                : missing.length
                  ? `Add ${missing.length} ${missing.length === 1 ? "item" : "items"} to groceries`
                  : plan.status === "packed"
                    ? early
                      ? `Eat around ${formatClock(plan.eatAt)}`
                      : "Log it"
                    : "Mark packed";
  const rows = buildRailRows({
    events,
    schoolSchedule: data.schoolSchedule,
    schoolToday: guidance.schoolToday,
    mealPlans: data.mealPlans,
    todayKey,
    now,
  });
  const openPlan = data.mealPlans.find((p) => p.id === openPlanId);
  const openPlanIngredients = openPlan
    ? ingredientsForMeal(openPlan.template, data.groceryState.pantry, todayKey)
    : [];
  const stale =
    plan && guidance.event && plan.eventStartTime !== guidance.event.startTime;
  return (
    <Shell footer={false} onNavigate={onNavigate}>
      <header className="today-heading">
        <h1 className="page-title">Today</h1>
        <p>{formatDate(todayKey)}</p>
        <div className="today-chips">
          {guidance.schoolToday && (
            <span>
              School {formatClock(data.schoolSchedule.startTime)}–
              {formatClock(data.schoolSchedule.endTime)}
            </span>
          )}
          {events.map((e) => (
            <span key={e.id} className={e.type === "game" ? "chip-game" : ""}>
              {e.title} {formatClock(e.startTime)}
            </span>
          ))}
        </div>
      </header>
      <div className="today-layout">
        <NowCard
          {...{
            guidance,
            plan,
            stale,
            pending,
            write,
            idea,
            missing,
            ingredients,
            setChosen,
            onNavigate,
            early,
            primary,
            action,
            setWhy,
            todayKey,
          }}
        />
        <DayRail {...{ rows, onNavigate }} onOpenPlan={setOpenPlanId} />
        {tasks.length > 0 && (
          <PackPrep
            {...{
              tasks,
              done,
              pending,
              write,
              todayKey,
              now,
              showTasks,
              setShowTasks,
            }}
          />
        )}
        <WaterRow {...{ data, todayKey, pending, water, setCustom }} />
        {tonight.show && (
          <TonightCard
            plan={tonight}
            {...{ pending, write, buildTomorrow, onNavigate }}
          />
        )}
      </div>
      <ContextPrompt
        {...{
          data,
          guidance,
          notificationError,
          pending,
          run,
          write,
          onNavigate,
          now,
        }}
      />
      {openPlan && (
        <Dialog
          title={openPlan.template.name}
          onClose={() => setOpenPlanId(null)}
        >
          <p>{foodMomentLine(openPlan)}</p>
          <p>
            Status: {formatPlanStatus(openPlan.status)}
            {openPlan.eatAt ? ` · Eat about ${formatTime(openPlan.eatAt)}` : ""}
          </p>
          {openPlanIngredients.length > 0 && (
            <ul className="today-availability" aria-label="What you need">
              {openPlanIngredients.map((i) => (
                <li key={i.ingredientId} data-have={i.sufficient}>
                  {availabilityLabel(i)}
                </li>
              ))}
            </ul>
          )}
          <div className="dialog-actions">
            <button onClick={() => setOpenPlanId(null)}>Close</button>
          </div>
        </Dialog>
      )}
      {why && (
        <Dialog title="Why this?" onClose={() => setWhy(false)}>
          <h3>Why it fits you</h3>
          <p>{guidance.explanation}</p>
          <p>Your timing, food access, and food at home shape this pick.</p>
          <h3>What the tip is based on</h3>
          <p>
            Reviewed by Emily Cornelius, RDN, September 29, 2026 (owner-reported
            approval).
          </p>
          <a href="https://pubmed.ncbi.nlm.nih.gov/26920240/">
            Nutrition and athletic performance position statement
          </a>
        </Dialog>
      )}
      {custom && (
        <Dialog title="Add water" onClose={() => setCustom(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await water(Number(amount))) setCustom(false);
            }}
          >
            <label>
              Ounces
              <input
                type="number"
                min="1"
                max="128"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <button className="primary" disabled={!!pending}>
              Add water
            </button>
          </form>
        </Dialog>
      )}
    </Shell>
  );
}
