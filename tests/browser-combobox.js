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
      await p
        .getByRole("heading", {
          level: 1,
          name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/,
        })
        .waitFor();

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
          s.options.length === (width < 768 ? 1 : 13) &&
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
  if (result.failure) return result;

  // U4-03 (UX-CMP-09): a TimeField is the same combobox. It shows the app's
  // time ("4:00 PM", never "04:00 PM"), suggests times every 15 minutes,
  // reads what is typed ("4:10p"), and ArrowDown, Enter and Escape work as
  // on Sport; Escape closes only the list, not the sheet.
  const timeContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await timeContext.clock.setFixedTime(new Date(2026, 9, 13, 10, 0, 0));
  p = await timeContext.newPage();
  p.setDefaultTimeout(15000);
  p.on("pageerror", (e) => result.errors.push(e.message));
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Maya");
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
    await p.goto(`${base}#/schedule`);
    await p
      .getByRole("button", { name: /^(\+ )?Add$/ })
      .first()
      .click();
    const sheet = p.getByRole("dialog", { name: "Add practice" });
    const starts = sheet.getByRole("combobox", { name: "Starts", exact: true });
    await starts.waitFor();
    let t = await state(starts);
    expect(t.value === "4:00 PM", `Starts shows "${t.value}", not 4:00 PM`);
    expect(
      (await sheet.locator("input[type=time], input[type=date]").count()) === 0,
      "the sheet still has a native time or date input",
    );
    await starts.fill("4:10p");
    await sheet.getByRole("textbox", { name: "Name" }).focus();
    t = await state(starts);
    expect(t.value === "4:10 PM", `typed 4:10p reads "${t.value}"`);
    await starts.fill("16:45");
    await sheet.getByRole("textbox", { name: "Name" }).focus();
    expect(
      (await state(starts)).value === "4:45 PM",
      "typed 16:45 does not read 4:45 PM",
    );
    await starts.focus();
    await p.keyboard.press("ArrowDown");
    t = await state(starts);
    expect(
      t.expanded === "true" &&
        t.options.length === 96 &&
        t.active === "4:45 PM",
      `ArrowDown did not open 96 times on 4:45 PM: ${JSON.stringify({ ...t, options: t.options.length })}`,
    );
    await p.keyboard.press("ArrowDown");
    await p.keyboard.press("Enter");
    t = await state(starts);
    expect(
      t.value === "5:00 PM" && t.expanded === "false",
      `ArrowDown then Enter picked "${t.value}"`,
    );
    await p.keyboard.press("ArrowDown");
    await p.keyboard.press("Escape");
    expect(
      (await state(starts)).expanded === "false" && (await sheet.isVisible()),
      "Escape did not close only the time list",
    );
    await sheet.getByRole("combobox", { name: "Ends", exact: true }).fill("6p");
    await sheet
      .getByRole("button", { name: "Add practice", exact: true })
      .click();
    await sheet.waitFor({ state: "hidden" });
    await p.getByRole("main").getByText("5:00 PM–6:00 PM").first().waitFor();
    result.checks.push(
      "U4-03 TimeField at 390: Starts shows 4:00 PM with no native time or date input in the sheet; typed 4:10p reads 4:10 PM and 16:45 reads 4:45 PM; ArrowDown opens 96 times on the current one, ArrowDown and Enter pick 5:00 PM, Escape closes only the list; saving with Ends 6p lists 5:00 PM–6:00 PM (UX-CMP-09).",
    );
  } catch (error) {
    result.failure = `time field: ${error.message}`;
  } finally {
    await timeContext.close();
  }
  return result;
};
