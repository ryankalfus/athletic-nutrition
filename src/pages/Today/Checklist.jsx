import { X } from "lucide-react";
import { formatClock, timeToMinutes } from "../../domain/timing.js";
import { syncPlanPreparation } from "../../domain/plans.js";
import { IconButton } from "../../components/ui/Button.jsx";

// CMP-12: one checklist for today's Pack & prep and tomorrow's list.
// Due times read "By 7:15 AM"; a missed one on today's list reads "Was due".
export default function Checklist({ tasks, dateKey, pending, write, now }) {
  const current = now ? now.getHours() * 60 + now.getMinutes() : null;
  const isLate = (t) =>
    current != null && !t.done && t.dueAt && timeToMinutes(t.dueAt) < current;
  return (
    <ul className="checklist">
      {tasks.map((t, index) => {
        const late = isLate(t);
        // "Was due 7:30 AM" once for a run of missed tasks with that time.
        const before = tasks[index - 1];
        const repeat =
          late && before && isLate(before) && before.dueAt === t.dueAt;
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
                {t.dueAt && !repeat && (
                  <small className={late ? "prep-late" : undefined}>
                    {late ? "Was due" : "By"} {formatClock(t.dueAt)}
                  </small>
                )}
              </span>
            </label>
            <IconButton
              label={`Remove ${t.label}`}
              icon={X}
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
            />
          </li>
        );
      })}
    </ul>
  );
}
