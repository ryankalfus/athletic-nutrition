// Second size for each top-level screen: 1024×768 (desktop pass), 320×700 (phone pass).
import { newPage, seed, go, settle, scenario, D, BASE } from "../lib.mjs";
import { lived, athletesDoc } from "../seeds.mjs";

const SCREENS = [
  ["today", "today", "Today (meal window, planned snack)"],
  ["schedule", "schedule", "Schedule week"],
  ["schedule-month", "schedule", "Schedule month"],
  ["food-ideas", "food/ideas", "Food › Ideas"],
  ["food-home", "food/home", "Food › At home"],
  ["food-groceries", "food/groceries", "Food › Groceries"],
  ["food-log-day", "food/log", "Food › Log › Day"],
  ["food-log-week", "food/log/week", "Food › Log › Week"],
  ["you", "you", "You"],
  ["you-device", "you/device", "You › This device"],
  ["you-about", "you/about", "About Nourally's guidance"],
  ["notfound", "nope", "Not found"],
];

export default async function ({ browser, pass, cap }) {
  const size = pass === "desktop" ? "1024" : "320";
  await scenario(cap, 700, "sizes", async (opened) => {
    const r = await newPage(browser, pass, { extra: true, clock: D(2026, 10, 13, 13, 30) });
    opened.push(r.context);
    const p = r.page;
    await p.goto(BASE);
    await p.getByRole("button", { name: "Get started" }).waitFor();
    await settle(p);
    await cap.shot(p, `w${size}`, "welcome-first-visit", `Welcome first visit at ${size}px`);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("heading", { level: 1 }).waitFor();
    await settle(p);
    await cap.shot(p, `w${size}`, "setup-step1", `Setup step 1 at ${size}px`);
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day", level: 1 }).waitFor();
    await cap.shot(p, `w${size}`, "setup-step2", `Setup step 2 at ${size}px`);
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Practices and games", level: 1 }).waitFor();
    await cap.shot(p, `w${size}`, "setup-step3", `Setup step 3 at ${size}px`);
    await seed(p, athletesDoc(3, lived()), "welcome");
    await cap.shot(p, `w${size}`, "welcome-3-athletes", `Welcome chooser with 3 athletes at ${size}px`);
    await seed(p, lived(), "today");
    for (const [state, route, note] of SCREENS) {
      await go(p, route);
      if (state === "schedule-month") {
        await p.getByRole("radio", { name: "Month" }).click();
        await settle(p, 300);
      }
      await cap.shot(p, `w${size}`, state, `${note} at ${size}px`);
    }
    await go(p, "food/log");
    await p.getByRole("button", { name: "Log food", exact: true }).click();
    await p.getByRole("dialog").waitFor();
    await settle(p, 300);
    await cap.shot(p, `w${size}`, "food-search-dialog", `Log food dialog at ${size}px`);
  });
}
