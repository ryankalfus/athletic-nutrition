import { newPage, seed, settle, scenario, D, clearToasts, closeAll, fixturePath } from "../lib.mjs";
import { baseDoc, bareDoc, dataOf } from "../seeds.mjs";

export default async function ({ browser, pass, cap }) {
  const opener = (opened) => async (clock = D(2026, 10, 13, 10, 0)) => {
    const r = await newPage(browser, pass, { clock });
    opened.push(r.context);
    return r.page;
  };
  const shot = (p, state, note, o) => cap.shot(p, "schedule", state, note, o);
  const head = (p) => p.getByRole("heading", { name: "Schedule", level: 1 }).waitFor();
  const today = (p) => p.getByRole("region", { name: / Today$/ });

  // 1. Empty schedule.
  await scenario(cap, 200, "schedule empty", async (opened) => {
    const p = await opener(opened)();
    await seed(p, bareDoc(), "schedule");
    await head(p);
    await settle(p);
    await shot(p, "week-empty", "Schedule week view with no school and no activities: 'Nothing scheduled this week', Set school day");
    await p.getByRole("radio", { name: "Month" }).click();
    await settle(p, 300);
    await shot(p, "month-empty", "Schedule month view with nothing scheduled");
  });

  // 2. Week and month with a full schedule.
  await scenario(cap, 203, "schedule views", async (opened) => {
    const p = await opener(opened)();
    await seed(p, baseDoc(), "schedule");
    await head(p);
    await settle(p);
    await shot(p, "week", "Schedule week Oct 12–18: school Mon–Fri, practice Mon–Thu, away game Sat, This week at a glance");
    await p.getByRole("button", { name: /^Next week/ }).click();
    await settle(p, 300);
    await shot(p, "week-next", "Next week (Oct 19–25): repeating school and practices, no game; Today button to return");
    await p.getByRole("button", { name: /^Previous week/ }).click().catch(() => {});
    await p.getByRole("radio", { name: "Month" }).click();
    await settle(p, 300);
    await shot(p, "month", "Schedule month view, October 2026, with today's day panel");
    await p.locator("button[aria-pressed]").filter({ hasText: /^17/ }).first().click().catch(() => {});
    await settle(p, 300);
    await shot(p, "month-day-selected-game", "Month view with Sat Oct 17 selected: away game in the day panel");
    await p.getByRole("button", { name: "Next month" }).click();
    await settle(p, 300);
    await shot(p, "month-next", "Month view November 2026");
    await p.getByRole("radio", { name: "Week" }).click();
    await settle(p, 300);
    // Row menu.
    await today(p).getByRole("button", { name: "Actions for Soccer practice", exact: true }).click();
    await today(p).getByRole("menu").waitFor();
    await shot(p, "row-menu-practice", "Row menu for a repeating practice: Edit, Skip this day, Delete…");
    await p.keyboard.press("Escape");
    await today(p).getByRole("button", { name: /^Actions for School/ }).first().click();
    await shot(p, "row-menu-school", "School row menu: Edit, Skip this day", { kind: "fold" });
    await p.keyboard.press("Escape");
    await today(p).getByRole("button", { name: "Actions for Soccer practice", exact: true }).click();
    await today(p).getByRole("menuitem", { name: "Edit" }).click();
    await p.getByRole("dialog", { name: "Change repeating activity" }).waitFor();
    await shot(p, "scope-edit-repeating", "Change repeating activity dialog: Change only Tue, Oct 13 / Change all Tuesday practices / Cancel");
    await p.getByRole("button", { name: `Change all Tuesday practices` }).click();
    const edit = p.getByRole("dialog", { name: /^Edit / });
    await edit.waitFor();
    await shot(p, "activity-edit-sheet", "Edit Tuesday practice sheet (all Tuesdays)");
    await edit.getByText("More options").click();
    await settle(p, 300);
    await shot(p, "activity-edit-more-options", "Edit sheet with More options open (activity level, notes)");
    await edit.getByLabel("Starts").fill("16:30");
    await p.keyboard.press("Escape");
    await p.getByRole("dialog", { name: "Discard changes?" }).waitFor();
    await shot(p, "discard-changes-confirm", "'Discard changes?' confirm after Escape with an unsaved edit");
    await p.getByRole("dialog", { name: "Discard changes?" }).getByRole("button", { name: "Discard", exact: true }).click();
    await closeAll(p);
    await today(p).getByRole("button", { name: "Actions for Soccer practice", exact: true }).click();
    await today(p).getByRole("menuitem", { name: "Delete…" }).click();
    await p.getByRole("dialog", { name: "Delete repeating activity" }).waitFor();
    await shot(p, "scope-delete-repeating", "Delete repeating activity dialog: Delete only / Delete all Tuesday practices (danger styles)");
    await closeAll(p);
    await today(p).getByRole("button", { name: "Actions for Soccer practice", exact: true }).click();
    await today(p).getByRole("menuitem", { name: "Skip this day" }).click();
    await settle(p, 400);
    await shot(p, "skipped-day-toast", "After Skip this day on Tue practice: practice gone from Tue, toast with Undo");
    await clearToasts(p);
    await p.getByRole("radio", { name: "Month" }).click();
    await settle(p, 300);
    await shot(p, "month-skipped-restore", "Month day panel for Tue Oct 13 with a skipped practice and Restore this day");
    await p.getByRole("radio", { name: "Week" }).click();
    const sat = p.getByRole("region", { name: /Sat, Oct 17/ });
    await sat.getByRole("button", { name: /^Actions for Soccer game/ }).click();
    await sat.getByRole("menuitem", { name: "Delete" }).click();
    await p.waitForTimeout(400);
    await shot(p, "delete-single-confirm", "Confirm dialog for deleting the one-off Saturday game");
    await closeAll(p);
  });

  // 3. Add activity sheet, errors, overlap.
  await scenario(cap, 225, "add activity", async (opened) => {
    const p = await opener(opened)();
    await seed(p, baseDoc(), "schedule");
    await head(p);
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    const sheet = p.getByRole("dialog", { name: /^Add / });
    await sheet.waitFor();
    await shot(p, "add-sheet-default", "Add practice sheet: Type, Name, Date or days, Starts/Ends, Where, More options");
    await sheet.getByLabel("Ends").fill("15:00");
    await sheet.getByRole("button", { name: /^Add (practice|game|activity)$/ }).click();
    await p.waitForTimeout(300);
    await shot(p, "add-sheet-error", "Add sheet with Ends before Starts: inline error on Ends");
    await sheet.getByLabel("Ends").fill("17:30");
    await sheet.getByRole("button", { name: "Game", exact: true }).click().catch(() => {});
    await sheet.getByRole("button", { name: "Away", exact: true }).click();
    await sheet.getByRole("spinbutton", { name: /Travel time/ }).fill("30");
    await shot(p, "add-sheet-game-away", "Add sheet as a game, Away, travel time 30 min");
    await sheet.getByRole("button", { name: "Every week" }).click();
    await settle(p, 200);
    await shot(p, "add-sheet-every-week", "Add sheet with Every week chosen: weekday picker and repeat end");
    await closeAll(p);
    // Overlap confirm: one-day practice at the same time as Tue practice.
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    await sheet.waitFor();
    await sheet.getByRole("textbox", { name: "Name" }).fill("Extra skills");
    await sheet.getByLabel("Starts").fill("16:30");
    await sheet.getByLabel("Ends").fill("17:15");
    await sheet.getByRole("button", { name: /^Add (practice|game|activity)$/ }).click();
    await p.waitForTimeout(500);
    await shot(p, "overlap-confirm", "Overlapping activity confirm: 'This overlaps Soccer practice. Save anyway?'");
    await closeAll(p);
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    await sheet.waitFor();
    await sheet.getByRole("textbox", { name: "Name" }).fill("Film session");
    await sheet.getByLabel("Starts").fill("18:30");
    await sheet.getByLabel("Ends").fill("19:30");
    await sheet.getByRole("button", { name: /^Add (practice|game|activity)$/ }).click();
    await p.waitForTimeout(400);
    await shot(p, "added-toast", "Week after adding a one-day practice: new row on Tue and toast with Undo");
  });

  // 4. School day editor and rest days.
  await scenario(cap, 235, "school + rest", async (opened) => {
    const p = await opener(opened)();
    await seed(p, baseDoc(), "schedule");
    await head(p);
    await p.getByRole("button", { name: /^(Edit|Set up) school day$/ }).first().click().catch(async () => {
      await p.locator(".school-schedule-card").getByRole("button", { name: "Edit" }).click();
    });
    const school = p.getByRole("dialog", { name: "School day" });
    await school.waitFor();
    await shot(p, "school-editor", "School day sheet: name, school year, hours, days, lunch and snack times, food access");
    await school.getByLabel("School ends").fill("07:00");
    await school.getByRole("button", { name: "Save school day" }).click();
    await p.waitForTimeout(300);
    await shot(p, "school-editor-error", "School day sheet with end before start: error");
    await closeAll(p);
    await p.locator(".card").filter({ hasText: "Rest days" }).getByRole("button").first().click();
    const rest = p.getByRole("dialog", { name: "Rest days" });
    await rest.waitFor();
    await shot(p, "rest-days-sheet", "Rest days sheet: weekday picker");
    await rest.getByRole("button", { name: "Sunday", exact: true }).click();
    await rest.getByRole("button", { name: /^Save/ }).click();
    await p.waitForTimeout(400);
    await clearToasts(p);
    await shot(p, "week-with-rest-day", "Week with Sunday as a weekly rest day (Rest day label)");
    const p2 = await opener(opened)();
    const doc = bareDoc();
    await seed(p2, doc, "schedule");
    await p2.getByRole("button", { name: "Set school day" }).first().click();
    await p2.getByRole("dialog", { name: "School day" }).waitFor();
    await shot(p2, "school-editor-new", "School day sheet when no school day is set yet");
  });

  // 5. Team calendar import: file, duplicates, link.
  await scenario(cap, 245, "import", async (opened) => {
    const p = await opener(opened)(D(2026, 10, 9, 10, 0));
    const doc = baseDoc();
    dataOf(doc).schedule = [];
    await seed(p, doc, "schedule");
    await head(p);
    const open = async () => {
      await p.getByRole("button", { name: "Import team calendar" }).or(p.getByRole("button", { name: "Import", exact: true })).first().click();
      const s = p.getByRole("dialog", { name: "Import team calendar" });
      await s.waitFor();
      return s;
    };
    let sheet = await open();
    await shot(p, "import-sheet", "Import team calendar sheet: File / Link choice and file picker");
    await sheet.getByLabel("Calendar file (.ics)").setInputFiles(fixturePath("teamsnap-lightning-u14.ics"));
    await sheet.getByText(/upcoming events/).first().waitFor();
    await settle(p, 300);
    await shot(p, "import-file-preview", "Import preview of the TeamSnap file: event list with checkboxes, Import N events");
    await sheet.getByRole("button", { name: /^Import \d+ events?$/ }).click();
    await p.waitForTimeout(500);
    await shot(p, "import-done-toast", "Schedule after importing: imported events and a toast");
    await clearToasts(p);
    await p.getByRole("button", { name: /^Next week/ }).click();
    await settle(p, 300);
    await shot(p, "week-imported-events", "Next week with imported team events ('From team calendar')");
    sheet = await open();
    await sheet.getByLabel("Calendar file (.ics)").setInputFiles(fixturePath("teamsnap-lightning-u14.ics"));
    await sheet.getByText(/already in your schedule/).first().waitFor();
    await settle(p, 300);
    await shot(p, "import-duplicates", "Re-import of the same file: 'Everything in this calendar is already in your schedule.' with Done");
    await closeAll(p);
    sheet = await open();
    await sheet.getByRole("radio", { name: "Link" }).click();
    await shot(p, "import-link-empty", "Import sheet on Link: Calendar link field and Keep this calendar updated switch");
    await sheet.getByRole("textbox", { name: "Calendar link" }).fill("not a link");
    await sheet.getByRole("button", { name: "Preview" }).click();
    await p.waitForTimeout(400);
    await shot(p, "import-link-error", "Link import with an invalid link: error");
    await sheet.getByRole("textbox", { name: "Calendar link" }).fill("webcal://api.team-manager.gc.com/ics/tigers-14u.ics");
    await sheet.getByRole("button", { name: "Preview" }).click();
    await sheet.getByText(/from Tigers 14U Baseball/).waitFor();
    await settle(p, 300);
    await shot(p, "import-link-preview", "Link preview from Tigers 14U Baseball incl. a 'No start time' row");
    await sheet.getByRole("button", { name: /^Import \d+ events?$/ }).click();
    await sheet.waitFor({ state: "detached" });
    await settle(p, 300);
    await clearToasts(p);
    await shot(p, "team-calendar-subscribed", "Schedule with the Team calendar card listing Tigers 14U Baseball (Updated time)");
    await p.locator(".calendar-links").getByRole("button").first().click();
    await p.waitForTimeout(300);
    await shot(p, "team-calendar-menu", "Team calendar link menu open: Refresh, Stop updating", { kind: "fold" });
    await p.keyboard.press("Escape");
  });
}
