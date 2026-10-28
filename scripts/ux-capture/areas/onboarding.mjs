import { newPage, seed, go, settle, scenario, BASE, D } from "../lib.mjs";
import { athletesDoc, baseDoc } from "../seeds.mjs";

export default async function ({ browser, pass, cap }) {
  const opener = (opened) => async (opts = {}) => {
    const r = await newPage(browser, pass, { clock: D(2026, 10, 13, 7, 0), ...opts });
    opened.push(r.context);
    return r.page;
  };
  const shot = (p, area, state, note, o) => cap.shot(p, area, state, note, o);

  // 1. First visit and the six setup steps.
  await scenario(cap, 0, "first visit + setup", async (opened) => {
    const p = await opener(opened)();
    const next = () => p.getByRole("button", { name: "Next", exact: true }).click();
    const step = (t) => p.getByRole("heading", { name: t, level: 1 }).waitFor();
    await p.goto(BASE);
    await p.getByRole("button", { name: "Get started" }).waitFor();
    await settle(p);
    await shot(p, "welcome", "first-visit", "Welcome page on a first visit: headline, Get started, privacy line, How Nourally works link");
    await p.getByRole("button", { name: "Get started" }).focus();
    await p.keyboard.press("Shift+Tab");
    await p.keyboard.press("Tab");
    await shot(p, "welcome", "focus-get-started", "Keyboard focus ring on Get started", { kind: "fold" });
    await p.getByRole("button", { name: "Get started" }).click();
    await step("What do you play?");
    await shot(p, "setup", "step1-empty", "Setup step 1 of 6 (What do you play?): first name, Sport combobox, Season; empty");
    await next();
    await p.getByText("Enter your sport.").waitFor();
    await shot(p, "setup", "step1-error", "Step 1 after Next with no sport: inline error 'Enter your sport.' on the Sport field");
    await p.getByRole("button", { name: "Sport suggestions" }).click();
    await p.getByRole("option").first().waitFor();
    await shot(p, "setup", "step1-combobox-open", "Step 1 with the Sport suggestions list open (chevron clicked)");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("So");
    await shot(p, "setup", "step1-combobox-filtered", "Sport combobox filtered by typing 'So'", { kind: "fold" });
    await p.getByRole("option", { name: "Soccer" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Maya");
    await p.getByRole("radiogroup", { name: "Season" }).getByRole("radio", { name: "In season" }).click();
    await shot(p, "setup", "step1-filled", "Step 1 filled: Maya, Soccer, In season");
    await next();
    await step("Your school day");
    await shot(p, "setup", "step2-default", "Step 2 of 6 (Your school day): weekday picker, school and lunch times, No school right now");
    // Validation: lunch outside the school day.
    await p.getByLabel("Lunch starts").fill("16:00");
    await p.getByLabel("Lunch ends").fill("16:30");
    await next();
    await p.waitForTimeout(300);
    await shot(p, "setup", "step2-error", "Step 2 with lunch set after school ends: validation error shown");
    await p.getByLabel("Lunch starts").fill("11:30");
    await p.getByLabel("Lunch ends").fill("12:00");
    await next();
    await step("Practices and games");
    await shot(p, "setup", "step3-empty", "Step 3 of 6 (Practices and games): practice days, times, Home/Away, Add a game");
    const days = p.getByRole("group", { name: "Practice days" });
    for (const d of ["Monday", "Tuesday", "Wednesday", "Thursday"])
      await days.getByRole("button", { name: d }).click();
    await p.getByRole("button", { name: /Add a game/ }).click();
    await p.getByLabel("Game date").fill("");
    await p.getByLabel("Ends").first().fill("15:00");
    await next();
    await p.waitForTimeout(300);
    await shot(p, "setup", "step3-errors", "Step 3 with practice ending before it starts and no game date: validation errors");
    await p.getByLabel("Ends").first().fill("17:30");
    await p.getByLabel("Game date").fill("2026-10-17");
    await shot(p, "setup", "step3-filled", "Step 3 filled: practice Mon–Thu 4:00–5:30 Home, game Sat Oct 17 6:00–7:30 Away");
    await next();
    await step("Food at school");
    await shot(p, "setup", "step4", "Step 4 of 6 (Food at school): chips Cafeteria, Fridge, Microwave, Can eat in class; family help switch");
    await p.getByRole("group", { name: "At school I have" }).getByRole("button", { name: "Microwave" }).click();
    await shot(p, "setup", "step4-selected", "Step 4 with Cafeteria and Microwave selected (check marks on chips)", { kind: "fold" });
    await next();
    await step("Food needs");
    await shot(p, "setup", "step5", "Step 5 of 6 (Food needs): 'Allergy filtering coming soon.', diet chips, 'Not a fan of' chips");
    await p.getByRole("button", { name: "Vegetarian" }).click();
    await p.getByRole("button", { name: "Raisins" }).click().catch(() => {});
    await p.getByRole("button", { name: "Grapes" }).click();
    await shot(p, "setup", "step5-selected", "Step 5 with Vegetarian and Grapes selected");
    await p.getByRole("button", { name: "Vegetarian" }).click();
    await next();
    await step("You're set");
    await shot(p, "setup", "step6-youre-set", "Step 6 of 6 (You're set): first plan preview and Open Today");
    await p.getByRole("button", { name: "Open Today" }).click();
    await p.getByRole("heading", { level: 1, name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/ }).waitFor();
    await settle(p);
    await shot(p, "today", "first-open-after-setup", "Today right after setup at 7:00 AM Tuesday (before school)");
  });

  // 2. Setup with "No school right now" and "Skip setup".
  await scenario(cap, 30, "setup skip paths", async (opened) => {
    const p = await opener(opened)();
    await p.goto(BASE);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Basketball");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day", level: 1 }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).focus();
    await shot(p, "setup", "step2-focus-skip-setup", "Step 2 with keyboard focus on Skip setup in the footer", { kind: "fold" });
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { level: 1, name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/ }).waitFor();
    await settle(p);
    await shot(p, "today", "after-skip-setup", "Today after Skip setup at step 2: no schedule (setup Now card)");
  });

  // 3. Returning visitors: 1 athlete and 3 athletes.
  await scenario(cap, 40, "welcome returning", async (opened) => {
    const p = await opener(opened)();
    await seed(p, athletesDoc(1), "welcome");
    await shot(p, "welcome", "returning-1-athlete", "Welcome for a returning visitor with 1 athlete: Who's using Nourally? one tile, Add another athlete");
    const p3 = await opener(opened)();
    await seed(p3, athletesDoc(3), "welcome");
    await shot(p3, "welcome", "returning-3-athletes", "Welcome with 3 athletes (Maya, Sam, Jordan), sorted by last used");
    await p3.getByRole("button", { name: "Maya options" }).click();
    await shot(p3, "welcome", "tile-menu-open", "Athlete tile menu open: Rename, Remove from this device");
    await p3.getByRole("menuitem", { name: "Rename" }).click();
    await p3.getByRole("dialog").waitFor();
    await shot(p3, "welcome", "rename-sheet", "Rename athlete sheet from the Welcome tile menu");
    await p3.keyboard.press("Escape");
    await p3.waitForTimeout(300);
    await p3.getByRole("button", { name: "Sam options" }).click();
    await p3.getByRole("menuitem", { name: "Remove from this device" }).click();
    await p3.getByRole("dialog").or(p3.getByRole("alertdialog")).first().waitFor();
    await shot(p3, "welcome", "remove-confirm", "Confirm dialog: Delete Sam's data from this device? (type DELETE)");
    await p3.keyboard.press("Escape");
    await p3.waitForTimeout(300);
    await p3.getByRole("button", { name: "Add another athlete" }).click();
    await p3.getByRole("dialog", { name: "Add athlete" }).waitFor();
    await shot(p3, "welcome", "add-athlete-sheet", "Add athlete sheet (first name) from Welcome");
    await p3.getByRole("dialog", { name: "Add athlete" }).getByRole("button", { name: "Add athlete", exact: true }).click();
    await p3.waitForTimeout(300);
    await shot(p3, "welcome", "add-athlete-empty-submit", "Add athlete sheet after submitting with no name");
  });

  // 4. Returning athlete opening Today (base doc, 1 athlete).
  await scenario(cap, 55, "welcome open athlete", async (opened) => {
    const p = await opener(opened)();
    await seed(p, baseDoc(), "today");
    await go(p, "welcome");
    await p.locator(".welcome-tile-open").first().click();
    await p.getByRole("heading", { level: 1, name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/ }).waitFor();
    await settle(p);
    await shot(p, "today", "opened-from-welcome", "Today opened from a Welcome tile");
  });
}
