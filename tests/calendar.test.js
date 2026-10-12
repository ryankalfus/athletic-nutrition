// P2-01 / P2-02 / ADD-08: team calendar import (domain/ics.js).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  expandEvents,
  guessLocation,
  guessType,
  importPreview,
  isCalendarLink,
  mergeFeed,
  parseICS,
  toScheduleEvent,
  unescapeText,
  unfoldLines,
  webcalToHttps,
} from "../src/domain/ics.js";
import { validateData, emptyData } from "../src/domain/storage.js";

const fixture = (name) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const TEAMSNAP = fixture("teamsnap-lightning-u14.ics");
const GAMECHANGER = fixture("gamechanger-tigers-14u.ics");
const today = "2026-10-11";
const wrap = (body) =>
  `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body.trim().replace(/\n/g, "\r\n")}\r\nEND:VCALENDAR\r\n`;
let ids = 0;
const makeId = () => `id-${++ids}`;
const at = (rows, date) => rows.filter((row) => row.date === date);

test("ICS: folded lines unfold and escaped text reads plainly", () => {
  assert.deepEqual(unfoldLines("A:one\r\n two\r\n\tthree\r\nB:x"), [
    "A:onetwothree",
    "B:x",
  ]);
  assert.equal(
    unescapeText("Field 3\\, Park\\; bring water\\nand cleats \\\\ ok"),
    "Field 3, Park; bring water\nand cleats \\ ok",
  );
  const { events } = parseICS(TEAMSNAP);
  const practice = events[0];
  assert.equal(
    practice.location,
    "Memorial Park, Field 3, 1200 Park Ave, Naperville IL",
  );
  assert.match(practice.description, /full water bottle\. Coach Dana/);
  assert.match(practice.description, /drills; parents please pick up/);
  assert.throws(() => parseICS("hello"), /not a calendar/);
});

test("P2-01: the TeamSnap file has 20 events in local time across the DST change", () => {
  // America/Chicago events seen on a phone in Phoenix (no DST): 5:00 PM CDT
  // is 3:00 PM before Nov 1 and 4:00 PM after.
  const phoenix = importPreview(TEAMSNAP, [], {
    todayKey: today,
    timeZone: "America/Phoenix",
  });
  assert.equal(phoenix.calendarName, "Lightning U14 Girls");
  assert.equal(phoenix.rows.length, 20);
  assert.equal(phoenix.rows.filter((row) => row.duplicate).length, 0);
  assert.deepEqual(
    [
      at(phoenix.rows, "2026-10-29")[0].startTime,
      at(phoenix.rows, "2026-10-29")[0].endTime,
    ],
    ["15:00", "16:30"],
  );
  assert.deepEqual(
    [
      at(phoenix.rows, "2026-11-03")[0].startTime,
      at(phoenix.rows, "2026-11-03")[0].endTime,
    ],
    ["16:00", "17:30"],
  );
  // The DST morning itself: 8:30 AM CST on Nov 1 is 7:30 AM in Phoenix.
  assert.equal(at(phoenix.rows, "2026-11-01")[0].startTime, "07:30");

  // New York changes on the same day as Chicago: always one hour later.
  const newYork = importPreview(TEAMSNAP, [], {
    todayKey: today,
    timeZone: "America/New_York",
  });
  for (const date of ["2026-10-29", "2026-11-03"])
    assert.equal(at(newYork.rows, date)[0].startTime, "18:00");
  assert.equal(at(newYork.rows, "2026-10-17")[0].startTime, "11:00");

  // London leaves DST a week earlier (Oct 25): 5:00 PM Chicago is 11:00 PM on
  // Oct 22, 10:00 PM on Oct 27 and 11:00 PM again on Nov 3.
  const london = importPreview(TEAMSNAP, [], {
    todayKey: today,
    timeZone: "Europe/London",
  });
  assert.equal(at(london.rows, "2026-10-22")[0].startTime, "23:00");
  assert.equal(at(london.rows, "2026-10-27")[0].startTime, "22:00");
  assert.equal(at(london.rows, "2026-11-03")[0].startTime, "23:00");
  // 6:30 PM Chicago ends past midnight in London: the row ends at 11:59 PM.
  assert.equal(at(london.rows, "2026-10-22")[0].endTime, "23:59");

  // Same zone as the feed: wall times unchanged.
  const chicago = importPreview(TEAMSNAP, [], {
    todayKey: today,
    timeZone: "America/Chicago",
  });
  assert.deepEqual(
    chicago.rows.slice(0, 3).map((row) => [row.date, row.startTime]),
    [
      ["2026-10-13", "17:00"],
      ["2026-10-15", "17:00"],
      ["2026-10-17", "10:00"],
    ],
  );
});

test("P2-01: type and home/away guesses follow the title, place and notes", () => {
  const rows = importPreview(TEAMSNAP, [], {
    todayKey: today,
    timeZone: "America/Chicago",
  }).rows;
  const by = (title) => rows.find((row) => row.title === title);
  assert.equal(by("Lightning U14 Practice").type, "practice");
  assert.equal(by("Lightning U14 vs. Hawks FC (Home)").type, "game");
  assert.equal(by("Lightning U14 vs. Hawks FC (Home)").place, "home");
  assert.equal(by("Lightning U14 at Rockets SC (Away)").place, "away");
  assert.equal(by("Scrimmage vs. Fire 2012G").type, "game");
  assert.equal(by("Conditioning").type, "practice");
  assert.equal(by("Team photos").type, "other");
  assert.equal(by("End of season party").type, "other");
  assert.equal(guessType("Tigers 14U @ Rockets"), "game");
  assert.equal(guessLocation("Tigers 14U @ Rockets"), "away");
  assert.equal(guessType("Tigers at Eagles"), "game");
  assert.equal(guessLocation("Tigers at Eagles"), "away");
  assert.equal(guessLocation("Practice at Lincoln Field"), "home");
  assert.equal(guessLocation("Game", "Away: Rockets Park"), "away");
  assert.equal(guessType("Team dinner", "Bring a dish"), "other");
});

test("P2-01: GameChanger RRULE, EXDATE, RECURRENCE-ID, COUNT, all-day and cancelled", () => {
  const preview = importPreview(GAMECHANGER, [], {
    todayKey: today,
    timeZone: "America/New_York",
  });
  const practices = preview.rows.filter((row) =>
    row.uid.startsWith("6a1f0c2e"),
  );
  // Mon/Wed from Oct 12 until Nov 18, minus the Oct 26 EXDATE.
  assert.deepEqual(
    practices.map((row) => row.date),
    [
      "2026-10-12",
      "2026-10-14",
      "2026-10-19",
      "2026-10-21",
      "2026-10-28",
      "2026-11-02",
      "2026-11-04",
      "2026-11-09",
      "2026-11-11",
      "2026-11-16",
      "2026-11-18",
    ],
  );
  // Wall time stays 4:00 PM in New York across Nov 1.
  assert.ok(
    practices
      .filter((row) => row.date !== "2026-11-04")
      .every((row) => row.startTime === "16:00" && row.endTime === "17:30"),
  );
  // RECURRENCE-ID moved Nov 4 to 5:00 PM with its own title.
  const moved = at(practices, "2026-11-04")[0];
  assert.deepEqual(
    [moved.startTime, moved.endTime, moved.title],
    ["17:00", "18:30", "Practice (moved to 5)"],
  );
  // Each occurrence has its own stable key.
  assert.equal(new Set(practices.map((row) => row.key)).size, 11);
  // COUNT=4 in UTC: 7:00 PM EDT, then 6:00 PM EST after the change.
  const cage = preview.rows.filter((row) => row.title === "Batting cage");
  assert.deepEqual(
    cage.map((row) => [row.date, row.startTime, row.endTime]),
    [
      ["2026-10-13", "19:00", "20:00"],
      ["2026-10-20", "19:00", "20:00"],
      ["2026-10-27", "19:00", "20:00"],
      ["2026-11-03", "18:00", "19:00"],
    ],
  );
  // UTC "Z" game: 17:00Z is 1:00 PM EDT.
  assert.equal(
    preview.rows.find((row) => row.title === "Tigers 14U vs Eagles").startTime,
    "13:00",
  );
  assert.ok(!preview.rows.some((row) => row.title === "Tigers 14U vs Bears"));
  const tourney = preview.rows.find(
    (row) => row.title === "Fall Classic Tournament",
  );
  assert.equal(tourney.allDay, true);
  assert.equal(tourney.date, "2026-11-07");
  assert.equal(tourney.startTime, "");
  // The September game is past: counted, not listed.
  assert.equal(preview.pastCount, 1);
});

test("ICS: weekly UNTIL as a date, INTERVAL and DAILY", () => {
  const calendar = parseICS(
    wrap(`
BEGIN:VEVENT
UID:a
DTSTART;TZID=America/Denver:20261005T060000
DTEND;TZID=America/Denver:20261005T070000
RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR;UNTIL=20261030
SUMMARY:Lift
END:VEVENT
BEGIN:VEVENT
UID:b
DTSTART:20261010T130000Z
RRULE:FREQ=DAILY;COUNT=3
EXDATE:20261011T130000Z
SUMMARY:Camp
END:VEVENT`),
  );
  const rows = expandEvents(calendar, {
    timeZone: "America/Denver",
    todayKey: "2026-10-01",
  });
  assert.deepEqual(
    rows.filter((row) => row.uid === "a").map((row) => row.date),
    ["2026-10-05", "2026-10-09", "2026-10-19", "2026-10-23"],
  );
  // COUNT includes the excluded day (RFC 5545): Oct 10 and Oct 12 remain.
  // No DTEND or DURATION: one hour.
  assert.deepEqual(
    rows
      .filter((row) => row.uid === "b")
      .map((row) => [row.date, row.startTime, row.endTime]),
    [
      ["2026-10-10", "07:00", "08:00"],
      ["2026-10-12", "07:00", "08:00"],
    ],
  );
});

test("ICS: Windows and prefixed TZIDs resolve; floating times use the device zone", () => {
  const calendar = parseICS(
    wrap(`
BEGIN:VEVENT
UID:w
DTSTART;TZID="Eastern Standard Time":20261020T170000
DTEND;TZID="Eastern Standard Time":20261020T180000
SUMMARY:Practice
END:VEVENT
BEGIN:VEVENT
UID:m
DTSTART;TZID=/mozilla.org/20050126_1/America/Los_Angeles:20261020T170000
DTEND;TZID=/mozilla.org/20050126_1/America/Los_Angeles:20261020T180000
SUMMARY:Game vs Owls
END:VEVENT
BEGIN:VEVENT
UID:f
DTSTART:20261020T090000
DTEND:20261020T100000
SUMMARY:Film session
END:VEVENT`),
  );
  const rows = expandEvents(calendar, {
    timeZone: "America/Chicago",
    todayKey: today,
  });
  const by = (uid) => rows.find((row) => row.uid === uid);
  assert.equal(by("w").startTime, "16:00");
  assert.equal(by("m").startTime, "19:00");
  assert.equal(by("f").startTime, "09:00");
});

test("P2-01: a second import of the same file adds no duplicates", () => {
  const options = { todayKey: today, timeZone: "America/Chicago" };
  const first = importPreview(TEAMSNAP, [], options);
  const imported = first.rows.map((row) =>
    toScheduleEvent(row, { id: makeId() }),
  );
  assert.equal(imported.length, 20);
  assert.ok(
    imported.every((event) => event.source.key && !event.source.feedId),
  );
  const again = importPreview(TEAMSNAP, imported, options);
  assert.equal(again.rows.length, 20);
  assert.ok(again.rows.every((row) => row.duplicate));
  // An activity typed in by hand with the same date, start and title also
  // counts as already there.
  const manual = [
    {
      id: "m1",
      type: "practice",
      title: "Lightning U14 Practice",
      date: "2026-10-13",
      startTime: "17:00",
      endTime: "18:30",
    },
  ];
  const withManual = importPreview(TEAMSNAP, manual, options);
  assert.equal(withManual.rows.filter((row) => row.duplicate).length, 1);
  // Without a UID the key is date + time + title.
  const noUid = wrap(`
BEGIN:VEVENT
DTSTART:20261020T220000Z
DTEND:20261020T233000Z
SUMMARY:Practice
END:VEVENT`);
  const once = importPreview(noUid, [], options).rows;
  assert.equal(once[0].key, "2026-10-20|17:00|practice");
  const events = once.map((row) => toScheduleEvent(row, { id: makeId() }));
  assert.ok(importPreview(noUid, events, options).rows[0].duplicate);
});

test("P2-02: refresh changes moved events, adds new ones and removes dropped ones from that feed only", () => {
  const options = { todayKey: today, timeZone: "America/Chicago" };
  const rows = importPreview(TEAMSNAP, [], options).rows;
  const feedEvents = rows.map((row) =>
    toScheduleEvent(row, { id: makeId(), feedId: "feed-1" }),
  );
  const manual = {
    id: "manual",
    type: "workout",
    title: "Run",
    date: "2026-10-14",
    startTime: "07:00",
    endTime: "07:30",
  };
  const other = toScheduleEvent(
    { ...rows[0], key: "other-key", title: "Other team" },
    { id: "other", feedId: "feed-2" },
  );
  const past = toScheduleEvent(
    { ...rows[0], key: "past-key", date: "2026-10-01" },
    { id: "past", feedId: "feed-1" },
  );
  // The athlete marked the first game Away with 30 min travel.
  const gameIndex = feedEvents.findIndex((e) => e.title.includes("Hawks"));
  feedEvents[gameIndex] = {
    ...feedEvents[gameIndex],
    location: "away",
    travelMinutes: 30,
  };
  const schedule = [manual, other, past, ...feedEvents];

  // The feed moves the Hawks game to 11:00, drops the party, adds a practice.
  const changed = TEAMSNAP.replace(
    "DTSTART;TZID=America/Chicago:20261017T100000",
    "DTSTART;TZID=America/Chicago:20261017T110000",
  )
    .replace(
      "DTEND;TZID=America/Chicago:20261017T113000",
      "DTEND;TZID=America/Chicago:20261017T123000",
    )
    .replace(
      /BEGIN:VEVENT\r\nUID:event-48213440@teamsnap\.com[\s\S]*?END:VEVENT\r\n/,
      "",
    )
    .replace(
      "END:VCALENDAR",
      "BEGIN:VEVENT\r\nUID:practice-new@teamsnap.com\r\nDTSTART;TZID=America/Chicago:20261117T170000\r\nDTEND;TZID=America/Chicago:20261117T183000\r\nSUMMARY:Lightning U14 Practice\r\nEND:VEVENT\r\nEND:VCALENDAR",
    );
  const next = importPreview(changed, schedule, options).rows;
  const result = mergeFeed(schedule, "feed-1", next, {
    todayKey: today,
    makeId,
  });
  assert.deepEqual([result.added, result.updated, result.removed], [1, 1, 1]);
  const game = result.events.find((e) => e.title.includes("Hawks"));
  assert.deepEqual(
    [game.startTime, game.endTime, game.location, game.travelMinutes],
    ["11:00", "12:30", "away", 30],
  );
  assert.ok(!result.events.some((e) => e.title === "End of season party"));
  assert.ok(result.events.some((e) => e.date === "2026-11-17"));
  // Manual, other feed and past events are untouched.
  assert.deepEqual(
    result.events.find((e) => e.id === "manual"),
    manual,
  );
  assert.deepEqual(
    result.events.find((e) => e.id === "other"),
    other,
  );
  assert.deepEqual(
    result.events.find((e) => e.id === "past"),
    past,
  );
  // A second refresh of the same feed changes nothing.
  const again = mergeFeed(result.events, "feed-1", next, {
    todayKey: today,
    makeId,
  });
  assert.deepEqual([again.added, again.updated, again.removed], [0, 0, 0]);
  assert.equal(again.events.length, result.events.length);
});

test("P2-02: refresh keeps an athlete's own time change until the feed changes that time", () => {
  const options = { todayKey: today, timeZone: "America/Chicago" };
  const rows = importPreview(TEAMSNAP, [], options).rows.slice(0, 1);
  const [event] = rows.map((row) =>
    toScheduleEvent(row, { id: "e", feedId: "f" }),
  );
  const edited = { ...event, startTime: "17:15" };
  const same = mergeFeed([edited], "f", rows, { todayKey: today, makeId });
  assert.equal(same.events[0].startTime, "17:15");
  assert.equal(same.updated, 0);
  const moved = mergeFeed([edited], "f", [{ ...rows[0], startTime: "17:30" }], {
    todayKey: today,
    makeId,
  });
  assert.equal(moved.events[0].startTime, "17:30");
});

test("P2-02: links and stored subscriptions are checked", () => {
  assert.equal(
    webcalToHttps("webcal://go.teamsnap.com/ics/abc"),
    "https://go.teamsnap.com/ics/abc",
  );
  assert.ok(isCalendarLink("webcal://go.teamsnap.com/ics/abc"));
  assert.ok(
    isCalendarLink(
      "https://api.team-manager.gc.com/ics-calendar-documents/user/x.ics",
    ),
  );
  assert.ok(!isCalendarLink("ftp://example.com/a.ics"));
  assert.ok(!isCalendarLink("javascript:alert(1)"));
  assert.ok(!isCalendarLink("not a link"));
  const data = validateData({
    ...emptyData(),
    calendarSubscriptions: [
      { id: "s", url: "webcal://go.teamsnap.com/ics/abc", name: "Team" },
    ],
  });
  assert.equal(data.calendarSubscriptions.length, 1);
  // Older data without the field gets an empty list.
  const { calendarSubscriptions: _drop, ...older } = emptyData();
  assert.deepEqual(validateData(older).calendarSubscriptions, []);
  assert.throws(
    () =>
      validateData({
        ...emptyData(),
        calendarSubscriptions: [{ id: "s", url: "file:///etc/passwd" }],
      }),
    /team calendar/,
  );
  assert.throws(
    () =>
      validateData({
        ...emptyData(),
        schedule: [{ id: "x", title: "Practice", source: "teamsnap" }],
      }),
    /imported activity/,
  );
});
