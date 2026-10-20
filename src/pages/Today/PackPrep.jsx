import { useEffect, useRef } from "react";
import Checklist from "./Checklist.jsx";
import { ShareButton } from "../../components/ui/ShareButton.jsx";
import { formatChecklistText } from "../../domain/share.js";
import { formatDate } from "../../format.js";

// TODAY-05: Pack & prep with due times, "1 of 3 done" and Share list (ADD-06).
// Once everything is packed the list folds to "All packed"; "Show list" and
// "Hide list" are one disclosure button (aria-expanded) that opens and closes
// it. It used to only open it, so a list opened after packing never closed.
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
  const allDone = done === tasks.length;
  const folded = allDone && !showTasks;
  const toggle = useRef(null);
  const wasFolded = useRef(folded);
  // Ticking the last task folds the list and removes the focused checkbox:
  // focus moves to the toggle instead of falling to <body>.
  useEffect(() => {
    if (
      folded &&
      !wasFolded.current &&
      document.activeElement === document.body
    )
      toggle.current?.focus();
    wasFolded.current = folded;
  }, [folded]);
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
        {allDone
          ? tasks.length === 1
            ? "Packed"
            : `All ${tasks.length} packed`
          : `${done} of ${tasks.length} done`}
      </p>
      {allDone && (
        <button
          ref={toggle}
          type="button"
          aria-expanded={showTasks}
          aria-controls="pack-prep-list"
          onClick={() => setShowTasks(!showTasks)}
        >
          {showTasks ? "Hide list" : "Show list"}
        </button>
      )}
      <div id="pack-prep-list" hidden={folded}>
        {!folded && (
          <Checklist
            tasks={tasks}
            dateKey={todayKey}
            pending={pending}
            write={write}
            now={now}
          />
        )}
      </div>
    </section>
  );
}
