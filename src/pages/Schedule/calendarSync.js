// Team calendar links (P2-02): fetch a feed through the server, and refresh
// every linked calendar when the app opens or on "Refresh". A refresh only
// changes events that came from that link (domain/ics.js mergeFeed).
import { useEffect } from "react";
import { importPreview, mergeFeed } from "../../domain/ics.js";
import { uid } from "../../domain/storage.js";
import { getDateKey } from "../../domain/timing.js";
import { transaction, useStore } from "../../store.js";
import { showToast } from "../../components/ui/Toast.jsx";
import { plural } from "../../format.js";

/** The .ics text behind a link (http, https or webcal), via /api/calendar. */
export async function fetchFeed(url) {
  let response;
  try {
    response = await fetch(`/api/calendar?${new URLSearchParams({ url })}`);
  } catch {
    throw new Error("You're offline. Try again when you're connected.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.ics !== "string")
    throw new Error(body.error || "Couldn't reach that calendar.");
  return body.ics;
}

/** "1 event changed, 2 added." or "" when nothing changed. */
export function refreshMessage({ added, updated, removed }) {
  const parts = [
    updated && `${updated} ${plural(updated, "event")} changed`,
    added && `${added} added`,
    removed && `${removed} removed`,
  ].filter(Boolean);
  return parts.length ? `Team calendar updated: ${parts.join(", ")}.` : "";
}

/**
 * Refreshes the given links for one athlete. Feeds are fetched first, then
 * merged inside one write. A link that fails keeps its events and records the
 * error for the Team calendar row.
 * @returns {Promise<{ added: number, updated: number, removed: number, failed: number }>}
 */
export async function refreshCalendars(athleteId, subscriptions, options = {}) {
  const todayKey = options.todayKey || getDateKey();
  const results = await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        const text = await fetchFeed(sub.url);
        return { id: sub.id, preview: importPreview(text, [], { todayKey }) };
      } catch (error) {
        return { id: sub.id, error: error.message };
      }
    }),
  );
  const totals = { added: 0, updated: 0, removed: 0, failed: 0 };
  const now = new Date().toISOString();
  const saved = await transaction((doc) => {
    const data = doc.profiles[athleteId]?.data;
    if (!data) return;
    totals.added = totals.updated = totals.removed = totals.failed = 0;
    data.calendarSubscriptions = (data.calendarSubscriptions || []).map(
      (sub) => {
        const result = results.find((item) => item.id === sub.id);
        if (!result) return sub;
        if (result.error) {
          totals.failed += 1;
          return { ...sub, lastError: result.error, lastTriedAt: now };
        }
        const merged = mergeFeed(
          data.schedule || [],
          sub.id,
          result.preview.rows,
          {
            todayKey,
            makeId: uid,
            skipKeys: sub.skippedKeys || [],
          },
        );
        data.schedule = merged.events;
        totals.added += merged.added;
        totals.updated += merged.updated;
        totals.removed += merged.removed;
        return {
          ...sub,
          name: sub.name || result.preview.calendarName || "",
          refreshedAt: now,
          lastTriedAt: now,
          lastError: null,
        };
      },
    );
  });
  if (!saved) totals.failed = subscriptions.length;
  return totals;
}

// One refresh per athlete per page load (StrictMode runs effects twice).
const refreshedOnOpen = new Set();

/** Refreshes the open athlete's linked calendars once when the app opens. */
export function useCalendarRefresh(enabled) {
  const { current } = useStore();
  const athleteId = enabled ? current?.id : null;
  useEffect(() => {
    if (!athleteId || refreshedOnOpen.has(athleteId)) return;
    const subscriptions = current?.data?.calendarSubscriptions || [];
    if (!subscriptions.length) return;
    refreshedOnOpen.add(athleteId);
    refreshCalendars(athleteId, subscriptions).then((totals) => {
      const message = refreshMessage(totals);
      if (message) showToast(message);
    });
  }, [athleteId]);
}
