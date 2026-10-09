// Playwright snippet: shared layout, type and landmark rules on every route.
// - 7.6 content scan: no technical terms, ISO dates or bare 24-hour times in the
//   rendered text of any route (P0-07, P0-05).
// - The first Tab on a fresh load reaches the skip link, Food routes included (A11Y-01).
// - Each page's H1 sits in a <header> (A11Y-03).
// - A page shorter than the window does not scroll (P1-11: the sr-only announcer
//   added a 1 px scroll).
// - Setup steps 2 and 3 stack time fields one per row at 320 px (RWD-06).
// - Numeral XL countdown and Numeral M water total (DS-03); Log in the 720 px
//   reading column (DS-08); 32 px between You and About sections (DS-09); the
//   phone top-bar "+ Add" is a 48 px primary (DS-11); Log Day/Week is the shared
//   segmented control and selected weekdays show a check (DS-12).
// The clock is fixed to Sunday 2026-10-11 10:00 with a 4:00 PM practice today.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 320, height: 740 },
    });
  await context.clock.setFixedTime(new Date(2026, 9, 11, 10, 0, 0));
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  const routes = [
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
  const terms = [
    "SR Legacy",
    "FNDDS",
    "Foundation",
    "Branded",
    "VITE_",
    "known subtotal",
    "In-app cart",
    "serving(s)",
    "no arrival buffer",
    "Ingredient relationship",
  ];
  const problems = [];
  // 7.6: the listed terms (any case for "streak"), ISO dates, bare 24-hour times.
  const scan = async (route) => {
    const text = await p.evaluate(() => {
      const open = document.querySelector("dialog[open]");
      return `${document.body.innerText}\n${open ? open.innerText : ""}`;
    });
    for (const term of terms)
      if (text.includes(term)) problems.push(`${route}: shows "${term}"`);
    if (/streak/i.test(text)) problems.push(`${route}: shows "streak"`);
    const iso = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (iso) problems.push(`${route}: ISO date ${iso[0]}`);
    const clock = text.match(/\b(1[3-9]|2[0-3]):\d{2}\b(?!\s*[AP]M)/);
    if (clock) problems.push(`${route}: 24-hour time ${clock[0]}`);
    const count = text.match(
      /\b1 (minutes|hours|days|weeks|items|games|practices|athletes|servings)\b/,
    );
    if (count) problems.push(`${route}: unpluralized "${count[0]}"`);
  };
  const headed = async (route) => {
    const inHeader = await p.evaluate(() => {
      const h1 = document.querySelector("main h1");
      return h1 ? Boolean(h1.closest("header")) : null;
    });
    if (inHeader === null) problems.push(`${route}: no H1 in main`);
    else if (!inHeader) problems.push(`${route}: H1 is not inside a <header>`);
  };
  const noExtraScroll = async (route) => {
    const page = await p.evaluate(() => {
      let bottom = 0;
      for (const el of document.querySelectorAll("body *")) {
        if (el.closest(".sr-only, dialog:not([open])")) continue;
        const style = getComputedStyle(el);
        if (style.position === "fixed" || style.display === "none") continue;
        bottom = Math.max(bottom, el.getBoundingClientRect().bottom + scrollY);
      }
      return {
        bottom,
        scroll: document.documentElement.scrollHeight,
        height: innerHeight,
      };
    });
    // Nothing hidden (the sr-only announcer) may make the page taller than
    // its visible boxes and the window.
    if (page.scroll > Math.max(page.height, Math.ceil(page.bottom)))
      problems.push(
        `${route}: scrolls to ${page.scroll}px with visible content ending at ${Math.round(page.bottom)}px`,
      );
  };
  const freshTab = async (route) => {
    await p.goto("about:blank");
    await p.goto(`${base}#/${route}`);
    await p.locator("main").waitFor();
    await p.waitForTimeout(150);
    await p.keyboard.press("Tab");
    const first = await p.evaluate(
      () =>
        document.activeElement?.className || document.activeElement?.tagName,
    );
    if (!String(first).includes("skip-link"))
      problems.push(`${route}: first Tab lands on ${first}, not the skip link`);
  };
  const stacked = async (step) => {
    const rows = await p.evaluate(() =>
      [...document.querySelectorAll(".time-fields, .school-date-fields")]
        .filter((group) => group.getClientRects().length)
        .map((group) => {
          const inputs = [...group.querySelectorAll("input")].map((input) =>
            input.getBoundingClientRect(),
          );
          return inputs.length < 2 || inputs[1].top >= inputs[0].bottom;
        }),
    );
    if (!rows.length) problems.push(`${step}: no time fields found`);
    if (rows.some((ok) => !ok))
      problems.push(`${step}: time fields sit side by side at 320 px`);
  };
  const tokenColor = (token) =>
    p.evaluate((name) => {
      const probe = document.createElement("div");
      probe.style.background = `var(${name})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    }, token);
  const fail = () => {
    if (problems.length) throw new Error(problems.slice(0, 20).join("\n  "));
  };
  try {
    // Welcome, before any athlete.
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).waitFor();
    await scan("welcome");
    await headed("welcome");
    await noExtraScroll("welcome");

    // RWD-06 and DS-12 in setup at 320 px.
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Layout");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await stacked("Setup step 2");
    const day = await p
      .getByRole("button", { name: "Monday", exact: true })
      .evaluate((node) => ({
        pressed: node.getAttribute("aria-pressed"),
        background: getComputedStyle(node).backgroundColor,
        check: getComputedStyle(node, "::before").backgroundImage,
        border: getComputedStyle(node).borderColor,
      }));
    const selectedBg = await tokenColor("--color-selected-bg");
    const primary = await tokenColor("--color-primary");
    if (
      day.pressed !== "true" ||
      day.background !== selectedBg ||
      day.border !== primary ||
      !day.check.includes("svg")
    )
      problems.push(
        `A selected weekday is not a checked chip: ${JSON.stringify(day)}`,
      );
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Practices and games" }).waitFor();
    await stacked("Setup step 3");
    fail();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    result.checks.push(
      "Setup steps 2 and 3 stack their time fields one per row at 320 px (RWD-06); a selected weekday has the selected tint, primary border and a check (DS-12).",
    );

    // A practice later today, so Today has a countdown.
    await p.goto(`${base}#/schedule`);
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    const sheet = p.getByRole("dialog", { name: "Add practice" });
    await sheet.getByLabel("Starts", { exact: true }).fill("16:00");
    await sheet.getByLabel("Ends", { exact: true }).fill("17:30");
    await sheet
      .getByRole("button", { name: "Add practice", exact: true })
      .click();
    await sheet.waitFor({ state: "hidden" });

    // Every route: 7.6 scan, H1 in a header, no stray scroll.
    for (const width of [320, 1280]) {
      await p.setViewportSize({ width, height: width === 320 ? 740 : 1200 });
      for (const route of routes) {
        await p.goto(`${base}#/${route}`);
        await p.locator("main").waitFor();
        await p.waitForTimeout(150);
        await scan(route);
        if (width === 320) await headed(route);
        await noExtraScroll(`${route} @${width}`);
      }
    }
    await p.goto(`${base}#/schedule`);
    await p.getByRole("radio", { name: "Month" }).click();
    await scan("schedule month");
    await p.getByRole("radio", { name: "Week" }).click();
    fail();
    result.checks.push(
      `No 7.6 term ("streak" included), ISO date or bare 24-hour time on Welcome and ${routes.length} routes at 320 and 1280 px, plus Schedule Month (P0-07, P0-05).`,
      "Every route's H1 sits inside a <header>: Welcome, Today, Schedule, Food, You, This device, About and Not found (A11Y-03).",
      "No route shorter than the window scrolls; the sr-only announcer adds no 1 px scroll (P1-11).",
    );

    // A11Y-01: first Tab on a fresh load reaches the skip link.
    await p.setViewportSize({ width: 390, height: 844 });
    for (const route of [
      "food/ideas",
      "food/home",
      "food/groceries",
      "food/log",
      "food/log/week",
      "today",
      "schedule",
      "you",
    ])
      await freshTab(route);
    fail();
    result.checks.push(
      "On a fresh load of every Food route (and Today, Schedule, You) the first Tab focuses the skip link (A11Y-01).",
    );

    // DS-03 / DS-11 / DS-12 at 390, DS-03 / DS-08 / DS-09 on desktop.
    const size = (selector) =>
      p
        .locator(selector)
        .first()
        .evaluate((node) => {
          const style = getComputedStyle(node);
          return `${parseFloat(style.fontSize)}/${parseFloat(style.lineHeight)}`;
        });
    await p.goto(`${base}#/today`);
    await p.locator(".now-card .today-countdown").waitFor();
    const phone = {
      countdown: await size(".now-card .today-countdown"),
      water: await size(".water-row .numeral"),
    };
    if (phone.countdown !== "32/36")
      problems.push(`Countdown at 390 px is ${phone.countdown}, not 32/36`);
    if (!phone.water.startsWith("16/"))
      problems.push(`Water total at 390 px is ${phone.water}, not 16 px`);
    await p.goto(`${base}#/schedule`);
    const action = await p
      .locator(".frame-action")
      .evaluate((node) => node.getBoundingClientRect().height);
    if (action < 48)
      problems.push(`Top-bar "+ Add" is ${action}px tall, not 48`);
    await p.goto(`${base}#/food/log`);
    const control = await p
      .locator(".log-view-tabs .segmented")
      .evaluate((track) => {
        const selected = track.querySelector(
          '[aria-checked="true"], [aria-pressed="true"]',
        );
        const style = getComputedStyle(selected);
        return {
          track: getComputedStyle(track).backgroundColor,
          selected: style.backgroundColor,
          shadow: style.boxShadow,
        };
      });
    const muted = await tokenColor("--color-surface-muted");
    const surface = await tokenColor("--color-surface");
    if (
      control.track !== muted ||
      control.selected !== surface ||
      control.shadow === "none" ||
      /inset/.test(control.shadow)
    )
      problems.push(
        `Log Day/Week is not the segmented control: ${JSON.stringify(control)}`,
      );

    await p.setViewportSize({ width: 1280, height: 900 });
    await p.goto(`${base}#/today`);
    await p.locator(".now-card .today-countdown").waitFor();
    const desk = {
      countdown: await size(".now-card .today-countdown"),
      water: await size(".water-row .numeral"),
    };
    if (desk.countdown !== "40/44")
      problems.push(`Countdown at 1280 px is ${desk.countdown}, not 40/44`);
    if (!desk.water.startsWith("17/"))
      problems.push(`Water total at 1280 px is ${desk.water}, not 17 px`);
    for (const route of ["you", "you/about", "you/device"]) {
      await p.goto(`${base}#/${route}`);
      await p.locator(".you-page").waitFor();
      const gaps = await p.locator(".you-page").evaluate((pageNode) => {
        const items = [...pageNode.children].filter((node) => {
          const style = getComputedStyle(node);
          return (
            style.display !== "none" &&
            style.position !== "absolute" &&
            node.getClientRects().length
          );
        });
        return items
          .slice(1)
          .map((node, i) =>
            Math.round(
              node.getBoundingClientRect().top -
                items[i].getBoundingClientRect().bottom,
            ),
          );
      });
      if (!gaps.length || gaps.some((gap) => gap !== 32))
        problems.push(`${route} section gaps ${gaps.join(", ")} (want 32)`);
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    for (const route of ["food/log", "food/log/week"]) {
      await p.goto(`${base}#/${route}`);
      const column = await p
        .locator(".log-layout > :first-child, .log-week")
        .first()
        .evaluate((node) => Math.round(node.getBoundingClientRect().width));
      if (column !== 720)
        problems.push(`${route} column is ${column}px at 1440 px, not 720`);
    }
    fail();
    result.checks.push(
      "The Now card countdown is Numeral XL 32/36 at 390 px and 40/44 at 1280 px; the water total is Numeral M 16/17 px (DS-03).",
      'The phone top-bar "+ Add" is 48 px tall (DS-11); Log Day/Week is the shared segmented control: muted track, white selected segment with a shadow (DS-12).',
      "You, About and This device sections are 32 px apart (DS-09); Log Day and Week read in a 720 px column at 1440 px (DS-08).",
    );
    return result;
  } catch (error) {
    return {
      ...result,
      failure: error.message,
      last: await p.locator("body").innerText(),
    };
  } finally {
    await context.close();
  }
};
