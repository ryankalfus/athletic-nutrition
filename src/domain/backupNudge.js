// DATA-08 / ADD-12: a monthly backup nudge in Today's contextual prompt slot.
// "Last backup 32 days ago. Save a backup file?"
export const BACKUP_NUDGE_DAYS = 30;

const DAY_MS = 86400000;
const startOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function daysSince(value, now = new Date()) {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
}

// The first day this athlete saved anything worth keeping (logs, plans).
export function firstUseDate(data = {}) {
  const dates = [
    ...Object.entries(data.dailyLogs || {})
      .filter(
        ([, log]) =>
          log?.entries?.length ||
          Number(log?.water) > 0 ||
          log?.waterEntries?.length,
      )
      .map(([date]) => date),
    ...Object.entries(data.dayPlans || {})
      .filter(([, list]) => Array.isArray(list) && list.length)
      .map(([date]) => date),
    ...(data.mealPlans || []).map((plan) => plan?.date),
  ].filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d));
  return dates.sort()[0] || null;
}

/**
 * Returns the nudge to show, or null.
 * - Backed up before: due 30 days after the last backup.
 * - Never backed up: due 30 days after the first saved log or plan.
 * - "Not now" hides it for another 30 days (profile.backupNudgeSnoozedAt).
 */
export function backupNudge(data = {}, now = new Date()) {
  const profile = data.profile || {};
  const snoozed = daysSince(profile.backupNudgeSnoozedAt, now);
  if (snoozed != null && snoozed < BACKUP_NUDGE_DAYS) return null;
  const last = daysSince(profile.lastBackupAt, now);
  if (last != null) {
    if (last < BACKUP_NUDGE_DAYS) return null;
    return {
      days: last,
      message: `Last backup ${last} days ago. Save a backup file?`,
    };
  }
  const used = daysSince(firstUseDate(data), now);
  if (used == null || used < BACKUP_NUDGE_DAYS) return null;
  return { days: null, message: "No backup saved yet. Save a backup file?" };
}
