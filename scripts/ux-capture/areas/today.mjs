import { newPage, seed, settle, scenario, D, clearToasts, closeAll } from "../lib.mjs";
import { baseDoc, bareDoc, dataOf } from "../seeds.mjs";

// Week of Mon Oct 12 – Sun Oct 18 2026. Practice Mon–Thu 4:00–5:30 PM home;
// game Sat 6:00–7:30 PM away, 45 min travel; school Mon–Fri 8–3, lunch 11:30.
const STATES = [
  ["setup", bareDoc, D(2026, 10, 13, 13, 0), "Now card 'setup': no school and no activities (Skip setup)"],
  ["before-school", baseDoc, D(2026, 10, 13, 7, 0), "Now card 'before school' Tue 7:00 AM: Pack your after-school snack"],
  ["plan-ahead", baseDoc, D(2026, 10, 13, 9, 30), "Now card 'plan ahead' Tue 9:30 AM, practice 4:00 PM"],
  ["school-window-lunch", baseDoc, D(2026, 10, 13, 11, 40), "Now card during the school lunch window Tue 11:40 AM"],
  ["meal-window", baseDoc, D(2026, 10, 13, 13, 30), "Now card 'meal window' Tue 1:30 PM: Eat a snack or small meal by 2:30 PM"],
  ["pre", baseDoc, D(2026, 10, 13, 15, 0), "Now card 'pre' Tue 3:00 PM, practice in 1 hr"],
  ["quick", baseDoc, D(2026, 10, 13, 15, 40), "Now card 'quick' Tue 3:40 PM, practice in 20 min"],
  ["during", baseDoc, D(2026, 10, 13, 16, 30), "Now card 'during' Tue 4:30 PM, practice in progress"],
  ["recovery", baseDoc, D(2026, 10, 13, 17, 50), "Now card 'recovery' Tue 5:50 PM, after practice"],
  ["evening", baseDoc, D(2026, 10, 13, 19, 30), "Now card 'evening' Tue 7:30 PM with the Tonight card (tomorrow's practice)"],
  ["late", baseDoc, D(2026, 10, 17, 22, 0), "Now card 'late' Sat 10:00 PM: Nothing to plan tonight"],
  ["rest", () => { const d = baseDoc(); dataOf(d).profile.restDays = ["2026-10-18"]; return d; }, D(2026, 10, 18, 12, 0), "Now card 'rest' Sun 12:00 PM marked rest day, Undo rest day"],
  ["no-sport", baseDoc, D(2026, 10, 16, 13, 30), "Now card 'no sport' Fri 1:30 PM, school day with no practice"],
  ["game-day", baseDoc, D(2026, 10, 17, 12, 0), "Now card on game day Sat 12:00 PM, Game day badge, away game 6:00 PM"],
  ["travel", baseDoc, D(2026, 10, 17, 16, 0), "Now card 'travel' Sat 4:00 PM: Leave by 5:15 PM (45 min drive)"],
  ["weekend-no-schedule", baseDoc, D(2026, 10, 18, 10, 0), "Sunday 10:00 AM, no school and no activity (not marked rest)"],
];

export default async function ({ browser, pass, cap }) {
  const opener = (opened) => async (clock) => {
    const r = await newPage(browser, pass, { clock });
    opened.push(r.context);
    return r.page;
  };
  const shot = (p, state, note, o) => cap.shot(p, "today", state, note, o);
  const now = (p) => p.locator(".now-card");
  const primary = (p) => p.locator(".today-primary");

  // 1. Every Now card state, no plan.
  let n = 100;
  for (const [state, make, clock, note] of STATES) {
    await scenario(cap, n, `today ${state}`, async (opened) => {
      const p = await opener(opened)(clock);
      await seed(p, make(), "today");
      await p.getByRole("heading", { level: 1, name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/ }).waitFor();
      await settle(p);
      await shot(p, `now-${state}`, note);
    });
    n += 1;
  }

  // 2. Plan statuses at the meal window, through the real buttons.
  await scenario(cap, 120, "plan statuses", async (opened) => {
    const p = await opener(opened)(D(2026, 10, 13, 13, 30));
    await seed(p, baseDoc(), "today");
    await now(p).waitFor();
    await shot(p, "plan-none", "Meal window, no plan yet: pick, two alternates, Plan this, More ideas, Why this?");
    await now(p).locator(".today-alternates button").first().click();
    await settle(p, 300);
    await shot(p, "plan-none-alternate-chosen", "After tapping an alternate: the Now card pick switches", { kind: "fold" });
    await now(p).locator(".today-alternates button").first().click();
    await primary(p).click();
    await p.locator(".app-toast").first().waitFor();
    await shot(p, "toast-planned-with-undo", "Toast 'Planned for 2:30 PM.' with Undo after Plan this", { kind: "fold", wait: 150 });
    await clearToasts(p);
    await shot(p, "plan-planned", "Plan status planned: title 'Banana + pretzels is planned', Add 1 item to groceries, Pack & prep list, rail row PLANNED");
    await primary(p).click();
    await settle(p, 300);
    await shot(p, "toast-added-to-groceries", "Toast after Add 1 item to groceries; primary becomes Mark packed", { kind: "fold", wait: 100 });
    const pack = p.getByRole("region", { name: "Pack & prep" });
    await pack.getByRole("checkbox").first().click();
    await settle(p, 300);
    await shot(p, "pack-prep-1-of-2", "Pack & prep with 1 of 2 tasks ticked");
    await pack.getByRole("checkbox").nth(1).click();
    await settle(p, 500);
    await shot(p, "pack-prep-all-packed-closed", "Pack & prep after ticking the last task: All packed, list folded, Show list button");
    const toggle = pack.getByRole("button", { name: /Show list|Hide list/ });
    if (await toggle.count()) {
      await toggle.click();
      await settle(p, 300);
      await shot(p, "pack-prep-all-packed-open", "Pack & prep reopened with Show list (Hide list shown)");
      await toggle.focus();
      await shot(p, "focus-pack-prep-toggle", "Keyboard focus ring on Pack & prep Hide list", { kind: "fold" });
    }
    await clearToasts(p);
    await shot(p, "plan-after-tasks", "Now card after all pack tasks done");
    const label = (await primary(p).innerText()).trim();
    if (/Mark packed/.test(label)) {
      await primary(p).click();
      await settle(p, 400);
    }
    await shot(p, "plan-packed", "Plan status packed: primary Log it / Eat around");
    await clearToasts(p);
    await p.getByRole("button", { name: /Banana \+ pretzels|Pre-practice snack/ }).first().click();
    await p.getByRole("dialog").waitFor();
    await shot(p, "plan-details-sheet-packed", "Plan details sheet opened from the Day rail (packed plan)");
    await closeAll(p);
    await p.clock.setFixedTime(D(2026, 10, 13, 14, 35));
    await p.reload();
    await settle(p);
    await shot(p, "plan-packed-log-it", "Packed plan at 2:35 PM: primary Log it");
    await primary(p).click();
    await settle(p, 400);
    await shot(p, "plan-eaten", "Plan status eaten after Log it; toast 'Logged what you ate.'");
  });

  // 3. Day rail sheets and dialogs on a planned day.
  await scenario(cap, 140, "rail sheets and dialogs", async (opened) => {
    const p = await opener(opened)(D(2026, 10, 13, 13, 30));
    await seed(p, baseDoc(), "today");
    await primary(p).click();
    await clearToasts(p);
    await p.getByRole("button", { name: "Why this?" }).click();
    await p.getByRole("dialog", { name: "Why this?" }).waitFor();
    await shot(p, "why-this-dialog", "Why this? dialog from the Now card");
    await closeAll(p);
    const rail = p.getByRole("region", { name: "Your day" });
    await rail.getByRole("button", { name: /Pre-practice snack/ }).click();
    await p.getByRole("dialog").waitFor();
    await shot(p, "plan-details-sheet-planned", "Plan details sheet (planned): ingredients, actions");
    await closeAll(p);
    await rail.getByRole("button", { name: /^Soccer practice/ }).click();
    const scope = p.getByRole("dialog", { name: "Change repeating activity" });
    await scope.waitFor();
    await shot(p, "scope-dialog-change-repeating", "'Change repeating activity' scope dialog from the Day rail: Change only Tue, Oct 13 / Change all Tuesday practices / Cancel");
    await scope.getByRole("button", { name: /^Change only/ }).click();
    const edit = p.getByRole("dialog", { name: /^Edit / });
    await edit.waitFor();
    await shot(p, "activity-sheet-from-rail", "Activity sheet (Edit Tuesday practice) after choosing Change only this date");
    await edit.getByLabel("Starts").fill("17:00");
    await edit.getByLabel("Ends").fill("18:30");
    await edit.getByRole("button", { name: "Save changes" }).click();
    await p.waitForTimeout(600);
    await clearToasts(p);
    await rail.getByRole("button", { name: /^School/ }).click();
    await p.getByRole("dialog").waitFor();
    await shot(p, "school-day-sheet-from-rail", "School day sheet opened from the Day rail");
    await closeAll(p);
    await settle(p);
    await shot(p, "plan-stale-moved", "Now card after practice moved: 'Soccer practice moved to 5:00 PM. Update your snack time?' Update/Keep");
  });

  // 4. Water (oz and ml).
  await scenario(cap, 150, "water", async (opened) => {
    const p = await opener(opened)(D(2026, 10, 13, 13, 30));
    await seed(p, baseDoc(), "today");
    const water = p.getByRole("region", { name: /^Water today/ });
    await water.scrollIntoViewIfNeeded();
    await shot(p, "water-oz-empty", "Water today: 0 oz with +8 +16 +24 Custom", { kind: "fold" });
    await water.getByRole("button", { name: "+16" }).click();
    await p.waitForTimeout(250);
    await water.scrollIntoViewIfNeeded();
    await shot(p, "water-oz-16-toast", "Water after +16: 16 oz and a toast with Undo", { kind: "fold", wait: 100 });
    await water.getByRole("button", { name: "Custom" }).click();
    await p.getByRole("dialog", { name: "Add water" }).waitFor();
    await shot(p, "water-custom-dialog", "Add water dialog (Custom)");
    await p.getByRole("dialog", { name: "Add water" }).getByRole("spinbutton").fill("0").catch(() => {});
    await p.getByRole("dialog", { name: "Add water" }).getByRole("button", { name: /Add|Save/ }).last().click().catch(() => {});
    await p.waitForTimeout(300);
    await shot(p, "water-custom-dialog-error", "Add water dialog after an invalid amount");
    const p2 = await opener(opened)(D(2026, 10, 13, 13, 30));
    const doc = baseDoc();
    dataOf(doc).profile.units = "ml";
    dataOf(doc).dailyLogs["2026-10-13"] = { entries: [], water: 500 };
    await seed(p2, doc, "today");
    const w2 = p2.getByRole("region", { name: /^Water today/ });
    await w2.scrollIntoViewIfNeeded();
    await shot(p2, "water-ml", "Water row in ml units with 500 ml logged", { kind: "fold" });
    await shot(p2, "page-ml-units", "Today with units set to ml", { kind: "full" });
  });

  // 5. Tonight card.
  await scenario(cap, 160, "tonight", async (opened) => {
    const p = await opener(opened)(D(2026, 10, 13, 19, 30));
    await seed(p, baseDoc(), "today");
    const tonight = p.getByRole("region", { name: "Tonight", exact: true });
    await tonight.scrollIntoViewIfNeeded();
    await shot(p, "tonight-card-unbuilt", "Tonight card: Tomorrow, Oct 14, practice row, Build tomorrow's list", { kind: "fold" });
    await primary(p).click();
    await p.waitForTimeout(400);
    await tonight.scrollIntoViewIfNeeded();
    await shot(p, "tonight-card-built", "Tonight card after Build tomorrow's list: checklist and toast");
    await tonight.getByRole("checkbox").first().click();
    await p.waitForTimeout(300);
    await shot(p, "tonight-card-1-done", "Tonight checklist with one item ticked", { kind: "fold" });
    const p2 = await opener(opened)(D(2026, 10, 16, 19, 30));
    await seed(p2, baseDoc(), "today");
    await shot(p2, "tonight-before-game-day", "Fri 7:30 PM: Tonight card for Saturday's away game (Game day badge)");
  });

  // 6. Prompt slot: reminder offer, backup nudge, Monday card.
  await scenario(cap, 170, "prompts", async (opened) => {
    const p = await opener(opened)(D(2026, 10, 13, 9, 30));
    await seed(p, baseDoc(), "today");
    const offer = p.getByRole("complementary", { name: "Reminders" });
    await offer.scrollIntoViewIfNeeded();
    await shot(p, "prompt-reminder-offer", "Prompt slot: 'Get a heads-up 60 min before practice?' Turn on / Not now", { kind: "fold" });
    await offer.getByRole("button", { name: "Not now" }).click();
    await p.waitForTimeout(300);
    await shot(p, "prompt-reminder-dismissed-toast", "After Not now: prompt gone, toast", { kind: "fold", wait: 50 });
    const p2 = await opener(opened)(D(2026, 10, 13, 9, 30));
    const doc = baseDoc({ backupDaysAgo: 40 });
    await seed(p2, doc, "today");
    const nudge = p2.locator(".today-prompt").first();
    await nudge.scrollIntoViewIfNeeded().catch(() => {});
    await shot(p2, "prompt-backup-nudge", "Prompt slot: backup nudge 'Last backup 40 days ago. Save a backup file?'", { kind: "fold" });
    const p3 = await opener(opened)(D(2026, 10, 19, 7, 0));
    await seed(p3, baseDoc({ backupDaysAgo: -4 }), "today");
    const mon = p3.getByRole("complementary", { name: "Last week" });
    await mon.scrollIntoViewIfNeeded().catch(() => {});
    await shot(p3, "prompt-monday-last-week", "Monday 7:00 AM: Last week card in the prompt slot", { kind: "fold" });
    await shot(p3, "monday-full", "Monday Today page with Last week card", { kind: "full" });
  });
}
