import { X } from "lucide-react";
import { formatClock, timeToMinutes } from "../../domain/timing.js";
import { syncPlanPreparation } from "../../domain/plans.js";

// CMP-12: one checklist for today's Pack & prep and tomorrow's list.
// Due times read "By 7:15 AM"; a missed one on today's list reads "Was due".
export default function Checklist({ tasks, dateKey, pending, write, now }) {
  const current = now ? now.getHours() * 60 + now.getMinutes() : null;
  return (
    <ul className="checklist">
      {tasks.map((t) => {
        const late =
          current != null &&
          !t.done &&
          t.dueAt &&
          timeToMinutes(t.dueAt) < current;
        return (
          <li key={t.id} className="prep-row">
            <label>
              <input
                type="checkbox"
                checked={Boolean(t.done)}
                disabled={!!pending}
                onChange={() =>
                  write(
                    "task",
                    (d) => {
                      d.dayPlans[dateKey] = (d.dayPlans[dateKey] || []).map(
                        (x) => (x.id === t.id ? { ...x, done: !x.done } : x),
                      );
                      syncPlanPreparation(d, dateKey);
                    },
                    t.done ? "Task reopened." : "Task done.",
                  )
                }
              />
              <span>
                {t.label}
                {t.dueAt && (
                  <small className={late ? "prep-late" : undefined}>
                    {late ? "Was due" : "By"} {formatClock(t.dueAt)}
                  </small>
                )}
              </span>
            </label>
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove ${t.label}`}
              disabled={!!pending}
              onClick={() =>
                write(
                  "remove",
                  (d) => {
                    d.dayPlans[dateKey] = (d.dayPlans[dateKey] || []).filter(
                      (x) => x.id !== t.id,
                    );
                  },
                  "Task removed.",
                )
              }
            >
              <X size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
