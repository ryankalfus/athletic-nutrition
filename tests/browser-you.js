// Playwright snippet: You page — sport field, hidden allergen chips, Reminders sheet route and honesty line.
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
    if (
      (await p.getByRole("combobox", { name: /^Sport/ }).inputValue()) !==
      "Soccer"
    )
      throw new Error("Sport was not saved to the profile");
    result.checks.push(
      "Sport entered at welcome is saved and names new activities (Soccer practice).",
    );

    const needs = p.getByRole("group", { name: "Dietary needs" });
    const chips = await needs.getByRole("button").allInnerTexts();
    if (chips.join(",") !== "Vegetarian,Vegan")
      throw new Error(`Unexpected dietary chips: ${chips.join(", ")}`);
    const allButtons = await p.getByRole("button").allInnerTexts();
    const allergen = allButtons.find((t) =>
      /Gluten-free|Dairy-free|Nut-free/i.test(t),
    );
    if (allergen) throw new Error(`Allergen chip is visible: ${allergen}`);
    await p.getByText("Allergies: check every label.").first().waitFor();
    result.checks.push(
      "Dietary needs shows only Vegetarian and Vegan; no Gluten-free, Dairy-free or Nut-free chip.",
    );

    await p.getByRole("button", { name: "Reminders — Off" }).click();
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
