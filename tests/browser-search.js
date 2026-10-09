// Playwright snippet: food search UI (P1-07, audit 6.15). The API is mocked with
// server-ranked fixture rows (tests/search.test.js covers the ranking itself), so
// this runs offline and never spends the USDA DEMO_KEY. Screenshots of results at
// 390 and 1280 px go to output/playwright/.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
    });
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  let id = 1;
  const basic = (description, extra = {}) => ({
    fdcId: id++,
    description,
    dataType: "SR Legacy",
    ...extra,
  });
  const product = (description, brandOwner, extra = {}) => ({
    fdcId: id++,
    description,
    dataType: "Branded",
    brandOwner,
    servingSize: 28,
    servingSizeUnit: "g",
    householdServingFullText: "1 cup",
    ...extra,
  });
  // Rows in the order the gateway returns them (basic first unless a brand).
  const pages = {
    banana: [
      basic("Bananas, raw"),
      basic("Bananas, ripe and slightly ripe, raw", { dataType: "Foundation" }),
      basic("Bananas, dehydrated, or banana powder"),
      product("BANANA CHIPS", "Great Value"),
    ],
    "peanut butter": [
      basic("Peanut butter", { dataType: "Survey (FNDDS)" }),
      basic("Peanut butter, smooth style, with salt"),
      product("CREAMY PEANUT BUTTER", "The J.M. Smucker Company", {
        householdServingFullText: "2 Tbsp",
        servingSize: 32,
      }),
    ],
    cheerios: [
      product("CHEERIOS", "General Mills Sales Inc.", {
        brandName: "CHEERIOS",
      }),
      product("HONEY NUT CHEERIOS", "General Mills Sales Inc."),
      basic("Cereals ready-to-eat, GENERAL MILLS, CHEERIOS"),
    ],
    rice: [
      basic("Rice, brown, long-grain, cooked"),
      basic("Rice, white, cooked, no added fat", {
        dataType: "Survey (FNDDS)",
      }),
      product("RICE", "Great Value", {
        householdServingFullText: "1/4 cup dry",
        servingSize: 45,
      }),
    ],
  };
  // A product that matches no ingredient, for At home's "Counts as?".
  pages.mystery = [product("MYSTERY CRUNCH BAR", "Trail Snacks Co.")];
  const requests = [];
  let mode = "local-snapshot";
  await context.route("**/api/foods/status", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ mode }),
    }),
  );
  await context.route("**/api/foods/search?*", (route) => {
    const q = new URL(route.request().url()).searchParams.get("q");
    requests.push(q);
    const foods = pages[q.toLowerCase()] || [];
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        foods,
        totalHits: foods.length,
        hasMore: false,
        mode,
      }),
    });
  });
  const rows = (dialog) => dialog.locator(".food-results li.food-result-row");
  const openSearch = async () => {
    await p.goto(`${base}#/food/log`);
    await p.getByRole("button", { name: "Log food", exact: true }).click();
    const dialog = p.getByRole("dialog", { name: "Log food" });
    await dialog.getByRole("searchbox").waitFor();
    return dialog;
  };
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Search test");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();

    // Local catalog: typing searches after 300 ms, once, with no button.
    let dialog = await openSearch();
    const box = dialog.getByRole("searchbox");
    if (!(await box.evaluate((node) => node === document.activeElement)))
      throw new Error("Search field is not focused");
    if (await dialog.getByRole("button", { name: /^Search foods?$/ }).count())
      throw new Error("An explicit Search button is still shown");
    await box.pressSequentially("banana", { delay: 40 });
    await rows(dialog).first().waitFor();
    await p.waitForTimeout(400);
    if (requests.join() !== "banana")
      throw new Error(
        `Debounce sent ${requests.length} requests: ${requests.join(", ")}`,
      );
    result.checks.push(
      "Search is focused, has no Search button, and typing “banana” sends one request after the 300 ms pause.",
    );

    for (const [query, first, line] of [
      ["banana", "Bananas, raw", "Basic food · 1 medium, 118 g"],
      ["peanut butter", "Peanut butter", "Basic food · 2 tbsp, 32 g"],
      ["cheerios", "Cheerios", "Brand: Cheerios · 1 cup, 28 g"],
      [
        "rice",
        "Rice, brown, long-grain, cooked",
        "Basic food · 1 cup cooked, 158 g",
      ],
    ]) {
      await box.fill(query);
      await rows(dialog)
        .first()
        .getByRole("heading", { name: first, exact: true })
        .waitFor();
      const top = await rows(dialog).first().innerText();
      if (!top.includes(line))
        throw new Error(`${query}: first row reads ${top}`);
      const text = await dialog.locator(".food-results").innerText();
      if (
        /SR Legacy|FNDDS|Foundation|Branded|kcal|results?\b.*\d|\d+ results/i.test(
          text,
        )
      )
        throw new Error(`${query}: database labels, kcal or counts shown`);
      // The label line shows once above the results, not on every row.
      if (text.split("Allergies: check every label.").length !== 2)
        throw new Error(`${query}: the label line is not shown exactly once`);
      for (const row of await rows(dialog).all()) {
        const rowText = await row.innerText();
        if (rowText.includes("Allergies: check every label."))
          throw new Error(`${query}: a row repeats the label line`);
        if (
          rowText.includes("Brand: ") &&
          !rowText.includes("Allergens: check the package.")
        )
          throw new Error(`${query}: a product is missing the allergen line`);
        for (const line of [
          "Allergens: check the package.",
          "Allergies: check every label.",
        ])
          if (rowText.split(line).length > 2)
            throw new Error(`${query}: "${line}" shows twice on a row`);
      }
      if (query === "banana")
        await dialog
          .getByRole("button", { name: "Add Bananas, raw, 1 medium, 118 g" })
          .waitFor();
      if (query === "cheerios") {
        await p.setViewportSize({ width: 1280, height: 900 });
        await p.screenshot({
          path: "output/playwright/search-cheerios-1280.png",
        });
        await p.setViewportSize({ width: 390, height: 844 });
        await p.screenshot({
          path: "output/playwright/search-cheerios-390.png",
        });
      }
    }
    result.checks.push(
      "banana, peanut butter, cheerios and rice: sentence-case names, “Basic food” or “Brand: …” with a portion hint, the allergen line on products and the label line on every row (each once), and no database labels, kcal or counts.",
    );

    // Add opens the portion sheet.
    await box.fill("banana");
    await dialog
      .getByRole("button", { name: "Add Bananas, raw, 1 medium, 118 g" })
      .click();
    await dialog.getByText("Usual portion: 1 medium, 118 g").waitFor();
    await dialog.getByText("From USDA food data").waitFor();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    result.checks.push(
      "Add opens the portion sheet with the portion hint and the quiet source line.",
    );

    // FOOD-05: a double tap on the Save star saves once (not save + unsave).
    dialog = await openSearch();
    await dialog.getByRole("searchbox").fill("cheerios");
    const star = dialog.getByRole("button", {
      name: "Save Honey nut cheerios",
    });
    await star.dblclick();
    await p.waitForTimeout(800);
    if ((await star.getAttribute("aria-pressed")) !== "true")
      throw new Error("A double tap on the Save star left the food unsaved");
    // Log Cheerios so it shows under Recent.
    await dialog.getByRole("button", { name: /^Add Cheerios, / }).click();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    result.checks.push(
      "FOOD-05: a double tap on a result's Save star saves it once.",
    );

    // P0-06: Recent and Saved list products with the label line above them.
    dialog = await openSearch();
    // The Log dialog keeps the last query; clear it for the idle lists.
    await dialog.getByRole("searchbox").fill("");
    const recent = dialog.getByRole("region", { name: "Recent" });
    const saved = dialog.getByRole("region", { name: "Saved" });
    for (const [list, name] of [
      [recent, "Cheerios"],
      [saved, "Honey nut cheerios"],
    ]) {
      const row = list
        .locator("li.food-result-row")
        .filter({ has: p.getByRole("heading", { name, exact: true }) });
      const text = await row.innerText();
      if (!text.includes("Brand: ") || !text.includes("Allergens: check"))
        throw new Error(
          `${name} in the idle list lacks its brand or allergen line`,
        );
    }
    const idle = await dialog.innerText();
    if (idle.split("Allergies: check every label.").length !== 2)
      throw new Error("Recent and Saved do not show the label line once");
    result.checks.push(
      "P0-06: Recent and Saved show products with their allergen line and the label line once above them.",
    );
    await dialog.getByRole("button", { name: "Close Log food" }).click();

    // P0-06: a product added At home that matches no ingredient opens
    // "Counts as?", which keeps the allergen and label lines.
    await p.goto(`${base}#/food/home`);
    await p.getByRole("button", { name: "Add food", exact: true }).click();
    const homeAdd = p.getByRole("dialog", { name: "Add food at home" });
    await homeAdd.getByRole("searchbox").fill("mystery");
    await homeAdd
      .getByRole("button", { name: /^Add Mystery crunch bar/ })
      .click();
    const countsAs = p.getByRole("dialog", { name: "Counts as?" });
    await countsAs.getByText("Allergies: check every label.").waitFor();
    await countsAs.getByText("Allergens: check the package.").waitFor();
    await countsAs.getByRole("button", { name: "Skip" }).click();
    await countsAs.waitFor({ state: "hidden" });
    result.checks.push(
      "P0-06: At home “Counts as?” for a branded product shows the allergen and label lines.",
    );

    // API fallback mode: search waits for Enter, protecting the limited key.
    mode = "limited-demo";
    requests.length = 0;
    dialog = await openSearch();
    await dialog.getByRole("searchbox").fill("rice");
    await dialog.getByText("Press Enter to search.").waitFor();
    await p.waitForTimeout(500);
    if (requests.length) throw new Error("API mode searched without Enter");
    await dialog.getByRole("searchbox").press("Enter");
    await rows(dialog).first().waitFor();
    if (requests.join() !== "rice")
      throw new Error("Enter did not search once");
    result.checks.push(
      "With the live USDA API, search runs on Enter only (one request).",
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
