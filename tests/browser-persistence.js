// Playwright snippet: additive backup import, profile switch, scoped deletion, failed-save visibility.
// Run with `npm run test:browser` (or paste into a Playwright CLI browser).
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page.context().browser().newContext();
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (error) => result.errors.push(error.message));
  const athlete = () =>
    p.getByRole("banner").getByRole("button", { name: "Switch athlete" });
  const profileSelect = () =>
    p.getByRole("combobox", { name: "Current device profile" });
  try {
    await p.goto(base);
    await p
      .getByRole("textbox", { name: /First name/ })
      .fill("Persistence test");
    await p.getByRole("button", { name: /Save and see today/ }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await p.goto(`${base}#/you`);
    await p
      .getByLabel("Restore backup")
      .setInputFiles("tests/fixtures/import-profile.json");
    await p
      .getByRole("status")
      .getByText("Imported as separate profiles.", { exact: false })
      .waitFor();
    if ((await profileSelect().locator("option").count()) !== 2)
      throw new Error("Additive import did not keep the existing profile");
    await profileSelect().selectOption({ label: "Imported fixture" });
    await athlete().getByText("Imported fixture").waitFor();
    await p.goto(`${base}#/today`);
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    if (!(await athlete().innerText()).includes("Imported fixture"))
      throw new Error("Profile switch did not survive navigation");
    await p.goto(`${base}#/you`);
    await p
      .getByRole("main")
      .getByRole("button", { name: "Switch athlete" })
      .click();
    await p.getByRole("button", { name: "Open Imported fixture" }).waitFor();
    await p.getByRole("button", { name: "Open Persistence test" }).waitFor();
    result.checks.push(
      "Restore backup is additive, the profile switch sticks, and the device profile chooser lists both.",
    );

    await p.getByRole("button", { name: "Open Imported fixture" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await p.goto(`${base}#/you`);
    await p.getByRole("button", { name: "Delete this profile" }).click();
    const confirm = p.getByRole("dialog", {
      name: /^Delete Imported fixture.*data from this device\?$/,
    });
    const deleteButton = confirm.getByRole("button", { name: "Delete data" });
    if (!(await deleteButton.isDisabled()))
      throw new Error("Delete is enabled before typing DELETE");
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await confirm.waitFor({ state: "hidden" });
    if ((await profileSelect().locator("option").count()) !== 2)
      throw new Error("Cancelling delete removed a profile");
    await p.getByRole("button", { name: "Delete this profile" }).click();
    await confirm.getByRole("textbox", { name: /Type DELETE/ }).fill("DELETE");
    await deleteButton.click();
    // Deleting signs out to the device profile chooser.
    await p
      .getByRole("heading", { name: "Choose a device profile" })
      .waitFor();
    if (await p.getByRole("button", { name: "Open Imported fixture" }).count())
      throw new Error("Deleted profile is still listed");
    await p.getByRole("button", { name: "Open Persistence test" }).click();
    await athlete().getByText("Persistence test").waitFor();
    await p.goto(`${base}#/you`);
    if ((await profileSelect().locator("option").count()) !== 1)
      throw new Error("Profile deletion affected the wrong profile");
    result.checks.push(
      "Delete needs typed DELETE, can be cancelled, removes only the active profile, and returns to the chooser.",
    );

    await p.evaluate(() => {
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (args[1] === "app")
          throw new DOMException(
            "Quota exceeded for test",
            "QuotaExceededError",
          );
        return original.apply(this, args);
      };
    });
    await p.goto(`${base}#/today`);
    await p.getByRole("button", { name: "+8", exact: true }).click();
    const alert = p.getByRole("alert").filter({ hasText: "Not saved:" });
    await alert.getByRole("button", { name: "Export backup" }).waitFor();
    if (
      !(await p.getByRole("region", { name: "Water" }).innerText()).includes(
        "Water today · 0 oz",
      )
    )
      throw new Error("Failed write changed the visible water total");
    result.checks.push(
      "A simulated quota failure keeps the saved water total and shows Not saved with Export backup.",
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
