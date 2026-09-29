// Playwright snippet: You settings list — Sport sheet, Food needs without allergen chips, Reminders sheet and honesty line.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page.context().browser().newContext();
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  const honesty =
    "Reminders work while Nourally is open in a desktop browser. On phones, add Nourally to your home screen (coming soon).";
  try {
    await p.goto(base);
    await p.getByRole("textbox", { name: /First name/ }).fill("You test");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: /Save and see today/ }).click();
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
    await p.getByRole("status").getByText("Saved.").waitFor();
    if (!p.url().endsWith("#/you"))
      throw new Error(`Saving a sheet did not return to #/you: ${p.url()}`);
    await p.getByRole("link", { name: /^Sport & season — Swimming/ }).waitFor();
    result.checks.push(
      "Sport from welcome names new activities (Soccer practice); the Sport sheet at #/you/sport saves, toasts Saved, and returns to You.",
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
      .getByText("Allergy filtering is waiting for review. Check every label.", {
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
