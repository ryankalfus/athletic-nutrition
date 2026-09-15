// Playwright CLI helper for schedule CRUD, recurrence scope, and school exceptions.
async (page) => {
  const context = await page.context().browser().newContext();
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  try {
    await p.goto("http://127.0.0.1:5173/");
    await p
      .getByRole("textbox", { name: "First name Optional" })
      .fill("Schedule test");
    await p
      .getByRole("button", { name: "Save and see today", exact: false })
      .click();
    await p.getByRole("heading", { name: "Today, Schedule test" }).waitFor();
    await p.goto("http://127.0.0.1:5173/#/calendar");
    await p.getByRole("button", { name: "Agenda" }).click();
    await p.getByRole("button", { name: "+ Add" }).click();
    await p
      .getByRole("textbox", { name: "Activity name" })
      .fill("Practice test");
    await p.getByRole("textbox", { name: "Ends" }).fill("15:00");
    await p
      .getByRole("button", { name: "Add to calendar", exact: false })
      .click();
    if (
      !(await p.getByRole("dialog").innerText()).includes(
        "Overnight events are not supported",
      )
    )
      throw new Error("Invalid event time accepted");
    result.checks.push("Invalid and overnight event times rejected.");
    await p.getByRole("textbox", { name: "Ends" }).fill("17:30");
    await p.getByRole("button", { name: "Away", exact: true }).click();
    await p.getByRole("spinbutton", { name: /Travel time/ }).fill("25");
    await p.getByRole("button", { name: "Every week" }).click();
    await p
      .getByRole("button", { name: "Add to calendar", exact: false })
      .click();
    await p.getByRole("heading", { name: "Practice test" }).waitFor();
    if (
      !(await p.locator(".agenda-event").innerText())
        .toLowerCase()
        .includes("weekly series through")
    )
      throw new Error("Weekly scope/end date missing");
    result.checks.push(
      "Weekly away practice saved with travel and visible series end date.",
    );
    await p.getByRole("button", { name: /Skip Practice test on/ }).click();
    await p.getByRole("button", { name: "Restore this day" }).waitFor();
    await p.getByRole("button", { name: "Restore this day" }).click();
    await p.getByRole("heading", { name: "Practice test" }).waitFor();
    result.checks.push("Single recurring occurrence skipped and restored.");
    await p.getByRole("button", { name: "Edit Practice test series" }).click();
    if (
      !(await p.getByRole("dialog").innerText()).includes(
        "changes affect every occurrence",
      )
    )
      throw new Error("Series edit scope unclear");
    await p
      .getByRole("button", { name: "Close Edit series", exact: false })
      .click();
    p.once("dialog", (dialog) => dialog.dismiss());
    await p
      .getByRole("button", { name: "Delete Practice test series" })
      .click();
    await p.getByRole("heading", { name: "Practice test" }).waitFor();
    p.once("dialog", (dialog) => dialog.accept());
    await p
      .getByRole("button", { name: "Delete Practice test series" })
      .click();
    await p
      .getByRole("heading", { name: "Practice test" })
      .waitFor({ state: "hidden" });
    result.checks.push(
      "Series deletion requires confirmation and can be cancelled.",
    );
    await p.getByRole("button", { name: /School/ }).click();
    await p
      .getByRole("button", { name: "Save school schedule", exact: false })
      .click();
    await p
      .getByRole("heading", { name: "School", exact: true, level: 3 })
      .waitFor();
    await p.getByRole("button", { name: /Cancel school on/ }).click();
    await p.getByRole("button", { name: "Restore", exact: true }).waitFor();
    await p.getByRole("button", { name: "Restore", exact: true }).click();
    await p
      .getByRole("heading", { name: "School", exact: true, level: 3 })
      .waitFor();
    result.checks.push(
      "School schedule and single-day cancellation/restoration work.",
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
