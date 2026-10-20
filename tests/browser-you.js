// Playwright snippet: You settings list — Sport sheet, Food needs without allergen chips, Reminders sheet and honesty line.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page.context().browser().newContext();
  // A permission the test can set (UX-BUG-15): localStorage "test-permission".
  await context.addInitScript(() => {
    const forced = () => localStorage.getItem("test-permission");
    if (!forced() || typeof Notification === "undefined") return;
    Object.defineProperty(Notification, "permission", {
      get: forced,
      configurable: true,
    });
    Notification.requestPermission = () => Promise.resolve(forced());
  });
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  const honesty =
    "Reminders work while Nourally is open in a desktop browser. On phones, add Nourally to your home screen (coming soon).";
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("You test");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await p.goto(`${base}#/schedule`);
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    const name = p
      .getByRole("dialog", { name: "Add practice" })
      .getByRole("textbox", { name: "Name" });
    if ((await name.getAttribute("placeholder")) !== "Soccer practice")
      throw new Error(
        `Activity name placeholder ignores sport: ${await name.getAttribute("placeholder")}`,
      );
    await p.keyboard.press("Escape");
    await p.goto(`${base}#/you`);
    await p.getByRole("link", { name: /^Sport & season — Soccer/ }).click();
    const sport = p.getByRole("dialog", { name: "Sport & season" });
    if (!p.url().endsWith("#/you/sport"))
      throw new Error(`Sport sheet did not route: ${p.url()}`);
    const sportField = sport.getByRole("combobox", { name: /^Sport/ });
    if ((await sportField.inputValue()) !== "Soccer")
      throw new Error("Sport was not saved to the profile");
    await sportField.fill("Swimming");
    await sport.getByRole("button", { name: "Save", exact: true }).click();
    await sport.waitFor({ state: "hidden" });
    await p.locator(".app-toast").getByText("Sport & season saved.").waitFor();
    if (!p.url().endsWith("#/you"))
      throw new Error(`Saving a sheet did not return to #/you: ${p.url()}`);
    await p.getByRole("link", { name: /^Sport & season — Swimming/ }).waitFor();
    result.checks.push(
      "Sport from welcome names new activities (Soccer practice); the Sport sheet at #/you/sport saves, toasts Saved, and returns to You.",
    );

    // UX-BUG-01: Sport is required here too; an empty Save keeps the sheet.
    await p.getByRole("link", { name: /^Sport & season — Swimming/ }).click();
    const required = p.getByRole("dialog", { name: "Sport & season" });
    const requiredField = required.getByRole("combobox", { name: /^Sport/ });
    if (/Optional/.test(await required.locator("label").first().innerText()))
      throw new Error("Sport is labelled Optional in the You sheet");
    await requiredField.fill("");
    await requiredField.press("Tab");
    await required.getByRole("button", { name: "Save", exact: true }).click();
    await required.getByText("Enter your sport.").waitFor();
    if (!(await required.isVisible()) || !p.url().endsWith("#/you/sport"))
      throw new Error("An empty sport closed the sheet");
    const stored = await p.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const open = indexedDB.open("nourally-v2");
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const get = open.result
              .transaction("documents")
              .objectStore("documents")
              .get("app");
            get.onsuccess = () => {
              const doc = get.result;
              const id = sessionStorage.getItem("nourally-profile-id");
              resolve(
                doc.profiles[id || doc.defaultProfileId].data.profile.sport,
              );
            };
          };
        }),
    );
    if (stored !== "Swimming")
      throw new Error(`The stored sport changed to "${stored}"`);
    await requiredField.fill("Swimming");
    await required
      .getByText("Enter your sport.")
      .waitFor({ state: "detached" });
    await required.getByRole("button", { name: "Cancel" }).click();
    await required.waitFor({ state: "hidden" });
    result.checks.push(
      "In #/you/sport an empty Sport shows “Enter your sport.”, keeps the sheet open and leaves the stored sport (Swimming); typing a sport clears it (UX-BUG-01, UX-BUG-02).",
    );

    await p.getByRole("link", { name: /^Food needs & allergies/ }).click();
    const needs = p.getByRole("dialog", { name: "Food needs & allergies" });
    await needs.getByRole("button", { name: "Vegan" }).waitFor();
    const chips = await needs
      .getByRole("group", { name: "I don't eat" })
      .getByRole("button")
      .allInnerTexts();
    if (chips.join(",") !== "Vegetarian,Vegan")
      throw new Error(`Unexpected dietary chips: ${chips.join(", ")}`);
    const allButtons = await needs.getByRole("button").allInnerTexts();
    const allergen = allButtons.find((t) =>
      /Gluten-free|Dairy-free|Nut-free/i.test(t),
    );
    if (allergen) throw new Error(`Allergen chip is visible: ${allergen}`);
    // P1-09 gate closed: no allergy chips, only the waiting line.
    await needs
      .getByText("Allergy filtering coming soon.", {
        exact: true,
      })
      .waitFor();
    for (const chip of ["Peanuts", "Tree nuts", "Milk", "Sesame"])
      if (await needs.getByRole("button", { name: chip, exact: true }).count())
        throw new Error(`Allergy chip ${chip} shows while the gate is closed`);
    await needs.getByRole("button", { name: "Cancel" }).click();
    await needs.waitFor({ state: "hidden" });
    result.checks.push(
      "Food needs offers only Vegetarian and Vegan; no Gluten-free, Dairy-free or Nut-free chip; no allergy chips while ALLERGY_TAGS_REVIEWED is false, and the waiting line shows.",
    );

    await p.getByRole("link", { name: "Reminders — Off" }).click();
    const sheet = p.getByRole("dialog", { name: "Reminders" });
    await sheet.waitFor();
    if (!p.url().endsWith("#/you/reminders"))
      throw new Error(`Reminders sheet did not route: ${p.url()}`);
    await sheet.getByText(honesty, { exact: true }).waitFor();
    await sheet.getByRole("button", { name: /^Close/ }).click();
    await sheet.waitFor({ state: "hidden" });
    if (!p.url().endsWith("#/you"))
      throw new Error(`Closing Reminders did not return to #/you: ${p.url()}`);
    await p.goto(`${base}#/reminders`);
    await sheet.getByText(honesty, { exact: true }).waitFor();
    if (!p.url().endsWith("#/you/reminders"))
      throw new Error(`#/reminders did not redirect: ${p.url()}`);
    result.checks.push(
      "Reminders opens at #/you/reminders (also from old #/reminders) with the honesty line, and closes to #/you.",
    );

    // UX-BUG-15: reminders left on, then the browser blocks notifications:
    // "How long before" and the evening reminder are disabled and dimmed.
    await p.evaluate(() => localStorage.setItem("test-permission", "granted"));
    await p.reload();
    await sheet.getByRole("switch").check();
    await sheet.getByRole("button", { name: "Save", exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
    await p.evaluate(() => localStorage.setItem("test-permission", "denied"));
    await p.goto(`${base}#/you/reminders`);
    await p.reload();
    await sheet
      .getByText("Notifications are blocked.", { exact: false })
      .waitFor();
    const dependents = await sheet.evaluate((dialog) => {
      const lead = dialog.querySelector("fieldset");
      const evening = dialog.querySelector("input[type=checkbox]:not([role])");
      return {
        switchOn: dialog.querySelector("[role=switch]").checked,
        lead: lead.disabled,
        segments: [...lead.querySelectorAll("button")].every((b) =>
          b.matches(":disabled"),
        ),
        evening: evening.disabled,
        legend: getComputedStyle(lead.querySelector("legend")).color,
        eveningText: getComputedStyle(evening.closest("label")).color,
        ink: getComputedStyle(dialog.querySelector("h2")).color,
      };
    });
    if (
      !dependents.lead ||
      !dependents.segments ||
      !dependents.evening ||
      dependents.legend === dependents.ink ||
      dependents.eveningText === dependents.ink
    )
      throw new Error(
        `Blocked reminders leave options active: ${JSON.stringify(dependents)}`,
      );
    await sheet.getByRole("button", { name: /^Close/ }).click();
    await sheet.waitFor({ state: "hidden" });
    await p.evaluate(() => localStorage.removeItem("test-permission"));
    result.checks.push(
      "With reminders on and notifications blocked, “How long before” and the evening reminder are disabled and dimmed (UX-BUG-15).",
    );

    // UX-BUG-22: each You sheet's save toasts "<Thing> saved." with an Undo
    // that puts the previous values back; so does Rename on This device.
    await p.evaluate(() => localStorage.setItem("test-permission", "granted"));
    await p.reload();
    const toastBox = p.locator(".app-toast");
    const undoSave = async (open, sheetName, change, toastText) => {
      await open();
      const dialog = p.getByRole("dialog", { name: sheetName });
      await dialog.waitFor();
      await change(dialog);
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      await toastBox.getByText(toastText, { exact: true }).waitFor();
      await toastBox.getByRole("button", { name: "Undo" }).click();
      await toastBox.getByText("Undone.", { exact: true }).waitFor();
    };
    const fromYou = (name) => async () => {
      await p.goto(`${base}#/you`);
      await p.getByRole("link", { name }).click();
    };
    const reopen = async (name, sheetName) => {
      await fromYou(name)();
      const dialog = p.getByRole("dialog", { name: sheetName });
      await dialog.waitFor();
      return dialog;
    };
    const closeSheet = async (dialog) => {
      await dialog.getByRole("button", { name: /^Close/ }).click();
      await dialog.waitFor({ state: "hidden" });
    };
    await undoSave(
      fromYou(/^Sport & season/),
      "Sport & season",
      (d) => d.getByRole("combobox", { name: /^Sport/ }).fill("Basketball"),
      "Sport & season saved.",
    );
    await p.getByRole("link", { name: /^Sport & season — Swimming/ }).waitFor();
    await undoSave(
      fromYou(/^Food needs/),
      "Food needs & allergies",
      (d) => d.getByRole("button", { name: "Vegan" }).click(),
      "Food needs saved.",
    );
    let again = await reopen(/^Food needs/, "Food needs & allergies");
    if (
      (await again
        .getByRole("button", { name: "Vegan" })
        .getAttribute("aria-pressed")) === "true"
    )
      throw new Error("Undo did not put Food needs back");
    await closeSheet(again);
    again = await reopen(/^Food access/, "Food access & budget");
    const lowCost = again.getByRole("switch", { name: /Keep ideas low-cost/ });
    const lowCostBefore = await lowCost.isChecked();
    await closeSheet(again);
    await undoSave(
      fromYou(/^Food access/),
      "Food access & budget",
      (d) => d.getByRole("switch", { name: /Keep ideas low-cost/ }).click(),
      "Food access saved.",
    );
    again = await reopen(/^Food access/, "Food access & budget");
    if (
      (await again
        .getByRole("switch", { name: /Keep ideas low-cost/ })
        .isChecked()) !== lowCostBefore
    )
      throw new Error("Undo did not put Food access back");
    await closeSheet(again);
    again = await reopen(/^Reminders/, "Reminders");
    const remindersBefore = await again.getByRole("switch").isChecked();
    await closeSheet(again);
    await undoSave(
      fromYou(/^Reminders/),
      "Reminders",
      (d) => d.getByRole("switch").setChecked(!remindersBefore),
      "Reminders saved.",
    );
    again = await reopen(/^Reminders/, "Reminders");
    if ((await again.getByRole("switch").isChecked()) !== remindersBefore)
      throw new Error("Undo did not put Reminders back");
    await closeSheet(again);
    await p.goto(`${base}#/you/device`);
    const renameButton = p.getByRole("button", { name: /^Rename / }).first();
    const oldName = (await renameButton.getAttribute("aria-label")).replace(
      /^Rename /,
      "",
    );
    await undoSave(
      () => renameButton.click(),
      `Rename ${oldName}`,
      (d) => d.getByRole("textbox", { name: "First name" }).fill("Renamed"),
      "Name saved.",
    );
    await p.getByRole("button", { name: `Rename ${oldName}` }).waitFor();
    await p.evaluate(() => localStorage.removeItem("test-permission"));
    result.checks.push(
      "Sport & season, Food needs, Food access, Reminders and Rename toast “<Thing> saved.” with Undo, and Undo puts the previous values back (UX-BUG-22).",
    );
    await p.goto(`${base}#/you/device`);
    await p.getByRole("heading", { name: "This device", level: 1 }).waitFor();
    await p
      .getByText(
        "Nourally saves each athlete's plans in this browser. There is no account or cloud copy. Save a backup file now and then.",
        { exact: true },
      )
      .waitFor();
    result.checks.push("This device opens with the DATA-02 panel intro.");
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
