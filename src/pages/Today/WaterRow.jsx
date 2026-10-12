import { WATER_STEPS, formatWater, waterUnit } from "../../format.js";

// TODAY-06: "Water today · 24 oz" plus three quick adds and Custom. The
// unit follows You › Food access (ADD-14); the total is never a target.
export default function WaterRow({
  data,
  todayKey,
  pending,
  water,
  setCustom,
}) {
  const unit = waterUnit(data.profile);
  return (
    <section className="water-row" aria-labelledby="water-title">
      <h2 id="water-title">
        Water today ·{" "}
        <span className="numeral">
          {formatWater(data.dailyLogs[todayKey]?.water || 0, unit)}
        </span>
      </h2>
      <div>
        {WATER_STEPS[unit].map((n) => (
          <button key={n} disabled={!!pending} onClick={() => water(n)}>
            +{n}
          </button>
        ))}
        <button onClick={() => setCustom(true)}>Custom</button>
      </div>
      {/* COPY-23: the hydration line sits at the water decision. */}
      <p className="water-note">
        Bring a full bottle. Follow your coach&apos;s or doctor&apos;s plan if
        you have one.
      </p>
    </section>
  );
}
