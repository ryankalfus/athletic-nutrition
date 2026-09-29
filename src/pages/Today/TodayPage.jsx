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
  addDays,
  tomorrowPrepTasks,
} from "../../domain/timing.js";
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
  const events = eventsForDate(data.schedule, todayKey);
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
  const tomorrow = addDays(todayKey, 1);
  const next = eventsForDate(data.schedule, tomorrow)[0];
  const showTonight =
    next && (now.getHours() >= 19 || timeToMinutes(next.startTime) < 600);
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
        const list = d.dayPlans[tomorrow] || [];
        for (const t of tomorrowPrepTasks(next))
          if (!list.some((x) => x.label === t.label))
            list.push({ ...t, id: uid(), done: false, independent: true });
        d.dayPlans[tomorrow] = list;
      },
      "Tomorrow’s list is ready.",
    );
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
    if (guidance.state === "evening") return buildTomorrow();
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
          ? "Build tomorrow’s list"
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
        <h1>Today</h1>
        <p>{formatDate(todayKey)}</p>
        <div className="today-chips">
          {guidance.schoolToday && (
            <span>
              School {formatClock(data.schoolSchedule.startTime)}–
              {formatClock(data.schoolSchedule.endTime)}
            </span>
          )}
          {events.map((e) => (
            <span key={e.id}>
              {e.title} {formatClock(e.startTime)}
            </span>
          ))}
          {guidance.gameDay && <span>Game day</span>}
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
              showTasks,
              setShowTasks,
            }}
          />
        )}
        <WaterRow {...{ data, todayKey, pending, water, setCustom }} />
        {showTonight && (
          <TonightCard {...{ next, pending, buildTomorrow, data, tomorrow }} />
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
          <button onClick={() => setOpenPlanId(null)}>Close</button>
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
