import {
  addDays,
  eventsForDate,
  formatClock,
  getDateKey,
  timeToMinutes,
} from "./timing.js";
import { formatCountdown } from "../format.js";

export function canDeliverReminders({ signedOut, enabled, permission }) {
  return !signedOut && Boolean(enabled) && permission === "granted";
}

export function reminderCandidates(schedule, settings, now) {
  if (!settings.enabled) return [];
  const date = getDateKey(now),
    minutes = now.getHours() * 60 + now.getMinutes();
  const lead = Number(settings.leadMinutes || 60);
  const candidates = eventsForDate(schedule, date).flatMap((event) => {
    const travel = ["away", "travel"].includes(event.location)
      ? Number(event.travelMinutes || 0)
      : 0;
    const targetMinutes = timeToMinutes(event.startTime) - travel;
    if (targetMinutes < 0) return [];
    const remaining = targetMinutes - minutes;
    const targetTime = `${String(Math.floor(targetMinutes / 60)).padStart(2, "0")}:${String(targetMinutes % 60).padStart(2, "0")}`;
    return remaining < 0 || remaining > lead
      ? []
      : [
          {
            key: `${event.id}-${date}-${event.startTime}-${targetTime}`,
            title: travel
              ? `${event.title}: Leave ${formatCountdown(remaining)} (${formatClock(targetTime)})`
              : `${event.title} ${remaining === 0 ? "starts now" : `starts ${formatCountdown(remaining)}`} (${formatClock(event.startTime)})`,
            body: travel
              ? "Grab your packed food, water, and travel gear."
              : "Check your food plan, water, and gear before you go.",
          },
        ];
  });
  const tomorrow = getDateKey(addDays(now, 1));
  const early = eventsForDate(schedule, tomorrow).find(
    (e) => timeToMinutes(e.startTime) <= 600,
  );
  if (settings.eveningPrep && now.getHours() >= 19 && early)
    candidates.push({
      key: `prep-${tomorrow}-${early.id}-${early.startTime}`,
      title: `Prepare tonight for ${early.title}`,
      body: "Set out breakfast, pack a snack and water, and put your gear by the door.",
    });
  return candidates;
}

// A same-origin Web Lock serializes the read/deliver/write across open tabs.
// An OS tag additionally coalesces delivery where Web Locks are unavailable.
export async function deliverReminders({
  profileId,
  candidates,
  storage,
  notify,
  locks,
  cancelled = () => false,
}) {
  const run = () => {
    if (cancelled()) return;
    const key = `nourally-notified-${profileId}`;
    let previous = [];
    try {
      previous = JSON.parse(storage.getItem(key) || "[]");
    } catch {
      /* A broken delivery ledger is not user food data. */
    }
    const sent = new Set(Array.isArray(previous) ? previous : []);
    for (const candidate of candidates) {
      if (cancelled() || sent.has(candidate.key)) continue;
      notify(candidate.title, {
        body: candidate.body,
        tag: `${profileId}-${candidate.key}`,
      });
      sent.add(candidate.key);
      storage.setItem(key, JSON.stringify([...sent].slice(-200)));
    }
  };
  return locks ? locks.request(`nourally-reminders-${profileId}`, run) : run();
}
