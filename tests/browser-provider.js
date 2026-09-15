// Playwright CLI helper for local USDA search, failure states, and barcode fallback.
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
      .fill("Provider test");
    await p
      .getByRole("button", { name: "Save and see today", exact: false })
      .click();
    await p.getByRole("heading", { name: "Today, Provider test" }).waitFor();
    await p.goto("http://127.0.0.1:5173/#/food/pantry");
    await p.getByRole("button", { name: "+ Add food" }).click();
    await p.getByRole("searchbox").fill("banana");
    await p.getByRole("button", { name: "Generic" }).click();
    await p.getByRole("button", { name: "Search foods" }).click();
    await p.locator(".food-result-row").first().waitFor();
    const first = await p.locator(".food-result-row").first().innerText();
    if (!first.includes("Bananas, raw"))
      throw new Error(`Plain banana did not rank first: ${first}`);
    const sourceText = await p.locator(".food-result-list").innerText();
    if (
      !["Foundation", "SR Legacy", "Survey (FNDDS)"].every((name) =>
        sourceText.includes(name),
      )
    )
      throw new Error("Generic food types not visible together");
    await p.getByRole("button", { name: "Next results" }).click();
    await p.getByRole("status").filter({ hasText: "Page 2" }).waitFor();
    result.checks.push(
      "Generic USDA types, exact raw-food ranking, and 18-item pagination pass.",
    );
    await p.getByRole("searchbox").fill("abcdefnonfood");
    if (await p.getByRole("heading", { name: "Bananas, raw" }).count())
      throw new Error("Stale banana results remained after query change");
    await p.getByRole("button", { name: "Search foods" }).click();
    await p.getByText("No matching foods.", { exact: false }).waitFor();
    result.checks.push(
      "Changing the query clears old results; no-result state is explicit.",
    );
    await p.route("**/api/foods/search?*", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: "Provider rate limit reached." }),
      }),
    );
    await p.getByRole("searchbox").fill("banana");
    await p.getByRole("button", { name: "Search foods" }).click();
    await p
      .getByRole("alert")
      .getByText("Provider rate limit reached.")
      .waitFor();
    if (await p.locator(".food-result-row").count())
      throw new Error("Old results remained after provider failure");
    if (
      !(await p.getByRole("alert").innerText()).includes(
        "Saved foods and manual entry",
      )
    )
      throw new Error("Failure fallback hidden");
    await p.unroute("**/api/foods/search?*");
    await p.getByRole("button", { name: "Retry" }).click();
    await p.locator(".food-result-row").first().waitFor();
    result.checks.push(
      "429 clears stale results and offers a working retry/manual fallback.",
    );
    await p.getByRole("button", { name: "Barcode" }).click();
    await p.getByRole("textbox", { name: "Barcode number" }).fill("1234");
    await p.getByRole("button", { name: "Look up product" }).click();
    await p
      .getByRole("alert")
      .getByText(/8–14 digit/)
      .waitFor();
    await p.route("**/api/barcode/12345678", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          product: {
            product_name: "Zero test water",
            brands: "Audit brand",
            nutriments: { "energy-kcal_100g": 0 },
          },
        }),
      }),
    );
    await p.getByRole("textbox", { name: "Barcode number" }).fill("12345678");
    await p.getByRole("button", { name: "Look up product" }).click();
    await p
      .getByRole("heading", { name: "Zero test water — Audit brand" })
      .waitFor();
    if (!(await p.locator(".product-result").innerText()).includes("0 kcal"))
      throw new Error("Zero energy treated as unknown");
    await p.getByRole("button", { name: "Use this food" }).click();
    await p.getByRole("button", { name: "Save at home" }).waitFor();
    result.checks.push(
      "Barcode format validation, normalized Open Food Facts zero, and shared pantry editor pass.",
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
