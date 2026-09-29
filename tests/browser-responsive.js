// Playwright snippet: responsive layout and design-system checks on every main route.
// Seeds a practice, a grocery list and food at home first so pages are not just empty states.
// Fails on page-level horizontal scroll at 320 px and up, text under 12 px (13 px outside the
// tab bar and badges), negative margins, an uncentered or over-wide page column, phone chrome
// over 112 px, and Food sections that do not fit at 320 px. Screenshots at 375 px go to
// output/playwright/.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page.context().browser().newContext();
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [], layouts: [] };
  p.on("pageerror", (error) => result.errors.push(error.message));
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
  ];
  const widths = [320, 375, 768, 1024, 1440];

  // Runs in the page. Returns design-system problems for the current screen.
  const measure = (route) => {
    const hidden = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return (
        rect.width === 0 ||
        rect.height === 0 ||
        style.visibility === "hidden" ||
        Boolean(el.closest("[aria-hidden=true], .sr-only, .page-title"))
      );
    };
    const name = (el) =>
      `${el.tagName.toLowerCase()}${el.classList.length ? `.${[...el.classList].join(".")}` : ""}`;
    const inScroller = (node) => {
      // Content clipped by an overflow container is not a page spill.
      for (
        let n = node.parentElement;
        n && n !== document.body;
        n = n.parentElement
      )
        if (/auto|scroll|hidden|clip/.test(getComputedStyle(n).overflowX))
          return true;
      return false;
    };
    const tiny = new Set();
    const small = new Set();
    const negative = new Set();
    const spill = [];
    for (const el of document.querySelectorAll("body *")) {
      if (hidden(el)) continue;
      const style = getComputedStyle(el);
      const size = parseFloat(style.fontSize);
      const hasText = [...el.childNodes].some(
        (n) => n.nodeType === 3 && n.textContent.trim(),
      );
      if (hasText && size < 12) tiny.add(`${name(el)} ${size}px`);
      else if (
        hasText &&
        size < 13 &&
        !el.closest(".frame-nav-item, .tab-badge, .badge")
      )
        small.add(`${name(el)} ${size}px`);
      for (const side of ["Top", "Right", "Bottom", "Left"])
        if (parseFloat(style[`margin${side}`]) < 0)
          negative.add(`${name(el)} margin-${side.toLowerCase()}`);
      if (
        el.getBoundingClientRect().right > innerWidth + 1 &&
        spill.length < 3 &&
        !inScroller(el)
      )
        spill.push(name(el).slice(0, 50));
    }

    // Page column: centered right of the rail, capped per route, 16/24/32 px gutters.
    const viewport = document.documentElement.clientWidth;
    let column = "";
    const main = document.querySelector("main.shell");
    if (main) {
      const style = getComputedStyle(main);
      const rect = main.getBoundingClientRect();
      const left = rect.left + parseFloat(style.paddingLeft);
      const right = rect.right - parseFloat(style.paddingRight);
      const rail =
        main.closest(".has-navigation") && viewport >= 1024 ? 232 : 0;
      const gutter = viewport >= 1024 ? 32 : viewport >= 768 ? 24 : 16;
      const max = {
        reading: 720,
        grid: 960,
        wide: viewport >= 1200 ? 1072 : 720,
      }[main.dataset.layout];
      const width = right - left;
      const before = left - rail;
      const after = viewport - right;
      if (!max) column = "main has no data-layout";
      else if (width > max + 1)
        column = `${Math.round(width)}px wide (max ${max})`;
      else if (Math.abs(before - after) > 1)
        column = `not centered (${Math.round(before)} vs ${Math.round(after)} px)`;
      else if (before < gutter - 1)
        column = `gutter ${Math.round(before)} px (want ${gutter})`;
      else if (width < max - 1 && before > gutter + 1)
        column = `gutter ${Math.round(before)} px (want ${gutter})`;
    }

    // Chrome: the lowest top bar or sticky section control near the top.
    let chrome = 0;
    for (const el of document.querySelectorAll(
      ".frame-header, .food-sections",
    )) {
      const rect = el.getBoundingClientRect();
      if (!hidden(el) && rect.top < 120) chrome = Math.max(chrome, rect.bottom);
    }

    const clippedTabs = [];
    const tabs = document.querySelector("nav.food-sections");
    if (tabs && route.startsWith("food/")) {
      const box = tabs.getBoundingClientRect();
      for (const link of tabs.querySelectorAll("a, button")) {
        const r = link.getBoundingClientRect();
        if (r.left < box.left - 1 || r.right > box.right + 1)
          clippedTabs.push(link.textContent.trim());
      }
    }
    return {
      viewport,
      scrollWidth: document.documentElement.scrollWidth,
      spill,
      tiny: [...tiny].slice(0, 3),
      small: [...small].slice(0, 3),
      negative: [...negative].slice(0, 3),
      column,
      chrome: Math.round(chrome),
      clippedTabs,
    };
  };

  const spills = [];
  const problems = [];
  const check = async (route, width) => {
    const state = await p.evaluate(measure, route);
    result.layouts.push({ width, route, scrollWidth: state.scrollWidth });
    const at = `${route} @${width}px`;
    if (state.scrollWidth > state.viewport)
      spills.push(
        `${at} scrolls to ${state.scrollWidth}px (${state.spill.join(", ")})`,
      );
    for (const text of state.tiny)
      problems.push(`${at} text under 12px: ${text}`);
    for (const text of state.small)
      problems.push(
        `${at} text under 13px outside tab bar and badges: ${text}`,
      );
    for (const text of state.negative)
      problems.push(`${at} negative margin: ${text}`);
    if (state.column) problems.push(`${at} column ${state.column}`);
    if (width <= 375 && state.chrome > 112)
      problems.push(
        `${at} chrome before content is ${state.chrome}px (max 112)`,
      );
    if (state.clippedTabs.length)
      problems.push(
        `${at} Food section cut off: ${state.clippedTabs.join(", ")}`,
      );
  };

  try {
    // Welcome and setup, before any athlete exists.
    for (const width of widths) {
      await p.setViewportSize({ width, height: 850 });
      await p.goto(base);
      await p.getByRole("button", { name: "Get started" }).waitFor();
      await check("welcome", width);
    }
    await p.getByRole("button", { name: "Get started" }).click();
    for (const width of widths) {
      await p.setViewportSize({ width, height: 850 });
      await p.goto(`${base}#/setup`);
      await p.getByRole("heading", { name: "What do you play?" }).waitFor();
      await check("setup", width);
    }

    await p.setViewportSize({ width: 375, height: 812 });
    await p.goto(`${base}#/setup`);
    await p.getByRole("textbox", { name: /First name/ }).fill("Layout test");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Cross country");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await p.goto(`${base}#/schedule`);
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    const sheet = p.getByRole("dialog", { name: "Add practice" });
    await sheet.getByRole("button", { name: "Away", exact: true }).click();
    await sheet.getByRole("spinbutton", { name: /Travel time/ }).fill("45");
    await sheet
      .getByRole("button", { name: "Add practice", exact: true })
      .click();
    await sheet.waitFor({ state: "hidden" });
    await p.goto(`${base}#/food/groceries`);
    await p.getByRole("button", { name: "Add food for this week" }).click();
    const week = p.getByRole("dialog", { name: "Add food for this week" });
    for (const box of await week.getByRole("checkbox").all()) await box.check();
    await week.getByRole("button", { name: "Add selected" }).click();
    await week.waitFor({ state: "hidden" });
    await p.goto(`${base}#/food/home`);
    await p.getByRole("button", { name: "+ Bananas" }).click();
    await p.getByRole("radiogroup", { name: "Bananas stock" }).waitFor();

    for (const width of widths) {
      await p.setViewportSize({ width, height: 850 });
      for (const route of routes) {
        await p.goto(`${base}#/${route}`);
        await p.locator("main").waitFor();
        await p.waitForTimeout(100);
        await check(route, width);
        if (width === 375)
          await p.screenshot({
            path: `output/playwright/responsive-375-${route.replace(/\//g, "-")}.png`,
            fullPage: true,
          });
      }
      // The activity sheet: a bottom sheet on phones, a dialog from 768 px.
      await p.goto(`${base}#/schedule`);
      await p
        .getByRole("button", { name: "+ Add", exact: true })
        .first()
        .click();
      const add = p.getByRole("dialog", { name: "Add practice" });
      await add.waitFor();
      await p.waitForTimeout(250);
      await check("schedule add sheet", width);
      const fits = await add.evaluate((dialog) => {
        const box = dialog.getBoundingClientRect();
        const footer = dialog
          .querySelector(".schedule-form-footer")
          .getBoundingClientRect();
        return (
          box.left >= 0 &&
          box.right <= innerWidth &&
          box.bottom <= innerHeight + 1 &&
          footer.bottom <= box.bottom + 1 &&
          (innerWidth >= 768 || Math.round(box.width) === innerWidth)
        );
      });
      if (!fits)
        problems.push(
          `schedule add sheet @${width}px is clipped or its footer is off screen`,
        );
      await p.keyboard.press("Escape");
      await add.waitFor({ state: "hidden" });
    }
    if (spills.length)
      throw new Error(`Horizontal scroll:\n  ${spills.join("\n  ")}`);
    if (problems.length)
      throw new Error(
        `Design system:\n  ${problems.slice(0, 20).join("\n  ")}`,
      );
    result.checks.push(
      `No horizontal scroll on welcome, setup and ${routes.length} routes (Today, Schedule, Food tabs, You and its sheets) at ${widths.join("/")} px.`,
      "No text under 12 px; 12 px only in tab-bar labels and badges (DS-05).",
      "No negative margins on any visible element (DS-09).",
      "Every page column is centered, at most 720/960/1072 px, with 16/24/32 px gutters (DS-07, DS-08).",
      "Phone chrome before content stays within 112 px and all four Food sections fit at 320 px (RWD-04, RWD-05).",
      "The activity sheet fits every width with its footer on screen; full-width bottom sheet below 768 px (RWD-11).",
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
