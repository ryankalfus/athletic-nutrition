// Playwright snippet: every expandable section opens AND closes again, by
// mouse and by keyboard, reports its state (aria-expanded or the native
// <details> open state), and stays the way the athlete left it when the page
// re-renders. Owner bug: on Today, after everything in Pack & prep was
// packed, "Show list" opened the list and nothing could close it again.
// Covered at 1440, 1280, 768, 390 and 320 px:
// - Today › Pack & prep (packed state): Show list / Hide list.
// - Schedule › Add practice › More options (<details>).
// - Schedule row menu (aria-expanded).
// - Food › Log food › portion step › Nutrition details (<details>).
// - Food › Log › Week › View as table (<details>).
// Each is checked open → closed → open by mouse, then closed → open by
// keyboard, and Pack & prep stays open / closed across a save elsewhere on
// the page. The clock is fixed to Friday 2026-10-09 1:00 PM.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const browser = page.context().browser();
  const result = { checks: [], errors: [] };
  let p;
  const expect = (ok, message) => {
    if (!ok) throw new Error(message);
  };

  // A disclosure button: aria-expanded and whether the panel it controls is
  // on screen.
  const buttonState = (button) =>
    button.evaluate((node) => {
      const id = node.getAttribute("aria-controls");
      const panel = id && document.getElementById(id);
      return {
        expanded: node.getAttribute("aria-expanded"),
        visible: Boolean(panel && panel.checkVisibility()),
      };
    });
  const expectButton = async (label, button, open) => {
    const s = await buttonState(button);
    expect(
      s.expanded === String(open) && s.visible === open,
      `${label}: expected ${open ? "open" : "closed"}, got ${JSON.stringify(s)}`,
    );
  };
  // A native <details>: its open state and whether its content shows.
  const detailsState = (summary) =>
    summary.evaluate((node) => {
      const details = node.parentElement;
      const content = details.querySelector(":scope > :not(summary)");
      return { open: details.open, visible: content.checkVisibility() };
    });
  const expectDetails = async (label, summary, open) => {
    const s = await detailsState(summary);
    expect(
      s.open === open && s.visible === open,
      `${label}: expected ${open ? "open" : "closed"}, got ${JSON.stringify(s)}`,
    );
  };
  // Mouse open → closed → open, then keyboard closed → open (Enter, Space).
  const walk = async (label, control, expectState) => {
    await expectState(label, control, false);
    await control.click();
    await expectState(`${label} (click 1)`, control, true);
    await control.click();
    await expectState(`${label} (click 2)`, control, false);
    await control.click();
    await expectState(`${label} (click 3)`, control, true);
    await control.focus();
    await p.keyboard.press("Enter");
    await expectState(`${label} (Enter)`, control, false);
    await control.focus();
    await p.keyboard.press("Space");
    await expectState(`${label} (Space)`, control, true);
  };

  for (const width of [1440, 1280, 768, 390, 320]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    await context.clock.setFixedTime(new Date(2026, 9, 9, 13, 0, 0));
    p = await context.newPage();
    p.setDefaultTimeout(15000);
    p.on("pageerror", (e) => result.errors.push(e.message));
    try {
      await p.goto(base);
      await p.getByRole("button", { name: "Get started" }).click();
      await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
      await p.getByRole("button", { name: "Next", exact: true }).click();
      await p.getByRole("button", { name: "Skip setup" }).click();
      await p.getByRole("heading", { name: "Today", exact: true }).waitFor();

      // Schedule › Add practice › More options, then a practice at 3:00 PM.
      await p.goto(`${base}#/schedule`);
      await p.getByRole("heading", { name: "Schedule", level: 1 }).waitFor();
      await p
        .getByRole("button", { name: "+ Add", exact: true })
        .first()
        .click();
      const add = p.getByRole("dialog", { name: "Add practice" });
      const more = add.locator("summary", { hasText: "More options" });
      await walk(`${width} Schedule › More options`, more, expectDetails);
      // Typing elsewhere re-renders the sheet; More options stays open.
      await add.getByLabel("Starts").fill("15:00");
      await add.getByLabel("Ends").fill("16:30");
      await expectDetails(`${width} More options after typing`, more, true);
      await more.click();
      await add.getByRole("textbox", { name: "Name" }).fill("Practice");
      await expectDetails(
        `${width} More options closed after typing`,
        more,
        false,
      );
      await add
        .getByRole("button", { name: "Add practice", exact: true })
        .click();
      await add.waitFor({ state: "hidden" });
      result.checks.push(
        `${width}: Schedule › More options opens and closes by click, Enter and Space and keeps its state while typing.`,
      );

      // Schedule row menu.
      const menuButton = p
        .getByRole("button", { name: /^Actions for / })
        .first();
      await expectButton(`${width} row menu`, menuButton, false);
      await menuButton.click();
      await expectButton(`${width} row menu (click)`, menuButton, true);
      await menuButton.click();
      await expectButton(`${width} row menu (click 2)`, menuButton, false);
      await menuButton.focus();
      await p.keyboard.press("Enter");
      await expectButton(`${width} row menu (Enter)`, menuButton, true);
      await p.keyboard.press("Escape");
      await expectButton(`${width} row menu (Escape)`, menuButton, false);
      result.checks.push(
        `${width}: Schedule row menu opens and closes by click, Enter and Escape (aria-expanded).`,
      );

      // Today: plan the snack, pack everything, then Show list / Hide list.
      await p.goto(`${base}#/today`);
      await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
      await p.locator(".today-primary").click();
      const pack = p.getByRole("region", { name: "Pack & prep" });
      await pack.getByRole("checkbox").first().waitFor();
      const boxes = pack.getByRole("checkbox");
      // Each tick is a save: wait for the count before the next one.
      const total = await boxes.count();
      for (let n = 1; n <= total; n++) {
        await pack.getByRole("checkbox", { checked: false }).first().click();
        await pack
          .getByText(
            n === total ? `All ${n} packed` : `${n} of ${total} done`,
            { exact: true },
          )
          .waitFor();
      }
      await pack.getByText(/^All \d+ packed$/).waitFor();
      const toggle = pack.getByRole("button", { name: /^(Show|Hide) list$/ });
      // Ticking the last task folds the list and moves focus to the toggle.
      expect(
        await toggle.evaluate((node) => node === document.activeElement),
        `${width}: focus fell to the page when the list folded`,
      );
      expect(
        (await boxes.count()) === 0,
        `${width}: the packed list did not fold`,
      );
      await walk(`${width} Today › Pack & prep`, toggle, expectButton);
      expect(
        (await toggle.innerText()) === "Hide list",
        `${width}: the open list's button does not read "Hide list"`,
      );
      // A save elsewhere on Today re-renders it; the list stays open, then
      // stays closed.
      const waterPlus = p
        .getByRole("region", { name: /^Water today/ })
        .getByRole("button", { name: "+8", exact: true });
      await waterPlus.click();
      await p.waitForTimeout(300);
      await expectButton(`${width} Pack & prep after a save`, toggle, true);
      await toggle.click();
      await waterPlus.click();
      await p.waitForTimeout(300);
      await expectButton(
        `${width} Pack & prep closed after a save`,
        toggle,
        false,
      );
      // Unticking a task from the open list brings the toggle back to the
      // working list; packing it again folds it.
      await toggle.click();
      await boxes.first().click();
      await pack
        .getByText(`${total - 1} of ${total} done`, { exact: true })
        .waitFor();
      expect(
        (await toggle.count()) === 0,
        `${width}: Show/Hide list shows while tasks are left`,
      );
      await pack.getByRole("checkbox", { checked: false }).click();
      await pack.getByText(`All ${total} packed`, { exact: true }).waitFor();
      result.checks.push(
        `${width}: Today › Pack & prep (all packed) Show list / Hide list opens and closes by click, Enter and Space (aria-expanded), stays as left across saves, and focus moves to it when the list folds.`,
      );

      // Food › Log food › portion step › Nutrition details.
      await p.goto(`${base}#/food/log`);
      await p.getByRole("button", { name: "Log food", exact: true }).click();
      const log = p.getByRole("dialog", { name: "Log food" });
      await log.getByRole("button", { name: /^Add / }).first().click();
      const nutrition = log.locator("summary", {
        hasText: "Nutrition details (optional)",
      });
      await walk(`${width} Log › Nutrition details`, nutrition, expectDetails);
      await p.keyboard.press("Escape");
      const discard = p.getByRole("dialog", { name: "Discard changes?" });
      if (await discard.isVisible().catch(() => false))
        await discard
          .getByRole("button", { name: "Discard", exact: true })
          .click();
      await log.waitFor({ state: "hidden" });
      result.checks.push(
        `${width}: Log food › Nutrition details opens and closes by click, Enter and Space.`,
      );

      // Food › Log › Week › View as table.
      await p.goto(`${base}#/food/log/week`);
      const table = p.locator("summary", { hasText: "View as table" });
      await walk(`${width} Log › View as table`, table, expectDetails);
      result.checks.push(
        `${width}: Log › Week › View as table opens and closes by click, Enter and Space.`,
      );
    } catch (error) {
      result.failure = `${width}px: ${error.message}`;
      break;
    } finally {
      await context.close();
    }
  }
  return result;
};
