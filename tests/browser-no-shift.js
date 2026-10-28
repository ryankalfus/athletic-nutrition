// Playwright snippet: nothing behind a dialog, menu or toast moves when it
// opens. At 1280, 1440, 768, 390 and 320 px it opens each kind of overlay on
// every tab (the rail's athlete sheet, Today sheets, You sheets, Schedule
// sheets, Food sheets, Welcome sheets, a confirm, the nested "Discard
// changes?", row menus, the Sport suggestions list and a toast) and compares the page H1, main, the frame
// footer and the Welcome privacy line (page coordinates) and
// the scroll position before, while open and after closing: all must be
// identical. A <dialog> rendered between </main> and the footer used to break
// .shell:has(+ .frame-footer), so the footer dropped 48–96 px; a routed You
// sheet scrolled the page behind it to the top.
// The clock is fixed to Friday 2026-10-09 1:00 PM.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const browser = page.context().browser();
  const result = { checks: [], errors: [] };
  const widths = [1280, 1440, 768, 390, 320];
  let p;

  const measure = () =>
    p.evaluate(() => {
      const box = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const r = node.getBoundingClientRect();
        return [r.left, r.top + window.scrollY, r.width, r.height].map(
          (n) => Math.round(n * 10) / 10,
        );
      };
      return {
        h1: box("main h1"),
        main: box("main"),
        footer: box(".frame-footer"),
        privacy: box(".welcome-privacy"),
        scroll: [window.scrollX, window.scrollY],
        page: [
          document.documentElement.scrollWidth,
          document.documentElement.scrollHeight,
        ],
      };
    });

  const settle = () =>
    p.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );

  // Opens an overlay with `open`, waits for `ready`, compares, then `close`.
  const same = async (label, open, ready, close) => {
    await settle();
    const before = await measure();
    await open();
    await ready();
    await settle();
    const after = await measure();
    const a = JSON.stringify(before);
    const b = JSON.stringify(after);
    if (a !== b) throw new Error(`${label} moved the page: ${a} -> ${b}`);
    if (close) {
      await close();
      await settle();
      const closed = JSON.stringify(await measure());
      if (closed !== a)
        throw new Error(`closing ${label} moved the page: ${a} -> ${closed}`);
    }
    result.checks.push(label);
  };

  const dialog = (name) => p.getByRole("dialog", { name });
  // The trigger is scrolled to mid-screen first (clear of the sticky bars):
  // a click's own scroll is not a shift.
  const center = (locator) =>
    locator.evaluate((node) => node.scrollIntoView({ block: "center" }));
  const openDialog = async (label, name, trigger) => {
    await center(trigger);
    await same(
      label,
      () => trigger.click(),
      () => dialog(name).waitFor(),
      async () => {
        await p.keyboard.press("Escape");
        await dialog(name).waitFor({ state: "hidden" });
      },
    );
  };
  const go = async (hash, heading) => {
    await p.goto(`${base}#/${hash}`);
    await p.getByRole("heading", { name: heading, level: 1 }).waitFor();
  };

  for (const width of widths) {
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
      await p.getByRole("textbox", { name: /First name/ }).fill("Zoe");
      await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
      await p.getByRole("button", { name: "Next", exact: true }).click();
      await p.getByRole("heading", { name: "Your school day" }).waitFor();
      await p.getByRole("button", { name: "Skip setup" }).click();
      await p.getByRole("heading", { level: 1, name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/ }).waitFor();

      // A one-day practice, so Schedule has a row with a menu.
      await go("schedule", /^(January|February|March|April|May|June|July|August|September|October|November|December)$/);
      await p
        .getByRole("button", { name: /^(\+ )?Add$/ })
        .first()
        .click();
      const add = dialog("Add practice");
      await add.getByRole("textbox", { name: "Name" }).fill("Practice");
      await add.getByLabel("Starts").fill("15:00");
      await add.getByLabel("Ends").fill("16:30");
      await add
        .getByRole("button", { name: "Add practice", exact: true })
        .click();
      await add.waitFor({ state: "hidden" });

      // Today: Why this?, Add water and the day rail's activity sheet.
      await go("today", /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/);
      await openDialog(
        `${width} today: Why this?`,
        "Why this?",
        p.getByRole("button", { name: "Why this?" }),
      );
      await openDialog(
        `${width} today: Add water`,
        "Add water",
        p.getByRole("button", { name: "Custom", exact: true }),
      );
      await openDialog(
        `${width} today: activity sheet`,
        /^Edit /,
        p
          .getByRole("region", { name: "Your day" })
          .getByRole("button", { name: /practice/i }),
      );

      // The rail / top bar athlete button on every tab and Food section.
      for (const [hash, heading] of [
        ["today", /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/],
        ["schedule", /^(January|February|March|April|May|June|July|August|September|October|November|December)$/],
        ["food/log", "Food"],
        ["food/ideas", "Food"],
        ["food/home", "Food"],
        ["food/groceries", "Food"],
        ["you", "You"],
        ["you/device", "This device"],
      ]) {
        await go(hash, heading);
        // Scrolled to the bottom, where the footer is on screen.
        await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await openDialog(
          `${width} ${hash}: Add athlete`,
          "Add athlete",
          p.locator(".frame-athlete"),
        );
      }
      await go("you", "You");
      await openDialog(
        `${width} you: Add another athlete`,
        "Add athlete",
        p.locator("main").getByRole("button", { name: "Add another athlete" }),
      );

      await go("schedule", /^(January|February|March|April|May|June|July|August|September|October|November|December)$/);
      await openDialog(
        `${width} schedule: Add practice`,
        "Add practice",
        p.getByRole("button", { name: /^(\+ )?Add$/ }).first(),
      );
      // The nested confirm opens over a dirty sheet: neither moves the page.
      await p
        .getByRole("button", { name: /^(\+ )?Add$/ })
        .first()
        .click();
      await dialog("Add practice")
        .getByRole("textbox", { name: "Name" })
        .fill("Changed");
      await same(
        `${width} schedule: Discard changes?`,
        () => p.keyboard.press("Escape"),
        () => dialog("Discard changes?").waitFor(),
        async () => {
          await dialog("Discard changes?")
            .getByRole("button", { name: "Discard", exact: true })
            .click();
          await dialog("Add practice").waitFor({ state: "hidden" });
        },
      );
      await openDialog(
        `${width} schedule: School day`,
        "School day",
        p.getByRole("button", { name: "Set up school day" }),
      );
      await openDialog(
        `${width} schedule: Import team calendar`,
        "Import team calendar",
        p.getByRole("button", { name: "Import team calendar" }),
      );
      const rowMenu = p.getByRole("button", { name: /^Actions for / }).first();
      await center(rowMenu);
      await same(
        `${width} schedule: row menu`,
        () => rowMenu.click(),
        () => p.getByRole("menu").first().waitFor(),
        async () => {
          await p.keyboard.press("Escape");
          await p.getByRole("menu").waitFor({ state: "hidden" });
        },
      );

      await go("food/log", "Food");
      await openDialog(
        `${width} food/log: Log food`,
        "Log food",
        p.getByRole("button", { name: "Log food", exact: true }),
      );
      await go("food/home", "Food");
      await openDialog(
        `${width} food/home: Add food at home`,
        "Add food at home",
        p.getByRole("button", { name: "Add food", exact: true }),
      );
      await go("food/groceries", "Food");
      await openDialog(
        `${width} food/groceries: Add to groceries`,
        "Add to groceries",
        p.getByRole("button", { name: "Add food", exact: true }),
      );
      await openDialog(
        `${width} food/groceries: Add food for this week`,
        "Add food for this week",
        p.getByRole("button", { name: "Suggest for this week" }),
      );

      for (const [title, name] of [
        ["Sport", "Sport & season"],
        ["Food needs", "Food needs & allergies"],
        ["Food access", "Food access & budget"],
        ["Reminders", "Reminders"],
      ]) {
        await go("you", "You");
        const link = p.getByRole("link", { name: new RegExp(`^${title}`) });
        // A routed sheet (#/you/…): opening and closing it keep the scroll.
        await center(link);
        await same(
          `${width} you: ${name}`,
          () => link.click(),
          () => dialog(name).waitFor(),
          async () => {
            await p.keyboard.press("Escape");
            await dialog(name).waitFor({ state: "hidden" });
          },
        );
      }

      // The Sport combobox list inside its sheet.
      await go("you", "You");
      await p.getByRole("link", { name: /^Sport/ }).click();
      const sportSheet = dialog("Sport & season");
      await sportSheet.waitFor();
      await same(
        `${width} you: Sport suggestions list`,
        () =>
          sportSheet.getByRole("button", { name: "Sport suggestions" }).click(),
        () => p.getByRole("listbox", { name: "Sport suggestions" }).waitFor(),
        async () => {
          await p.keyboard.press("Escape");
          await p
            .getByRole("listbox", { name: "Sport suggestions" })
            .waitFor({ state: "hidden" });
        },
      );
      await p.keyboard.press("Escape");
      await sportSheet.waitFor({ state: "hidden" });

      await go("you/device", "This device");
      await openDialog(
        `${width} you/device: delete confirm`,
        "Delete Zoe's data from this device?",
        p.getByRole("button", { name: "Delete Zoe's data" }),
      );

      await go("today", /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/);
      await same(
        `${width} today: toast`,
        () =>
          p.evaluate(() =>
            window.dispatchEvent(
              new CustomEvent("nourally:toast", {
                detail: { message: "Shift check." },
              }),
            ),
          ),
        () =>
          p
            .locator(".app-toast-region")
            .getByText("Shift check.", { exact: true })
            .waitFor(),
      );

      // Welcome (the athlete chooser): its sheets, confirm and row menu.
      await go("welcome", "Fuel for the day you actually have.");
      await openDialog(
        `${width} welcome: Add athlete`,
        "Add athlete",
        p.getByRole("button", { name: "Add another athlete" }),
      );
      const tileMenu = p.getByRole("button", { name: "Zoe options" });
      await center(tileMenu);
      await same(
        `${width} welcome: row menu`,
        () => tileMenu.click(),
        () => p.getByRole("menu").waitFor(),
        async () => {
          await p.keyboard.press("Escape");
          await p.getByRole("menu").waitFor({ state: "hidden" });
        },
      );
      for (const [item, name] of [
        ["Rename", "Rename Zoe"],
        [
          "Remove from this device",
          "Delete Zoe's data from this device?",
        ],
      ]) {
        await center(tileMenu);
        await tileMenu.click();
        await same(
          `${width} welcome: ${item}`,
          () => p.getByRole("menuitem", { name: item }).click(),
          () => dialog(name).waitFor(),
          async () => {
            await p.keyboard.press("Escape");
            await dialog(name).waitFor({ state: "hidden" });
          },
        );
      }
    } catch (error) {
      result.failure = `${width}px: ${error.message}`;
      break;
    } finally {
      await context.close();
    }
  }
  return result;
};
