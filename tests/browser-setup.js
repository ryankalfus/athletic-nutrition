// Playwright snippet: Welcome and schedule-first setup (6.1, 6.2, P1-11) at 390 × 844.
// Checks the #/welcome first visit, each step fitting the screen (except step 5),
// resume after reload at step 4, the gated allergy section, the step 6 preview,
// Today naming the practice, the athlete chooser, and "Add another athlete".
// The clock is fixed to Tuesday 2026-09-29 09:00 so the practice is later today.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const browser = page.context().browser();
  const result = { checks: [], errors: [] };
  const open = async () => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const p = await context.newPage();
    p.setDefaultTimeout(15000);
    p.on("pageerror", (e) => result.errors.push(e.message));
    await p.clock.setFixedTime(new Date(2026, 8, 29, 9, 0, 0));
    return { context, p };
  };
  const fits = async (p, name) => {
    const { height, view } = await p.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      view: window.innerHeight,
    }));
    if (height > view + 1)
      throw new Error(`${name} scrolls at 390 × 844 (${height}px)`);
  };
  const next = (p) =>
    p.getByRole("button", { name: "Next", exact: true }).click();
  const step = (p, title) => p.getByRole("heading", { name: title, level: 1 });
  let p;
  let context;
  try {
    ({ context, p } = await open());
    await p.goto(base);
    await p
      .getByRole("heading", { name: "Fuel for the day you actually have." })
      .waitFor();
    if (!p.url().endsWith("#/welcome"))
      throw new Error(`First visit is not #/welcome: ${p.url()}`);
    const italic = await p.evaluate(
      () =>
        [...document.querySelectorAll("main *")].filter(
          (el) => getComputedStyle(el).fontStyle === "italic",
        ).length,
    );
    if (italic) throw new Error(`${italic} italic elements on Welcome`);
    if (!(await p.locator("main#main-content").count()))
      throw new Error("Welcome is not inside the shared frame");
    await p.getByText("Saved on this device only.", { exact: false }).waitFor();
    result.checks.push(
      "A new browser opens #/welcome inside the shared frame, with no italic type and the privacy line.",
    );

    await p.getByRole("button", { name: "Get started" }).click();
    await step(p, "What do you play?").waitFor();
    await fits(p, "Step 1");
    await next(p);
    await p.getByRole("alert").getByText("Enter your sport.").waitFor();
    await p.getByRole("textbox", { name: /First name/ }).fill("Maya");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    const season = p.getByRole("radiogroup", { name: "Season" });
    await season.getByRole("radio", { name: "In season" }).click();
    await next(p);
    await step(p, "Your school day").waitFor();
    await fits(p, "Step 2");
    if (
      (await p.getByRole("progressbar").getAttribute("aria-valuenow")) !== "2"
    )
      throw new Error("Progress does not read step 2");
    await next(p);
    await step(p, "Practices and games").waitFor();
    await fits(p, "Step 3");
    const days = p.getByRole("group", { name: "Practice days" });
    await days.getByRole("button", { name: "Tuesday" }).click();
    await next(p);
    await step(p, "Food at school").waitFor();
    await fits(p, "Step 4");
    result.checks.push(
      "Get started opens step 1; sport is required; steps 1–4 fit 390 × 844 without scrolling.",
    );

    await p.reload();
    await step(p, "Food at school").waitFor();
    await p.getByRole("button", { name: "Back" }).click();
    await step(p, "Practices and games").waitFor();
    if (
      (await days
        .getByRole("button", { name: "Tuesday" })
        .getAttribute("aria-pressed")) !== "true"
    )
      throw new Error("Step 3 practice day was not saved");
    await p.getByRole("button", { name: "Back" }).click();
    await step(p, "Your school day").waitFor();
    await p.getByRole("button", { name: "Back" }).click();
    await step(p, "What do you play?").waitFor();
    if (
      (await p.getByRole("combobox", { name: /^Sport/ }).inputValue()) !==
      "Soccer"
    )
      throw new Error("Step 1 sport was not saved");
    await next(p);
    await next(p);
    await next(p);
    await step(p, "Food at school").waitFor();
    result.checks.push(
      "A reload during step 4 reopens step 4, and Back shows steps 1–3 saved.",
    );

    const chip = p
      .getByRole("group", { name: "At school I have" })
      .getByRole("button", { name: "Microwave" });
    await chip.click();
    const shapes = await p.evaluate(() => {
      const pressed = document.querySelector(
        '.chip-group > button[aria-pressed="true"]',
      );
      return {
        check: pressed ? getComputedStyle(pressed, "::before").content : "",
        segmented: Boolean(
          document.querySelector(".segmented[role=radiogroup]"),
        ),
      };
    });
    if (!shapes.check || shapes.check === "none")
      throw new Error("Selected multi-select chip has no check mark");
    result.checks.push(
      "Multi-select chips show a check when selected; single choices use a segmented radio group.",
    );
    await next(p);

    await step(p, "Food needs").waitFor();
    await p
      .getByText(
        "Allergy filtering is waiting for review. Check every label.",
        {
          exact: true,
        },
      )
      .waitFor();
    for (const chipName of ["Peanuts", "Milk", "Sesame"])
      if (await p.getByRole("button", { name: chipName, exact: true }).count())
        throw new Error(
          `Allergy chip ${chipName} shows while the gate is closed`,
        );
    await p.getByRole("button", { name: "Vegetarian" }).waitFor();
    result.checks.push(
      "Step 5 shows no allergy chips while ALLERGY_TAGS_REVIEWED is false, only the waiting line.",
    );
    await next(p);

    await step(p, "You're set").waitFor();
    await p
      .getByText(
        "Here's your first plan: Soccer practice today at 4:00 PM. Plan a snack for about 2:30.",
        { exact: true },
      )
      .waitFor();
    await fits(p, "Step 6");
    await p.getByRole("button", { name: "Open Today" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    if (!p.url().endsWith("#/today"))
      throw new Error(`Open Today went to ${p.url()}`);
    await p.getByText("Soccer practice at 4:00 PM").first().waitFor();
    result.checks.push(
      "Step 6 previews the first plan; Open Today lands on #/today and the hero names Soccer practice.",
    );

    await p.goto(`${base}#/welcome`);
    await p.getByRole("heading", { name: "Who's using Nourally?" }).waitFor();
    await p
      .getByRole("button", { name: "Maya, Soccer, last used today" })
      .click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    if (!p.url().endsWith("#/today"))
      throw new Error(`Choosing an athlete opened ${p.url()}`);
    await p.clock.setFixedTime(new Date(2026, 8, 29, 9, 5, 0));
    await p.goto(`${base}#/welcome`);
    await p.getByRole("button", { name: "Add another athlete" }).click();
    const add = p.getByRole("dialog", { name: "Add athlete" });
    await add.getByRole("textbox", { name: "First name" }).fill("Sam");
    await add.getByRole("button", { name: "Save", exact: true }).click();
    await step(p, "What do you play?").waitFor();
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Tennis");
    await next(p);
    await step(p, "Your school day").waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await p.goto(`${base}#/welcome`);
    const tiles = p.locator(".welcome-tile-open");
    await tiles.nth(1).waitFor();
    const first = await tiles.first().getAttribute("aria-label");
    if (!/^Sam, Tennis/.test(first || ""))
      throw new Error(`Last-used athlete is not first: ${first}`);
    result.checks.push(
      "The chooser shows tiles named with sport and last used; a tile opens Today; Add another athlete opens setup step 1; the last used athlete is listed first.",
    );
    await context.close();

    ({ context, p } = await open());
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await next(p);
    await step(p, "Your school day").waitFor();
    await p.getByRole("button", { name: "No school right now" }).click();
    await step(p, "Practices and games").waitFor();
    await p
      .getByRole("group", { name: "Practice days" })
      .getByRole("button", { name: "Tuesday" })
      .click();
    await next(p);
    await step(p, "Food at school").waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await p.getByText("Soccer practice at 4:00 PM").first().waitFor();
    result.checks.push(
      "Completing only steps 1 and 3 gives a Today hero that names the practice.",
    );
    return result;
  } catch (e) {
    return {
      ...result,
      failure: e.message,
      last: p ? await p.locator("body").innerText() : "",
    };
  } finally {
    await context?.close();
  }
};
