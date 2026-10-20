// Playwright snippet: team calendar import and weekly rest days (P2-01 to P2-03).
// - A TeamSnap .ics (America/Chicago, 20 events) previews and imports with
//   local times in America/Phoenix, which keeps one offset while Chicago
//   leaves DST on Nov 1: 5:00 PM practices read 3:00 PM, then 4:00 PM.
// - A second import adds no duplicates.
// - A webcal link imports through /api/calendar (mocked here; the SSRF guard
//   is covered by tests/calendar-fetch.test.js) and refreshes on app open.
// - Weekly rest days show REST on Today with no daily tap, and "Undo rest
//   day" changes only today.
// The clock is Sunday 2026-10-11 10:00 in Phoenix.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const AxeBuilder = globalThis.AxeBuilder;
  const context = await page
    .context()
    .browser()
    .newContext({
      timezoneId: "America/Phoenix",
      viewport: { width: 390, height: 844 },
    });
  await context.clock.setFixedTime(new Date("2026-10-11T10:00:00-07:00"));
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  const axe = async (where) => {
    if (!AxeBuilder) return;
    await p.waitForTimeout(250);
    const { violations } = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = violations.filter((v) =>
      ["serious", "critical"].includes(v.impact),
    );
    if (serious.length)
      throw new Error(
        `axe on ${where}: ${serious.map((v) => `${v.id} (${v.nodes[0]?.target})`).join(", ")}`,
      );
  };
  const feedText = async (name) =>
    (await context.request.get(`${base}tests/fixtures/${name}`)).text();
  const teamsnap = "tests/fixtures/teamsnap-lightning-u14.ics";
  const openImport = async () => {
    await p.getByRole("button", { name: "Import team calendar" }).click();
    return p.getByRole("dialog", { name: "Import team calendar" });
  };
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Sofia");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await p.goto(`${base}#/schedule`);
    await p.getByRole("heading", { name: "Schedule", level: 1 }).waitFor();

    // --- P2-01: file import preview ---
    let sheet = await openImport();
    await axe("import sheet, first step");
    await sheet.getByLabel("Calendar file (.ics)").setInputFiles(teamsnap);
    await sheet.getByText("20 upcoming events").waitFor();
    const rows = sheet.locator("li.import-row");
    if ((await rows.count()) !== 20)
      throw new Error(`Preview lists ${await rows.count()} events, not 20`);
    const row = (title, date) =>
      rows.filter({ hasText: title }).filter({ hasText: date });
    await row("Lightning U14 Practice", "Thu, Oct 29")
      .getByText("3:00 PM–4:30 PM")
      .waitFor();
    await row("Lightning U14 Practice", "Tue, Nov 3")
      .getByText("4:00 PM–5:30 PM")
      .waitFor();
    const select = (label) => sheet.getByRole("combobox", { name: label });
    const hawks = "Lightning U14 vs. Hawks FC (Home), Sat, Oct 17";
    const rockets = "Lightning U14 at Rockets SC (Away), Sat, Oct 24";
    if ((await select(`Type for ${hawks}`).inputValue()) !== "game")
      throw new Error("The home game is not guessed as a game");
    if ((await select(`Where for ${rockets}`).inputValue()) !== "away")
      throw new Error("The away game is not guessed as Away");
    if (
      (await select(
        "Type for End of season party, Sun, Nov 15",
      ).inputValue()) !== "other"
    )
      throw new Error("The party is not guessed as Other");
    result.checks.push(
      "The TeamSnap file previews 20 events in Phoenix time (3:00 PM before Chicago's DST change, 4:00 PM after) with game/practice/other and Home/Away guesses.",
    );
    await axe("import preview");
    // Leave one out and change one type.
    await row("Team photos", "Mon, Oct 19").getByRole("checkbox").uncheck();
    await select("Type for Team meeting, Sun, Oct 18").selectOption("practice");
    await sheet.getByRole("button", { name: "Import 19 events" }).click();
    await p
      .locator(".app-toast")
      .getByText("Added 19 events from Lightning U14 Girls.")
      .waitFor();
    await sheet.waitFor({ state: "detached" });
    // Week view, next week: Tue Oct 13 practice at 3:00 PM, flagged.
    await p.getByRole("button", { name: /^Next week/ }).click();
    const tuesday = p.getByRole("region", { name: /Tue, Oct 13/ });
    await tuesday.getByText("3:00 PM–4:30 PM").waitFor();
    await tuesday.getByText("From team calendar", { exact: false }).waitFor();
    const sunday = p.getByRole("region", { name: /Sun, Oct 18/ });
    await sunday.getByText("Team meeting").waitFor();
    result.checks.push(
      "Import adds the 19 chosen events; rows show local times and From team calendar.",
    );

    // --- P2-01: a second import adds no duplicates ---
    sheet = await openImport();
    await sheet.getByLabel("Calendar file (.ics)").setInputFiles(teamsnap);
    await sheet.getByText("19 are already in your schedule.").waitFor();
    if (
      (await rows.filter({ hasText: "Already in your schedule" }).count()) !==
      19
    )
      throw new Error("The second preview does not flag 19 duplicates");
    await sheet.getByRole("button", { name: "Import 1 event" }).click();
    await sheet.waitFor({ state: "detached" });
    sheet = await openImport();
    await sheet.getByLabel("Calendar file (.ics)").setInputFiles(teamsnap);
    // UX-FLOW-05 / UX-BUG-13: nothing new says so and ends with an
    // enabled Done that closes the sheet (no Back, no disabled button).
    await sheet
      .getByText("Everything in this calendar is already in your schedule.")
      .waitFor();
    const footer = sheet.locator(".schedule-form-footer");
    if ((await footer.getByRole("button").allInnerTexts()).join() !== "Done")
      throw new Error("A third import still offers more than Done");
    const doneButton = footer.getByRole("button", {
      name: "Done",
      exact: true,
    });
    if (await doneButton.isDisabled()) throw new Error("Done is disabled");
    await doneButton.click();
    await sheet.waitFor({ state: "detached" });
    await p.getByRole("button", { name: /^Next week/ }).click();
    if (
      (await p
        .getByRole("region", { name: /Tue, Oct 20/ })
        .getByText("Lightning U14 Practice")
        .count()) !== 1
    )
      throw new Error("Tue, Oct 20 has a duplicate practice");
    result.checks.push(
      "A second import of the same file flags 19 duplicates and adds only the one left out; a third says “Everything in this calendar is already in your schedule.” and an enabled Done closes it (UX-BUG-13).",
    );

    // --- P2-02: subscription link through the server, refresh on open ---
    let feed = await feedText("gamechanger-tigers-14u.ics");
    const asked = [];
    await p.route("**/api/calendar?**", async (route) => {
      asked.push(new URL(route.request().url()).searchParams.get("url"));
      await route.fulfill({ json: { ics: feed } });
    });
    sheet = await openImport();
    await sheet.getByRole("radio", { name: "Link" }).click();
    await sheet
      .getByRole("textbox", { name: "Calendar link" })
      .fill("webcal://api.team-manager.gc.com/ics/tigers-14u.ics");
    if (
      !(await sheet
        .getByRole("switch", { name: /Keep this calendar updated/ })
        .isChecked())
    )
      throw new Error("Keep this calendar updated is not on by default");
    await sheet.getByRole("button", { name: "Preview" }).click();
    await sheet.getByText("from Tigers 14U Baseball").waitFor();
    await rows
      .filter({ hasText: "Fall Classic Tournament" })
      .getByText("No start time")
      .waitFor();
    if (asked[0] !== "webcal://api.team-manager.gc.com/ics/tigers-14u.ics")
      throw new Error(`The server was asked for ${asked[0]}`);
    await sheet.getByRole("button", { name: /^Import \d+ events$/ }).click();
    await sheet.waitFor({ state: "detached" });
    await p
      .locator(".calendar-links")
      .getByText("Tigers 14U Baseball")
      .waitFor();
    await p.getByText("Updated 10:00 AM").waitFor();
    // The feed moves the Eagles game from 10:00 to 11:00 AM; reopening the
    // app refreshes it without a tap.
    feed = feed
      .replace("DTSTART:20261017T170000Z", "DTSTART:20261017T180000Z")
      .replace("DTEND:20261017T190000Z", "DTEND:20261017T200000Z");
    const before = asked.length;
    await p.reload();
    await p
      .locator(".app-toast")
      .getByText("Team calendar updated: 1 event changed.")
      .waitFor();
    if (asked.length !== before + 1)
      throw new Error("Opening the app did not refresh the link once");
    await p.getByRole("button", { name: /^Next week/ }).click();
    const saturday = p.getByRole("region", { name: /Sat, Oct 17/ });
    await saturday.getByText("11:00 AM–1:00 PM").waitFor();
    result.checks.push(
      "A webcal link imports through /api/calendar, is kept on the athlete, and refreshes on app open (the moved game shows 11:00 AM).",
    );

    // --- P2-03: weekly rest days ---
    await p.getByRole("button", { name: "Go to today" }).click();
    await p.getByRole("button", { name: "Set rest days" }).click();
    const rest = p.getByRole("dialog", { name: "Rest days" });
    await axe("rest days sheet");
    await rest.getByRole("button", { name: "Sunday" }).click();
    await rest.getByRole("button", { name: "Save" }).click();
    await rest.waitFor({ state: "detached" });
    await p.getByText("Every Sun").waitFor();
    await p
      .locator(".schedule-empty-days li, .schedule-week-day")
      .filter({ hasText: "Sun, Oct 11" })
      .getByText("Rest day")
      .waitFor();
    await p.goto(`${base}#/today`);
    await p.getByText("Rest day — keep regular meals").waitFor();
    result.checks.push(
      "Rest days Sun: Schedule marks Sunday and Today shows the REST state with no daily tap.",
    );
    await p.getByRole("button", { name: "Undo rest day" }).click();
    await p.locator(".app-toast").getByText("Rest day removed.").waitFor();
    if (await p.getByText("Rest day — keep regular meals").count())
      throw new Error("Undo rest day did not change today");
    // The weekly pattern itself is unchanged.
    await p.goto(`${base}#/schedule`);
    await p.getByText("Every Sun").waitFor();
    result.checks.push(
      "Undo rest day changes only today; the weekly pattern stays.",
    );
  } catch (error) {
    result.failure = error.message;
    result.last = await p
      .locator("body")
      .innerText()
      .catch(() => "");
  } finally {
    await context.close();
  }
  return result;
};
