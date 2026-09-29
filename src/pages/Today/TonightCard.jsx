import { formatClock } from "../../domain/timing.js";
export default function TonightCard({
  next,
  pending,
  buildTomorrow,
  data,
  tomorrow,
}) {
  return (
    <section className="tonight-card">
      <h2>Tonight</h2>
      <p>
        {next.title} tomorrow at {formatClock(next.startTime)}
      </p>
      <button disabled={!!pending} onClick={buildTomorrow}>
        Build tomorrow’s list
      </button>
      {(data.dayPlans[tomorrow] || []).map((t) => (
        <p key={t.id}>{t.label}</p>
      ))}
    </section>
  );
}
