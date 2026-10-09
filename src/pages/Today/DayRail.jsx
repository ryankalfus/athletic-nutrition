import { Fragment } from "react";
import { formatTime } from "../../format.js";

// A sub-line part that is a time or time range never breaks inside itself.
const TIME = /\d:\d\d/;

function SubLine({ text }) {
  const parts = String(text || "").split(" · ");
  return (
    <span className="rail-sub">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && " · "}
          <span className={TIME.test(part) ? "nowrap" : undefined}>{part}</span>
        </Fragment>
      ))}
    </span>
  );
}

// TODAY-02 Day rail: a time column, then a 12px activity-colour dot on a 2px
// line, the title (with a status badge) and one sub-line. Rows are plain
// list rows, not boxed buttons.
export default function DayRail({
  rows,
  onNavigate,
  onOpenPlan,
  onOpenActivity,
  onOpenSchool,
}) {
  // TODAY-02: each row opens its details sheet (food moment → plan,
  // activity → activity sheet, school → School day); windows open Ideas.
  const open = (r) =>
    r.planId
      ? onOpenPlan(r.planId)
      : r.eventId
        ? onOpenActivity(r.eventId)
        : r.sheet === "school"
          ? onOpenSchool()
          : onNavigate(r.route);
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
            data-kind={r.kind}
            data-type={r.type}
            className={`rail-${r.kind}${r.now ? " rail-now" : r.past ? " rail-past" : ""}`}
          >
            <time>{formatTime(r.time)}</time>
            {r.now ? (
              <strong className="rail-body">{r.title}</strong>
            ) : (
              <button
                className="rail-body"
                aria-haspopup={r.route ? undefined : "dialog"}
                onClick={() => open(r)}
              >
                <strong>
                  {r.title}
                  {r.game && <span className="badge badge-game">Game</span>}
                  {r.status && <span className="badge">{r.status}</span>}
                </strong>
                <SubLine text={r.detail} />
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
