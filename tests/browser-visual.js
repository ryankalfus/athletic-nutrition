// Playwright snippet: measurable UI review fixes (You/setup, Today/Schedule
// and Food reports, 2026.09.29) so they cannot regress. Each check measures
// geometry or computed style: one-row segmented controls, a Discard confirm
// that is its own sheet or centered dialog, 700 as the heaviest weight, one
// title edge and row across tabs, 52 px inputs (U2-01), borderless sheet headers, full-width
// sticky primary buttons, a joined weekday bar, a centered tablet tab group, one rail
// edge, a Now card above the tab bar, a Day rail whose times fit, and the
// Schedule week switcher, day headers, top-bar add and month headers; U4-01
// button kinds: no outlined buttons, data-kind, desktop hug width; U4-02 the
// Row and Section fixture (?ui=rows).
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
    await p
      .getByRole("heading", {
        level: 1,
        name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/,
      })
      .waitFor();
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
    // ---------- 320: setup, segmented controls, joined weekdays ----------
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
      return [
        ...[field, error].map((n) => Math.round(n.getBoundingClientRect().top)),
        document.querySelectorAll(".field .field-hint").length,
      ];
    });
    // UX-COPY-05: the helper that described the system is gone.
    if (!(order[0] < order[1]) || order[2] !== 0)
      fail(`Sport field then error, with no helper line: ${order}`);
    await sport.fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    const header = await box(p.locator(".setup-header"));
    if (header.h > 64)
      fail(`Setup step header is ${header.h}px tall at 320 (wraps)`);
    const weekdayBar = await p.locator(".school-weekdays").evaluate((bar) => {
      const buttons = [...bar.querySelectorAll("button")];
      const boxes = buttons.map((button) => button.getBoundingClientRect());
      return {
        count: buttons.length,
        height: bar.getBoundingClientRect().height,
        gap: getComputedStyle(bar).gap,
        tops: [...new Set(boxes.map((rect) => rect.top))],
        gaps: boxes
          .slice(1)
          .map((rect, index) => rect.left - boxes[index].right),
        badges: buttons.some((button) => {
          const before = getComputedStyle(button, "::before");
          return (
            button.children.length ||
            !["none", "normal"].includes(before.content)
          );
        }),
      };
    });
    if (
      weekdayBar.count !== 7 ||
      weekdayBar.height !== 48 ||
      weekdayBar.gap !== "0px" ||
      weekdayBar.tops.length !== 1 ||
      weekdayBar.gaps.some((gap) => Math.abs(gap) > 0.01) ||
      weekdayBar.badges
    )
      fail(`Joined weekday bar @320: ${JSON.stringify(weekdayBar)}`);
    const inputs = await p
      .locator(".setup-fields .time-field input")
      .evaluateAll((all) => all.map((i) => i.getBoundingClientRect().height));
    if (inputs.some((h) => !near(h, 52)))
      fail(`Time inputs are ${inputs.join("/")}px, not 52`);
    result.checks.push(
      "320: setup segments stay on one row, Sport reads e.g. Soccer with field → error and no helper line (UX-COPY-05), step 2's header is one row, the seven weekdays form one 48 px joined row with 0 px gaps and no badges (UX-CMP-07) and time inputs are 52 px (U2-01, UX-DS-06).",
    );
    await context.close();

    // ---------- 390: Today fold, Day rail, sheets, Discard ----------
    await open(390);
    await setup();
    const now = await box(p.locator(".now-card"));
    const rail = await box(p.locator(".day-rail"));
    const nav = await box(p.locator(".frame-nav"));
    if (now.bottom > nav.y - 8)
      fail(
        `Now card ends at ${Math.round(now.bottom)}px, under the 64px tab bar`,
      );
    if (rail.y > nav.y)
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

    // UX-CMP-10: plain sheet chrome and a full-width sticky primary.
    await p.goto(`${base}#/you/sport`);
    const sheet = p.getByRole("dialog", { name: "Sport & season" });
    await sheet.waitFor();
    await p.waitForTimeout(250);
    const chrome = await sheet.evaluate((node) => {
      const header = node.querySelector("header");
      const footer = node.querySelector(".dialog-actions");
      const save = footer.querySelector('[data-kind="primary"]');
      const css = getComputedStyle(node);
      const title = getComputedStyle(header.querySelector("h2"));
      const ruled = [
        header,
        footer,
        ...header.children,
        ...footer.children,
      ].some((el) =>
        ["", "::before", "::after"].some((pseudo) => {
          const s = getComputedStyle(el, pseudo || null);
          return (
            (s.content !== "none" || !pseudo) &&
            (parseFloat(s.borderTopWidth) || parseFloat(s.borderBottomWidth))
          );
        }),
      );
      return {
        radius: css.borderTopLeftRadius,
        title: `${title.fontSize}/${title.lineHeight}`,
        ruled,
        primary: save.getBoundingClientRect().width,
        content:
          footer.clientWidth -
          parseFloat(getComputedStyle(footer).paddingLeft) -
          parseFloat(getComputedStyle(footer).paddingRight),
        sticky: getComputedStyle(footer).position,
        close: !!header.querySelector('[aria-label^="Close"]'),
      };
    });
    if (
      chrome.radius !== "28px" ||
      chrome.title !== "22px/28px" ||
      chrome.ruled ||
      chrome.close ||
      chrome.sticky !== "sticky" ||
      !near(chrome.primary, chrome.content, 1)
    )
      fail(`Sheet chrome at 390: ${JSON.stringify(chrome)}`);
    if (
      await sheet.getByRole("button", { name: "Cancel", exact: true }).count()
    )
      fail("Clean sheet exposes Cancel");
    const field = await box(sheet.getByRole("combobox", { name: /^Sport/ }));
    if (!near(field.h, 52)) fail(`Sheet text input is ${field.h}px, not 52`);
    for (const m of await segmentsOnOneRow("Sport sheet @390")) fail(m);
    await sheet.getByRole("radio").first().click();
    await p.keyboard.press("Escape");
    const discard = p.getByRole("dialog", { name: "Discard changes?" });
    await discard.waitFor();
    await p.waitForTimeout(250);
    const d390 = await box(discard);
    if (
      !near(d390.w, 320) ||
      !near(d390.x + d390.w / 2, 195) ||
      !near(d390.y + d390.h / 2, 422)
    )
      fail(`Discard at 390 must be a centered alert: ${JSON.stringify(d390)}`);
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
    await p
      .getByRole("heading", {
        level: 1,
        name: /^(January|February|March|April|May|June|July|August|September|October|November|December)$/,
      })
      .waitFor();
    const add = p
      .getByRole("banner")
      .getByRole("button", { name: /^(\+ )?Add$/ });
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
    await p
      .getByRole("button", { name: /^(\+ )?Add$/ })
      .first()
      .click();
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
      "390: the Now card and the top of the Day rail fit above the tab bar, chips take one row, rail times fit and the marker reads Now, water buttons are equal; sheets have 28 px top corners, 22/28 titles, no hairlines or short-sheet X, 52 px inputs and full-width sticky Save; Discard is a centered 320 px alert on <body>; no text is heavier than 700; Schedule's + Add is in the top bar, the week label and day headings stay on one row, and the activity sheet keeps 16 px between groups.",
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
    if (
      !near(d1280.w, 320) ||
      !near(d1280.x + d1280.w / 2, 640, 1) ||
      !near(d1280.y + d1280.h / 2, 450, 1)
    )
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
    await week.getByRole("button", { name: /^Add \d+ to list$/ }).click();
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
    const mobileNav = await box(p.locator(".frame-nav"));
    if (menu.bottom > mobileNav.y - 8)
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

    // ---------- U4-01: button kinds, no outlined buttons, desktop hug ----------
    // UX-CMP-01: no <button> in main or a dialog is outlined (a 1 px border
    // on a clear or white fill, R13); Button renders data-kind; UX-RWD-10:
    // at 1440 no primary outside a dialog spans its column.
    const outlinedButtons = () =>
      p.evaluate(() => {
        const clear = (c) =>
          !c || c === "transparent" || /rgba\(.*,\s*0\)$/.test(c);
        return [
          ...document.querySelectorAll("main button, [role=dialog] button"),
        ]
          .filter((el) => el.getBoundingClientRect().width)
          .filter((el) => {
            const s = getComputedStyle(el);
            const outlined = ["Top", "Right", "Bottom", "Left"].every(
              (side) =>
                Math.round(parseFloat(s[`border${side}Width`])) === 1 &&
                !clear(s[`border${side}Color`]),
            );
            return (
              outlined &&
              (clear(s.backgroundColor) ||
                s.backgroundColor === "rgb(255, 255, 255)")
            );
          })
          .map((el) => el.getAttribute("aria-label") || el.innerText.trim());
      });
    const fullWidthPrimaries = () =>
      p.evaluate(() => {
        const main = document.querySelector("main");
        const gutter = parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--gutter",
          ),
        );
        const column = main.getBoundingClientRect().width - 2 * gutter;
        return [
          ...main.querySelectorAll(
            ".primary, .today-primary, [data-kind=primary], [data-kind=hero]",
          ),
        ]
          .filter(
            (el) =>
              !el.closest("[role=dialog]") &&
              el.getBoundingClientRect().width >= column - 1,
          )
          .map((el) => el.innerText.trim());
      });
    const everyRoute = [
      "today",
      "schedule",
      "food/ideas",
      "food/home",
      "food/groceries",
      "food/log",
      "food/log/week",
      "you",
      "you/sport",
      "you/needs",
      "you/access",
      "you/reminders",
      "you/device",
      "you/about",
      "nope",
    ];
    for (const width of [390, 1440]) {
      await open(width);
      await setup();
      for (const route of everyRoute) {
        await p.goto(`${base}#/${route}`);
        await p.locator("main h1").first().waitFor();
        await p.waitForTimeout(100);
        const outlined = await outlinedButtons();
        if (outlined.length)
          fail(`${width} ${route}: outlined buttons ${outlined.join(", ")}`);
        if (width === 1440) {
          const wide = await fullWidthPrimaries();
          if (wide.length)
            fail(`1440 ${route}: full-width primary ${wide.join(", ")}`);
        }
      }
      // A sheet built on Button: Save carries data-kind="primary".
      await p.goto(`${base}#/you/sport`);
      const sheet = p.getByRole("dialog").first();
      await sheet.waitFor();
      const saveKind = await sheet
        .getByRole("button", { name: "Save", exact: true })
        .getAttribute("data-kind");
      if (saveKind !== "primary")
        fail(`${width}: the sheet's Save has data-kind ${saveKind}`);
      const inSheet = await outlinedButtons();
      if (inSheet.length)
        fail(`${width} sheet: outlined buttons ${inSheet.join(", ")}`);
      await context.close();
    }
    result.checks.push(
      "U4-01: no button in main or a sheet is outlined on any of the 15 routes at 390 and 1440 px; Button renders data-kind (Save is primary); at 1440 px no primary outside a dialog spans its column (UX-CMP-01, UX-RWD-10).",
    );

    // ---------- U4-02: the Row and Section fixture (?ui=rows, dev only) ----------
    // UX-CMP-02/03/23: 56px min rows with an inset hairline, no background,
    // border or shadow, a 44px trailing target, 17/22 600 titles clamped to
    // two lines, 20/26 650 section titles, and 44px food art tiles (radius
    // 10) with the letter tile for unknown foods.
    await open(390);
    await p.goto(`${base}?ui=rows`);
    await p.locator(".row").first().waitFor();
    const rows = await p.evaluate(() =>
      [...document.querySelectorAll(".row")].map((row) => {
        const style = getComputedStyle(row);
        const after = getComputedStyle(row, "::after");
        const art = row.querySelector(".row-art");
        const trailing = row.querySelector(".row-trailing, .row-actions");
        const title = row.querySelector(".row-title");
        const titleStyle = getComputedStyle(title);
        const size = (el) => {
          const b = el.getBoundingClientRect();
          return [Math.round(b.width), Math.round(b.height)];
        };
        return {
          height: Math.round(row.getBoundingClientRect().height),
          background: style.backgroundColor,
          border: style.borderTopWidth,
          shadow: style.boxShadow,
          hairline: after.content !== "none" && after.borderTopWidth === "1px",
          last: !row.nextElementSibling,
          art: art && {
            size: size(art),
            radius: getComputedStyle(art).borderRadius,
            img: !!art.querySelector("img"),
            letter: art.textContent,
          },
          trailing: trailing && size(trailing),
          title: `${titleStyle.fontSize}/${titleStyle.lineHeight} ${titleStyle.fontWeight}`,
          titleLines: Math.round(title.getBoundingClientRect().height / 22),
        };
      }),
    );
    if (rows.length < 9) fail(`the rows fixture renders ${rows.length} rows`);
    rows.forEach((row, i) => {
      if (row.height < 56) fail(`row ${i} is ${row.height}px tall`);
      if (row.background !== "rgba(0, 0, 0, 0)")
        fail(`row ${i} has a background`);
      if (row.border !== "0px" || row.shadow !== "none")
        fail(`row ${i} has a border or shadow`);
      if (row.hairline === row.last)
        fail(`row ${i} hairline ${row.hairline} (last: ${row.last})`);
      if (!row.trailing || row.trailing[0] < 44 || row.trailing[1] < 44)
        fail(`row ${i} trailing target ${row.trailing}`);
      if (row.title !== "17px/22px 600") fail(`row ${i} title ${row.title}`);
      if (row.titleLines > 2)
        fail(`row ${i} title runs ${row.titleLines} lines`);
    });
    const arts = rows.filter((row) => row.art).map((row) => row.art);
    if (arts.length !== 3) fail(`${arts.length} food art tiles, want 3`);
    for (const art of arts)
      if (art.size[0] !== 44 || art.size[1] !== 44 || art.radius !== "10px")
        fail(`art tile ${art.size} radius ${art.radius}`);
    if (!(
      arts[0]?.img &&
      arts[1]?.img &&
      !arts[2]?.img &&
      arts[2]?.letter === "M"
    ))
      fail(
        "food rows: want art for Bananas and Hummus + pita, the letter M for the unknown food",
      );
    const sectionTitles = await p
      .locator(".section-head h2")
      .evaluateAll((all) =>
        all.map((h) => {
          const s = getComputedStyle(h);
          return `${s.fontSize}/${s.lineHeight} ${s.fontWeight}`;
        }),
      );
    if (sectionTitles.some((t) => t !== "20px/26px 650"))
      fail(`section titles ${sectionTitles.join(", ")}`);
    if ((await p.locator(".section-head .text-button").count()) !== 1)
      fail("one section has a trailing text action");
    await context.close();
    result.checks.push(
      "U4-02: the ?ui=rows fixture's nine rows are 56 px or taller with an inset hairline between rows, no background, border or shadow, a 44 px trailing target and 17/22 600 titles clamped to two lines; section titles are 20/26 650 with one text action; food rows show a 44 px art tile (radius 10) for Bananas and Hummus + pita and the letter M for an unknown food (UX-CMP-02, UX-CMP-03, UX-CMP-23).",
    );

    // ---------- 768: tablet tabs centered on the bar ----------
    await open(768, 1024);
    await setup();
    const tabletNav = await box(p.locator(".frame-nav"));
    if (!near(tabletNav.x + tabletNav.w / 2, 384, 2))
      fail(
        `Tablet tabs center at ${Math.round(tabletNav.x + tabletNav.w / 2)} px, not 384`,
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
