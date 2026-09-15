// Playwright CLI helper for isolated local profile import, deletion, and failed-save visibility.
async (page) => {
  const context = await page.context().browser().newContext();
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (error) => result.errors.push(error.message));
  try {
    await p.goto("http://127.0.0.1:5173/");
    await p
      .getByRole("textbox", { name: "First name Optional" })
      .fill("Persistence test");
    await p
      .getByRole("button", { name: "Save and see today", exact: false })
      .click();
    await p.getByRole("heading", { name: "Today, Persistence test" }).waitFor();
    await p.goto("http://127.0.0.1:5173/#/profile");
    await p
      .getByLabel("Import backup")
      .setInputFiles("tests/fixtures/import-profile.json");
    await p
      .getByRole("status")
      .getByText("Imported as separate profiles.", { exact: false })
      .waitFor();
    const select = p.getByLabel("Current device profile");
    if ((await select.locator("option").count()) !== 2)
      throw new Error("Additive import did not retain the existing profile");
    await select.selectOption({ index: 1 });
    await p.getByRole("button", { name: "Save changes", exact: false }).click();
    await p.getByRole("heading", { name: "Today, Imported fixture" }).waitFor();
    await p.goto("http://127.0.0.1:5173/#/profile");
    await p
      .getByRole("button", { name: "Close profile / choose another" })
      .click();
    await p.getByRole("button", { name: /Imported fixture.*Open/ }).waitFor();
    result.checks.push(
      "Validated import is additive, profile switch survives, and local profile chooser remains available.",
    );
    await p.getByRole("button", { name: /Imported fixture.*Open/ }).click();
    await p.getByRole("button", { name: "Save changes", exact: false }).click();
    await p.getByRole("heading", { name: "Today, Imported fixture" }).waitFor();
    await p.goto("http://127.0.0.1:5173/#/profile");
    p.once("dialog", (dialog) => dialog.accept());
    await p.getByRole("button", { name: "Delete this profile" }).click();
    await p.getByRole("button", { name: "Save changes", exact: false }).click();
    await p.getByRole("heading", { name: "Today, Persistence test" }).waitFor();
    await p.goto("http://127.0.0.1:5173/#/profile");
    if (
      (await p
        .getByLabel("Current device profile")
        .locator("option")
        .count()) !== 1
    )
      throw new Error("Profile deletion affected the wrong profile");
    result.checks.push(
      "Confirmed deletion removes only the active profile and returns to the preserved profile.",
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
    await p.goto("http://127.0.0.1:5173/#/today");
    await p.getByRole("button", { name: "+8 oz" }).click();
    await p.getByText("Not saved:", { exact: false }).waitFor();
    if (
      (await p.getByRole("heading", { name: "0 oz logged today" }).count()) !==
      1
    )
      throw new Error("Failed write changed the visible saved hydration value");
    result.checks.push(
      "A simulated quota failure leaves the saved value intact and shows an exportable error.",
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
