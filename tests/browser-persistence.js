// Playwright snippet: additive backup import, profile switch, scoped deletion, failed-save visibility.
// Run with `npm run test:browser` (or paste into a Playwright CLI browser).
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page.context().browser().newContext();
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (error) => result.errors.push(error.message));
  // With one athlete the frame button reads "Add another athlete" (6.13).
  const athlete = () =>
    p.getByRole("banner").getByRole("button", {
      name: /^(Switch athlete|Add another athlete)$/,
    });
  const athletes = () =>
    p
      .getByRole("region", { name: "Athletes on this device" })
      .getByRole("listitem");
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Aiden");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { level: 1, name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/ }).waitFor();
    await p.goto(`${base}#/you/device`);
    await p.getByRole("heading", { name: "This device", level: 1 }).waitFor();
    await p
      .getByLabel("Backup file")
      .setInputFiles("tests/fixtures/import-profile.json");
    const preview = p.getByRole("dialog", { name: "Add from this file?" });
    await preview.getByText(/Riley/).waitFor();
    await preview.getByRole("button", { name: "Add from file" }).click();
    await preview.waitFor({ state: "hidden" });
    await athletes().nth(1).waitFor();
    if ((await athletes().count()) !== 2)
      throw new Error("Additive restore did not keep the existing athlete");
    if (!(await athletes().first().innerText()).includes("Open now"))
      throw new Error("Restore switched away from the open athlete");
    await p.getByRole("button", { name: /^Open Riley/ }).click();
    await athlete().getByText("Riley").waitFor();
    await p.goto(`${base}#/today`);
    await p.getByRole("heading", { level: 1, name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/ }).waitFor();
    if (!(await athlete().innerText()).includes("Riley"))
      throw new Error("Athlete switch did not survive navigation");
    await p.goto(`${base}#/you`);
    await p
      .getByRole("region", { name: "Athlete" })
      .getByRole("button", { name: "Switch athlete" })
      .click();
    await p.getByRole("heading", { name: "Who's using Nourally?" }).waitFor();
    await p.getByRole("button", { name: /^Riley(?!.* options$)/ }).waitFor();
    await p.getByRole("button", { name: /^Aiden, Soccer/ }).waitFor();
    result.checks.push(
      "Restore previews the file and adds without replacing; opening the imported athlete sticks; the chooser lists both.",
    );

    await p.getByRole("button", { name: /^Riley(?!.* options$)/ }).click();
    await p.getByRole("heading", { level: 1, name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/ }).waitFor();
    if (!p.url().endsWith("#/today"))
      throw new Error(`Choosing an athlete did not open Today: ${p.url()}`);
    await p.goto(`${base}#/you/device`);
    const deleteData = p.getByRole("button", {
      name: /^Delete Riley.*'s data$/,
    });
    await deleteData.click();
    const confirm = p.getByRole("dialog", {
      name: /^Delete Riley.*data from this device\?$/,
    });
    const deleteButton = confirm.getByRole("button", { name: "Delete data" });
    if (!(await deleteButton.isDisabled()))
      throw new Error("Delete is enabled before typing DELETE");
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await confirm.waitFor({ state: "hidden" });
    if ((await athletes().count()) !== 2)
      throw new Error("Cancelling delete removed an athlete");
    await deleteData.click();
    await confirm.getByRole("textbox", { name: /Type DELETE/ }).fill("DELETE");
    await deleteButton.click();
    // Deleting signs out to the athlete chooser on Welcome.
    await p.getByRole("heading", { name: "Who's using Nourally?" }).waitFor();
    if (await p.getByRole("button", { name: /^Riley(?!.* options$)/ }).count())
      throw new Error("Deleted athlete is still listed");
    await p.getByRole("button", { name: /^Aiden, / }).click();
    await athlete().getByText("Aiden").waitFor();
    await p.goto(`${base}#/you/device`);
    await athletes().first().waitFor();
    if ((await athletes().count()) !== 1)
      throw new Error("Deletion affected the wrong athlete");
    result.checks.push(
      "Delete [name]'s data needs typed DELETE, can be cancelled, removes only the open athlete, and returns to the chooser.",
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
    await alert.getByRole("button", { name: "Save a backup file" }).waitFor();
    if (
      !(await p.getByRole("region", { name: "Water" }).innerText()).includes(
        "Water today: 0 oz",
      )
    )
      throw new Error("Failed write changed the visible water total");
    result.checks.push(
      "A simulated quota failure keeps the saved water total and shows Not saved with Save a backup file.",
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
