import { formatTime } from "../../format.js";

// A time or time range ("about 2:30 PM", "until 5:30 PM", "4:00–5:30 PM")
// never breaks inside itself; the sentence around it wraps freely.
const TIME =
  /((?:about |until )?\d{1,2}:\d\d(?:\s[AP]M)?(?:–\d{1,2}:\d\d(?:\s[AP]M)?)?)/i;

function SubLine({ text }) {
  const parts = String(text || "").split(TIME);
  return (
    <span className="rail-sub">
      {parts.map((part, i) =>
        i % 2 ? (
          <span key={i} className="nowrap">
            {part}
          </span>
        ) : (
          part
        ),
      )}
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
