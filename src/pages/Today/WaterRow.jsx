export default function WaterRow({
  data,
  todayKey,
  pending,
  water,
  setCustom,
}) {
  return (
    <section className="water-row" aria-labelledby="water-title">
      <h2 id="water-title">
        Water today ·{" "}
        <span className="numeral">
          {data.dailyLogs[todayKey]?.water || 0} oz
        </span>
      </h2>
      <div>
        {[8, 16, 24].map((n) => (
          <button key={n} disabled={!!pending} onClick={() => water(n)}>
            +{n}
          </button>
        ))}
        <button onClick={() => setCustom(true)}>Custom</button>
      </div>
    </section>
  );
}
