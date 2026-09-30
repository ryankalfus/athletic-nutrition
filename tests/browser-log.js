// Playwright snippet: Food › Log Day and Week (P1-08, audit 6.8, 6.11, 6.12).
// No network needed: logs Quick basics and a planned idea. Screenshots of Day and
// Week at 390 and 1280 px go to output/playwright/.
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
  const main = () => p.getByRole("main");
  const timeline = () => p.locator("ol.log-timeline");
  const row = (name) =>
    p.locator("li.log-entry").filter({ has: p.getByRole("heading", { name }) });
  const keys = await p.evaluate(() => {
    const key = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const now = new Date();
    const yesterday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      12,
    );
    return { today: key(now), yesterday: key(yesterday) };
  });
  const label = (
    key,
    options = { weekday: "short", month: "short", day: "numeric" },
  ) =>
    new Intl.DateTimeFormat("en-US", options).format(
      new Date(`${key}T12:00:00`),
    );
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Log test");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();

    // A practice today (context row) and bananas at home with an exact count.
    await p.goto(`${base}#/schedule`);
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    const sheet = p.getByRole("dialog", { name: "Add practice" });
    await sheet
      .getByRole("button", { name: "Add practice", exact: true })
      .click();
    await sheet.waitFor({ state: "hidden" });
    await p.goto(`${base}#/food/home`);
    await p.getByRole("button", { name: "Add Bananas", exact: true }).click();
    const bananas = p
      .locator(".stock-row")
      .filter({ has: p.getByText("Bananas", { exact: true }) });
    await bananas.getByRole("button", { name: "Bananas options" }).click();
    await bananas.getByRole("menuitem", { name: "Edit details" }).click();
    const details = p.getByRole("dialog");
    await details
      .getByRole("combobox", { name: "Amount type" })
      .selectOption({ label: "Exact quantity" });
    await details.getByRole("spinbutton", { name: "Amount left" }).fill("3");
    await details.getByRole("button", { name: "Save details" }).click();
    await details.waitFor({ state: "hidden" });

    // Day view: today, the practice as a context row, the Day/Week control.
    await p.goto(`${base}#/food/log`);
    await p
      .getByRole("heading", { name: `Today · ${label(keys.today)}` })
      .waitFor();
    await p
      .getByRole("radiogroup", { name: "Log view" })
      .getByRole("radio", { name: "Day", checked: true })
      .waitFor();
    await p
      .getByRole("button", { name: /^Next day, / })
      .and(p.locator("[disabled]"))
      .waitFor();
    await timeline()
      .locator("li.log-activity")
      .getByText(/practice/i)
      .waitFor();
    if (await main().getByText("Calories are optional").count())
      throw new Error("Empty state still says Calories are optional (LOG-08)");
    if (
      await main()
        .getByRole("button", { name: /Export/ })
        .count()
    )
      throw new Error("Log shows an export control (HIST-02)");
    result.checks.push(
      "#/food/log shows Today with Day selected, › disabled, the practice as a context row, no export and no calorie line.",
    );

    // Log a food: search is focused; the portion sheet shows the portion hint,
    // the source line and calories only under Nutrition details.
    await p.getByRole("button", { name: "Log food", exact: true }).click();
    const search = p.getByRole("dialog", { name: "Log food" });
    if (
      !(await search
        .getByRole("searchbox")
        .evaluate((node) => node === document.activeElement))
    )
      throw new Error("Search field is not focused when Log food opens");
    await search
      .getByRole("button", { name: "Add Bananas", exact: true })
      .click();
    await search.getByText("Usual portion: 1 medium, 118 g").waitFor();
    await search.getByText("Added by you").waitFor();
    await search.getByText("Nutrition details (optional)").waitFor();
    const time = await search.getByLabel("Time eaten").inputValue();
    if (!/^\d\d:\d\d$/.test(time))
      throw new Error(`No time for today: ${time}`);
    await search.getByRole("button", { name: "Save", exact: true }).click();
    await search.waitFor({ state: "hidden" });
    await p.getByRole("status").getByText("Logged Bananas.").waitFor();
    await p.getByRole("status").getByRole("button", { name: "Undo" }).waitFor();
    await row("Bananas").getByText("118 g").waitFor();
    if (/kcal/.test(await timeline().innerText()))
      throw new Error("A log row renders kcal (LOG-02)");
    result.checks.push(
      "Log food focuses search; Bananas logs 118 g with the portion hint, source line, a Logged toast with Undo, and no kcal on the row.",
    );

    // LOG-05: the At home prompt deducts only the matched row.
    await p.getByText("Used bananas from home?").waitFor();
    await p.getByRole("button", { name: "Yes", exact: true }).click();
    const use = p.getByRole("dialog", { name: "Use food from home" });
    if ((await use.getByRole("spinbutton").count()) !== 1)
      throw new Error("Use from home lists rows that did not match");
    await use.getByRole("spinbutton", { name: /^Bananas — 3/ }).fill("1");
    await use.getByRole("button", { name: "Save", exact: true }).click();
    await use.waitFor({ state: "hidden" });
    await row("Bananas").getByText("Used from At home").waitFor();
    result.checks.push(
      "After logging, “Used bananas from home?” Yes takes 1 from the matched At home row only.",
    );

    // LOG-04: editing keeps the time.
    const shownTime = await row("Bananas").locator(".log-time").innerText();
    await row("Bananas")
      .getByRole("button", { name: "Bananas options" })
      .click();
    await row("Bananas").getByRole("menuitem", { name: "Edit" }).click();
    const edit = p.getByRole("dialog", { name: "Edit food" });
    await edit.getByRole("spinbutton", { name: "Amount eaten" }).fill("150");
    await edit.getByRole("button", { name: "Save", exact: true }).click();
    await edit.waitFor({ state: "hidden" });
    await row("Bananas").getByText("150 g").waitFor();
    if ((await row("Bananas").locator(".log-time").innerText()) !== shownTime)
      throw new Error("Editing changed the entry time");
    await p.getByRole("status").getByText("Updated Bananas.").waitFor();
    result.checks.push(
      "Editing an entry keeps its time and shows Updated with Undo.",
    );

    // Water: explicit amounts only.
    const water = p.getByRole("region", { name: "Water" });
    await water.getByText("No water logged").waitFor();
    await water.getByRole("button", { name: "+ Water" }).click();
    await water.getByText("8 oz").waitFor();

    await p.setViewportSize({ width: 1280, height: 900 });
    await p.screenshot({
      path: "output/playwright/log-day-1280.png",
      fullPage: true,
    });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({
      path: "output/playwright/log-day-390.png",
      fullPage: true,
    });

    // Previous day: same tools, approximate time, Back to today.
    await p
      .getByRole("button", {
        name: `Previous day, ${label(keys.yesterday).replace(",", "")}`,
      })
      .click();
    await p.waitForURL(new RegExp(`#/food/log/${keys.yesterday}$`));
    await p
      .getByRole("heading", { name: `Yesterday · ${label(keys.yesterday)}` })
      .waitFor();
    await p.getByText(`Nothing logged on ${label(keys.yesterday)}.`).waitFor();
    await p.getByRole("button", { name: "Log food", exact: true }).click();
    const past = p.getByRole("dialog", { name: "Log food" });
    await past.getByRole("button", { name: "Add Apples", exact: true }).click();
    await past.getByRole("button", { name: "Save", exact: true }).click();
    await past.getByText("Choose about when you ate it.").waitFor();
    await past.getByRole("radio", { name: "Morning" }).click();
    await past.getByRole("button", { name: "Save", exact: true }).click();
    await past.waitFor({ state: "hidden" });
    await row("Apples").locator(".log-time").getByText("Morning").waitFor();
    await p.getByRole("button", { name: "Back to today" }).click();
    await p.waitForURL(/#\/food\/log$/);
    result.checks.push(
      "‹ opens yesterday by URL with the same tools; a past entry needs Morning/Midday/Afternoon/Evening or a time; Back to today returns.",
    );

    // A past date opened by URL, and #/history redirects without a loop.
    await p.goto(`${base}#/food/log/${keys.yesterday}`);
    await row("Apples").waitFor();
    await p.getByRole("button", { name: "Back to today" }).waitFor();
    await p.goto(`${base}#/today`);
    await p.goto(`${base}#/history`);
    await p.waitForURL(/#\/food\/log$/);
    await p.goBack();
    await p.waitForURL(/#\/today$/);
    await p.goto(`${base}#/weekly`);
    await p.waitForURL(/#\/food\/log\/week$/);
    result.checks.push(
      "A past date by URL shows its entries and Back to today; #/history and #/weekly redirect and Back does not loop.",
    );

    // LOG-03: a plan logs in one tap and becomes Eaten.
    await p.goto(`${base}#/food/ideas`);
    const card = p.locator("article.idea-card").first();
    const idea = await card.getByRole("heading").first().innerText();
    await card.getByRole("button", { name: `Plan ${idea}` }).click();
    await p.getByRole("region", { name: "Planned food" }).waitFor();
    await p.goto(`${base}#/food/log`);
    const plans = p.getByRole("list", { name: "Planned food" });
    await plans.getByText(`Did you eat ${idea}?`).waitFor();
    await plans.getByRole("button", { name: "Yes, as planned" }).click();
    await plans.waitFor({ state: "detached" });
    await row(idea).waitFor();
    await p.getByRole("status").getByText(`Logged ${idea}.`).waitFor();
    await p.goto(`${base}#/food/ideas`);
    await p
      .getByRole("region", { name: "Planned food" })
      .getByText(/· Eaten$/)
      .waitFor();
    await p.goto(`${base}#/today`);
    const now = await p.locator("#now-title").innerText();
    if (now.startsWith(`${idea} is`))
      throw new Error(`Today's Now card still shows the eaten plan: ${now}`);
    result.checks.push(
      `“Did you eat ${idea}?” → Yes, as planned logs it in one tap, the plan reads Eaten, and Today's Now card moves on.`,
    );

    // "Changed it" opens the plan's ingredients to adjust, then logs it.
    await p.goto(`${base}#/food/ideas`);
    const second = p.locator("article.idea-card").nth(1);
    const idea2 = await second.getByRole("heading").first().innerText();
    await second.getByRole("button", { name: `Plan ${idea2}` }).click();
    await p.goto(`${base}#/food/log`);
    await p
      .getByRole("list", { name: "Planned food" })
      .getByRole("button", { name: "Changed it" })
      .click();
    const changed = p.getByRole("dialog", { name: `Log ${idea2}` });
    await changed.getByText("From your plan").waitFor();
    await changed.getByRole("button", { name: "Log it" }).click();
    await changed.waitFor({ state: "hidden" });
    await row(idea2).waitFor();
    result.checks.push(
      `“Changed it” opens ${idea2} with editable amounts and logs it.`,
    );

    // Week: one sentence, seven rows, no chart, streak or percentage.
    await p.goto(`${base}#/food/log`);
    await p
      .getByRole("radiogroup", { name: "Log view" })
      .getByRole("radio", { name: "Week" })
      .click();
    await p.waitForURL(/#\/food\/log\/week$/);
    const week = p.locator(".log-week");
    const sentence = await week.locator(".week-summary").innerText();
    if (
      !/^1 practice\. You planned food for it\.$|^1 practice\. It had no food plan\.$/.test(
        sentence,
      )
    )
      throw new Error(`Unexpected week sentence: ${sentence}`);
    const rows = week.locator("a.week-day-row");
    if ((await rows.count()) !== 7)
      throw new Error("Week does not show 7 day rows");
    const first = await rows.first().innerText();
    if (!first.startsWith(label(keys.today)))
      throw new Error(
        `Newest day is not first or not "Mon, Sep 21" format: ${first}`,
      );
    if (!/3 foods logged/.test(first) || !/8 oz/.test(first))
      throw new Error(`Today row counts are wrong: ${first}`);
    const weekText = await week.innerText();
    if (
      /%|streak|\/7/i.test(weekText) ||
      (await week.locator("svg rect, .bar-track, canvas").count())
    )
      throw new Error("Week shows a percentage, streak or chart");
    if (!weekText.includes("No water logged"))
      throw new Error("Days without water do not read No water logged");
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.screenshot({
      path: "output/playwright/log-week-1280.png",
      fullPage: true,
    });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({
      path: "output/playwright/log-week-390.png",
      fullPage: true,
    });
    await week.getByText("View as table").click();
    await p.waitForFunction(
      () => document.activeElement?.tagName === "CAPTION",
    );
    await week.getByRole("columnheader", { name: "Water" }).waitFor();
    await p
      .getByRole("button", { name: /^Next week, / })
      .and(p.locator("[disabled]"))
      .waitFor();
    await p.getByRole("button", { name: /^Previous week, / }).click();
    await p.waitForURL(/#\/food\/log\/week\/\d{4}-\d{2}-\d{2}$/);
    await p.getByRole("button", { name: /^Next week, / }).click();
    await p.waitForURL(/#\/food\/log\/week$/);
    await rows.nth(1).click();
    await p.waitForURL(new RegExp(`#/food/log/${keys.yesterday}$`));
    await row("Apples").waitFor();
    result.checks.push(
      `Week: "${sentence}", 7 newest-first rows in "Mon, Sep 21" format with food and water, a table with a focused caption, no chart/streak/percentage; ‹ › move a week; a row opens its Day.`,
    );

    // Remove with Undo.
    await p.goto(`${base}#/food/log`);
    await row("Bananas")
      .getByRole("button", { name: "Bananas options" })
      .click();
    await row("Bananas").getByRole("menuitem", { name: "Remove" }).click();
    await p.getByRole("status").getByText("Removed Bananas.").waitFor();
    await p.getByRole("status").getByRole("button", { name: "Undo" }).click();
    await row("Bananas").waitFor();
    result.checks.push(
      "Remove shows a toast whose Undo brings the entry back.",
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
