// Builds seeds/lived.json: a lived-in week for Maya made through the real UI
// (quick adds, logs on past days, a plan, groceries, one shopping trip).
import { writeFileSync } from "node:fs";
import { launch, newPage, seed, go, dump, D, HERE, clearToasts, closeAll } from "./lib.mjs";
import { baseDoc, dataOf } from "./seeds.mjs";

const browser = await launch();
const { page: p } = await newPage(browser, "desktop", { clock: D(2026, 10, 13, 13, 30) });
const step = async (label, fn) => {
  try {
    await fn();
    console.log("ok", label);
  } catch (e) {
    console.log("!!", label, e.message.split("\n")[0]);
    console.log((await p.locator("body").innerText()).slice(0, 1500));
    throw e;
  }
};
await seed(p, baseDoc(), "food/home");

await step("quick adds", async () => {
  for (const name of ["Bananas", "Apples", "Baby carrots", "Whole-grain bread", "Tortillas", "Frozen berries"]) {
    await p.getByRole("button", { name: `Add ${name}`, exact: true }).click();
    await p.waitForTimeout(250);
  }
  await clearToasts(p);
  console.log((await p.locator("main").innerText()).slice(0, 1500));
});

const log = async (date, foods, time) => {
  await go(p, `food/log/${date}`);
  for (const f of foods) {
    await p.getByRole("button", { name: "Log food", exact: true }).click();
    const d = p.getByRole("dialog", { name: "Log food" });
    await d.waitFor();
    await d.getByRole("button", { name: `Add ${f}`, exact: true }).click();
    await d.getByRole("button", { name: "Save", exact: true }).click();
    await p.waitForTimeout(300);
    if (await d.getByRole("radio", { name: time }).count()) {
      await d.getByRole("radio", { name: time }).click();
      await d.getByRole("button", { name: "Save", exact: true }).click();
      await p.waitForTimeout(300);
    }
    const use = p.getByRole("dialog", { name: "Use food from home" });
    if (await use.count()) await use.getByRole("button", { name: /Skip|Not now|Cancel|No/ }).first().click().catch(() => closeAll(p));
    const yesNo = p.getByRole("button", { name: "No", exact: true });
    if (await yesNo.count()) await yesNo.first().click().catch(() => {});
    await closeAll(p);
  }
  await clearToasts(p);
};
await step("log food dialog look", async () => {
  await go(p, "food/log");
  await p.getByRole("button", { name: "Log food", exact: true }).click();
  const d = p.getByRole("dialog", { name: "Log food" });
  await d.waitFor();
  console.log((await d.innerText()).slice(0, 1200));
  await closeAll(p);
});
await step("logs", async () => {
  await log("2026-10-08", ["Bananas", "Apples"], "Morning");
  await log("2026-10-09", ["Whole-grain bread"], "Midday");
  await log("2026-10-10", ["Apples"], "Afternoon");
  await log("2026-10-12", ["Bananas", "Baby carrots"], "Afternoon");
  await log("2026-10-13", ["Apples"], "Morning");
});

await step("plan today", async () => {
  await go(p, "today");
  await p.locator(".today-primary").click();
  await p.waitForTimeout(400);
  await p.locator(".today-primary").click();
  await p.waitForTimeout(400);
  await clearToasts(p);
});

await step("week suggestions", async () => {
  await go(p, "food/groceries");
  await p.getByRole("button", { name: /Suggest for this week/ }).click();
  const s = p.getByRole("dialog");
  await s.waitFor();
  console.log((await s.innerText()).slice(0, 1500));
  const cb = s.getByRole("checkbox");
  for (let i = 0; i < Math.min(6, await cb.count()); i++) await cb.nth(i).click();
  await s.getByRole("button", { name: /Add selected/ }).click();
  await p.waitForTimeout(500);
  await clearToasts(p);
  console.log((await p.locator("main").innerText()).slice(0, 2000));
});

await step("shop + put away", async () => {
  const boxes = p.getByRole("checkbox");
  const n = await boxes.count();
  for (let i = 0; i < Math.min(3, n); i++) {
    await boxes.nth(i).click();
    await p.waitForTimeout(200);
  }
  await p.getByRole("button", { name: /^Finish shopping/ }).click();
  const put = p.getByRole("dialog", { name: "Put these away?" });
  await put.waitFor();
  console.log((await put.innerText()).slice(0, 1200));
  await put.getByRole("button", { name: "Add to At home" }).click();
  await p.waitForTimeout(500);
  await clearToasts(p);
  const b2 = p.getByRole("checkbox");
  if (await b2.count()) await b2.first().click();
  await p.waitForTimeout(300);
  console.log((await p.locator("main").innerText()).slice(0, 2000));
});

const doc = await dump(p);
const d = dataOf(doc);
// Stock states and places the UI would set through Edit details.
const byName = (n) => d.groceryState.pantry.find((r) => r.name === n);
const set = (n, patch) => byName(n) && Object.assign(byName(n), patch);
set("Apples", { availability: "low" });
set("Tortillas", { availability: "out", previousAvailability: "have" });
set("Frozen berries", { location: "freezer" });
set("Baby carrots", { location: "fridge" });
set("Whole-grain bread", { availability: "exact", quantity: 6, unit: "slice" });
const bag = structuredClone(byName("Bananas"));
if (bag) {
  bag.id = "bag-granola-bar";
  bag.name = "Granola bars";
  bag.food = { ...bag.food, id: "granola-bars", name: "Granola bars", catalogId: "granola-bars" };
  bag.ingredientId = "granola-bars";
  bag.catalogId = "granola-bars";
  bag.location = "bag";
  d.groceryState.pantry.push(bag);
}
d.profile.lastBackupAt = "2026-10-11T12:00:00.000Z";
writeFileSync(`${HERE}/seeds/lived.json`, JSON.stringify(doc, null, 1));
console.log("pantry", d.groceryState.pantry.map((r) => `${r.name}:${r.availability}:${r.location}`).join(", "));
console.log("items", d.groceryState.items.map((r) => `${r.name}:${r.checked}`).join(", "));
console.log("purchases", d.groceryState.purchases.length, "logs", Object.keys(d.dailyLogs).join(","));
await browser.close();
