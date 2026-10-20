import { writeFileSync, readFileSync } from "node:fs";
import { launch, newPage, seed, go, dump, D, HERE } from "./lib.mjs";
const doc = JSON.parse(readFileSync(`${HERE}/seeds/after-setup.json`, "utf8"));
const browser = await launch();
const { page: p, context } = await newPage(browser, "desktop", { clock: D(2026, 10, 13, 13, 0) });
const txt = async (label) => console.log(`\n===== ${label}\n` + (await p.locator("main").innerText()).slice(0, 2500));
await seed(p, doc, "food/home");
await txt("food/home");
for (const f of ["Add Bananas", "Add Pretzels", "Add Granola"]) {
  const b = p.getByRole("button", { name: f, exact: true });
  if (await b.count()) { await b.click(); await p.waitForTimeout(300); }
}
await go(p, "today");
await txt("today 1pm");
const primary = p.locator(".today-primary");
await primary.click(); await p.waitForTimeout(600);
await txt("today after plan");
await primary.click(); await p.waitForTimeout(600);
await txt("today after primary 2");
await go(p, "food/groceries");
await txt("groceries");
await go(p, "food/ideas");
await txt("ideas");
await go(p, "food/log");
await txt("log");
await go(p, "food/log/week");
await txt("log week");
await go(p, "schedule");
await txt("schedule");
await go(p, "you");
await txt("you");
await go(p, "you/device");
await txt("device");
await go(p, "you/about");
await txt("about");
writeFileSync(`${HERE}/seeds/after-plan.json`, JSON.stringify(await dump(p), null, 1));
await context.close();
await browser.close();
