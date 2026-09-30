// Playwright snippet: accessibility pass (P1-13, audit 9.4 and 9.6).
// Runs axe-core on every route and the key dialog and sheet states at 390 and
// 1280 px and fails on any serious or critical violation. Then checks keyboard
// use: skip link and tab order through the frame nav, focus on the page H1 and
// a live announcement on route change, a dialog opened and closed from the
// keyboard with focus returned, and a row menu worked with arrow keys and
// Escape. The food search API is mocked so this runs offline.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const AxeBuilder = globalThis.AxeBuilder;
  if (!AxeBuilder)
    throw new Error("Run through scripts/run-browser-checks.mjs");
  const browser = page.context().browser();
  const result = { checks: [], errors: [], warnings: [] };
  const serious = [];
  const moderate = new Map();
  let scans = 0;
  let p;
  let context;

  const open = async (width) => {
    context = await browser.newContext({
      viewport: { width, height: width < 768 ? 844 : 900 },
    });
    p = await context.newPage();
    p.setDefaultTimeout(15000);
    p.on("pageerror", (e) => result.errors.push(e.message));
    await p.clock.setFixedTime(new Date(2026, 8, 29, 15, 0, 0));
    await context.route("**/api/foods/status", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ mode: "local-snapshot" }),
      }),
    );
    await context.route("**/api/foods/search?*", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          foods: [
            { fdcId: 1, description: "Bananas, raw", dataType: "SR Legacy" },
            {
              fdcId: 2,
              description: "BANANA CHIPS",
              dataType: "Branded",
              brandOwner: "Great Value",
              servingSize: 28,
              servingSizeUnit: "g",
              householdServingFullText: "1 cup",
            },
          ],
          totalHits: 2,
          hasMore: false,
          mode: "local-snapshot",
        }),
      }),
    );
  };

  const failures = [];
  // Run one part of the walk; a broken step is recorded and the walk goes on,
  // so one run reports every axe problem.
  const attempt = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      failures.push(`${name}: ${e.message.split("\n").slice(0, 3).join(" ")}`);
      await p.keyboard.press("Escape").catch(() => {});
    }
  };
  // Runs in the page: interactive controls under 44 × 44 px (24 px for an
  // inline link in a sentence). A chip's or segment's ::after touch area and a
  // checkbox's wrapping label count toward the size (audit 9.6).
  const smallTargets = () => {
    const px = (v) => (v === "auto" ? null : parseFloat(v));
    const out = [];
    // With a modal open, only its controls can be reached.
    const modal = [...document.querySelectorAll("dialog[open]")].at(-1);
    for (const el of document.querySelectorAll(
      'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=menuitem], [tabindex="0"]',
    )) {
      if (el.closest("[aria-hidden=true], [inert], dialog:not([open])"))
        continue;
      if (el.matches(".sr-only, .skip-link")) continue;
      if (modal && !modal.contains(el)) continue;
      const target =
        el.matches("input[type=checkbox], input[type=radio]") &&
        el.closest("label")
          ? el.closest("label")
          : el;
      const r = target.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (getComputedStyle(target).visibility === "hidden") continue;
      let w = r.width;
      let h = r.height;
      const after = getComputedStyle(target, "::after");
      if (after.content !== "none" && after.position === "absolute") {
        const [t, b, l, rt] = ["top", "bottom", "left", "right"].map((k) =>
          px(after[k]),
        );
        if (t !== null && b !== null) h = Math.max(h, r.height - t - b);
        if (l !== null && rt !== null) w = Math.max(w, r.width - l - rt);
      }
      const min =
        el.tagName === "A" && getComputedStyle(el).display === "inline"
          ? 24
          : 44;
      if (w < min - 0.5 || h < min - 0.5)
        out.push(
          `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}" ${Math.round(w)}×${Math.round(h)}`,
        );
    }
    return [...new Set(out)];
  };
  const small = [];

  const scan = async (name, width) => {
    await p.waitForTimeout(250); // let sheet entry transitions settle
    const { violations } = await new AxeBuilder({ page: p })
      .withTags([
        "wcag2a",
        "wcag2aa",
        "wcag21a",
        "wcag21aa",
        "wcag22aa",
        "best-practice",
      ])
      .analyze();
    scans++;
    for (const target of await p.evaluate(smallTargets))
      small.push(`${name} @${width}: ${target}`);
    for (const v of violations) {
      const where = `${name} @${width}`;
      if (v.impact === "serious" || v.impact === "critical")
        serious.push(
          `${where}: ${v.impact} ${v.id} (${v.nodes.length}) ${v.nodes
            .slice(0, 3)
            .map((n) => n.target.join(" "))
            .join(" | ")}`,
        );
      else
        moderate.set(`${v.impact} ${v.id}`, [
          ...(moderate.get(`${v.impact} ${v.id}`) || []),
          where,
        ]);
    }
  };

  const go = async (route, heading) => {
    await p.goto(`${base}#/${route}`);
    if (heading)
      await p
        .getByRole("heading", { name: heading, level: 1 })
        .first()
        .waitFor();
    else await p.locator("main").waitFor();
  };
  const next = () =>
    p.getByRole("button", { name: "Next", exact: true }).click();
  const step = (title) =>
    p.getByRole("heading", { name: title, level: 1 }).waitFor();
  const closeDialog = async (dialog) => {
    await p.keyboard.press("Escape");
    // Clean sheets close at once; a dirty one asks first.
    const discard = p.getByRole("button", { name: /^Discard/ });
    if (await discard.isVisible().catch(() => false)) await discard.click();
    await dialog.waitFor({ state: "hidden" });
  };

  const walk = async (width) => {
    await open(width);
    await attempt(`Welcome and setup @${width}`, async () => {
      await p.goto(base);
      await p.getByRole("button", { name: "Get started" }).waitFor();
      await scan("Welcome (first visit)", width);
      await p.getByRole("button", { name: "Get started" }).click();
      await step("What do you play?");
      await scan("Setup 1", width);
      await next();
      await p.getByText("Enter your sport.").waitFor();
      await scan("Setup 1 with error", width);
      await p.getByRole("textbox", { name: /First name/ }).fill("Axe");
      await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
      await next();
      await step("Your school day");
      await scan("Setup 2", width);
      await next();
      await step("Practices and games");
      await p
        .getByRole("group", { name: "Practice days" })
        .getByRole("button", { name: "Tuesday" })
        .click();
      await scan("Setup 3", width);
      await next();
      await step("Food at school");
      await scan("Setup 4", width);
      await next();
      await step("Food needs");
      await scan("Setup 5", width);
      await next();
      await step("You're set");
      await scan("Setup 6", width);
      await p.getByRole("button", { name: "Open Today" }).click();
      await go("today", "Today");
      await scan("Today", width);
    });

    await attempt(`Schedule @${width}`, async () => {
      await go("schedule", "Schedule");
      await scan("Schedule week", width);
      await p
        .getByRole("button", { name: "+ Add", exact: true })
        .first()
        .click();
      const activity = p.getByRole("dialog", { name: "Add practice" });
      await activity.waitFor();
      await scan("Activity sheet", width);
      await activity.getByLabel("Ends").fill("06:00");
      await activity
        .getByRole("button", { name: "Add practice", exact: true })
        .click();
      await activity.getByText(/End time must be later/).waitFor();
      await scan("Activity sheet with a field error", width);
      await closeDialog(activity);
      await p.getByRole("button", { name: "School day", exact: true }).click();
      const school = p.getByRole("dialog", { name: "School day" });
      await school.waitFor();
      await scan("School-day sheet", width);
      await closeDialog(school);
      await p.getByRole("radio", { name: "Month" }).click();
      await scan("Schedule month", width);
    });

    await attempt(`Food Ideas, At home, Groceries @${width}`, async () => {
      await go("food/ideas");
      await scan("Food Ideas", width);
      await go("food/home");
      await p.getByRole("button", { name: "+ Bananas" }).click();
      await p.getByRole("radiogroup", { name: "Bananas stock" }).waitFor();
      await scan("At home", width);
      await attempt(`At home menu @${width}`, async () => {
        await p.getByLabel("Bananas options").click();
        await p.getByRole("menu").first().waitFor({ timeout: 2000 });
        await scan("At home row menu open", width);
        await p.keyboard.press("Escape");
      });
      await go("food/groceries");
      await p.getByRole("button", { name: "Add food for this week" }).click();
      const week = p.getByRole("dialog", { name: "Add food for this week" });
      await week.waitFor();
      await scan("Add food for this week sheet", width);
      for (const box of await week.getByRole("checkbox").all())
        await box.check();
      await week.getByRole("button", { name: "Add selected" }).click();
      await week.waitFor({ state: "hidden" });
      await scan("Groceries", width);
    });

    await attempt(`Log, search and portion @${width}`, async () => {
      await go("food/log");
      await scan("Log Day", width);
      await p.getByRole("button", { name: "Log food", exact: true }).click();
      const search = p.getByRole("dialog", { name: "Log food" });
      await search.getByRole("searchbox").waitFor();
      await scan("Search dialog", width);
      await search.getByRole("searchbox").fill("banana");
      await search.locator(".food-results li").first().waitFor();
      await scan("Search dialog with results", width);
      await search.getByRole("searchbox").fill("");
      await search
        .getByRole("button", { name: "Bananas", exact: true })
        .click();
      await search.getByText("Nutrition details (optional)").waitFor();
      await scan("Portion sheet", width);
      await search.getByRole("button", { name: "Save", exact: true }).click();
      await search.waitFor({ state: "hidden" });
      await scan("Log Day with an entry and toast", width);
      await go("food/log/week");
      await scan("Log Week", width);
    });

    await attempt(`You and other pages @${width}`, async () => {
      await go("you", "You");
      await scan("You", width);
      for (const [route, name] of [
        ["you/sport", "Sport & season"],
        ["you/needs", "Food needs & allergies"],
        ["you/access", "Food access"],
        ["you/reminders", "Reminders"],
      ]) {
        await p.goto(`${base}#/${route}`);
        await p.getByRole("dialog", { name }).waitFor();
        await scan(`You › ${name} sheet`, width);
      }
      await go("you/device");
      await scan("This device", width);
      await go("you/about");
      await scan("About", width);
      await go("nowhere", "Page not found");
      await scan("Not found", width);
      await go("welcome");
      await p.getByRole("heading", { name: "Who's using Nourally?" }).waitFor();
      await scan("Welcome (athlete chooser)", width);
    });
  };

  const focused = () =>
    p.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName.toLowerCase(),
        name: (el?.getAttribute("aria-label") || el?.textContent || "").trim(),
        level: el?.tagName.match(/^H(\d)$/)?.[1] || "",
      };
    });

  try {
    await walk(390);
    await context.close();
    await walk(1280);

    for (const [rule, where] of moderate)
      result.warnings.push(
        `axe ${rule} on ${where.length} scans (${where[0]}…)`,
      );
    if (small.length)
      failures.push(
        `Targets under 44 × 44 px:\n    ${small.slice(0, 20).join("\n    ")}`,
      );
    if (failures.length || serious.length)
      throw new Error(
        [
          failures.length && `Walk steps failed:\n  ${failures.join("\n  ")}`,
          serious.length &&
            `axe found ${serious.length} serious or critical violations in ${scans} scans:\n  ${serious.join("\n  ")}`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    result.checks.push(
      `axe: ${scans} scans (every route, setup step and key dialog, sheet and menu state at 390 and 1280 px) have zero serious or critical violations.`,
      "Every visible control in those scans is at least 44 × 44 px (inline links in sentences at least 24 px).",
    );

    // Keyboard: skip link first, then the frame nav in order.
    await go("today", "Today");
    await p.locator("body").focus();
    await p.evaluate(() => document.activeElement?.blur());
    const order = [];
    for (let i = 0; i < 6; i++) {
      await p.keyboard.press("Tab");
      order.push((await focused()).name);
    }
    const want = [
      "Skip to content",
      "Today",
      "Schedule",
      "Food",
      "You",
      "Switch athlete",
    ];
    if (order.join("|") !== want.join("|"))
      throw new Error(`Tab order is ${order.join(" → ")}`);
    const visible = await p.evaluate(() => {
      const style = getComputedStyle(document.activeElement);
      return (
        style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2
      );
    });
    if (!visible) throw new Error("Focused nav item has no visible focus ring");
    // Enter on the focused Schedule item: the H1 takes focus and is announced.
    await p.keyboard.press("Shift+Tab");
    await p.keyboard.press("Shift+Tab");
    await p.keyboard.press("Shift+Tab");
    await p.keyboard.press("Enter");
    await p.getByRole("heading", { name: "Schedule", level: 1 }).waitFor();
    await p.waitForFunction(
      () =>
        document.activeElement?.tagName === "H1" &&
        /Schedule/.test(
          document.querySelector("#route-announcer")?.textContent || "",
        ),
    );
    if ((await p.title()) !== "Schedule · Nourally")
      throw new Error(`Page title is ${await p.title()}`);
    result.checks.push(
      "Tab order: Skip to content → Today → Schedule → Food → You → Switch athlete with a visible ring; Enter on Schedule focuses its H1, announces it and sets the title “Schedule · Nourally”.",
    );

    // Dialog: open with the keyboard, focus the first control (the Type chips,
    // not ×), Tab stays inside, Escape closes and returns focus to the trigger.
    const add = p.getByRole("button", { name: "+ Add", exact: true }).first();
    await add.focus();
    await p.keyboard.press("Enter");
    const dialog = p.getByRole("dialog", { name: "Add practice" });
    await dialog.waitFor();
    const first = await dialog.evaluate(
      (d) =>
        d.contains(document.activeElement) &&
        document.activeElement.textContent.trim() === "Practice",
    );
    if (!first) throw new Error("Dialog did not focus its first control");
    for (let i = 0; i < 40; i++) {
      await p.keyboard.press("Tab");
      if (!(await dialog.evaluate((d) => d.contains(document.activeElement))))
        throw new Error("Tab left the open dialog");
    }
    await p.keyboard.press("Escape");
    const discard = p.getByRole("button", { name: "Discard", exact: true });
    if (await discard.isVisible().catch(() => false))
      throw new Error("A clean activity sheet asked to discard changes");
    await dialog.waitFor({ state: "hidden" });
    if (!(await add.evaluate((b) => b === document.activeElement)))
      throw new Error("Focus did not return to + Add after Escape");
    // Dirty close asks first and keeps the sheet on Keep editing.
    await p.keyboard.press("Enter");
    await dialog.waitFor();
    for (let i = 0; i < 10; i++) {
      if ((await focused()).tag === "input") break;
      await p.keyboard.press("Tab");
    }
    await p.keyboard.type("Keyboard practice");
    await p.keyboard.press("Escape");
    const confirm = p.getByRole("dialog", { name: "Discard changes?" });
    await confirm.waitFor();
    await confirm.getByRole("button", { name: "Keep editing" }).click();
    await confirm.waitFor({ state: "hidden" });
    await dialog.waitFor();
    await p.keyboard.press("Escape");
    await confirm.getByRole("button", { name: "Discard", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    if (!(await add.evaluate((b) => b === document.activeElement)))
      throw new Error("Focus did not return to + Add after Discard");
    result.checks.push(
      "Add practice opens from the keyboard with its first control (Type) focused, not ×; Tab stays in the dialog; Escape closes and returns focus to + Add; a dirty sheet asks “Discard changes?” first.",
    );

    // Row menu: Enter opens and focuses the first item, arrows move, Escape
    // closes and returns focus to the trigger.
    await go("food/home");
    const trigger = p.getByRole("button", { name: "Bananas options" });
    await trigger.focus();
    if ((await trigger.getAttribute("aria-haspopup")) !== "menu")
      throw new Error("Row menu trigger has no aria-haspopup=menu");
    await p.keyboard.press("Enter");
    const menu = p.getByRole("menu");
    await menu.waitFor();
    if ((await trigger.getAttribute("aria-expanded")) !== "true")
      throw new Error("Row menu trigger is not aria-expanded");
    const items = await menu.getByRole("menuitem").allInnerTexts();
    const at = async () => (await focused()).name;
    if ((await at()) !== items[0].trim())
      throw new Error(`Menu opened on ${await at()}, not ${items[0]}`);
    await p.keyboard.press("ArrowDown");
    if ((await at()) !== items[1].trim())
      throw new Error(`ArrowDown moved to ${await at()}`);
    await p.keyboard.press("ArrowUp");
    await p.keyboard.press("ArrowUp");
    if ((await at()) !== items.at(-1).trim())
      throw new Error(`ArrowUp from the first item moved to ${await at()}`);
    await p.keyboard.press("Home");
    if ((await at()) !== items[0].trim())
      throw new Error(`Home moved to ${await at()}`);
    await p.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    if (!(await trigger.evaluate((b) => b === document.activeElement)))
      throw new Error("Escape did not return focus to the menu trigger");
    await p.keyboard.press("ArrowDown");
    await menu.waitFor();
    await p.keyboard.press("Tab");
    await menu.waitFor({ state: "hidden" });
    result.checks.push(
      `Row menu: button[aria-haspopup=menu] opens on Enter with “${items[0].trim()}” focused; ArrowDown/ArrowUp wrap, Home jumps; Escape closes and refocuses the trigger; Tab closes it.`,
    );

    // Month grid: one tab stop; arrows move the selected day, Page Down the month.
    await go("schedule", "Schedule");
    await p.getByRole("radio", { name: "Month" }).click();
    const days = p.getByRole("group", { name: /^Days in / });
    const stop = days.locator('button[tabindex="0"]');
    if ((await stop.count()) !== 1)
      throw new Error("The month grid does not have exactly one tab stop");
    const from = await stop.getAttribute("data-key");
    await stop.focus();
    await p.keyboard.press("ArrowRight");
    const dayAfter = await p.evaluate(() => document.activeElement.dataset.key);
    const expected = new Date(`${from}T12:00:00`);
    expected.setDate(expected.getDate() + 1);
    const nextKey = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, "0")}-${String(expected.getDate()).padStart(2, "0")}`;
    if (dayAfter !== nextKey)
      throw new Error(`ArrowRight moved from ${from} to ${dayAfter}`);
    if (
      (await p.evaluate(() =>
        document.activeElement.getAttribute("aria-pressed"),
      )) !== "true"
    )
      throw new Error("The focused day is not aria-pressed");
    await p.keyboard.press("ArrowDown");
    await p.keyboard.press("PageDown");
    const month = await days.getAttribute("aria-label");
    if (
      month ===
        `Days in ${await p.locator(".calendar-toolbar h2").innerText()}` &&
      (await p.evaluate(
        () => document.activeElement?.closest(".calendar-grid") !== null,
      ))
    )
      result.checks.push(
        `Month grid: one tab stop; ArrowRight/ArrowDown move the selected day (aria-pressed) and Page Down opens the next month (${month.replace("Days in ", "")}) with focus kept in the grid.`,
      );
    else throw new Error("Page Down did not keep focus in the month grid");

    // Forced colors: selected and current states keep a system-color outline.
    await p.emulateMedia({ forcedColors: "active" });
    const outlines = await p.evaluate(() => {
      document.activeElement?.blur();
      const style = (el) => el && getComputedStyle(el).outlineStyle;
      return {
        day: style(document.querySelector(".calendar-day.selected")),
        other: style(
          document.querySelector(".calendar-day:not(.selected):not(.today)"),
        ),
        nav: style(document.querySelector('.frame-nav [aria-current="page"]')),
        segment: style(
          document.querySelector('[role="radio"][aria-checked="true"]'),
        ),
      };
    });
    if (
      outlines.day !== "solid" ||
      outlines.nav !== "solid" ||
      outlines.segment !== "solid" ||
      outlines.other !== "none"
    )
      throw new Error(`Forced colors outlines: ${JSON.stringify(outlines)}`);
    await p.emulateMedia({ forcedColors: "none" });
    result.checks.push(
      "Forced colors: the selected day, the current nav item and the checked segment keep a solid system-color outline; other days have none.",
    );

    // Reduced motion: no transform animation on the sheet.
    await p.emulateMedia({ reducedMotion: "reduce" });
    await go("schedule", "Schedule");
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    const moving = await dialog.evaluate(
      (d) =>
        d
          .getAnimations({ subtree: true })
          .some((a) =>
            (a.effect?.getKeyframes?.() || []).some(
              (k) => k.transform && k.transform !== "none",
            ),
          ) || getComputedStyle(d).transitionProperty.includes("transform"),
    );
    if (moving)
      throw new Error("A transform animation runs with reduced motion on");
    result.checks.push(
      "With reduced motion on, the sheet opens without a transform animation.",
    );
    return result;
  } catch (e) {
    return {
      ...result,
      failure: e.message,
      last: p
        ? await p
            .locator("body")
            .innerText()
            .catch(() => "")
        : "",
    };
  } finally {
    await context?.close();
  }
};
