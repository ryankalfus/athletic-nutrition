// U4-05: desktop dialog sizing, content-sized scanner and compact import rows.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const result = { checks: [], errors: [] };
  for (const width of [320, 390, 1280]) {
    const context = await page
      .context()
      .browser()
      .newContext({ viewport: { width, height: 844 } });
    await context.clock.setFixedTime(new Date("2026-10-11T12:00:00"));
    const p = await context.newPage();
    p.setDefaultTimeout(15000);
    p.on("pageerror", (error) => result.errors.push(error.message));
    try {
      await p.goto(base, { waitUntil: "domcontentloaded" });
      await p.getByRole("button", { name: "Get started" }).click();
      await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
      await p.getByRole("button", { name: "Next", exact: true }).click();
      await p.getByRole("heading", { name: "Your school day" }).waitFor();
      await p.getByRole("button", { name: "Skip setup" }).click();
      await p
        .getByRole("heading", {
          level: 1,
          name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/,
        })
        .waitFor();
      if (width === 1280) {
        await p.goto(`${base}#/you/sport`, { waitUntil: "domcontentloaded" });
        const form = p.getByRole("dialog", { name: "Sport & season" });
        await form.waitFor();
        await p.waitForTimeout(250);
        const box = await form.boundingBox();
        const radius = await form.evaluate(
          (node) => getComputedStyle(node).borderRadius,
        );
        if (
          Math.abs(box.width - 520) > 1 ||
          Math.abs(box.x + box.width / 2 - width / 2) > 1 ||
          Math.abs(box.y + box.height / 2 - 422) > 1 ||
          radius !== "24px"
        )
          throw new Error(
            `Desktop form geometry: ${JSON.stringify({ box, radius })}`,
          );
        await p.keyboard.press("Escape");
        await form.waitFor({ state: "hidden" });
        await p.goto(`${base}#/food/log`, { waitUntil: "domcontentloaded" });
        await p.getByRole("button", { name: "Log food", exact: true }).click();
        const search = p.getByRole("dialog", { name: "Log food", exact: true });
        await search.getByRole("button", { name: "Scan barcode" }).click();
        await search
          .getByRole("heading", { name: "Scan or enter a barcode" })
          .waitFor();
        await p.waitForTimeout(250);
        const scanner = await search.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const card = node
            .querySelector(".scanner-card")
            .getBoundingClientRect();
          const css = getComputedStyle(node);
          return {
            width: rect.width,
            height: rect.height,
            minHeight: css.minHeight,
            bottomSpace: rect.bottom - card.bottom,
            pad: parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(
                "--space-6",
              ),
            ),
          };
        });
        if (
          Math.abs(scanner.width - 520) > 1 ||
          scanner.minHeight !== "0px" ||
          scanner.bottomSpace > 25
        )
          throw new Error(
            `Scanner retains a fixed tall box: ${JSON.stringify(scanner)}`,
          );
        result.checks.push(
          "At 1280 form and scanner dialogs are centered at 520 px with radius 24; scanner height follows its content.",
        );
      }
      await p.goto(`${base}#/schedule`, { waitUntil: "domcontentloaded" });
      await p.getByRole("button", { name: "Import team calendar" }).click();
      const sheet = p.getByRole("dialog", {
        name: "Import team calendar",
        exact: true,
      });
      await sheet
        .getByLabel("Calendar file (.ics)")
        .setInputFiles("tests/fixtures/teamsnap-lightning-u14.ics");
      await sheet.getByText("20 upcoming events").waitFor();
      await p.waitForTimeout(250);
      if (width === 1280) {
        const geometry = await sheet.evaluate((node) => ({
          width: node.getBoundingClientRect().width,
          rows: [...node.querySelectorAll(".import-row")].map((row) => {
            const r = row.getBoundingClientRect();
            const info = row
              .querySelector(".checklist-row")
              .getBoundingClientRect();
            const fields = row
              .querySelector(".import-row-fields")
              ?.getBoundingClientRect();
            const summary = row.querySelector(".import-event-summary");
            return {
              height: r.height,
              aligned:
                !fields ||
                Math.abs(
                  info.y + info.height / 2 - (fields.y + fields.height / 2),
                ) <= 1,
              singleLine: getComputedStyle(summary).whiteSpace === "nowrap",
              overflow: row.scrollWidth > row.clientWidth + 1,
            };
          }),
        }));
        if (
          Math.abs(geometry.width - 520) > 1 ||
          geometry.rows.some(
            (row) =>
              row.height > 66 ||
              !row.aligned ||
              !row.singleLine ||
              row.overflow,
          )
        )
          throw new Error(`Import rows wrap: ${JSON.stringify(geometry)}`);
        const firstType = sheet
          .getByRole("combobox", { name: /^Type for/ })
          .first();
        await firstType.focus();
        await p.keyboard.press("ArrowDown");
        await p.keyboard.press("Tab");
        if (
          !(await sheet
            .getByRole("combobox", { name: /^Where for/ })
            .first()
            .evaluate((node) => document.activeElement === node))
        )
          throw new Error("Import Type/Where keyboard order changed");
      }
      await p.screenshot({
        path: `output/playwright/import-preview-${width}.png`,
      });
      if (
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw new Error(`Import overflows viewport at ${width}`);
      result.checks.push(
        `Import preview at ${width} stays within the viewport${width === 1280 ? ", with one-line rows and reachable Type/Where controls" : ""}.`,
      );
    } catch (error) {
      return { ...result, failure: `${width}: ${error.message}` };
    } finally {
      await context.close();
    }
  }
  return result;
};
