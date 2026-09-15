import { uid } from "./storage.js";
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
