import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Menu } from "../../components/ui/Menu.jsx";
import {
  consumeStock,
  makeLog,
  removeLogEntry,
  reviseLogEntry,
  undoConsumption,
} from "../../domain/food.js";
import { logPlanAsEaten } from "../../domain/plans.js";
import { addHydration } from "../../domain/hydration.js";
import {
  dayTimeline,
  dayWater,
  entryTimeFields,
  homeMatches,
  homePrompt,
  shiftDate,
  unconfirmedPlans,
  weekDates,
  APPROX_TIMES,
} from "../../domain/log.js";
import { changeData, useStore } from "../../store.js";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";
import {
  formatActivityType,
  formatAmount,
  formatDate,
  formatTime,
  plural,
} from "../../format.js";
import { Dialog } from "../../components/Dialog.jsx";
import { FoodSearch } from "../../components/FoodSearch.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { LabelCheck } from "../../components/ui/LabelCheck.jsx";
import { PortionSheet } from "./PortionSheet.jsx";
import { ChangedPlanSheet, foodFor, UseFromHomeSheet } from "./LogSheets.jsx";

const shortDate = (key) => formatDate(key).replace(",", "");

export function dayLabel(date, todayKey) {
  if (date === todayKey) return `Today · ${formatDate(date)}`;
  if (date === shiftDate(todayKey, -1))
    return `Yesterday · ${formatDate(date)}`;
  return formatDate(date);
}

function entryTime(entry) {
  const approx = APPROX_TIMES.find(([key]) => key === entry.approxTime);
  if (approx) return approx[1];
  return entry.time ? formatTime(entry.time) : "";
}

// LOG-02: the portion, never calories.
function entryPortion(entry) {
  if (entry.portion)
    return formatAmount(entry.portion.amount, entry.portion.unit);
  if (entry.servingGrams) return `${entry.servingGrams} g`;
  if (entry.ingredients?.length)
    return entry.ingredients
      .map((item) => formatAmount(item.amount, item.unit, item.name))
      .join(", ");
  return "";
}

// Food › Log › Day (6.8, 6.12): day switcher, "Log food", unconfirmed plans,
// the day's activities and food in time order, and water.
export default function LogDay({ date, todayKey, now, onNavigate }) {
  const { current } = useStore();
  const data = current.data;
  const { pending, run } = useAsyncAction();
  const searchInput = useRef(null);
  const [dialog, setDialog] = useState(null);
  // The open sheet with unsaved changes, if any (DS-15).
  const [dirtyDialog, setDirtyDialog] = useState(null);
  const [homeAsk, setHomeAsk] = useState(null);
  const [query, setQuery] = useState(
    () => sessionStorage.getItem(`food-query-${current.id}`) || "",
  );
  const isToday = date === todayKey;
  const log = data.dailyLogs[date] || { entries: [] };
  const timeline = dayTimeline({ log, events: data.schedule, dateKey: date });
  const plans = unconfirmedPlans(data.mealPlans, date, todayKey);
  const water = dayWater(log);
  const go = (key) =>
    onNavigate(key === todayKey ? "food/log" : `food/log/${key}`);

  useEffect(() => {
    sessionStorage.setItem(`food-query-${current.id}`, query);
  }, [query, current.id]);
  // Ideas › "Edit what I ate" opens the plan here (LOG-03).
  useEffect(() => {
    const planId = sessionStorage.getItem("nourally-log-plan");
    if (!planId) return;
    sessionStorage.removeItem("nourally-log-plan");
    const plan = data.mealPlans.find((entry) => entry.id === planId);
    if (plan && plan.status !== "eaten")
      setDialog({ type: "changed", plan, date: plan.date });
  }, [data.mealPlans]);
  useEffect(() => setHomeAsk(null), [date]);

  const askAboutHome = (entry) => {
    const matches = homeMatches(data.groceryState.pantry, entry);
    setHomeAsk(matches.length ? { entry, matches } : null);
  };

  async function save(portion) {
    const food = dialog.food;
    const old = dialog.entry;
    const next = makeLog(food, portion, date, {
      name: portion.name,
      ...entryTimeFields({ date, todayKey, original: old, ...portion.when }),
    });
    const ok = await run("save-food-log", () =>
      changeData(
        (d) => {
          const day = d.dailyLogs[date] || { entries: [], water: 0 };
          if (old) {
            const found = day.entries.find((e) => e.id === old.id);
            if (!found)
              throw new Error("This entry was removed on another screen.");
            day.entries = day.entries.map((e) =>
              e.id === found.id
                ? {
                    ...reviseLogEntry(found, next),
                    time: next.time,
                    approxTime: next.approxTime,
                  }
                : e,
            );
          } else day.entries.push(next);
          d.dailyLogs[date] = day;
          d.recentFoods = [
            food,
            ...d.recentFoods.filter((f) => f.id !== food.id),
          ].slice(0, 30);
        },
        old ? `Updated ${portion.name}.` : `Logged ${portion.name}.`,
      ),
    );
    if (!ok) return false;
    setDialog(null);
    if (!old) askAboutHome(next);
    return true;
  }

  function logAsPlanned(plan) {
    let logged = null;
    return run(`plan-${plan.id}`, () =>
      changeData((d) => {
        logged = logPlanAsEaten(d, plan.id, now);
        if (!isToday)
          Object.assign(
            logged,
            plan.eatAt
              ? { time: plan.eatAt, approxTime: null }
              : { time: null, approxTime: "midday" },
          );
      }, `Logged ${plan.template.name}.`),
    ).then((ok) => {
      if (ok && logged) askAboutHome(logged);
    });
  }

  async function useFromHome() {
    const { entry, matches } = homeAsk;
    if (matches.some((row) => row.amount == null)) {
      setHomeAsk(null);
      setDialog({ type: "use", entry, only: matches });
      return;
    }
    const ok = await run("use-home", () =>
      changeData(
        (d) =>
          consumeStock(
            d,
            entry.id,
            matches.map(({ id, amount }) => ({ id, amount })),
          ),
        `Took ${matches
          .map((row) => formatAmount(row.amount, row.unit || "piece", row.name))
          .join(" and ")} from At home.`,
      ),
    );
    if (ok) setHomeAsk(null);
  }

  const consumed = (entry) =>
    data.operations.some(
      (op) => op.type === "consume" && op.logId === entry.id && !op.undone,
    );
  const strip = weekDates(
    shiftDate(date, 3) > todayKey ? todayKey : shiftDate(date, 3),
  ).reverse();

  return (
    <div className="log-layout">
      <section className="log-day" aria-labelledby="log-day-title">
        <nav className="day-switcher" aria-label="Choose a day">
          <button
            type="button"
            className="icon-button"
            aria-label={`Previous day, ${shortDate(shiftDate(date, -1))}`}
            onClick={() => go(shiftDate(date, -1))}
          >
            <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <h2 id="log-day-title">{dayLabel(date, todayKey)}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label={`Next day, ${shortDate(shiftDate(date, 1))}`}
            disabled={isToday}
            onClick={() => go(shiftDate(date, 1))}
          >
            <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <label className="day-picker">
            <CalendarDays size={20} strokeWidth={1.75} aria-hidden="true" />
            <span className="sr-only">Choose a day</span>
            <input
              type="date"
              max={todayKey}
              value={date}
              onChange={(e) =>
                e.target.value &&
                e.target.value <= todayKey &&
                go(e.target.value)
              }
            />
          </label>
        </nav>
        {!isToday && (
          <button className="text-button" onClick={() => go(todayKey)}>
            Back to today
          </button>
        )}
        <button
          className="primary button-block"
          onClick={() => setDialog({ type: "search" })}
        >
          Log food
        </button>

        {homeAsk && (
          <section className="log-prompt card" aria-label="Food from home">
            <p>{homePrompt(homeAsk.matches)}</p>
            <div className="button-row">
              <button
                className="primary"
                disabled={!!pending}
                aria-busy={pending === "use-home" || undefined}
                onClick={useFromHome}
              >
                Yes
              </button>
              <button onClick={() => setHomeAsk(null)}>No</button>
            </div>
          </section>
        )}

        {plans.length > 0 && (
          <ul className="card-list log-plans" aria-label="Planned food">
            {plans.map((plan) => (
              <li className="card log-prompt" key={plan.id}>
                <p>Did you eat {plan.template.name}?</p>
                <div className="button-row">
                  <button
                    className="primary"
                    disabled={!!pending}
                    aria-busy={pending === `plan-${plan.id}` || undefined}
                    onClick={() => logAsPlanned(plan)}
                  >
                    Yes, as planned
                  </button>
                  <button
                    disabled={!!pending}
                    onClick={() => setDialog({ type: "changed", plan, date })}
                  >
                    Changed it
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!log.entries.length && (
          <EmptyState>
            {isToday
              ? "Nothing logged yet. Log a meal or snack when you want to."
              : `Nothing logged on ${formatDate(date)}.`}
          </EmptyState>
        )}
        {timeline.length > 0 && (
          <ol
            className="log-timeline"
            aria-label={`Food and activities, ${formatDate(date)}`}
          >
            {timeline.map((item) =>
              item.kind === "activity" ? (
                <li
                  key={item.id}
                  className={`log-activity ${item.event.type || "other"}`}
                >
                  <span className="log-time">
                    {formatTime(item.event.startTime)}
                  </span>
                  <span>
                    {item.event.title || formatActivityType(item.event.type)}
                    {item.event.endTime
                      ? ` · until ${formatTime(item.event.endTime)}`
                      : ""}
                  </span>
                </li>
              ) : (
                <li key={item.id} className="data-row log-entry">
                  <span className="log-time">{entryTime(item.entry)}</span>
                  <div>
                    <h3>{item.entry.name}</h3>
                    {entryPortion(item.entry) && (
                      <p>{entryPortion(item.entry)}</p>
                    )}
                    {consumed(item.entry) && <p>Used from At home</p>}
                  </div>
                  <Menu
                    label={`${item.entry.name} options`}
                    items={[
                      {
                        label: "Edit",
                        disabled: !!pending,
                        onSelect: () =>
                          setDialog({
                            type: "portion",
                            food: foodFor(item.entry),
                            entry: item.entry,
                          }),
                      },
                      consumed(item.entry)
                        ? {
                            label: "Put back at home",
                            disabled: !!pending,
                            onSelect: () =>
                              run(`restock-${item.id}`, () =>
                                changeData(
                                  (d) => undoConsumption(d, item.entry.id),
                                  "Put the food back at home.",
                                ),
                              ),
                          }
                        : {
                            label: "Used from At home…",
                            disabled: !!pending,
                            onSelect: () =>
                              setDialog({ type: "use", entry: item.entry }),
                          },
                      {
                        label: "Remove",
                        danger: true,
                        disabled: !!pending,
                        onSelect: () =>
                          run(`remove-${item.id}`, () =>
                            changeData(
                              (d) => removeLogEntry(d, date, item.entry.id),
                              `Removed ${item.entry.name}.`,
                            ),
                          ),
                      },
                    ]}
                  />
                </li>
              ),
            )}
          </ol>
        )}
        <LabelCheck />
      </section>

      <aside className="log-side" aria-label="This day at a glance">
        <section className="log-water" aria-labelledby="log-water-title">
          <h2 id="log-water-title">Water</h2>
          <p>{water.logged ? `${water.ounces} oz` : "No water logged"}</p>
          <button
            disabled={!!pending}
            onClick={() =>
              run("water", () =>
                changeData((d) => {
                  d.dailyLogs[date] = addHydration(
                    d.dailyLogs[date] || { entries: [], water: 0 },
                    8,
                  );
                }, "Added 8 oz of water."),
              )
            }
          >
            + Water
          </button>
        </section>
        <nav className="week-strip" aria-label="Nearby days">
          <ol>
            {strip.map((key) => {
              const count = data.dailyLogs[key]?.entries?.length || 0;
              return (
                <li key={key}>
                  <a
                    href={`#/food/log${key === todayKey ? "" : `/${key}`}`}
                    aria-current={key === date ? "date" : undefined}
                    aria-label={`${formatDate(key)}, ${count ? `${count} ${plural(count, "food")} logged` : "nothing logged"}`}
                  >
                    <span>
                      {new Intl.DateTimeFormat("en-US", {
                        weekday: "narrow",
                      }).format(new Date(`${key}T12:00:00`))}
                    </span>
                    <strong>{Number(key.slice(8))}</strong>
                    <i className={count ? "logged" : ""} aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ol>
          <a
            className="text-button"
            href={`#/food/log/week${strip.at(-1) === todayKey ? "" : `/${strip.at(-1)}`}`}
          >
            See the week
          </a>
        </nav>
      </aside>

      {dialog && (
        <Dialog
          initialFocusRef={dialog.type === "search" ? searchInput : undefined}
          className={dialog.type === "search" ? "food-search-dialog" : ""}
          title={
            dialog.type === "use"
              ? "Use food from home"
              : dialog.type === "changed"
                ? `Log ${dialog.plan.template.name}`
                : dialog.entry
                  ? "Edit food"
                  : "Log food"
          }
          onClose={() => setDialog(null)}
          dirty={dirtyDialog === dialog}
        >
          {dialog.type === "use" ? (
            <UseFromHomeSheet
              entry={dialog.entry}
              only={dialog.only}
              onDone={() => setDialog(null)}
            />
          ) : dialog.type === "changed" ? (
            <ChangedPlanSheet
              plan={dialog.plan}
              date={dialog.date}
              todayKey={todayKey}
              onDone={(entry) => {
                setDialog(null);
                if (dialog.date !== date) go(dialog.date);
                if (entry) askAboutHome(entry);
              }}
            />
          ) : dialog.type === "portion" ? (
            <PortionSheet
              food={dialog.food}
              entry={dialog.entry}
              isToday={isToday}
              onSave={save}
              onDirty={(dirty) => setDirtyDialog(dirty ? dialog : null)}
            />
          ) : (
            <FoodSearch
              searchInputRef={searchInput}
              initialQuery={query}
              onQuery={setQuery}
              onChoose={(food) => setDialog({ type: "portion", food })}
            />
          )}
        </Dialog>
      )}
    </div>
  );
}
