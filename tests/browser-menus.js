// U4-05: row menu geometry, nested destinations and page stability.
async (page) => {
  const base = globalThis.BASE_URL;
  const result = { checks: [] };
  for (const width of [320, 390, 1280]) {
    const context = await page
      .context()
      .browser()
      .newContext({ viewport: { width, height: 900 } });
    const p = await context.newPage();
    try {
      await p.goto(base);
      await p.getByRole("button", { name: "Get started" }).click();
      await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
      await p.getByRole("button", { name: "Next", exact: true }).click();
      await p.getByRole("button", { name: "Skip setup" }).click();
      await p.waitForURL("**/#/today");
      await p.getByRole("heading", { level: 1 }).waitFor();
      await p.goto(base + "#/food/home");
      await p.getByRole("button", { name: "Add Bananas", exact: true }).click();
      const trigger = p.getByRole("button", {
        name: "Bananas options",
        exact: true,
      });
      await trigger.waitFor();
      await trigger.evaluate((node) =>
        node.scrollIntoView({ block: "center" }),
      );
      const before = await p.locator("main").boundingBox();
      await trigger.click();
      const menu = p.getByRole("menu");
      await menu.waitFor();
      const geometry = await menu.evaluate((node) => {
        const sheet = node.closest("dialog");
        const box = sheet?.getBoundingClientRect();
        return {
          modal: Boolean(sheet?.matches(":modal")),
          bottom: box?.bottom,
          height: innerHeight,
          radius: getComputedStyle(node).borderRadius,
          title: sheet?.querySelector("h2")?.textContent,
        };
      });
      if (
        width < 768 &&
        (!geometry.modal ||
          Math.abs(geometry.bottom - geometry.height) > 1 ||
          geometry.title !== "Bananas")
      )
        throw new Error(JSON.stringify(geometry));
      if (width >= 768 && (geometry.modal || geometry.radius !== "24px"))
        throw new Error(JSON.stringify(geometry));
      if (
        JSON.stringify(before) !==
        JSON.stringify(await p.locator("main").boundingBox())
      )
        throw new Error("Opening moved main");
      await p.screenshot({ path: `output/playwright/u405-menu-${width}.png` });
      const actions = await menu.getByRole("menuitem").allTextContents();
      if (!/Remove/.test(actions.at(-1)))
        throw new Error("Destructive action is not last");
      await menu
        .getByRole("menuitem", { name: "Move to…", exact: true })
        .click();
      await menu.getByRole("menuitem", { name: "Back", exact: true }).waitFor();
      await p.screenshot({ path: `output/playwright/u405-move-${width}.png` });
      const destinations = await menu.getByRole("menuitem").allTextContents();
      if (
        destinations.length < 3 ||
        !destinations.slice(1).every((name) => name.startsWith("Move to "))
      )
        throw new Error("Missing move destinations");
      await p.keyboard.press("Escape");
      if (!(await trigger.evaluate((node) => node === document.activeElement)))
        throw new Error("Escape did not return focus");
      if (width < 768) {
        await trigger.click();
        await menu.getByRole("menuitem").first().waitFor();
        await p.keyboard.press("Tab");
        await menu.waitFor({ state: "hidden" });
        if (
          !(await trigger.evaluate((node) => node === document.activeElement))
        )
          throw new Error("Tab in the phone action sheet did not return focus");
      }
      if (
        JSON.stringify(before) !==
        JSON.stringify(await p.locator("main").boundingBox())
      )
        throw new Error("Closing moved main");
      result.checks.push(
        width +
          ": modal phone sheet or anchored desktop menu, item title, destructive last, Move second step, Tab hands focus back on phones, and no shift",
      );
    } finally {
      await context.close();
    }
  }
  return result;
};
