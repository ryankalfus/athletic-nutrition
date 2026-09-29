export default function WaterRow({
  data,
  todayKey,
  pending,
  water,
  setCustom,
}) {
  return (
    <section className="water-row" aria-label="Water">
      <strong>Water today · {data.dailyLogs[todayKey]?.water || 0} oz</strong>
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
