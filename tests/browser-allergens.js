// Playwright snippet: P1-09 product allergens. A scanned product lists the
// allergens and traces Open Food Facts reports, marked "may be incomplete",
// above the label line. The barcode API is mocked, so no network is needed.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page.context().browser().newContext();
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
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
    const listed =
      "Label lists: milk and tree nuts. May contain: peanuts. From Open Food Facts; this list may be incomplete.";
    if (!text.includes(listed))
      throw new Error(`Product allergens missing: ${text}`);
    if (!text.includes("Allergies: check every label."))
      throw new Error("Label line missing under the allergens");
    result.checks.push(
      "A scanned product lists Open Food Facts allergens and traces with 'this list may be incomplete' and keeps the label line.",
    );

    await product("11223344", {});
    await scan("11223344");
    await p.getByRole("heading", { name: "Bar 11223344" }).waitFor();
    const plain = await p.locator(".product-result").innerText();
    if (/Label lists|May contain/.test(plain))
      throw new Error("A product without tags shows an allergen line");
    if (!plain.includes("Allergies: check every label."))
      throw new Error("Label line missing on a product without tags");
    result.checks.push(
      "A product without allergen tags shows only the label line, never an 'allergen-free' claim.",
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
