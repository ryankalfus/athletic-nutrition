// Playwright snippet: food search, provider failure states, and barcode fallback. Needs network (USDA DEMO_KEY).
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page.context().browser().newContext();
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  const search = async (term) => {
    await p.getByRole("searchbox").fill(term);
    await p.getByRole("searchbox").press("Enter");
  };
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Provider test");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await p.goto(`${base}#/food/log`);
    await p.getByRole("button", { name: "Log food", exact: true }).click();
    const dialog = p.getByRole("dialog", { name: "Log food" });
    if (
      !(await p
        .getByRole("searchbox")
        .evaluate((node) => node === document.activeElement))
    )
      throw new Error("Search field is not focused when the dialog opens");
    await search("banana");
    await p
      .locator(".food-result-row")
      .or(p.getByText("Food provider rate limit reached.", { exact: false }))
      .first()
      .waitFor();
    if (!(await p.locator(".food-result-row").count()))
      throw new Error(
        "Real USDA search is rate-limited (DEMO_KEY allows ~30 requests/hour). Set FDC_API_KEY in .env or retry later.",
      );
    const first = await p.locator(".food-result-row").first().innerText();
    if (!/Bananas?, raw/.test(first))
      throw new Error(`Plain banana did not rank first: ${first}`);
    const listText = await p.locator(".food-result-list").last().innerText();
    // COPY-05: database taxonomy never shows; rows read "Basic food" or "Brand: …".
    if (/Foundation|SR Legacy|FNDDS|Branded/.test(listText))
      throw new Error("USDA data-type labels are visible");
    if (!listText.includes("Basic food"))
      throw new Error("Generic foods are not labeled Basic food");
    if (!listText.includes("Allergies: check every label."))
      throw new Error("Search rows are missing the label line");
    if (await p.getByRole("button", { name: "Show more results" }).count()) {
      const before = await p.locator(".food-result-row").count();
      await p.getByRole("button", { name: "Show more results" }).click();
      await p.waitForFunction(
        (n) => document.querySelectorAll(".food-result-row").length > n,
        before,
      );
    }
    result.checks.push(
      "Search is focused, plain banana ranks first, rows show Basic food and the label line, more results load.",
    );
    await search("abcdefnonfood");
    await p.getByText("No matching foods.", { exact: false }).waitFor();
    if (await dialog.getByRole("heading", { name: /Bananas?, raw/ }).count())
      throw new Error("Stale banana results remained after query change");
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
    await search("banana");
    await p
      .getByRole("alert")
      .getByText("Provider rate limit reached.")
      .waitFor();
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
      "429 shows a working retry and the saved/manual fallback.",
    );
    await p.route("**/api/foods/search?*", (route) => route.abort("failed"));
    await context.setOffline(true);
    await search("apple");
    await p
      .getByText("You're offline. Recent and saved foods still work.")
      .first()
      .waitFor();
    await context.setOffline(false);
    await p.unroute("**/api/foods/search?*");
    result.checks.push("Offline search shows the offline message (SRCH-06).");
    await p.getByRole("button", { name: "Scan barcode" }).click();
    await p.getByRole("textbox", { name: "Barcode number" }).fill("1234");
    await p.getByRole("button", { name: "Look up product" }).click();
    await p
      .getByRole("alert")
      .getByText(/8–14 digit/)
      .waitFor();
    await p.route("**/api/barcode/00000000", (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "not_found" }),
      }),
    );
    await p.getByRole("textbox", { name: "Barcode number" }).fill("00000000");
    await p.getByRole("button", { name: "Look up product" }).click();
    await p
      .getByRole("alert")
      .getByText("We couldn't find that barcode. Add the food yourself.")
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
    const product = await p.locator(".product-result").innerText();
    if (!product.includes("0 kcal"))
      throw new Error("Zero energy treated as unknown");
    if (!product.includes("Allergies: check every label."))
      throw new Error("Scanned product is missing the label line");
    result.checks.push(
      "Barcode validation, 404 not-found copy, normalized zero, and label line pass.",
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
