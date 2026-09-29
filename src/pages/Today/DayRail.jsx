import { formatTime } from "../../format.js";
export default function DayRail({ rows, onNavigate, onOpenPlan }) {
  return (
    <section className="day-rail" aria-labelledby="day-title">
      <div className="today-section-header">
        <h2 id="day-title">Your day</h2>
        <button onClick={() => onNavigate("schedule")}>Edit schedule</button>
      </div>
      <ol>
        {rows.map((r, i) => (
          <li
            key={`${r.kind}-${r.planId || r.time}-${i}`}
            aria-current={r.now ? "time" : undefined}
            className={`rail-${r.kind}${r.now ? " rail-now" : r.past ? " rail-past" : ""}`}
          >
            <time>{formatTime(r.time)}</time>
            {r.now ? (
              <strong>{r.title}</strong>
            ) : (
              <button
                onClick={() =>
                  r.planId ? onOpenPlan(r.planId) : onNavigate(r.route)
                }
              >
                <strong>
                  {r.title}
                  {r.game && <span className="badge badge-game">Game</span>}
                </strong>
                <span>{r.detail}</span>
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
