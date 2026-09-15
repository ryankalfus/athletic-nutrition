// Playwright CLI helper. Uses a fresh browser context so existing Nourally data is untouched.
async (page) => {
  const context = await page.context().browser().newContext();
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const errors = [];
  const checks = [];
  p.on("pageerror", (error) => errors.push(error.message));
  const routes = [
    "today",
    "food/overview",
    "food/pantry",
    "food/groceries",
    "food/meals",
    "food/log",
    "calendar",
    "weekly",
    "history",
    "profile",
  ];
  try {
    await p.goto("http://127.0.0.1:5173/");
    await p
      .getByRole("textbox", { name: "First name Optional" })
      .fill("Layout test");
    await p
      .getByRole("button", { name: "Save and see today", exact: false })
      .click();
    await p.getByRole("heading", { name: "Today, Layout test" }).waitFor();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await p.setViewportSize({ width, height: 850 });
      for (const route of routes) {
        await p.goto(`http://127.0.0.1:5173/#/${route}`);
        await p.locator("main").waitFor();
        const state = await p.evaluate(() => {
          const visible = [...document.querySelectorAll("main *")].filter(
            (el) => {
              const rect = el.getBoundingClientRect();
              const style = getComputedStyle(el);
              return (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                rect.width > 0
              );
            },
          );
          return {
            viewport: innerWidth,
            document: document.documentElement.scrollWidth,
            heading: document.querySelector("main h1")?.textContent?.trim(),
            spills: visible
              .filter((el) => el.getBoundingClientRect().right > innerWidth + 2)
              .slice(0, 4)
              .map(
                (el) =>
                  `${el.tagName}.${String(el.className).replace(/\s+/g, ".").slice(0, 60)}`,
              ),
          };
        });
        checks.push({ width, route, ...state });
        if (
          width === 390 &&
          ["today", "food/groceries", "food/meals", "calendar"].includes(route)
        )
          await p.screenshot({
            path: `output/playwright/responsive-390-${route.replace("/", "-")}.png`,
            fullPage: true,
          });
        if (
          width === 1440 &&
          ["today", "food/groceries", "calendar"].includes(route)
        )
          await p.screenshot({
            path: `output/playwright/responsive-1440-${route.replace("/", "-")}.png`,
            fullPage: true,
          });
      }
    }
    return { checks, errors };
  } catch (error) {
    return {
      failure: error.message,
      last: await p.locator("body").innerText(),
      checks,
      errors,
    };
  } finally {
    await context.close();
  }
};
