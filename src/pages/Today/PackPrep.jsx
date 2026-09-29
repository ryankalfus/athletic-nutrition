import { formatClock } from "../../domain/timing.js";
import { syncPlanPreparation } from "../../domain/plans.js";
export default function PackPrep({
  tasks,
  done,
  pending,
  write,
  todayKey,
  showTasks,
  setShowTasks,
}) {
  return (
    <section className="pack-prep" id="pack-prep">
      <div className="today-section-header">
        <h2>Pack &amp; prep</h2>
        <button onClick={() => shareList(tasks)}>Share list</button>
      </div>
      <p>
        {done} of {tasks.length} done
      </p>
      {done === tasks.length && !showTasks ? (
        <button onClick={() => setShowTasks(true)}>Show list</button>
      ) : (
        tasks.map((t) => (
          <label key={t.id} className="prep-row">
            <input
              type="checkbox"
              checked={t.done}
              disabled={!!pending}
              onChange={() =>
                write(
                  "task",
                  (d) => {
                    d.dayPlans[todayKey] = d.dayPlans[todayKey].map((x) =>
                      x.id === t.id ? { ...x, done: !x.done } : x,
                    );
                    syncPlanPreparation(d, todayKey);
                  },
                  t.done ? "Task reopened." : "Task done.",
                )
              }
            />
            <span>
              {t.label}
              {t.dueAt && <small>By {formatClock(t.dueAt)}</small>}
            </span>
          </label>
        ))
      )}
    </section>
  );
}
async function shareList(tasks) {
  const text = tasks
    .map(
      (t) =>
        `${t.done ? "✓" : "□"} ${t.label}${t.dueAt ? ` · By ${formatClock(t.dueAt)}` : ""}`,
    )
    .join("\n");
  try {
    if (navigator.share) await navigator.share({ title: "Pack & prep", text });
    else {
      await navigator.clipboard.writeText(text);
    }
  } catch (e) {
    if (e.name !== "AbortError") throw e;
  }
}
