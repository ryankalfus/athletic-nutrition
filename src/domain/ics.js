// Team calendar import (P2-01, P2-02, ADD-08): an RFC 5545 reader for the
// .ics files and subscription feeds that team apps (TeamSnap, GameChanger,
// SportsEngine, Google Calendar) publish. It covers what those feeds use:
// VEVENT with DTSTART/DTEND/DURATION in UTC ("Z"), with a TZID, floating, or
// all day (VALUE=DATE); RRULE DAILY/WEEKLY with BYDAY, INTERVAL, COUNT and
// UNTIL; EXDATE; RECURRENCE-ID overrides; STATUS:CANCELLED; folded lines and
// escaped text. Times are converted to the device's time zone, so a 5:00 PM
// Chicago game reads 6:00 PM on a phone in New York, before and after a DST
// change. Pure: no DOM, no network.

const MAX_OCCURRENCES = 1000;
const HORIZON_DAYS = 400;

// Outlook and Exchange feeds name zones the Windows way.
const WINDOWS_ZONES = {
  "Eastern Standard Time": "America/New_York",
  "Central Standard Time": "America/Chicago",
  "Mountain Standard Time": "America/Denver",
  "US Mountain Standard Time": "America/Phoenix",
  "Pacific Standard Time": "America/Los_Angeles",
  "Alaskan Standard Time": "America/Anchorage",
  "Hawaiian Standard Time": "Pacific/Honolulu",
  "Atlantic Standard Time": "America/Halifax",
  "GMT Standard Time": "Europe/London",
  "W. Europe Standard Time": "Europe/Berlin",
  "Romance Standard Time": "Europe/Paris",
  "AUS Eastern Standard Time": "Australia/Sydney",
  UTC: "UTC",
};

/** RFC 5545 3.1: a line that starts with a space or tab continues the last. */
export function unfoldLines(text) {
  return String(text || "")
    .replace(/^\uFEFF/, "") // byte-order mark
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .filter((line) => line.trim());
}

/** RFC 5545 3.3.11 TEXT: \n, \N, \, \; and \\. */
export function unescapeText(value) {
  return String(value || "").replace(/\\([nN,;\\])/g, (_, c) =>
    c === "n" || c === "N" ? "\n" : c,
  );
}

// "DTSTART;TZID="America/Chicago";VALUE=DATE-TIME:20261101T170000" →
// { name, params, value }. Colons and semicolons inside quotes do not split.
function parseLine(line) {
  let quoted = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ":" && !quoted) {
      colon = i;
      break;
    }
  }
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const parts = [];
  let current = "";
  quoted = false;
  for (const char of head) {
    if (char === '"') quoted = !quoted;
    if (char === ";" && !quoted) {
      parts.push(current);
      current = "";
    } else current += char;
  }
  parts.push(current);
  const params = {};
  for (const part of parts.slice(1)) {
    const eq = part.indexOf("=");
    if (eq > 0)
      params[part.slice(0, eq).toUpperCase()] = part
        .slice(eq + 1)
        .replace(/^"|"$/g, "");
  }
  return {
    name: parts[0].toUpperCase(),
    params,
    value: line.slice(colon + 1),
  };
}

/** An IANA zone name for a TZID, or null when the device cannot use it. */
export function resolveZone(tzid) {
  if (!tzid) return null;
  const candidates = [
    tzid,
    WINDOWS_ZONES[tzid],
    // "/mozilla.org/20050126_1/America/New_York" and similar prefixes.
    tzid.match(/([A-Za-z_]+\/[A-Za-z_+-]+(?:\/[A-Za-z_+-]+)?)$/)?.[1],
  ].filter(Boolean);
  for (const zone of candidates) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: zone });
      return zone;
    } catch {
      // not a zone this runtime knows
    }
  }
  return null;
}

/**
 * One DATE or DATE-TIME value.
 * @returns {{ y: number, m: number, d: number, h: number, mi: number, s: number, allDay: boolean, utc: boolean, zone: string | null } | null}
 */
export function parseDateValue(value, params = {}) {
  const match = String(value || "")
    .trim()
    .match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!match) return null;
  const allDay = params.VALUE === "DATE" || !match[4];
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
    h: allDay ? 0 : Number(match[4]),
    mi: allDay ? 0 : Number(match[5]),
    s: allDay ? 0 : Number(match[6] || 0),
    allDay,
    utc: Boolean(match[7]),
    zone: match[7] ? "UTC" : resolveZone(params.TZID),
  };
}

const formatters = new Map();
function partsIn(ms, zone) {
  let format = formatters.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(zone, format);
  }
  const out = {};
  for (const part of format.formatToParts(new Date(ms)))
    if (part.type !== "literal") out[part.type] = Number(part.value);
  return {
    y: out.year,
    m: out.month,
    d: out.day,
    h: out.hour % 24,
    mi: out.minute,
    s: out.second,
  };
}

const wallMs = (w) => Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s || 0);

/** Milliseconds a zone is ahead of UTC at an instant. */
export function zoneOffset(ms, zone) {
  return wallMs(partsIn(ms, zone)) - Math.floor(ms / 1000) * 1000;
}

/** The UTC instant of a wall-clock time in a zone (DST-aware). */
export function wallToInstant(wall, zone) {
  const guess = wallMs(wall);
  if (zone === "UTC") return guess;
  const first = guess - zoneOffset(guess, zone);
  const second = guess - zoneOffset(first, zone);
  return second;
}

/** A wall-clock time in a zone for a UTC instant. */
export const instantToWall = (ms, zone) => partsIn(ms, zone);

const pad = (n) => String(n).padStart(2, "0");
const dateKeyOf = (w) => `${w.y}-${pad(w.m)}-${pad(w.d)}`;
const clockOf = (w) => `${pad(w.h)}:${pad(w.mi)}`;
const addWallDays = (w, days) => {
  const date = new Date(Date.UTC(w.y, w.m - 1, w.d + days));
  return {
    ...w,
    y: date.getUTCFullYear(),
    m: date.getUTCMonth() + 1,
    d: date.getUTCDate(),
  };
};
const weekdayOfWall = (w) => new Date(Date.UTC(w.y, w.m - 1, w.d)).getUTCDay();

// The instant of a parsed value; floating and unknown zones use `fallback`.
const instantOf = (value, fallback) =>
  value.allDay ? wallMs(value) : wallToInstant(value, value.zone || fallback);

/** "PT1H30M", "P1D", "-PT15M" → milliseconds. */
export function parseDuration(text) {
  const match = String(text || "").match(
    /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );
  if (!match) return null;
  const [, sign, w, d, h, m, s] = match;
  const ms =
    (((Number(w || 0) * 7 + Number(d || 0)) * 24 + Number(h || 0)) * 60 +
      Number(m || 0)) *
      60000 +
    Number(s || 0) * 1000;
  return sign === "-" ? -ms : ms;
}

/** "FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=…" → an object; unknown parts kept. */
export function parseRRule(value) {
  const rule = {};
  for (const part of String(value || "").split(";")) {
    const [key, raw] = part.split("=");
    if (key && raw) rule[key.toUpperCase()] = raw;
  }
  return rule;
}

/**
 * Reads the calendar. Every VEVENT keeps its raw values; times are resolved
 * later by expandEvents().
 * @param {string} text
 */
export function parseICS(text) {
  const lines = unfoldLines(text);
  if (!lines.some((line) => /^BEGIN:VCALENDAR$/i.test(line.trim())))
    throw new Error("This file is not a calendar (.ics) file.");
  const events = [];
  let calendarName = "";
  /** @type {any} */
  let event = null;
  let depth = 0; // nested blocks inside a VEVENT (VALARM)
  for (const line of lines) {
    const prop = parseLine(line.trim());
    if (!prop) continue;
    if (prop.name === "BEGIN") {
      if (prop.value.toUpperCase() === "VEVENT" && !event)
        event = { exdates: [] };
      else if (event) depth += 1;
      continue;
    }
    if (prop.name === "END") {
      if (event && depth) depth -= 1;
      else if (event && prop.value.toUpperCase() === "VEVENT") {
        events.push(event);
        event = null;
      }
      continue;
    }
    if (!event) {
      if (prop.name === "X-WR-CALNAME") calendarName = unescapeText(prop.value);
      continue;
    }
    if (depth) continue;
    switch (prop.name) {
      case "UID":
        event.uid = prop.value.trim();
        break;
      case "SUMMARY":
        event.summary = unescapeText(prop.value).trim();
        break;
      case "LOCATION":
        event.location = unescapeText(prop.value).trim();
        break;
      case "DESCRIPTION":
        event.description = unescapeText(prop.value).trim();
        break;
      case "STATUS":
        event.status = prop.value.trim().toUpperCase();
        break;
      case "DTSTART":
        event.start = parseDateValue(prop.value, prop.params);
        break;
      case "DTEND":
        event.end = parseDateValue(prop.value, prop.params);
        break;
      case "DURATION":
        event.duration = parseDuration(prop.value.trim());
        break;
      case "RRULE":
        event.rrule = parseRRule(prop.value);
        break;
      case "RECURRENCE-ID":
        event.recurrenceId = parseDateValue(prop.value, prop.params);
        break;
      case "EXDATE":
        for (const value of prop.value.split(","))
          event.exdates.push(parseDateValue(value, prop.params));
        break;
      default:
    }
  }
  return {
    calendarName,
    events: events.filter((item) => item.start),
  };
}

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

// The start wall times of a recurring event in its own zone, in order, from
// DTSTART until UNTIL, COUNT or the horizon. DST does not move them: a 5:00 PM
// practice stays 5:00 PM where the team plays.
function recurrenceStarts(event, zone, horizonMs) {
  const rule = event.rrule;
  const start = event.start;
  const freq = rule.FREQ;
  if (freq !== "WEEKLY" && freq !== "DAILY") return [start];
  const interval = Math.max(1, Number(rule.INTERVAL) || 1);
  const count = Number(rule.COUNT) || Infinity;
  const until = rule.UNTIL ? parseDateValue(rule.UNTIL) : null;
  const untilMs = until
    ? until.allDay
      ? wallMs(addWallDays(until, 1)) - 1
      : instantOf(until, zone)
    : Infinity;
  const days =
    freq === "WEEKLY"
      ? (rule.BYDAY
          ? rule.BYDAY.split(",")
              .map((code) => DAY_CODES.indexOf(code.trim().slice(-2)))
              .filter((n) => n >= 0)
          : [weekdayOfWall(start)]
        ).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
      : null;
  const out = [];
  const startMs = instantOf(start, zone);
  const push = (wall) => {
    const ms = start.allDay ? wallMs(wall) : wallToInstant(wall, zone);
    if (ms < startMs) return true;
    if (ms > untilMs || ms > horizonMs || out.length >= count) return false;
    out.push(wall);
    return out.length < MAX_OCCURRENCES;
  };
  if (freq === "DAILY") {
    for (let i = 0; ; i += interval)
      if (!push(addWallDays(start, i))) return out;
  }
  // WEEKLY: weeks start on Monday (WKST default).
  const monday = addWallDays(start, -((weekdayOfWall(start) + 6) % 7));
  for (let week = 0; ; week += interval) {
    for (const day of days) {
      const wall = addWallDays(monday, week * 7 + ((day + 6) % 7));
      if (!push(wall)) return out;
    }
  }
}

/** A stable key for duplicate checks: UID (plus the occurrence), else date, time and title. */
export function occurrenceKey({ uid, originalStart, date, startTime, title }) {
  if (uid) return originalStart ? `${uid}|${originalStart}` : uid;
  return `${date}|${startTime || ""}|${String(title || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")}`;
}

/**
 * Every occurrence in the device's zone, sorted by start.
 * @param {{ events: any[] }} calendar
 * @param {{ timeZone?: string, todayKey?: string, horizonDays?: number }} [options]
 */
export function expandEvents(calendar, options = {}) {
  const timeZone =
    options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const horizonMs =
    (options.todayKey
      ? Date.parse(`${options.todayKey}T00:00:00Z`)
      : Date.now()) +
    (options.horizonDays ?? HORIZON_DAYS) * 86400000;
  const overrides = new Map();
  for (const event of calendar.events)
    if (event.recurrenceId && event.uid) {
      const zone = event.recurrenceId.zone || event.start.zone || timeZone;
      overrides.set(
        `${event.uid}|${instantOf(event.recurrenceId, zone)}`,
        event,
      );
    }
  const out = [];
  for (const event of calendar.events) {
    if (event.recurrenceId) continue;
    const zone = event.start.zone || timeZone;
    const startMs = instantOf(event.start, zone);
    const length = event.end
      ? instantOf(event.end, event.end.zone || zone) - startMs
      : event.duration != null
        ? event.duration
        : event.start.allDay
          ? 86400000
          : 3600000;
    const walls = event.rrule
      ? recurrenceStarts(event, zone, horizonMs)
      : [event.start];
    const excluded = new Set(
      event.exdates
        .filter(Boolean)
        .map((value) =>
          value.allDay || event.start.allDay
            ? dateKeyOf(value)
            : instantOf(value, value.zone || zone),
        ),
    );
    for (const wall of walls) {
      const original = event.start.allDay
        ? wallMs(wall)
        : wallToInstant(wall, zone);
      if (
        excluded.has(event.start.allDay ? dateKeyOf(wall) : original) ||
        excluded.has(dateKeyOf(wall))
      )
        continue;
      const override = event.rrule
        ? overrides.get(`${event.uid}|${original}`)
        : null;
      const source = override || event;
      if (source.status === "CANCELLED") continue;
      let begin = original;
      let finish = original + length;
      let allDay = Boolean(event.start.allDay);
      if (override) {
        const oZone = override.start.zone || zone;
        allDay = Boolean(override.start.allDay);
        begin = instantOf(override.start, oZone);
        finish = override.end
          ? instantOf(override.end, override.end.zone || oZone)
          : begin + (override.duration ?? length);
      }
      const title = source.summary || event.summary || "Team event";
      const from = allDay
        ? partsIn(begin, "UTC")
        : instantToWall(begin, timeZone);
      const to = allDay
        ? partsIn(finish, "UTC")
        : instantToWall(finish, timeZone);
      const date = dateKeyOf(from);
      const startTime = allDay ? "" : clockOf(from);
      // Past midnight (or a zero-length event): end the row at 11:59 PM, or
      // one hour after the start, so the activity sheet's rules hold.
      let endTime = allDay ? "" : clockOf(to);
      if (!allDay && (dateKeyOf(to) !== date || endTime <= startTime))
        endTime =
          dateKeyOf(to) !== date || from.h >= 23
            ? "23:59"
            : clockOf({ ...from, h: from.h + 1 });
      out.push({
        key: occurrenceKey({
          uid: event.uid,
          originalStart: event.rrule ? new Date(original).toISOString() : "",
          date,
          startTime,
          title,
        }),
        uid: event.uid || "",
        title,
        date,
        startTime,
        endTime,
        allDay,
        location: source.location || event.location || "",
        description: source.description || event.description || "",
        start: begin,
      });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

const GAME =
  /\b(game|match|vs\.?|versus|tournament|tourney|scrimmage|meet|race|playoffs?|championship|regatta|invitational|jamboree|bout)\b|(^|\s)@(\s|$)/i;
const PRACTICE =
  /\b(practice|training|train|workout|conditioning|skills|drills?|session|lift(ing)?|clinic|tryouts?|camp|warm[- ]?up)\b/i;

// "Tigers at Eagles": a capitalized name after "at" reads as an away game.
const AT_OPPONENT = /\sat\s+[A-Z0-9]/;
const AT_SIGN = /(^|\s)@(\s|$)/;

/** "practice", "game" or "other" from the title (and description). */
export function guessType(title = "", description = "") {
  if (GAME.test(title)) return "game";
  if (PRACTICE.test(title)) return "practice";
  if (AT_OPPONENT.test(title)) return "game";
  if (GAME.test(description)) return "game";
  if (PRACTICE.test(description)) return "practice";
  return "other";
}

/** "home" or "away" from the title, location and description. */
export function guessLocation(title = "", location = "", description = "") {
  const text = `${title}\n${location}\n${description}`;
  if (/\baway\b/i.test(text)) return "away";
  if (/\bhome\b/i.test(text)) return "home";
  if (AT_SIGN.test(title)) return "away";
  if (AT_OPPONENT.test(title) && !PRACTICE.test(title)) return "away";
  return "home";
}

const sameSlot = (a, b) =>
  a.date === b.date &&
  a.startTime === b.startTime &&
  String(a.title || "")
    .trim()
    .toLowerCase() ===
    String(b.title || "")
      .trim()
      .toLowerCase();

/**
 * The preview rows for an import: upcoming occurrences with a guessed type and
 * place, flagged as duplicates when the schedule already has them (same key,
 * or a one-day activity with the same date, start and title).
 * @param {string} text
 * @param {any[]} existing the athlete's schedule
 * @param {{ todayKey: string, timeZone?: string, horizonDays?: number }} options
 */
export function importPreview(text, existing, options) {
  const calendar = parseICS(text);
  const all = expandEvents(calendar, options);
  const upcoming = all.filter((row) => row.date >= options.todayKey);
  const keys = new Set(
    existing.map((event) => event.source?.key).filter(Boolean),
  );
  const seen = new Set();
  const rows = upcoming.map((row) => {
    const duplicate =
      keys.has(row.key) ||
      seen.has(row.key) ||
      existing.some((event) => event.date && sameSlot(event, row));
    seen.add(row.key);
    return {
      ...row,
      type: guessType(row.title, row.description),
      place: guessLocation(row.title, row.location, row.description),
      duplicate,
    };
  });
  return {
    calendarName: calendar.calendarName,
    rows,
    pastCount: all.length - upcoming.length,
  };
}

/**
 * An app activity for a preview row. `feedId` marks events a subscription
 * owns (refresh may change or remove them); `feed` keeps the values the feed
 * last sent so a refresh changes only what the feed changed.
 */
export function toScheduleEvent(row, { id, feedId = null }) {
  const type = ["practice", "game", "other"].includes(row.type)
    ? row.type
    : "other";
  return {
    id,
    type,
    title: row.title.slice(0, 120),
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    intensity: "medium",
    location: row.place === "away" ? "away" : "home",
    travelMinutes: 0,
    notes: row.location ? row.location.slice(0, 500) : "",
    source: {
      kind: "ics",
      key: row.key,
      feedId,
      feed: {
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
        title: row.title.slice(0, 120),
      },
    },
  };
}

const FEED_FIELDS = ["date", "startTime", "endTime", "title"];

/**
 * Refresh (P2-02): apply a feed's current occurrences to the schedule.
 * - Events from this feed whose feed values changed get the new date, times
 *   or title; the athlete's own choices (type, home/away, travel, notes) stay.
 * - New occurrences are added with a guessed type and place.
 * - Upcoming events from this feed that left the feed are removed.
 * - Manual events, file imports and other feeds are never touched, and past
 *   days are kept as they were.
 * @param {any[]} events
 * @param {string} feedId
 * @param {any[]} rows importPreview().rows (all upcoming occurrences)
 * @param {{ todayKey: string, makeId: () => string }} options
 */
export function mergeFeed(events, feedId, rows, { todayKey, makeId }) {
  const incoming = new Map();
  for (const row of rows) if (!row.allDay) incoming.set(row.key, row);
  const otherKeys = new Set(
    events
      .filter((event) => event.source?.key && event.source.feedId !== feedId)
      .map((event) => event.source.key),
  );
  const counts = { added: 0, updated: 0, removed: 0 };
  const kept = [];
  const owned = new Set();
  for (const event of events) {
    if (event.source?.feedId !== feedId) {
      kept.push(event);
      continue;
    }
    const row = incoming.get(event.source.key);
    if (!row) {
      if ((event.date || "") < todayKey) kept.push(event);
      else counts.removed += 1;
      continue;
    }
    owned.add(row.key);
    const last = event.source.feed || {};
    const changes = {};
    for (const field of FEED_FIELDS)
      if (row[field] !== last[field] && row[field] !== event[field])
        changes[field] = row[field];
    const feed = Object.fromEntries(FEED_FIELDS.map((f) => [f, row[f]]));
    if (Object.keys(changes).length) counts.updated += 1;
    kept.push({
      ...event,
      ...changes,
      source: { ...event.source, feed },
    });
  }
  for (const row of incoming.values()) {
    if (owned.has(row.key) || otherKeys.has(row.key) || row.date < todayKey)
      continue;
    if (
      events.some(
        (event) => event.date && !event.source?.feedId && sameSlot(event, row),
      )
    )
      continue;
    kept.push(
      toScheduleEvent(
        {
          ...row,
          type: row.type || guessType(row.title, row.description),
          place:
            row.place ||
            guessLocation(row.title, row.location, row.description),
        },
        { id: makeId(), feedId },
      ),
    );
    counts.added += 1;
  }
  return { events: kept, ...counts };
}

/** "webcal://…" → "https://…"; other text unchanged. */
export const webcalToHttps = (url) =>
  String(url || "")
    .trim()
    .replace(/^webcals?:\/\//i, "https://");

/** True for an http(s) or webcal link the app may send to the server. */
export function isCalendarLink(text) {
  try {
    const url = new URL(webcalToHttps(text));
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}
