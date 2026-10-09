// Playwright snippet: shared dialog behaviour at 390 × 844 (DLG-01, DLG-02,
// A11Y-04, A11Y-09, A11Y-10, STATE-01, STATE-02, DS-11).
// - Content swaps inside a dialog (Log food and Add to groceries: a search
//   result opens the next step) move focus to the new step's first field.
// - "Add food for this week" and "Put these away?" ask "Discard changes?" on
//   Escape, × and Cancel once something changed.
// - Schedule writes toast what happened ("Practice added.", "Day skipped.").
// - A failed save shows its error just above the sheet's footer; "Try again"
//   repeats only that write and closes the sheet (one practice, not two).
// - An empty date or time in Add practice is the app's own field error.
// - The calendar's Today button is named "Go to today" in Week and Month.
// - "Undo trip" shows the busy spinner and aria-busy while it saves.
// The clock is fixed to Sunday 2026-10-11 10:00.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
    });
  await context.clock.setFixedTime(new Date(2026, 9, 11, 10, 0, 0));
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  const toast = (text) =>
    p.locator(".app-toast-region").getByText(text, { exact: true }).waitFor();
  const focused = () =>
    p.evaluate(() => {
      const node = document.activeElement;
      return {
        tag: node?.tagName.toLowerCase() || "",
        type: node?.getAttribute("type") || "",
        inDialog: Boolean(node?.closest("dialog[open]")),
        label: node?.closest("label")?.innerText.split("\n")[0] || "",
      };
    });
  const discardAsked = async (sheet, how) => {
    await how();
    const ask = p.getByRole("dialog", { name: "Discard changes?" });
    await ask.waitFor();
    await ask.getByRole("button", { name: "Keep editing" }).click();
    await ask.waitFor({ state: "hidden" });
    if (!(await sheet.isVisible()))
      throw new Error("Keep editing closed the sheet");
  };
  // Each guarded close path: Escape, ×, Cancel, then Discard really closes.
  const guarded = async (name) => {
    const sheet = p.getByRole("dialog", { name });
    await discardAsked(sheet, () => p.keyboard.press("Escape"));
    await discardAsked(sheet, () =>
      sheet.getByRole("button", { name: `Close ${name}` }).click(),
    );
    await discardAsked(sheet, () =>
      sheet.getByRole("button", { name: "Cancel", exact: true }).click(),
    );
    await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
    const ask = p.getByRole("dialog", { name: "Discard changes?" });
    await ask.getByRole("button", { name: "Discard", exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
  };
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Dialog test");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();

    // A11Y-10: one control named "Today" (the nav); the calendar's is "Go to today".
    await p.goto(`${base}#/schedule`);
    await p.getByRole("heading", { name: "Schedule", level: 1 }).waitFor();
    for (const view of ["Week", "Month"]) {
      await p.getByRole("radio", { name: view }).click();
      await p.getByRole("button", { name: "Go to today", exact: true }).click();
      const named =
        (await p.getByRole("button", { name: "Today", exact: true }).count()) +
        (await p.getByRole("link", { name: "Today", exact: true }).count());
      if (named !== 1)
        throw new Error(`${view} view has ${named} controls named "Today"`);
    }
    await p.getByRole("radio", { name: "Week" }).click();
    result.checks.push(
      'Week and Month name the calendar button "Go to today"; only the nav is named "Today" (A11Y-10).',
    );

    // A11Y-09: empty date and start time are app errors on the field.
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    const add = p.getByRole("dialog", { name: "Add practice" });
    const submit = add.getByRole("button", {
      name: "Add practice",
      exact: true,
    });
    const fieldError = async (label, message) => {
      const input = add.getByLabel(label, { exact: true });
      if ((await input.getAttribute("aria-invalid")) !== "true")
        throw new Error(`${label} is not aria-invalid`);
      const id = await input.getAttribute("aria-describedby");
      const text = id
        ? await p.locator(`[id="${id.split(" ")[0]}"]`).innerText()
        : "";
      if (!text.includes(message))
        throw new Error(`${label} describes "${text}", not "${message}"`);
      if (!(await input.evaluate((node) => node === document.activeElement)))
        throw new Error(`${label} is not focused after submit`);
    };
    if (!(await add.locator("form").evaluate((form) => form.noValidate)))
      throw new Error("Add practice still uses the browser's validation popup");
    await add.getByLabel("Activity date", { exact: true }).fill("");
    await submit.click();
    await fieldError("Activity date", "Choose a date.");
    await add.getByLabel("Activity date", { exact: true }).fill("2026-10-11");
    await add.getByLabel("Starts", { exact: true }).fill("");
    await submit.click();
    await fieldError("Starts", "Choose a start time.");
    await add.getByLabel("Starts", { exact: true }).fill("16:00");
    await add.getByLabel("Ends", { exact: true }).fill("17:30");
    result.checks.push(
      "Add practice with an empty date or start time shows the app's message, aria-invalid and aria-describedby on the field, and focuses it (A11Y-09).",
    );

    // STATE-02: a failed save shows above the footer; Try again saves once
    // and closes the sheet.
    await p.evaluate(() => {
      window.__failSaves = true;
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (window.__failSaves && args[1] === "app")
          throw new DOMException(
            "Quota exceeded for test",
            "QuotaExceededError",
          );
        return original.apply(this, args);
      };
    });
    await add.getByLabel("Name", { exact: true }).fill("Retry practice");
    await submit.click();
    const error = add
      .locator(".inline-error")
      .filter({ hasText: "Not saved:" });
    await error.waitFor();
    const placement = await error.evaluate((node) => {
      const footer = node
        .closest("dialog")
        .querySelector(".schedule-form-footer");
      const header = node.closest("dialog").querySelector("header");
      const box = node.getBoundingClientRect();
      return {
        next: node.nextElementSibling === footer,
        aboveFooter: box.bottom <= footer.getBoundingClientRect().top + 1,
        underHeader: box.top - header.getBoundingClientRect().bottom < 24,
        visible: box.top >= 0 && box.bottom <= innerHeight,
      };
    });
    if (!placement.next || !placement.aboveFooter || placement.underHeader)
      throw new Error(
        `The dialog error is not above the footer: ${JSON.stringify(placement)}`,
      );
    if (!placement.visible)
      throw new Error("The dialog error is scrolled out of view");
    await p.evaluate(() => {
      window.__failSaves = false;
    });
    await error.getByRole("button", { name: "Try again" }).click();
    await add.waitFor({ state: "hidden" });
    await toast("Practice added.");
    const copies = await p.evaluate(
      () =>
        new Promise((resolve) => {
          const open = indexedDB.open("nourally-v2", 1);
          open.onsuccess = () => {
            const get = open.result
              .transaction("documents")
              .objectStore("documents")
              .get("app");
            get.onsuccess = () =>
              resolve(
                Object.values(get.result.profiles)
                  .flatMap((profile) => profile.data.schedule)
                  .filter((event) => event.title === "Retry practice").length,
              );
          };
        }),
    );
    if (copies !== 1)
      throw new Error(`Try again left ${copies} copies of the practice`);
    result.checks.push(
      'A failed save shows "Not saved" just above the sheet footer, in view; Try again saves once, closes the sheet and toasts "Practice added." (STATE-02).',
    );

    // STATE-01: each Schedule write says what happened.
    const today = () => p.getByRole("region", { name: / Today$/ });
    const menu = async (title, item) => {
      await today()
        .getByRole("button", { name: `Actions for ${title}`, exact: true })
        .first()
        .click();
      await p.getByRole("menuitem", { name: item }).click();
    };
    await menu("Retry practice", "Edit");
    const edit = p.getByRole("dialog", { name: /^Edit Sunday practice/ });
    await edit.getByLabel("Ends", { exact: true }).fill("18:00");
    await edit.getByRole("button", { name: "Save changes" }).click();
    await edit.waitFor({ state: "hidden" });
    await toast("Practice updated.");
    await menu("Retry practice", "Delete");
    await p
      .getByRole("dialog", { name: "Delete Retry practice?" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await toast("Practice deleted.");
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    await add.getByRole("button", { name: "Game", exact: true }).click();
    const addGame = p.getByRole("dialog", { name: "Add game" });
    await addGame.getByLabel("Name", { exact: true }).fill("Weekly game");
    await addGame.getByRole("button", { name: "Every week" }).click();
    await addGame
      .getByRole("button", { name: "Add game", exact: true })
      .click();
    await addGame.waitFor({ state: "hidden" });
    await toast("Game added.");
    await menu("Weekly game", "Skip this day");
    await toast("Day skipped.");
    result.checks.push(
      'Schedule toasts name the write: "Practice updated.", "Practice deleted.", "Game added.", "Day skipped." (STATE-01).',
    );

    // DLG-01 / A11Y-04: a search result swaps in the next step with focus on
    // its first field, not <body>.
    await p.goto(`${base}#/food/log`);
    await p.getByRole("button", { name: "Log food", exact: true }).click();
    const log = p.getByRole("dialog", { name: "Log food" });
    await log.getByRole("button", { name: "Add Bananas", exact: true }).click();
    await log.getByText("Usual portion: 1 medium, 118 g").waitFor();
    await p.waitForTimeout(100);
    let at = await focused();
    if (!at.inDialog || !["input", "select", "textarea"].includes(at.tag))
      throw new Error(`Log food portion step focus: ${JSON.stringify(at)}`);
    await p.keyboard.press("Escape");
    const ask = p.getByRole("dialog", { name: "Discard changes?" });
    if (await ask.isVisible())
      await ask.getByRole("button", { name: "Discard", exact: true }).click();
    await log.waitFor({ state: "hidden" });
    await p.goto(`${base}#/food/groceries`);
    await p.getByRole("button", { name: "Add food", exact: true }).click();
    const groceries = p.getByRole("dialog", { name: "Add to groceries" });
    await groceries
      .getByRole("button", { name: "Add Bananas", exact: true })
      .click();
    await groceries.getByRole("button", { name: "Save" }).waitFor();
    await p.waitForTimeout(100);
    at = await focused();
    if (!at.inDialog || !["input", "select", "textarea"].includes(at.tag))
      throw new Error(`Add to groceries details focus: ${JSON.stringify(at)}`);
    await p.keyboard.press("Escape");
    if (await ask.isVisible())
      await ask.getByRole("button", { name: "Discard", exact: true }).click();
    await groceries.waitFor({ state: "hidden" });
    result.checks.push(
      "Choosing a food in Log food and Add to groceries moves focus to the next step's first field (DLG-01, A11Y-04).",
    );

    // DLG-02: Add food for this week and Put these away? guard dirty closes.
    await p.getByRole("button", { name: "Suggest for this week" }).click();
    const week = p.getByRole("dialog", { name: "Add food for this week" });
    await p.keyboard.press("Escape");
    await week.waitFor({ state: "hidden" });
    if (await ask.isVisible())
      throw new Error("A clean Add food for this week asked to discard");
    await p.getByRole("button", { name: "Suggest for this week" }).click();
    await week.getByRole("checkbox", { name: /^Bananas · / }).check();
    await guarded("Add food for this week");
    await p.getByRole("button", { name: "Suggest for this week" }).click();
    await week.getByRole("checkbox", { name: /^Bananas · / }).check();
    await week.getByRole("checkbox", { name: /^Pretzels · / }).check();
    // STATE-02 in a Food sheet too: the error sits above its footer and Try
    // again adds the two items once and closes the sheet.
    await p.evaluate(() => {
      window.__failSaves = true;
    });
    await week.getByRole("button", { name: "Add selected" }).click();
    const weekError = week
      .locator(".inline-error")
      .filter({ hasText: "Not saved:" });
    await weekError.waitFor();
    if (
      !(await weekError.evaluate(
        (node) =>
          node.nextElementSibling?.classList.contains("sheet-footer") &&
          node.getBoundingClientRect().bottom <=
            node.nextElementSibling.getBoundingClientRect().top + 1,
      ))
    )
      throw new Error(
        "Add food for this week: the error is not above the footer",
      );
    await p.evaluate(() => {
      window.__failSaves = false;
    });
    await weekError.getByRole("button", { name: "Try again" }).click();
    await week.waitFor({ state: "hidden" });
    await toast("Added 2 items to groceries.");
    if ((await p.getByRole("checkbox", { name: "Got Bananas" }).count()) !== 1)
      throw new Error("Try again added Bananas more than once");
    await p.getByRole("checkbox", { name: "Got Bananas" }).click();
    await p.getByRole("checkbox", { name: "Got Pretzels" }).click();
    await p.getByRole("button", { name: "Finish shopping (2)" }).click();
    const putAway = p.getByRole("dialog", { name: "Put these away?" });
    await putAway
      .getByRole("combobox", { name: "Place for Bananas" })
      .selectOption({ label: "Bag" });
    await guarded("Put these away?");
    result.checks.push(
      'Add food for this week and Put these away? close at once when clean, and ask "Discard changes?" on Escape, × and Cancel once changed (DLG-02); a failed Add selected shows its error above the footer and Try again adds the items once and closes the sheet (STATE-02).',
    );

    // DS-11: Undo trip shows the spinner and aria-busy while it saves.
    await p.getByRole("button", { name: "Finish shopping (2)" }).click();
    await putAway.getByRole("button", { name: "Add to At home" }).click();
    await putAway.waitFor({ state: "hidden" });
    await p.getByRole("button", { name: "Past trips" }).click();
    const trips = p.getByRole("dialog", { name: "Past trips" });
    // Hold the next read so the busy state stays on screen.
    await p.evaluate(() => {
      const hook = Object.getOwnPropertyDescriptor(
        IDBRequest.prototype,
        "onsuccess",
      );
      Object.defineProperty(IDBRequest.prototype, "onsuccess", {
        configurable: true,
        get() {
          return hook.get.call(this);
        },
        set(handler) {
          hook.set.call(
            this,
            handler &&
              ((event) => setTimeout(() => handler.call(this, event), 3000)),
          );
        },
      });
    });
    const undo = trips.getByRole("button", { name: /Undo trip|Undoing/ });
    await undo.click();
    const busy = await undo.evaluate((node) => ({
      busy: node.getAttribute("aria-busy"),
      text: node.innerText,
      spinner: getComputedStyle(node, "::before").content,
    }));
    if (
      busy.busy !== "true" ||
      busy.spinner === "none" ||
      busy.text !== "Undoing…"
    )
      throw new Error(`Undo trip busy state: ${JSON.stringify(busy)}`);
    result.checks.push(
      'Undo trip shows "Undoing…" with the spinner and aria-busy="true" while it saves (DS-11).',
    );
    return result;
  } catch (error) {
    return {
      ...result,
      failure: error.message,
      last: await p.locator("body").innerText(),
    };
  } finally {
    await context.close();
  }
};
