import Checklist from "./Checklist.jsx";
import { ShareButton } from "../../components/ui/ShareButton.jsx";
import { formatChecklistText } from "../../domain/share.js";
import { formatDate } from "../../format.js";

// TODAY-05: Pack & prep with due times, "1 of 3 done" and Share list (ADD-06).
export default function PackPrep({
  tasks,
  done,
  pending,
  write,
  todayKey,
  now,
  showTasks,
  setShowTasks,
}) {
  return (
    <section className="pack-prep" id="pack-prep" aria-labelledby="pack-title">
      <div className="today-section-header">
        <h2 id="pack-title">Pack &amp; prep</h2>
        <ShareButton
          title="Pack & prep"
          label="Pack & prep"
          getText={() =>
            formatChecklistText({
              title: "Pack & prep",
              subtitle: formatDate(todayKey),
              tasks,
            })
          }
        />
      </div>
      <p>
        {done === tasks.length && !showTasks
          ? `All packed · ${done} of ${tasks.length}`
          : `${done} of ${tasks.length} done`}
      </p>
      {done === tasks.length && !showTasks ? (
        <button onClick={() => setShowTasks(true)}>Show list</button>
      ) : (
        <Checklist
          tasks={tasks}
          dateKey={todayKey}
          pending={pending}
          write={write}
          now={now}
        />
      )}
    </section>
  );
}
