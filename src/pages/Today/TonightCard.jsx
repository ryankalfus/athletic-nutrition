import Checklist from "./Checklist.jsx";
import { ShareButton } from "../../components/ui/ShareButton.jsx";
import { formatChecklistText } from "../../domain/share.js";
import { formatDate, formatTime } from "../../format.js";
import { tomorrowEventDetail } from "../../domain/tonight.js";

// TODAY-07 / ADD-11: Tonight — set up any activity day the evening before.
export default function TonightCard({
  plan,
  pending,
  write,
  buildTomorrow,
  onNavigate,
  showBuild = true,
}) {
  const { tasks, lines, events, gameDay, done, built, tomorrowKey } = plan;
  return (
    <section className="tonight-card" aria-labelledby="tonight-title">
      <div className="today-section-header">
        <h2 id="tonight-title">Tonight</h2>
        {tasks.length > 0 && (
          <ShareButton
            title="Tomorrow’s list"
            label="Tomorrow’s list"
            getText={() =>
              formatChecklistText({
                title: "Tomorrow’s list",
                subtitle: formatDate(tomorrowKey),
                context: lines,
                tasks,
              })
            }
          />
        )}
      </div>
      <div className="tonight-events">
        {gameDay && <span className="badge badge-game">Game day</span>}
        <p className="tonight-when">Tomorrow · {formatDate(tomorrowKey)}</p>
        {/* Each activity reads like a Day rail row: time, dot, title, sub-line. */}
        <ul className="rail-list">
          {events.map((event) => (
            <li key={event.occurrenceId || event.id} data-type={event.type}>
              <time>{formatTime(event.startTime)}</time>
              <span className="rail-body">
                <strong>{event.title}</strong>
                <span className="rail-sub">{tomorrowEventDetail(event)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      {tasks.length > 0 ? (
        <>
          <p className="muted">
            {done} of {tasks.length} done
          </p>
          <Checklist
            tasks={tasks}
            dateKey={tomorrowKey}
            pending={pending}
            write={write}
          />
        </>
      ) : (
        <p className="tonight-helper">
          Build the list to set out food, water, and gear tonight.
        </p>
      )}
      <div className="button-row">
        {/* Secondary: the Now card's lime button is the page's one primary. */}
        {!built && showBuild && (
          <button
            aria-busy={pending === "tomorrow" || undefined}
            disabled={!!pending}
            onClick={buildTomorrow}
          >
            {tasks.length ? "Add missing items" : "Build tomorrow’s list"}
          </button>
        )}
        <button
          className="text-button"
          onClick={() => onNavigate("food/ideas?moment=tomorrow")}
        >
          Choose tomorrow’s snack
        </button>
      </div>
    </section>
  );
}
