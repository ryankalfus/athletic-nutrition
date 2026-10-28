import { newPage, seed, go, settle, scenario, D, clearToasts, closeAll, mockApi, BASE } from "../lib.mjs";
import { lived, athletesDoc, baseDoc } from "../seeds.mjs";

const T = D(2026, 10, 13, 13, 30);

export default async function ({ browser, pass, cap }) {
  const opener = (opened) => async (clock = T) => {
    const r = await newPage(browser, pass, { clock });
    opened.push(r.context);
    return r.page;
  };
  const shot = (p, area, state, note, o) => cap.shot(p, area, state, note, o);
  const navName = pass === "phone" ? "bottom bar" : "side rail";

  // Navigation and keyboard focus.
  await scenario(cap, 600, "nav + focus", async (opened) => {
    const p = await opener(opened)();
    await seed(p, lived(), "today");
    await p.keyboard.press("Tab");
    await p.waitForTimeout(200);
    await shot(p, "global", "focus-skip-link", "First Tab: 'Skip to content' link visible with focus ring", { kind: "fold" });
    const link = p.getByRole("link", { name: "Schedule", exact: true }).or(p.getByRole("button", { name: "Schedule", exact: true })).first();
    await link.focus();
    await shot(p, "global", `focus-nav-${pass === "phone" ? "bottom-bar" : "rail"}`, `Keyboard focus ring on Schedule in the ${navName}`, { kind: "fold" });
    await p.locator(".today-primary").focus();
    await shot(p, "global", "focus-now-primary", "Keyboard focus ring on the Now card primary button", { kind: "fold" });
    await go(p, "schedule");
    await p.getByRole("radio", { name: "Week" }).focus();
    await shot(p, "global", "focus-segmented", "Keyboard focus ring on the Week/Month segmented control", { kind: "fold" });
    await p.getByRole("button", { name: /^Actions for / }).first().focus();
    await shot(p, "global", "focus-row-menu", "Keyboard focus ring on a Schedule row '…' menu button", { kind: "fold" });
    await go(p, "you/access");
    await p.getByRole("dialog").getByRole("button").filter({ hasText: "Nearby store" }).focus();
    await shot(p, "global", "focus-chip-in-sheet", "Keyboard focus ring on a chip inside the Food access sheet", { kind: "fold" });
    await p.getByRole("dialog").getByRole("textbox").first().focus().catch(() => {});
    await p.getByRole("dialog").locator("input[inputmode], input[type=number], input[type=text]").first().focus().catch(() => {});
    await shot(p, "global", "focus-input-in-sheet", "Keyboard focus ring on a text input inside a sheet", { kind: "fold" });
    await closeAll(p);
    for (const [route, label] of [["today", "today"], ["schedule", "schedule"], ["food/ideas", "food"], ["you", "you"]]) {
      await go(p, route);
      await shot(p, "global", `nav-${label}-active`, `${navName} with ${label} active`, { kind: "fold" });
    }
  });

  // Toasts.
  await scenario(cap, 615, "toasts", async (opened) => {
    const p = await opener(opened)();
    await seed(p, lived(), "today");
    const water = p.getByRole("region", { name: /^Water today/ });
    await water.getByRole("button", { name: "+8" }).click();
    await p.locator(".app-toast").first().waitFor();
    await shot(p, "global", "toast-with-undo", "Toast with Undo and dismiss after +8 water", { kind: "fold", wait: 100 });
    await p.locator(".app-toast").getByRole("button", { name: "Undo" }).click();
    await p.waitForTimeout(400);
    await shot(p, "global", "toast-after-undo", "After pressing Undo on the toast", { kind: "fold", wait: 50 });
    await clearToasts(p);
    await go(p, "you/needs");
    await p.getByRole("dialog").getByRole("button", { name: "Vegetarian" }).click();
    await p.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
    await p.locator(".app-toast").first().waitFor();
    await shot(p, "global", "toast-without-undo", "Toast '<Thing> saved.' with Undo after saving a You sheet", { kind: "fold", wait: 100 });
    await clearToasts(p);
    await go(p, "you/needs");
    await p.getByRole("dialog").getByRole("button", { name: "Pasta" }).click();
    await p.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
    await p.waitForTimeout(400);
    await shot(p, "global", "discard-changes-you-sheet", "'Discard changes?' after Cancel on a changed Food needs sheet");
    await closeAll(p);
  });

  // Athlete switcher.
  await scenario(cap, 625, "athlete switcher", async (opened) => {
    let p = await opener(opened)();
    await seed(p, lived(), "today");
    const one = p.getByRole("button", { name: "Add another athlete" }).first();
    await one.focus();
    await shot(p, "global", "athlete-switcher-1-focus", "Frame athlete button with 1 athlete ('Add') focused", { kind: "fold" });
    await one.click();
    await p.getByRole("dialog").waitFor();
    await shot(p, "global", "athlete-switcher-1-add-sheet", "Add athlete sheet opened from the frame athlete button");
    await closeAll(p);
    p = await opener(opened)();
    await seed(p, athletesDoc(3, lived()), "today");
    await shot(p, "global", "athlete-switcher-3", "Frame athlete button with 3 athletes ('Switch')", { kind: "fold" });
    await p.getByRole("button", { name: "Switch athlete" }).first().click();
    await p.getByRole("heading", { name: "Who's using Nourally?" }).waitFor();
    await settle(p);
    await shot(p, "global", "athlete-switcher-chooser", "Switch athlete opens the Welcome chooser");
    await p.locator(".welcome-tile-open").nth(1).click();
    await settle(p);
    await shot(p, "global", "athlete-switched-today", "Today for the second athlete (Sam, Tennis) after switching");
  });

  // Data error (unreadable saved data).
  await scenario(cap, 635, "data error", async (opened) => {
    const p = await opener(opened)();
    await seed(p, { version: 3, revision: 1, defaultProfileId: "x", profiles: { x: { id: "x", name: "Broken", data: { schedule: "not a list" } } } }, "today");
    await settle(p, 600);
    await shot(p, "global", "data-error-recovery", "Saved data that fails validation: 'Your data needs attention' recovery screen");
    const clean = p.getByRole("button", { name: /recovery|clean/i }).first();
    if (await clean.count()) {
      await clean.click();
      await p.waitForTimeout(400);
      await shot(p, "global", "data-error-recovery-confirm", "Confirm: Open a clean recovery profile?");
    }
  });

  // Tablet top bar (768 × 1024), desktop pass only.
  if (pass === "desktop") {
    await scenario(cap, 640, "tablet", async (opened) => {
      const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
      opened.push(context);
      await mockApi(context);
      await context.clock.setFixedTime(T);
      const p = await context.newPage();
      await seed(p, lived(), "today");
      await shot(p, "tablet", "today", "Tablet 768×1024: Today with the top navigation bar");
      await go(p, "schedule");
      await shot(p, "tablet", "schedule", "Tablet 768×1024: Schedule");
      await go(p, "food/ideas");
      await shot(p, "tablet", "food-ideas", "Tablet 768×1024: Food › Ideas");
      await go(p, "food/log");
      await shot(p, "tablet", "food-log", "Tablet 768×1024: Food › Log");
      await go(p, "you");
      await shot(p, "tablet", "you", "Tablet 768×1024: You");
      await go(p, "schedule");
      await p.getByRole("button", { name: /^(\+ )?Add$/ }).first().click();
      await p.getByRole("dialog").waitFor();
      await shot(p, "tablet", "sheet", "Tablet 768×1024: Add practice sheet");
      await closeAll(p);
      await p.goto(BASE);
    });
  }
}
