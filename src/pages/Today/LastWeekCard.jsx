// WEEK-05 (P2-05): the Monday "last week" card in Today's prompt slot.
// Counts only: no score, streak or target. "Hide" keeps it away until the
// next Monday (profile.lastWeekHidden holds the Monday it was hidden on).
export default function LastWeekCard({ card, pending, write, onNavigate }) {
  return (
    <aside className="today-prompt" aria-label="Last week">
      <p>{card.message}</p>
      <div className="button-row">
        <button disabled={!!pending} onClick={() => onNavigate(card.route)}>
          See last week
        </button>
        <button
          disabled={!!pending}
          onClick={() =>
            write(
              "hide-last-week",
              (d) => {
                d.profile.lastWeekHidden = card.weekKey;
              },
              "Hidden until next Monday.",
            )
          }
        >
          Hide
        </button>
      </div>
    </aside>
  );
}
