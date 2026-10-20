import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { shiftDate, weekSentence, weekSummary } from "../../domain/log.js";
import { useStore } from "../../store.js";
import {
  formatActivityType,
  formatDate,
  formatDateRange,
  formatWater,
  plural,
  waterUnit,
} from "../../format.js";

const foodsLine = (count) =>
  count ? `${count} ${plural(count, "food")} logged` : "Nothing logged";

// Food › Log › Week (6.11, WEEK-01 to WEEK-04): one sentence and seven day
// rows. No tiles, charts, streaks or percentages.
export default function LogWeek({ endKey, todayKey, onNavigate }) {
  const { current } = useStore();
  const data = current.data;
  const caption = useRef(null);
  // ADD-14: water reads in the athlete's unit.
  const unit = waterUnit(data.profile);
  const waterLine = (water) =>
    water.logged ? formatWater(water.ounces, unit) : "No water logged";
  // A day row says what exists, never a negative (UX-COPY-06): "2 foods,
  // 8 oz water", "8 oz water", or "Nothing logged" once.
  const dayMeta = (day) =>
    [
      day.foods && `${day.foods} ${plural(day.foods, "food")}`,
      day.water.logged && `${formatWater(day.water.ounces, unit)} water`,
    ]
      .filter(Boolean)
      .join(", ") || "Nothing logged";
  const summary = weekSummary({
    endKey,
    events: data.schedule,
    mealPlans: data.mealPlans,
    dailyLogs: data.dailyLogs,
    profile: data.profile,
  });
  const range = formatDateRange(summary.startKey, endKey);
  const isCurrent = endKey >= todayKey;
  const go = (key) =>
    onNavigate(key >= todayKey ? "food/log/week" : `food/log/week/${key}`);
  const dayHref = (key) => `#/food/log${key === todayKey ? "" : `/${key}`}`;
  return (
    <section className="log-week" aria-labelledby="log-week-title">
      <nav className="day-switcher" aria-label="Choose a week">
        <button
          type="button"
          className="icon-button"
          aria-label={`Previous week, ${formatDateRange(shiftDate(summary.startKey, -7), shiftDate(endKey, -7))}`}
          onClick={() => go(shiftDate(endKey, -7))}
        >
          <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <h2 id="log-week-title">{range}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={`Next week, ${formatDateRange(shiftDate(summary.startKey, 7), shiftDate(endKey, 7))}`}
          disabled={isCurrent}
          onClick={() => go(shiftDate(endKey, 7))}
        >
          <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </nav>
      <p className="week-summary">{weekSentence(summary)}</p>
      <ol className="week-days">
        {summary.days.map((day) => (
          <li key={day.dateKey}>
            <a href={dayHref(day.dateKey)} className="week-day-row">
              <span className="week-day-main">
                <strong>{formatDate(day.dateKey)}</strong>
                {(day.activities.length > 0 || day.rest) && (
                  <span className="week-day-chips">
                    {day.activities.map(({ event }) => (
                      <span
                        key={event.occurrenceId || event.id}
                        className={`badge activity-chip ${event.type || "other"}`}
                      >
                        {event.title || formatActivityType(event.type)}
                      </span>
                    ))}
                    {day.rest && <span className="badge">Rest day</span>}
                  </span>
                )}
                <span className="week-day-meta">{dayMeta(day)}</span>
              </span>
              <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>
      <details
        className="week-table"
        onToggle={(e) => {
          if (e.currentTarget.open) caption.current?.focus();
        }}
      >
        <summary>View as table</summary>
        <div className="table-wrap">
          <table>
            <caption ref={caption} tabIndex={-1}>
              Food and water logged, {range}
            </caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Activities</th>
                <th scope="col">Food</th>
                <th scope="col">Water</th>
              </tr>
            </thead>
            <tbody>
              {summary.days.map((day) => (
                <tr key={day.dateKey}>
                  <th scope="row" className="nowrap">
                    {new Intl.DateTimeFormat("en-US", {
                      weekday: "short",
                      day: "numeric",
                    }).format(new Date(`${day.dateKey}T12:00:00`))}
                  </th>
                  <td>
                    {day.activities.length
                      ? day.activities
                          .map(
                            ({ event, planned }) =>
                              `${event.title || formatActivityType(event.type)}${planned ? " (planned food)" : ""}`,
                          )
                          .join(", ")
                      : day.rest
                        ? "Rest day"
                        : "None"}
                  </td>
                  <td>{foodsLine(day.foods)}</td>
                  <td>{waterLine(day.water)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="muted">
        This is a record of what you logged. It is not a score.
      </p>
    </section>
  );
}
