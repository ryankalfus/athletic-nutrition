// Playwright snippet: schedule week view, activity validation, repeating scope prompts, school day skip/restore.
// Everything is relative to today, so it works on any date.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page.context().browser().newContext();
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  const pad = (n) => String(n).padStart(2, "0");
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    now,
  );
  const inYear = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  // Today's column in the week view is the only day heading ending in "· Today".
  const today = () =>
    p.getByRole("region", { name: /· Today$/ });
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
    await p.getByRole("heading", { name: /· Today$/, level: 2 }).waitFor();
    result.checks.push("Schedule opens in Week view with today marked.");

    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    const sheet = p.getByRole("dialog", { name: "Add practice" });
    await sheet.getByRole("textbox", { name: "Name" }).fill("Practice test");
    await sheet.getByLabel("Ends").fill("15:00");
    await sheet.getByRole("button", { name: "Add practice", exact: true }).click();
    await sheet
      .getByText("Overnight events are not supported", { exact: false })
      .waitFor();
    if ((await sheet.getByLabel("Ends").getAttribute("aria-invalid")) !== "true")
      throw new Error("The Ends field is not marked invalid (A11Y-09)");
    result.checks.push("An end time before the start is rejected with the overnight message.");

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
    await sheet.getByRole("button", { name: "Add practice", exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
    await rows("Practice test").first().waitFor();
    if (!(await today().innerText()).includes("Away · Leave by 3:35 PM"))
      throw new Error("Away practice with travel time is not on today");
    result.checks.push(
      "A weekly away practice with 25 min travel shows on today with Leave by 3:35 PM.",
    );

    await actions("Practice test");
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
    await p.locator(".agenda-event").filter({ hasText: "Practice test" }).waitFor();
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
      "Deleting a repeating practice asks for scope, can be closed, and 'all' removes the series.",
    );

    await p.getByRole("button", { name: "School day", exact: true }).click();
    const school = p.getByRole("dialog", { name: "School day" });
    await school.getByLabel("School year starts").fill(inYear(-30));
    await school.getByLabel("School year ends").fill(inYear(120));
    const day = school.getByRole("button", { name: weekday, exact: true });
    if ((await day.getAttribute("aria-pressed")) !== "true") await day.click();
    await school.getByRole("button", { name: "Save school day" }).click();
    await school.waitFor({ state: "hidden" });
    await today().getByText("School", { exact: true }).waitFor();
    await actions("School");
    await today().getByRole("menuitem", { name: "Skip this day" }).click();
    await p
      .locator(`.schedule-week-day`)
      .filter({ hasText: "· Today" })
      .getByText("No school")
      .first()
      .waitFor();
    await p.getByRole("radio", { name: "Month" }).click();
    await p.getByText("No school this day.").waitFor();
    await p.getByRole("button", { name: "Restore", exact: true }).click();
    await p.getByText("No school this day.").waitFor({ state: "hidden" });
    await p.getByRole("radio", { name: "Week" }).click();
    await today().getByText("School", { exact: true }).waitFor();
    result.checks.push(
      `School day saves, today (${todayKey}) can be skipped to No school, and Month view restores it.`,
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
