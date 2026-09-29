// Playwright snippet: P1-09 / SRCH-07 product allergens. A scanned product
// lists the allergens and traces Open Food Facts reports, marked "may be
// incomplete", above the label line, exactly once on the barcode result, the
// portion sheet and the grocery item sheet. The barcode API is mocked.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page.context().browser().newContext();
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  // Each allergen text shows once per view (one source: allergenLine).
  const once = (text, where) => {
    for (const phrase of [
      "Allergens listed:",
      "May contain:",
      "This list may be incomplete.",
      "Allergens: check the package.",
      "Allergies: check every label.",
    ]) {
      const n = text.split(phrase).length - 1;
      if (n > 1) throw new Error(`${where}: "${phrase}" shows ${n} times`);
    }
  };
  const listed =
    "Allergens listed: milk, tree nuts. May contain: peanuts. This list may be incomplete. Check the package.";
  const scan = async (code) => {
    await p.getByRole("textbox", { name: "Barcode number" }).fill(code);
    await p.getByRole("button", { name: "Look up product" }).click();
  };
  const product = (code, extra) =>
    p.route(`**/api/barcode/${code}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          product: {
            product_name: `Bar ${code}`,
            nutriments: { "energy-kcal_100g": 400 },
            ...extra,
          },
        }),
      }),
    );
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await p.goto(`${base}#/food/log`);
    await p.getByRole("button", { name: "Log food", exact: true }).click();
    await p.getByRole("button", { name: "Scan barcode" }).click();

    await product("87654321", {
      allergens_tags: ["en:milk", "en:nuts"],
      traces_tags: ["en:peanuts"],
    });
    await scan("87654321");
    await p.getByRole("heading", { name: "Bar 87654321" }).waitFor();
    const text = await p.locator(".product-result").innerText();
    if (!text.includes(listed))
      throw new Error(`Product allergens missing: ${text}`);
    if (!text.includes("Allergies: check every label."))
      throw new Error("Label line missing under the allergens");
    if (/Basic food/.test(text))
      throw new Error("A scanned product is called a basic food");
    once(text, "Barcode result");
    result.checks.push(
      "A scanned product lists Open Food Facts allergens and traces once, with 'This list may be incomplete', the label line, and 'Packaged food' rather than 'Basic food'.",
    );

    await product("11223344", {});
    await scan("11223344");
    await p.getByRole("heading", { name: "Bar 11223344" }).waitFor();
    const plain = await p.locator(".product-result").innerText();
    if (/Allergens listed|May contain/.test(plain))
      throw new Error("A product without tags lists allergens");
    if (!plain.includes("Allergens: check the package."))
      throw new Error("A product without tags lost 'Allergens: check the package.'");
    if (!plain.includes("Allergies: check every label."))
      throw new Error("Label line missing on a product without tags");
    if (/allergen[- ]free|safe/i.test(plain))
      throw new Error("A product without tags reads as allergen-free");
    once(plain, "Untagged barcode result");
    result.checks.push(
      "A product without allergen tags says 'Allergens: check the package.' and the label line, never an 'allergen-free' claim.",
    );

    // Log: Use this food opens the portion sheet with the line once.
    await product("87654321", {
      allergens_tags: ["en:milk", "en:nuts"],
      traces_tags: ["en:peanuts"],
    });
    await scan("87654321");
    await p.getByRole("heading", { name: "Bar 87654321" }).waitFor();
    await p.getByRole("button", { name: "Use this food" }).click();
    const portion = p.locator(".portion-form");
    await portion.waitFor();
    const portionText = await portion.innerText();
    if (!portionText.includes(listed))
      throw new Error(`Portion sheet allergens missing: ${portionText}`);
    once(portionText, "Portion sheet");
    result.checks.push(
      "The portion sheet shows the product's allergen line and the label line once each.",
    );
    await p.keyboard.press("Escape");

    // Groceries: Add food → Scan barcode → Use this food opens the item
    // sheet with the line once.
    await p.goto(`${base}#/food/groceries`);
    await p.getByRole("button", { name: "Add food", exact: true }).first().click();
    await p.getByRole("button", { name: "Scan barcode" }).click();
    await scan("87654321");
    await p.getByRole("heading", { name: "Bar 87654321" }).waitFor();
    await p.getByRole("button", { name: "Use this food" }).click();
    const sheet = p.getByRole("dialog");
    await sheet.getByRole("textbox", { name: "Name" }).waitFor();
    const sheetText = await sheet.innerText();
    if (!sheetText.includes(listed))
      throw new Error(`Grocery sheet allergens missing: ${sheetText}`);
    once(sheetText, "Grocery item sheet");
    result.checks.push(
      "The grocery item sheet shows the product's allergen line and the label line once each.",
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
