// Playwright snippet: the top-bar athlete button (IA-14, COPY-28) and deleting
// the last athlete (DATA-05). With one athlete the button reads "Add another
// athlete"; with two it is "Switch athlete" and opens the chooser on Welcome.
// Deleting the last athlete returns to first-run Welcome ("Get started").
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page
    .context()
    .browser()
    .newContext({ viewport: { width: 1280, height: 800 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  const banner = () => p.getByRole("banner");
  const skipSetup = async () => {
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
  };
  const deleteOpenAthlete = async (name) => {
    await p.goto(`${base}#/you/device`);
    await p
      .getByRole("button", { name: new RegExp(`^Delete ${name}'s data$`) })
      .click();
    const confirm = p.getByRole("dialog", {
      name: `Delete ${name}'s data from this device?`,
    });
    await confirm.getByRole("textbox", { name: /Type DELETE/ }).fill("DELETE");
    await confirm.getByRole("button", { name: "Delete data" }).click();
  };
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Ana");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await skipSetup();

    // One athlete: the button says what it does.
    if (await banner().getByRole("button", { name: "Switch athlete" }).count())
      throw new Error("With one athlete the top bar still says Switch athlete");
    await banner().getByRole("button", { name: "Add another athlete" }).click();
    const sheet = p.getByRole("dialog", { name: "Add athlete" });
    await sheet.getByRole("textbox", { name: "First name" }).fill("Ben");
    await sheet
      .getByRole("button", { name: "Add athlete", exact: true })
      .click();
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Swimming");
    await skipSetup();
    result.checks.push(
      "One athlete: the top-bar button reads “Add another athlete” and opens the Add athlete sheet.",
    );

    // Two athletes: Switch athlete opens the chooser on Welcome.
    await banner().getByRole("button", { name: "Switch athlete" }).click();
    await p.getByRole("heading", { name: "Who's using Nourally?" }).waitFor();
    await p.getByRole("button", { name: /^Ana, Soccer/ }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await banner().getByText("Ana").waitFor();
    result.checks.push(
      "Two athletes: the top-bar “Switch athlete” opens the chooser on Welcome, and choosing Ana opens Today for Ana.",
    );

    // Delete Ana: Ben is left, so Welcome lists Ben.
    await deleteOpenAthlete("Ana");
    await p.getByRole("heading", { name: "Who's using Nourally?" }).waitFor();
    await p
      .getByRole("status")
      .getByText("Deleted Ana's data from this device.", { exact: true })
      .waitFor();
    await p.getByRole("button", { name: /^Ben, / }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();

    // Delete Ben, the last athlete: first-run Welcome, no leftover tile.
    await deleteOpenAthlete("Ben");
    await p.getByRole("button", { name: "Get started" }).waitFor();
    await p
      .getByRole("status")
      .getByText("Deleted Ben's data from this device.", { exact: true })
      .waitFor();
    if (await p.getByRole("heading", { name: "Who's using Nourally?" }).count())
      throw new Error(
        "Welcome shows the athlete chooser after the last delete",
      );
    const body = await p.locator(".welcome").innerText();
    if (/New profile|No sport set|Ben/.test(body))
      throw new Error("Welcome still shows a deleted or placeholder athlete");
    if (!p.url().endsWith("#/welcome"))
      throw new Error(`Last delete did not land on #/welcome: ${p.url()}`);
    await p.reload();
    await p.getByRole("button", { name: "Get started" }).waitFor();
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).waitFor();
    result.checks.push(
      "Deleting the last athlete opens first-run Welcome with “Get started” and no athlete tile (also after reload), and toasts “Deleted Ben's data from this device.”",
    );
    return result;
  } catch (e) {
    return {
      ...result,
      failure: e.message,
      last: await p.locator("body").innerText(),
    };
  } finally {
    await context.close();
  }
};
