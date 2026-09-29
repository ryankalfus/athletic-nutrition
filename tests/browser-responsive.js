// Playwright snippet: no horizontal page scroll on any main route at phone, tablet and desktop widths.
// Seeds a practice, a grocery list and food at home first so pages are not just empty states.
// Fails on page-level horizontal scroll at 320 px and up. Screenshots at 375 px go to output/playwright/.
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
  try {
    await p.setViewportSize({ width: 375, height: 812 });
    await p.goto(base);
    await p.getByRole("textbox", { name: /First name/ }).fill("Layout test");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Cross country");
    await p.getByRole("button", { name: /Save and see today/ }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await p.goto(`${base}#/schedule`);
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    const sheet = p.getByRole("dialog", { name: "Add practice" });
    await sheet.getByRole("button", { name: "Away", exact: true }).click();
    await sheet.getByRole("spinbutton", { name: /Travel time/ }).fill("45");
    await sheet.getByRole("button", { name: "Add practice", exact: true }).click();
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

    const spills = [];
    for (const width of widths) {
      await p.setViewportSize({ width, height: 850 });
      for (const route of routes) {
        await p.goto(`${base}#/${route}`);
        await p.locator("main").waitFor();
        await p.waitForTimeout(100);
        const state = await p.evaluate(() => ({
          // Page-level scroll only: inner scrollers (Food tabs, Ideas moment
          // picker) overflow on purpose and do not widen the document.
          viewport: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          offenders: [...document.querySelectorAll("body *")]
            .filter((el) => {
              const rect = el.getBoundingClientRect();
              const style = getComputedStyle(el);
              return (
                rect.width > 0 &&
                style.visibility !== "hidden" &&
                rect.right > innerWidth + 1 &&
                !el.closest("[aria-hidden=true], .sr-only") &&
                !(function inScroller(node) {
                  // Content clipped by an overflow container is not a page spill.
                  for (
                    let n = node.parentElement;
                    n && n !== document.body;
                    n = n.parentElement
                  )
                    if (/auto|scroll|hidden|clip/.test(getComputedStyle(n).overflowX))
                      return true;
                  return false;
                })(el)
              );
            })
            .slice(0, 3)
            .map(
              (el) =>
                `${el.tagName.toLowerCase()}.${String(el.className).trim().replace(/\s+/g, ".").slice(0, 50)}`,
            ),
        }));
        result.layouts.push({ width, route, scrollWidth: state.scrollWidth });
        if (state.scrollWidth > state.viewport)
          spills.push(
            `${route} @${width}px scrolls to ${state.scrollWidth}px (${state.offenders.join(", ")})`,
          );
        if (width === 375)
          await p.screenshot({
            path: `output/playwright/responsive-375-${route.replace(/\//g, "-")}.png`,
            fullPage: true,
          });
      }
    }
    if (spills.length)
      throw new Error(`Horizontal scroll:\n  ${spills.join("\n  ")}`);
    result.checks.push(
      `No horizontal scroll on ${routes.length} routes (Today, Schedule, Food tabs, You and its sheets) at ${widths.join("/")} px.`,
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
