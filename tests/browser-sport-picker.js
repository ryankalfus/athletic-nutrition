// The Sport list pushes inside its sheet on phones and remains a popover on desktop.
async (page) => {
  const base = globalThis.BASE_URL;
  const browser = page.context().browser();
  const checks = [];
  for (const width of [320, 390, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: width === 390,
    });
    const p = await context.newPage();
    try {
      await p.goto(base);
      await p.getByRole("button", { name: "Get started" }).click();
      await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
      await p.getByRole("button", { name: "Next", exact: true }).click();
      await p.getByRole("button", { name: "Skip setup" }).click();
      await p.waitForURL("**/#/today");
      await p.goto(base + "#/you/sport");
      const sheet = p.getByRole("dialog", { name: "Sport & season" });
      await sheet.getByRole("button", { name: "Sport suggestions" }).click();
      const list = p.getByRole("listbox", { name: "Sport suggestions" });
      const geometry = await list.evaluate((node) => {
        const sheet = node.closest("dialog");
        const pushed = node.closest(".combobox-pushed");
        return {
          pushed: !!pushed,
          fillsSheet:
            !!pushed &&
            ["left", "top", "right", "bottom"].every(
              (edge) =>
                Math.abs(
                  pushed.getBoundingClientRect()[edge] -
                    sheet.getBoundingClientRect()[edge],
                ) <= 1,
            ),
          popover: node.matches(":popover-open"),
          inside: !!sheet,
          selectedCheck: !!node.querySelector('[aria-selected="true"] svg'),
        };
      });
      if (
        !geometry.selectedCheck ||
        (width < 768
          ? !geometry.fillsSheet ||
            !geometry.pushed ||
            geometry.popover ||
            !geometry.inside
          : geometry.pushed || !geometry.popover)
      )
        throw new Error(JSON.stringify(geometry));
      if (width < 768) {
        await p.waitForTimeout(250);
        const { violations } = await new globalThis.AxeBuilder({ page: p })
          .include(".combobox-pushed")
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        if (violations.length)
          throw new Error(
            JSON.stringify(
              violations.map((v) => ({
                id: v.id,
                nodes: v.nodes.map((n) => n.failureSummary),
              })),
            ),
          );
        const back = sheet.getByRole("button", { name: "Back to form" });
        const field = sheet.getByRole("combobox", { name: /^Sport/ });
        await field.press("Tab");
        if (!(await back.evaluate((node) => node === document.activeElement)))
          throw new Error("Tab missed picker Back");
        await back.press("Escape");
        if ((await list.isVisible()) || !(await sheet.isVisible()))
          throw new Error("Escape on Back must pop one page");
        await sheet.getByRole("button", { name: "Sport suggestions" }).click();
        await field.fill("ba");
        await field.press("ArrowDown");
        await field.press("Enter");
        if (
          (await field.inputValue()) !== "Basketball" ||
          (await list.isVisible())
        )
          throw new Error("Filtered keyboard selection failed");
        await sheet.getByRole("button", { name: "Sport suggestions" }).click();
        if (width === 390) {
          await sheet
            .getByRole("option", { name: "Tennis", exact: true })
            .tap();
          if ((await field.inputValue()) !== "Tennis")
            throw new Error("Touch selection failed");
          await sheet.getByRole("button", { name: "Sport suggestions" }).tap();
        }
        await back.click();
        if (await list.isVisible()) throw new Error("Back leaves picker open");
        await sheet.getByRole("button", { name: "Sport suggestions" }).click();
      }
      await p.keyboard.press("Escape");
      if (!(await sheet.isVisible()) || (await list.isVisible()))
        throw new Error("Escape closed sheet or left picker open");
      checks.push(
        width + ": Sport picker geometry, selected check, Back and Escape",
      );
    } finally {
      await context.close();
    }
  }
  return { checks };
};
