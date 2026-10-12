import { uid } from "./storage.js";
import { formatWater, toOunces } from "../format.js";

// Water is stored in ounces (`log.water`, `waterEntries[].amount`) whatever
// the athlete's unit, so older logs stay valid (ADD-14, P2-04).
export function addHydration(log, amount) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 128)
    throw new Error("Invalid water amount.");
  return {
    ...log,
    water: (log.water || 0) + amount,
    waterEntries: [
      ...(log.waterEntries || []),
      { id: uid(), amount, createdAt: new Date().toISOString() },
    ],
  };
}

/** Add an amount given in the athlete's unit ("oz" or "ml"). */
export const addWater = (log, amount, unit = "oz") =>
  addHydration(log, toOunces(amount, unit));

/** "Added 250 ml of water." in the unit the athlete tapped or typed. */
export const waterToast = (amount, unit = "oz") =>
  `Added ${formatWater(toOunces(amount, unit), unit)} of water.`;

export function undoHydration(log) {
  const latest = [...(log.waterEntries || [])]
    .reverse()
    .find((entry) => !entry.undone);
  if (!latest) return log;
  return {
    ...log,
    water: Math.max((log.water || 0) - latest.amount, 0),
    waterEntries: log.waterEntries.map((e) =>
      e.id === latest.id ? { ...e, undone: true } : e,
    ),
  };
}
