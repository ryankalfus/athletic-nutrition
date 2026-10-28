// Playwright snippet: the Sport combobox (setup step 1 and You › Sport &
// season) at 1280, 1440, 768, 390 and 320 px. A mouse click on the chevron
// opens the list (the old <datalist> drew a chevron over padding, away from
// the browser's hidden picker, so the click did nothing); typing filters it;
// ArrowDown/ArrowUp move with aria-activedescendant, Enter picks; Escape
// closes only the list inside the sheet, a second Escape the sheet; a click on
// an option picks it; a click outside closes it; aria-controls always names
// the listbox; any other sport can be typed and is saved; no <datalist> is
// left in the app. At 390 px a touch phone taps the chevron (the list opens
// without the keyboard), taps an option, and a tap outside closes the list.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const browser = page.context().browser();
  const result = { checks: [], errors: [] };
  let p;
  const expect = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  const state = (box) =>
    box.evaluate((node) => {
      const list = document.getElementById(node.getAttribute("aria-controls"));
      const active = node.getAttribute("aria-activedescendant");
      if (list?.getAttribute("role") !== "listbox")
        throw new Error("aria-controls does not name a listbox");
      return {
        expanded: node.getAttribute("aria-expanded"),
        options: list.hidden
          ? []
          : [...list.querySelectorAll('[role="option"]')].map(
              (o) => o.textContent,
            ),
        active: active ? document.getElementById(active)?.textContent : null,
        focused: node === document.activeElement,
        value: node.value,
      };
    });

  for (const width of [1280, 1440, 768, 390, 320]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    p = await context.newPage();
    p.setDefaultTimeout(15000);
    p.on("pageerror", (e) => result.errors.push(e.message));
    try {
      await p.goto(base);
      await p.getByRole("button", { name: "Get started" }).click();
      const sport = p.getByRole("combobox", { name: /^Sport/ });
      await sport.waitFor();
      expect(
        (await p.locator("datalist, input[list]").count()) === 0,
        "a <datalist> is still used",
      );

      // Mouse: the chevron opens every option; a second click closes.
      const chevron = p.getByRole("button", { name: "Sport suggestions" });
      await chevron.click();
      let s = await state(sport);
      expect(
        s.expanded === "true" && s.options.length === 13 && s.focused,
        `${width}: chevron click did not open the list: ${JSON.stringify(s)}`,
      );
      await chevron.click();
      expect(
        (await state(sport)).expanded === "false",
        `${width}: second chevron click did not close the list`,
      );
      // A click outside closes it.
      await chevron.click();
      await p.getByRole("heading", { level: 1 }).first().click();
      expect(
        (await state(sport)).expanded === "false",
        `${width}: a click outside did not close the list`,
      );

      // Typing filters; arrows move; Enter picks.
      await sport.fill("ba");
      s = await state(sport);
      expect(
        JSON.stringify(s.options) ===
          JSON.stringify([
            "Basketball",
            "Baseball",
            "Football",
            "Volleyball",
            "Softball",
          ]),
        `${width}: "ba" filtered to ${JSON.stringify(s.options)}`,
      );
      await p.keyboard.press("ArrowDown");
      await p.keyboard.press("ArrowDown");
      expect(
        (await state(sport)).active === "Baseball",
        `${width}: ArrowDown did not move to Baseball`,
      );
      await p.keyboard.press("ArrowUp");
      await p.keyboard.press("Enter");
      s = await state(sport);
      expect(
        s.value === "Basketball" && s.expanded === "false",
        `${width}: Enter did not pick Basketball: ${JSON.stringify(s)}`,
      );

      // Click an option.
      await sport.fill("s");
      await p.getByRole("option", { name: "Swimming" }).click();
      s = await state(sport);
      expect(
        s.value === "Swimming" && s.expanded === "false" && s.focused,
        `${width}: clicking Swimming did not pick it: ${JSON.stringify(s)}`,
      );

      // Free text: no suggestion matches, the list stays closed, it saves.
      await sport.fill("Ultimate frisbee");
      expect(
        (await state(sport)).expanded === "false",
        `${width}: an unknown sport left an empty list open`,
      );
      await p.getByRole("button", { name: "Next", exact: true }).click();
      await p.getByRole("heading", { name: "Your school day" }).waitFor();
      await p.getByRole("button", { name: "Skip setup" }).click();
      await p.getByRole("heading", { level: 1, name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/ }).waitFor();

      // You › Sport & season: Escape closes the list, not the sheet.
      await p.goto(`${base}#/you/sport`);
      const sheet = p.getByRole("dialog", { name: "Sport & season" });
      const box = sheet.getByRole("combobox", { name: /^Sport/ });
      expect(
        (await box.inputValue()) === "Ultimate frisbee",
        `${width}: the typed sport was not saved`,
      );
      await sheet.getByRole("button", { name: "Sport suggestions" }).click();
      await p.keyboard.press("Escape");
      expect(
        (await state(box)).expanded === "false" && (await sheet.isVisible()),
        `${width}: Escape closed the sheet with the list open`,
      );
      // ArrowDown opens every option from the keyboard, on the current value.
      await box.fill("Tennis");
      await p.keyboard.press("ArrowDown");
      s = await state(box);
      expect(
        s.expanded === "true" &&
          s.options.length === 13 &&
          s.active === "Tennis",
        `${width}: ArrowDown did not open on Tennis: ${JSON.stringify(s)}`,
      );
      await p.keyboard.press("Escape");
      await p.keyboard.press("Escape");
      await p.getByRole("dialog", { name: "Discard changes?" }).waitFor();
      result.checks.push(
        `${width}: chevron click, filter, arrows, Enter, click, free text, Escape in a sheet`,
      );
    } catch (error) {
      result.failure = error.message;
      break;
    } finally {
      await context.close();
    }
  }
  if (result.failure) return result;

  // Touch phone: tap the chevron, tap an option, tap outside.
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  p = await context.newPage();
  p.setDefaultTimeout(15000);
  p.on("pageerror", (e) => result.errors.push(e.message));
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).tap();
    const sport = p.getByRole("combobox", { name: /^Sport/ });
    const chevron = p.getByRole("button", { name: "Sport suggestions" });
    await chevron.tap();
    let s = await state(sport);
    expect(
      s.expanded === "true" && s.options.length === 13 && !s.focused,
      `touch: tapping the chevron did not open the list: ${JSON.stringify(s)}`,
    );
    await p.getByRole("option", { name: "Hockey" }).tap();
    s = await state(sport);
    expect(
      s.value === "Hockey" && s.expanded === "false",
      `touch: tapping Hockey did not pick it: ${JSON.stringify(s)}`,
    );
    await chevron.tap();
    await p.getByRole("heading", { level: 1 }).first().tap();
    expect(
      (await state(sport)).expanded === "false",
      "touch: a tap outside did not close the list",
    );
    result.checks.push("390 touch: tap chevron, tap option, tap outside");
  } catch (error) {
    result.failure = `touch: ${error.message}`;
  } finally {
    await context.close();
  }
  return result;
};
