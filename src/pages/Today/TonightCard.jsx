import Checklist from "./Checklist.jsx";
import { ShareButton } from "../../components/ui/ShareButton.jsx";
import { formatChecklistText } from "../../domain/share.js";
import { formatDate } from "../../format.js";

// TODAY-07 / ADD-11: Tonight — set up any activity day the evening before.
export default function TonightCard({
  plan,
  pending,
  write,
  buildTomorrow,
  onNavigate,
}) {
  const { tasks, lines, gameDay, done, built, tomorrowKey } = plan;
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
        <p className="tonight-when">
          Tomorrow · {formatDate(tomorrowKey)}
          {gameDay && <span className="badge badge-game">Game day</span>}
        </p>
        <ul>
          {lines.map((line) => (
            <li key={line}>{line}</li>
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
        <p className="muted">
          Build the list to set out food, water, and gear tonight.
        </p>
      )}
      <div className="button-row">
        {!built && (
          <button
            className={tasks.length ? undefined : "primary"}
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
