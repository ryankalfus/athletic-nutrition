// Playwright snippet: schedule week view, activity validation, repeating scope prompts, school day skip/restore.
// The clock is fixed to Sunday 2026-10-11 10:00, so the 4:00 PM practice is
// later today and today is the last row of the week list: its row menu opens
// near the bottom of the window (the case that once closed the menu).
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page.context().browser().newContext();
  const now = new Date(2026, 9, 11, 10, 0, 0);
  await context.clock.setFixedTime(now);
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  const pad = (n) => String(n).padStart(2, "0");
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    now,
  );
  const inYear = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  // Today's day in the week view is the only heading with the Today badge.
  const today = () => p.getByRole("region", { name: / Today$/ });
  const rows = (title) =>
    p.locator("article.schedule-week-row").filter({ hasText: title });
  const actions = async (title) => {
    const menu = today()
      .getByRole("button", { name: `Actions for ${title}`, exact: true })
      .first();
    // Only open the menu if it is closed.
    if ((await menu.getAttribute("aria-expanded")) !== "true")
      await menu.click();
  };
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Schedule test");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await p.goto(`${base}#/schedule`);
    await p.getByRole("heading", { name: "Schedule", level: 1 }).waitFor();
    if (
      !(await p
        .getByRole("radio", { name: "Week" })
        .getAttribute("aria-checked"))
    )
      throw new Error("Week view is not the default");
    // An empty week is one empty state (TS-20), not seven empty cards.
    await p
      .getByRole("heading", { name: "Nothing scheduled this week" })
      .waitFor();
    if (await p.locator(".schedule-week-day, .schedule-empty-days").count())
      throw new Error("An empty week still lists its days");
    result.checks.push(
      "Schedule opens in Week view; an empty week shows one empty state.",
    );

    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    const sheet = p.getByRole("dialog", { name: "Add practice" });
    await sheet.getByRole("textbox", { name: "Name" }).fill("Practice test");
    await sheet.getByLabel("Ends").fill("15:00");
    await sheet
      .getByRole("button", { name: "Add practice", exact: true })
      .click();
    await sheet
      .getByText("Overnight events are not supported", { exact: false })
      .waitFor();
    if (
      (await sheet.getByLabel("Ends").getAttribute("aria-invalid")) !== "true"
    )
      throw new Error("The Ends field is not marked invalid (A11Y-09)");
    result.checks.push(
      "An end time before the start is rejected with the overnight message.",
    );

    await sheet.getByLabel("Ends").fill("17:30");
    await sheet.getByRole("button", { name: "Away", exact: true }).click();
    await sheet.getByRole("spinbutton", { name: /Travel time/ }).fill("25");
    await sheet.getByText("Leave by 3:35 PM").waitFor();
    await sheet.getByRole("button", { name: "Every week" }).click();
    if (
      (await sheet
        .getByRole("button", { name: weekday, exact: true })
        .getAttribute("aria-pressed")) !== "true"
    )
      throw new Error("Repeat does not default to today's weekday");
    await sheet
      .getByRole("button", { name: "Add practice", exact: true })
      .click();
    await sheet.waitFor({ state: "hidden" });
    await rows("Practice test").first().waitFor();
    await p.getByRole("heading", { name: / Today$/, level: 2 }).waitFor();
    if (!(await today().innerText()).includes("Away · Leave by 3:35 PM"))
      throw new Error("Away practice with travel time is not on today");
    result.checks.push(
      "A weekly away practice with 25 min travel shows on today with Leave by 3:35 PM.",
    );

    await actions("Practice test");
    // The open menu holds still: same place over six animation frames.
    const tops = await p.evaluate(
      () =>
        new Promise((resolve) => {
          const seen = [];
          const sample = () => {
            const menu = document.querySelector(".row-menu-items");
            seen.push(
              menu ? Math.round(menu.getBoundingClientRect().top) : null,
            );
            if (seen.length < 6) requestAnimationFrame(sample);
            else resolve(seen);
          };
          requestAnimationFrame(sample);
        }),
    );
    if (tops.includes(null) || new Set(tops).size !== 1)
      throw new Error(`Row menu near the bottom is not stable: ${tops}`);
    const menuBox = await today().getByRole("menu").boundingBox();
    if (menuBox.y < 0 || menuBox.y + menuBox.height > 720)
      throw new Error("Row menu near the bottom leaves the window");
    result.checks.push(
      "A row menu opened near the bottom of the window stays put and in view.",
    );
    await today().getByRole("menuitem", { name: "Edit" }).click();
    const scope = p.getByRole("dialog", { name: "Change repeating activity" });
    await scope
      .getByRole("button", { name: `Change all ${weekday} practices` })
      .waitFor();
    await scope.getByRole("button", { name: /^Change only / }).click();
    const edit = p.getByRole("dialog", { name: /^Edit .* practice$/ });
    await edit.getByText(/^Changing .* only\.$/).waitFor();
    await edit.getByRole("button", { name: "Cancel" }).click();
    await edit.waitFor({ state: "hidden" });
    result.checks.push(
      "Editing a repeating practice asks for scope; 'only this date' edits one day.",
    );

    await actions("Practice test");
    await today().getByRole("menuitem", { name: "Skip this day" }).click();
    await today().getByText("Practice test").waitFor({ state: "hidden" });
    await p.getByRole("radio", { name: "Month" }).click();
    await p.getByRole("button", { name: "Restore this day" }).click();
    await rows("Practice test").first().waitFor();
    await p.getByRole("radio", { name: "Week" }).click();
    await today().getByText("Practice test").waitFor();
    result.checks.push(
      "Skip this day hides one occurrence; Month view restores it.",
    );

    await actions("Practice test");
    await today().getByRole("menuitem", { name: "Delete…" }).click();
    const del = p.getByRole("dialog", { name: "Delete repeating activity" });
    await del.getByRole("button", { name: /^Close/ }).click();
    await del.waitFor({ state: "hidden" });
    await today().getByText("Practice test").waitFor();
    await actions("Practice test");
    await today().getByRole("menuitem", { name: "Delete…" }).click();
    await del
      .getByRole("button", { name: `Delete all ${weekday} practices` })
      .click();
    await del.waitFor({ state: "hidden" });
    await today().getByText("Practice test").waitFor({ state: "hidden" });
    if (await rows("Practice test").count())
      throw new Error("Series delete left occurrences");
    result.checks.push(
      `Deleting a repeating practice asks for scope and can be closed; on a ${weekday}-only series "Delete all ${weekday} practices" removes it.`,
    );

    await p.getByRole("button", { name: /^(Edit|Set up) school day$/ }).click();
    const school = p.getByRole("dialog", { name: "School day" });
    await school.getByLabel("School year starts").fill(inYear(-30));
    await school.getByLabel("School year ends").fill(inYear(120));
    const day = school.getByRole("button", { name: weekday, exact: true });
    if ((await day.getAttribute("aria-pressed")) !== "true") await day.click();
    await school.getByRole("button", { name: "Save school day" }).click();
    await school.waitFor({ state: "hidden" });
    // COPY-29: the agenda row reads "School day".
    await today().getByText("School day", { exact: true }).waitFor();
    await actions("School day");
    await today().getByRole("menuitem", { name: "Skip this day" }).click();
    // A skipped school day with nothing else reads "Day off" in its row.
    await p
      .locator(".schedule-empty-days li")
      .filter({ hasText: "Today" })
      .getByText("Day off", { exact: true })
      .waitFor();
    await p.getByRole("radio", { name: "Month" }).click();
    await p.getByText("No school this day.").waitFor();
    await p.getByRole("button", { name: "Restore", exact: true }).click();
    await p.getByText("No school this day.").waitFor({ state: "hidden" });
    await p.getByRole("radio", { name: "Week" }).click();
    await today().getByText("School day", { exact: true }).waitFor();
    result.checks.push(
      `School day saves, today (${todayKey}) can be skipped to No school, and Month view restores it.`,
    );

    // ACT-02 / ACT-03 / SCH-09 on a Mon–Fri series next week (Oct 12–16).
    const until = async (test, message) => {
      for (let i = 0; i < 60; i++) {
        if (await test()) return;
        await p.waitForTimeout(100);
      }
      throw new Error(message);
    };
    const dayOf = (label) =>
      p.getByRole("region", { name: label, exact: true });
    const week = {
      Monday: "Mon, Oct 12",
      Tuesday: "Tue, Oct 13",
      Wednesday: "Wed, Oct 14",
      Thursday: "Thu, Oct 15",
      Friday: "Fri, Oct 16",
    };
    const practiceTimes = async () => {
      const out = {};
      for (const [name, label] of Object.entries(week)) {
        const row = dayOf(label)
          .locator("article.schedule-week-row")
          .filter({ hasText: "Soccer practice" });
        out[name] = (await row.count())
          ? (await row.locator(".schedule-week-time").innerText()).trim()
          : null;
      }
      return out;
    };
    await p.getByRole("button", { name: /^Next week/ }).click();
    await p
      .getByRole("button", { name: `Add activity on ${week.Monday}` })
      .click();
    const add = p.getByRole("dialog", { name: "Add practice" });
    // A plain "Practice" reads "Soccer practice" once the sport is set.
    await add.getByRole("textbox", { name: "Name" }).fill("Practice");
    await add.getByRole("button", { name: "Every week" }).click();
    for (const name of ["Tuesday", "Wednesday", "Thursday", "Friday"])
      await add.getByRole("button", { name, exact: true }).click();
    await add
      .getByRole("button", { name: "Add practice", exact: true })
      .click();
    await add.waitFor({ state: "hidden" });
    await dayOf(week.Friday).getByText("Soccer practice").waitFor();
    const all = "4:00 PM–5:30 PM";
    let times = await practiceTimes();
    if (Object.values(times).some((time) => time !== all))
      throw new Error(
        `Mon–Fri series not on every weekday: ${JSON.stringify(times)}`,
      );
    if (
      await p
        .locator("article.schedule-week-row strong")
        .filter({ hasText: /^Practice$/ })
        .count()
    )
      throw new Error("A Schedule row shows the raw title Practice (SCH-09)");
    result.checks.push(
      "SCH-09: a Mon–Fri series named Practice reads Soccer practice in every row.",
    );

    // ACT-03: "Delete all Friday practices" removes Fridays only; Undo restores.
    await dayOf(week.Friday)
      .getByRole("button", { name: "Actions for Soccer practice", exact: true })
      .click();
    await dayOf(week.Friday).getByRole("menuitem", { name: "Delete…" }).click();
    await del.getByText("Soccer practice repeats.").waitFor();
    await del
      .getByRole("button", { name: "Delete all Friday practices" })
      .click();
    await del.waitFor({ state: "hidden" });
    await until(
      async () => (await practiceTimes()).Friday === null,
      "Friday practice still shows after Delete all Friday practices",
    );
    times = await practiceTimes();
    for (const name of ["Monday", "Tuesday", "Wednesday", "Thursday"])
      if (times[name] !== all)
        throw new Error(
          `Delete all Friday practices removed ${name}: ${JSON.stringify(times)}`,
        );
    await p.getByRole("button", { name: "Undo", exact: true }).click();
    await until(
      async () => (await practiceTimes()).Friday === all,
      "Undo did not bring Friday back",
    );
    result.checks.push(
      "ACT-03: Delete all Friday practices removes Fridays only; Mon–Thu stay; Undo restores Friday.",
    );

    // ACT-02: "Change all Tuesday practices" changes Tuesdays only.
    await dayOf(week.Tuesday)
      .getByRole("button", { name: "Actions for Soccer practice", exact: true })
      .click();
    await dayOf(week.Tuesday).getByRole("menuitem", { name: "Edit" }).click();
    const change = p.getByRole("dialog", { name: "Change repeating activity" });
    await change.getByText("Soccer practice repeats.").waitFor();
    await change
      .getByRole("button", { name: "Change all Tuesday practices" })
      .click();
    const tue = p.getByRole("dialog", { name: "Edit Tuesday practice" });
    await tue
      .getByText("Changing all Tuesday practices.", { exact: false })
      .waitFor();
    await tue.getByLabel("Starts").fill("17:00");
    await tue.getByLabel("Ends").fill("18:00");
    await tue.getByRole("button", { name: "Save changes" }).click();
    await tue.waitFor({ state: "hidden" });
    await until(
      async () => (await practiceTimes()).Tuesday === "5:00 PM–6:00 PM",
      "Tuesday did not change",
    );
    times = await practiceTimes();
    for (const name of ["Monday", "Wednesday", "Thursday", "Friday"])
      if (times[name] !== all)
        throw new Error(
          `Change all Tuesday practices changed ${name}: ${JSON.stringify(times)}`,
        );
    // The following Tuesday follows the change; the following Monday does not.
    await p.getByRole("button", { name: /^Next week/ }).click();
    await dayOf("Tue, Oct 20").getByText("5:00 PM–6:00 PM").waitFor();
    await dayOf("Mon, Oct 19").getByText(all).waitFor();
    result.checks.push(
      "ACT-02: Change all Tuesday practices moves Tuesdays to 5:00 PM; Mon, Wed, Thu, Fri stay at 4:00 PM.",
    );
    return result;
  } catch (e) {
    return {
      ...result,
      failure: e.message,
      last: await p.locator("body").innerText(),
    };
  } finally {
    await context.close();
  }
};
