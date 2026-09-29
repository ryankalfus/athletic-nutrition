import { formatClock, timeToMinutes } from "../../domain/timing.js";
export default function DayRail({ rows, now, onNavigate }) {
  return (
    <section className="day-rail" aria-labelledby="day-title">
      <div className="today-section-header">
        <h2 id="day-title">Your day</h2>
        <button onClick={() => onNavigate("schedule")}>Edit schedule</button>
      </div>
      <ol>
        {rows.map((r, i) => (
          <li
            key={i}
            aria-current={r.now ? "time" : undefined}
            className={
              r.now
                ? "rail-now"
                : timeToMinutes(r.time) < now.getHours() * 60 + now.getMinutes()
                  ? "rail-past"
                  : ""
            }
          >
            <time>{formatClock(r.time)}</time>
            {r.now ? (
              <strong>Now</strong>
            ) : (
              <button onClick={() => onNavigate(r.route)}>
                <strong>{r.title}</strong>
                <span>{r.detail}</span>
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
