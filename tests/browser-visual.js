// Playwright snippet: measurable UI review fixes (You/setup, Today/Schedule
// and Food reports, 2026.09.29) so they cannot regress. Each check measures
// geometry or computed style: one-row segmented controls, a Discard confirm
// that is its own sheet or centered dialog, 700 as the heaviest weight, one
// title edge and row across tabs, 48 px inputs, 64 px sheet headers, equal
// footer buttons, round weekday circles, a centered tablet tab group, one rail
// edge, a Now card above the tab bar, a Day rail whose times fit, and the
// Schedule week switcher, day headers, top-bar add and month headers.
// The clock is Tuesday 2026-09-29 10:00 with a 4:00 PM practice today.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const browser = page.context().browser();
  const result = { checks: [], errors: [] };
  const problems = [];
  const fail = (message) => problems.push(message);
  let context;
  let p;
  const open = async (width, height = width < 768 ? 844 : 900) => {
    context = await browser.newContext({ viewport: { width, height } });
    p = await context.newPage();
    p.setDefaultTimeout(15000);
    p.on("pageerror", (e) => result.errors.push(e.message));
    await p.clock.setFixedTime(new Date(2026, 8, 29, 10, 0, 0));
    return p;
  };
  const box = (locator) =>
    locator.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        right: r.right,
        bottom: r.bottom,
      };
    });
  const near = (a, b, tolerance = 1) => Math.abs(a - b) <= tolerance;
  // Walks setup: Maya, Soccer, school Mon–Fri, practice Tuesdays 4:00 PM.
  const setup = async () => {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Maya");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Practices and games" }).waitFor();
    await p
      .getByRole("group", { name: "Practice days" })
      .getByRole("button", { name: "Tuesday" })
      .click();
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Food at school" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
  };
  // Every segment of every visible segmented control shares one row and
  // none of them overflows its label.
  const segmentsOnOneRow = (where) =>
    p.evaluate((where) => {
      const out = [];
      for (const track of document.querySelectorAll(".segmented")) {
        const buttons = [...track.children].filter(
          (b) => b.getClientRects().length,
        );
        if (!buttons.length) continue;
        const tops = new Set(
          buttons.map((b) => Math.round(b.getBoundingClientRect().top)),
        );
        if (tops.size > 1)
          out.push(
            `${where}: "${track.getAttribute("aria-label")}" wraps onto ${tops.size} rows`,
          );
        for (const b of buttons)
          if (b.scrollWidth > b.clientWidth + 1)
            out.push(`${where}: segment "${b.textContent}" overflows`);
      }
      return out;
    }, where);

  try {
    // ---------- 320: setup, segmented controls, weekday circles ----------
    await open(320);
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("heading", { name: "What do you play?" }).waitFor();
    for (const m of await segmentsOnOneRow("Setup step 1 @320")) fail(m);
    const sport = p.getByRole("combobox", { name: /^Sport/ });
    if ((await sport.getAttribute("placeholder")) !== "e.g. Soccer")
      fail(
        `Sport placeholder reads ${await sport.getAttribute("placeholder")}`,
      );
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByText("Enter your sport.").waitFor();
    const order = await p.evaluate(() => {
      const field = document.querySelector(".field input");
      const error = document.querySelector(".field .field-error");
      const hint = document.querySelector(".field .field-hint");
      return [field, error, hint].map((n) =>
        Math.round(n.getBoundingClientRect().top),
      );
    });
    if (!(order[0] < order[1] && order[1] < order[2]))
      fail(`Sport field, error and hint are not in that order: ${order}`);
    await sport.fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    const header = await box(p.locator(".setup-header"));
    if (header.h > 64)
      fail(`Setup step header is ${header.h}px tall at 320 (wraps)`);
    const circles = await p
      .locator(".school-weekdays > button")
      .evaluateAll((all) =>
        all.map((b) => [
          b.getBoundingClientRect().width,
          b.getBoundingClientRect().height,
        ]),
      );
    if (circles.some(([w, h]) => !near(w, h)))
      fail(
        `Weekday circles are not round at 320: ${JSON.stringify(circles[1])}`,
      );
    const inputs = await p
      .locator(".setup-fields input[type=time]")
      .evaluateAll((all) => all.map((i) => i.getBoundingClientRect().height));
    if (inputs.some((h) => !near(h, 48)))
      fail(`Time inputs are ${inputs.join("/")}px, not 48`);
    result.checks.push(
      "320: setup segments stay on one row, Sport reads e.g. Soccer with field → error → hint, step 2's header is one row, weekday circles are round and time inputs are 48 px.",
    );
    await context.close();

    // ---------- 390: Today fold, Day rail, sheets, Discard ----------
    await open(390);
    await setup();
    const now = await box(p.locator(".now-card"));
    const rail = await box(p.locator(".day-rail"));
    if (now.bottom > 844 - 64)
      fail(
        `Now card ends at ${Math.round(now.bottom)}px, under the 64px tab bar`,
      );
    if (rail.y > 844 - 64)
      fail(`Day rail starts below the fold (${Math.round(rail.y)}px)`);
    const chips = await p
      .locator(".today-chips > span")
      .evaluateAll(
        (all) =>
          new Set(all.map((c) => Math.round(c.getBoundingClientRect().top)))
            .size,
      );
    if (chips > 1) fail(`Today day chips take ${chips} rows at 390`);
    const times = await p
      .locator(".day-rail time")
      .evaluateAll((all) =>
        all
          .filter((t) => t.scrollWidth > t.clientWidth + 1)
          .map((t) => t.textContent),
      );
    if (times.length) fail(`Day rail times overflow: ${times.join(", ")}`);
    const marker = await p
      .locator(".day-rail [aria-current=time] .rail-body")
      .innerText();
    if (marker.trim() !== "Now") fail(`Now marker reads "${marker}"`);
    const water = await p.locator(".water-row button").evaluateAll((all) => ({
      widths: new Set(
        all.map((b) => Math.round(b.getBoundingClientRect().width)),
      ).size,
      overflow: all.some((b) => b.scrollWidth > b.clientWidth + 1),
    }));
    if (water.widths > 1 || water.overflow)
      fail(`Water buttons are unequal or overflow: ${JSON.stringify(water)}`);
    const docWidth = await p.evaluate(
      () => document.documentElement.scrollWidth,
    );
    if (docWidth > 390) fail(`Today scrolls sideways at 390 (${docWidth}px)`);

    // You sheet: 64 px header, 48 px inputs, equal footer buttons, Discard.
    await p.goto(`${base}#/you/sport`);
    const sheet = p.getByRole("dialog", { name: "Sport & season" });
    await sheet.waitFor();
    await p.waitForTimeout(250);
    const head = await box(sheet.locator("header"));
    if (!near(head.h, 64)) fail(`Sheet header is ${head.h}px, not 64`);
    const field = await box(sheet.getByRole("combobox", { name: /^Sport/ }));
    if (!near(field.h, 48)) fail(`Sheet text input is ${field.h}px, not 48`);
    const footer = await sheet
      .locator(".dialog-actions > button")
      .evaluateAll((all) =>
        all.map((b) => Math.round(b.getBoundingClientRect().width)),
      );
    if (new Set(footer).size > 1)
      fail(`Sheet footer buttons differ: ${footer.join(" vs ")}`);
    for (const m of await segmentsOnOneRow("Sport sheet @390")) fail(m);
    await sheet.getByRole("combobox", { name: /^Sport/ }).fill("Hockey");
    await p.keyboard.press("Escape");
    const discard = p.getByRole("dialog", { name: "Discard changes?" });
    await discard.waitFor();
    await p.waitForTimeout(250);
    const d390 = await box(discard);
    if (d390.x < 0 || d390.right > 390 + 0.5 || !near(d390.bottom, 844))
      fail(
        `Discard sheet at 390 is not a bottom sheet: ${JSON.stringify(d390)}`,
      );
    if (!(await discard.evaluate((d) => d.parentElement === document.body)))
      fail("The Discard confirm is nested inside the sheet");
    await discard.getByRole("button", { name: "Discard", exact: true }).click();

    // Reminders: one-row segments with short labels.
    await p.goto(`${base}#/you/reminders`);
    await p.getByRole("dialog", { name: "Reminders" }).waitFor();
    for (const m of await segmentsOnOneRow("Reminders @390")) fail(m);

    // Heaviest weight is 700: You row titles and the athlete card.
    await p.goto(`${base}#/you`);
    await p.locator(".you-list").waitFor();
    const heavy = await p.evaluate(() =>
      [...document.querySelectorAll("main *")]
        .filter(
          (el) =>
            el.getClientRects().length &&
            Number(getComputedStyle(el).fontWeight) > 700,
        )
        .map(
          (el) =>
            `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 20)}"`,
        ),
    );
    if (heavy.length)
      fail(`Text heavier than 700 on You: ${heavy.slice(0, 3).join(", ")}`);

    // Schedule at 390: + Add in the top bar, one-line week label, day heads.
    await p.goto(`${base}#/schedule`);
    await p.getByRole("heading", { name: "Schedule", level: 1 }).waitFor();
    const add = p
      .getByRole("banner")
      .getByRole("button", { name: "+ Add", exact: true });
    if (!(await add.isVisible()))
      fail("Schedule + Add is not in the phone top bar");
    const label = await box(p.locator(".schedule-week-switcher strong"));
    if (label.h > 24) fail(`Week label wraps (${label.h}px tall)`);
    const heads = await p.locator(".schedule-week-day-head").evaluateAll(
      (all) =>
        all.filter((h) => {
          const [title, button] = h.children;
          return (
            Math.abs(
              title.getBoundingClientRect().top -
                button.getBoundingClientRect().top,
            ) > 12
          );
        }).length,
    );
    if (heads)
      fail(`${heads} day headings drop their add button to a second row`);
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    const activity = p.getByRole("dialog", { name: "Add practice" });
    await activity.waitFor();
    await p.waitForTimeout(250);
    for (const m of await segmentsOnOneRow("Activity sheet @390")) fail(m);
    const gap = await activity.evaluate((d) => {
      const track = d
        .querySelector('[aria-label="Date or days"]')
        .getBoundingClientRect();
      const date = [...d.querySelectorAll("label")].find((l) =>
        /Activity date/.test(l.textContent),
      );
      return date.getBoundingClientRect().top - track.bottom;
    });
    if (gap < 15)
      fail(`"Activity date" sits ${Math.round(gap)}px under Date or days`);
    result.checks.push(
      "390: the Now card and the top of the Day rail fit above the tab bar, chips take one row, rail times fit and the marker reads Now, water buttons are equal; sheets have 64 px headers, 48 px inputs and equal footers; Discard is its own bottom sheet on <body>; no text is heavier than 700; Schedule's + Add is in the top bar, the week label and day headings stay on one row, and the activity sheet keeps 16 px between groups.",
    );
    await context.close();

    // ---------- 1280: one title edge, rail edge, Discard centered ----------
    await open(1280);
    await setup();
    if (await p.evaluate(() => document.activeElement?.tagName === "H1"))
      fail("A fresh load focuses the page H1");
    const titles = {};
    for (const route of [
      "today",
      "schedule",
      "food/ideas",
      "you",
      "you/device",
    ]) {
      await p.goto(`${base}#/${route}`);
      await p.locator("main h1").first().waitFor();
      await p.waitForTimeout(150);
      titles[route] = await box(p.locator("main h1").first());
    }
    const xs = new Set(Object.values(titles).map((t) => Math.round(t.x)));
    if (xs.size > 1) fail(`Page titles start at ${[...xs].join(" / ")} px`);
    const ys = new Set(
      ["today", "schedule", "food/ideas", "you"].map((r) =>
        Math.round(titles[r].y),
      ),
    );
    if (ys.size > 1) fail(`Tab page titles sit at y ${[...ys].join(" / ")}`);
    const edges = await p.evaluate(() =>
      [".frame-brand img", ".frame-nav-item svg", ".frame-avatar"].map((s) =>
        Math.round(document.querySelector(s).getBoundingClientRect().left),
      ),
    );
    if (new Set(edges).size > 1)
      fail(`Rail brand, icons and avatar start at ${edges.join(" / ")}`);
    await p.goto(`${base}#/schedule`);
    await p.getByRole("radio", { name: "Month" }).click();
    const weekdays = await p.locator(".weekday-row").innerText();
    if (/SUN|MON/.test(weekdays)) fail("Month weekday headers are in capitals");
    await p.getByRole("radio", { name: "Week" }).click();
    const glance = await p.locator(".schedule-week-glance").innerText();
    if (/\b1 (games|practices|away trips)\b/.test(glance))
      fail(`Glance plural: ${glance}`);
    await p.goto(`${base}#/you/sport`);
    const sport1280 = p.getByRole("dialog", { name: "Sport & season" });
    await sport1280.getByRole("combobox", { name: /^Sport/ }).fill("Hockey");
    await p.keyboard.press("Escape");
    const confirm = p.getByRole("dialog", { name: "Discard changes?" });
    await confirm.waitFor();
    await p.waitForTimeout(250);
    const d1280 = await box(confirm);
    if (!near(d1280.x + d1280.w / 2, 640, 2) || d1280.y < 100)
      fail(`Discard dialog at 1280 is not centered: ${JSON.stringify(d1280)}`);
    result.checks.push(
      "1280: no H1 focus on load; Today, Schedule, Food, You and This device titles share one left edge and the tabs one title row; rail brand, icons and avatar share one edge; month headers are sentence case; the glance never says '1 games'; Discard is a centered dialog.",
    );
    await context.close();

    // ---------- 320: Food rows, section bar, row menus ----------
    await open(320);
    await setup();
    await p.goto(`${base}#/food/groceries`);
    await p.getByRole("button", { name: "Suggest for this week" }).click();
    const week = p.getByRole("dialog", { name: "Add food for this week" });
    for (const box of await week.getByRole("checkbox").all()) await box.check();
    await week.getByRole("button", { name: "Add selected" }).click();
    await week.waitFor({ state: "hidden" });
    const groceryRows = await p.locator(".grocery-row").evaluateAll((rows) =>
      rows.map((row) => {
        const check = row
          .querySelector(".grocery-check")
          .getBoundingClientRect();
        const menu = row
          .querySelector(".row-menu-trigger")
          .getBoundingClientRect();
        const chip = row.querySelector(".reason-chip");
        return {
          aligned: Math.abs(check.top - menu.top) <= 1,
          chipLines: chip
            ? Math.round(chip.getBoundingClientRect().height / 18)
            : 1,
        };
      }),
    );
    if (groceryRows.some((r) => !r.aligned))
      fail("Grocery check and menu are not on the name line");
    if (groceryRows.some((r) => r.chipLines > 1))
      fail("A grocery reason chip wraps onto two lines");
    const trackFits = await p.evaluate(() => {
      const track = document.querySelector(".food-sections");
      const bar = document.querySelector(".food-sections-bar");
      const main = document.querySelector("main.shell");
      const links = [...track.querySelectorAll("a")].map(
        (a) => a.getBoundingClientRect().width,
      );
      const inner =
        main.getBoundingClientRect().width -
        parseFloat(getComputedStyle(main).paddingLeft) * 2;
      return {
        overflow: track.scrollWidth > track.clientWidth + 1,
        narrow: links.filter((w) => w < 44).length,
        strip: Math.abs(bar.getBoundingClientRect().width - inner) <= 1,
      };
    });
    if (trackFits.overflow || trackFits.narrow)
      fail(`Food section bar at 320: ${JSON.stringify(trackFits)}`);
    if (!trackFits.strip) fail("The sticky Food bar is not a full-width strip");
    await p.goto(`${base}#/food/home`);
    for (const name of ["Bananas", "Apples", "Frozen berries"])
      await p.getByRole("button", { name: `Add ${name}`, exact: true }).click();
    await p.locator(".stock-row").nth(2).waitFor();
    const stock = await p.locator(".stock-row").evaluateAll((rows) =>
      rows.map((row) => {
        const box = row.getBoundingClientRect();
        const menu = row
          .querySelector(".row-menu-trigger")
          .getBoundingClientRect();
        return {
          h: Math.round(box.height),
          menuTop: Math.round(menu.top - box.top),
        };
      }),
    );
    if (stock.some((r) => r.h > 80 || r.menuTop > 24))
      fail(`At home rows wrap at 320: ${JSON.stringify(stock)}`);
    if (!(await p.getByRole("radiogroup", { name: "Stock filter" }).count()))
      fail("The At home filter is not a segmented control");
    // A row menu near the bottom opens upward, clear of the tab bar.
    await p.evaluate(() => window.scrollTo(0, 0));
    const last = p.locator(".stock-row").last();
    await last.evaluate((row) => {
      const y = row.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, y - window.innerHeight + 64 + 72));
    });
    await last.locator(".row-menu-trigger").click();
    // It holds still right after the scroll: same place for six frames.
    const tops = await p.evaluate(
      () =>
        new Promise((resolve) => {
          const seen = [];
          const sample = () => {
            const items = document.querySelector(".row-menu-items");
            seen.push(
              items ? Math.round(items.getBoundingClientRect().top) : null,
            );
            if (seen.length < 6) requestAnimationFrame(sample);
            else resolve(seen);
          };
          requestAnimationFrame(sample);
        }),
    );
    if (tops.includes(null) || new Set(tops).size !== 1)
      fail(`A row menu near the tab bar moves or closes (${tops})`);
    const menu = await box(p.locator(".row-menu-items"));
    if (menu.bottom > 844 - 64 + 1)
      fail(`A row menu runs under the tab bar (${Math.round(menu.bottom)}px)`);
    await p.keyboard.press("Escape");
    await p.goto(`${base}#/food/log`);
    const arrows = await p.evaluate(() => {
      const [prev, next] = document.querySelectorAll(
        ".day-switcher .icon-button",
      );
      return [
        getComputedStyle(prev).color,
        getComputedStyle(next).color,
        next.disabled,
      ];
    });
    if (arrows[2] && arrows[0] === arrows[1])
      fail("The disabled Next day arrow looks enabled");
    result.checks.push(
      "320 Food: grocery checks and menus sit on the name line with one-line reason chips; the section bar is a full-width strip whose four links fit at 44 px or more; At home rows stay on one line with a segmented filter; a low row menu opens above the tab bar; a disabled day arrow is dimmed.",
    );
    await context.close();

    // ---------- 768: tablet tabs centered on the bar ----------
    await open(768, 1024);
    await setup();
    const nav = await box(p.locator(".frame-nav"));
    if (!near(nav.x + nav.w / 2, 384, 2))
      fail(
        `Tablet tabs center at ${Math.round(nav.x + nav.w / 2)} px, not 384`,
      );
    result.checks.push("768: the tablet tab group is centered on the bar.");

    if (problems.length) throw new Error(problems.join("\n  "));
    return result;
  } catch (e) {
    return { ...result, failure: e.message };
  } finally {
    await context?.close();
  }
};
