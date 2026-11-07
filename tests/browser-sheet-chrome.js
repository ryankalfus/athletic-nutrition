// U4-05 part 1. Geometry and close paths through the actual settings form.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
    });
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  const sheet = p.getByRole("dialog", { name: "Sport & season", exact: true });
  const cancel = sheet.getByRole("button", { name: "Cancel", exact: true });
  const open = async () => {
    await p.goto(`${base}#/you/sport`);
    await sheet.waitFor();
    await p.waitForTimeout(250);
  };
  const drag = async () => {
    const grip = await sheet.locator(".sheet-grabber").boundingBox();
    if (!grip) throw new Error("Sheet grabber is absent");
    await p.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await p.mouse.down();
    await p.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 + 90, {
      steps: 8,
    });
    await p.mouse.up();
  };
  try {
    await p.goto(base);
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
    await open();
    if (await cancel.count())
      throw new Error("Clean settings sheet exposes Cancel");
    if (await sheet.getByRole("button", { name: /^Close/ }).count())
      throw new Error("Short settings sheet exposes an X");
    const grip = await sheet.locator(".sheet-grabber").boundingBox();
    if (!grip || grip.height < 44)
      throw new Error("Grabber has no usable drag target");
    await drag();
    await sheet.waitFor({ state: "hidden" });
    result.checks.push(
      "Clean short sheets have a grabber and no Cancel or X; dragging the grabber closes.",
    );

    await open();
    await sheet.getByRole("radio").first().click();
    await cancel.waitFor();
    await drag();
    const ask = p.getByRole("dialog", { name: "Discard changes?" });
    await ask.waitFor();
    await ask.getByRole("button", { name: "Keep editing" }).click();
    if (!(await cancel.isVisible()))
      throw new Error("Dirty Cancel disappeared after keeping edits");
    await cancel.click();
    await ask.getByRole("button", { name: "Discard", exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
    result.checks.push(
      "Dirty sheets expose Cancel and protect the draft on drag, Escape and Cancel.",
    );

    await open();
    const box = await sheet.boundingBox();
    await p.mouse.click(4, Math.max(4, box.y - 12));
    await sheet.waitFor({ state: "hidden" });
    await open();
    await p.keyboard.press("Escape");
    await sheet.waitFor({ state: "hidden" });
    result.checks.push("Clean scrim taps and Escape close the sheet.");

    await p.goto(`${base}#/food/log`);
    await p.getByRole("button", { name: "Log food", exact: true }).click();
    const search = p.getByRole("dialog", { name: "Log food", exact: true });
    if (!(await search.getByRole("button", { name: "Close Log food" }).count()))
      throw new Error("Full-height search lost its X");
    if (!(await search.locator(".sheet-grabber").count()))
      throw new Error("Full-height search lost its grabber");
    result.checks.push("Full-height Log food keeps its grabber and X.");
    return result;
  } catch (e) {
    return { ...result, failure: e.message };
  } finally {
    await context.close();
  }
};
