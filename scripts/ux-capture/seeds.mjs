// Seed documents built from a document the app itself wrote (seeds/after-setup.json).
import { readFileSync, existsSync } from "node:fs";
import { HERE } from "./lib.mjs";

const load = (name) =>
  JSON.parse(readFileSync(`${HERE}/seeds/${name}.json`, "utf8"));
export const hasSeed = (name) => existsSync(`${HERE}/seeds/${name}.json`);

export const clone = (x) => structuredClone(x);
export const only = (doc) => Object.values(doc.profiles)[0];
export const dataOf = (doc, i = 0) => Object.values(doc.profiles)[i].data;

// Maya, Soccer in season, school Mon–Fri 8–3 (lunch 11:30–12), practice
// Mon–Thu 4:00–5:30 home, game Sat Oct 17 6:00–7:30 PM away.
export function baseDoc({ travel = 45, backupDaysAgo = 2 } = {}) {
  const doc = load("after-setup");
  const d = dataOf(doc);
  const game = d.schedule.find((e) => e.type === "game");
  game.travelMinutes = travel;
  d.profile.lastBackupAt = new Date(
    Date.UTC(2026, 9, 13 - backupDaysAgo, 12),
  ).toISOString();
  d.lastUsedAt = "2026-10-13T11:00:00.000Z";
  return doc;
}

// A profile with no schedule and no school ("Skip setup" after step 1).
export function bareDoc() {
  const doc = baseDoc();
  const d = dataOf(doc);
  d.schedule = [];
  d.schoolSchedule = null;
  return doc;
}

export function lived() {
  return load("lived");
}

const ATHLETES = [
  ["Maya", "Soccer", "2026-10-13T11:00:00.000Z"],
  ["Sam", "Tennis", "2026-10-12T22:00:00.000Z"],
  ["Jordan", "Cross country", "2026-10-02T22:00:00.000Z"],
];
export function athletesDoc(n, from = baseDoc()) {
  const doc = clone(from);
  const first = only(doc);
  doc.profiles = {};
  for (let i = 0; i < n; i++) {
    const [name, sport, used] = ATHLETES[i];
    const id = i === 0 ? first.id : `athlete-${i}`;
    const p = clone(first);
    p.id = id;
    p.name = name;
    p.data.profile.name = name;
    p.data.profile.sport = sport;
    p.data.lastUsedAt = used;
    if (i > 0) {
      p.data.schedule = p.data.schedule.map((e) => ({
        ...e,
        id: `${e.id}-${i}`,
        title: e.title.replace("Soccer", sport),
      }));
      p.data.mealPlans = [];
      p.data.dayPlans = {};
      p.data.dailyLogs = {};
    }
    doc.profiles[id] = p;
  }
  doc.defaultProfileId = first.id;
  return doc;
}
