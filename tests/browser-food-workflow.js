// Playwright snippet: Groceries -> put-away -> At home -> Ideas -> plan/pack/log -> use from home -> put back.
// No network needed: uses weekly staples, not USDA search.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page.context().browser().newContext();
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  const main = () => p.getByRole("main");
  const stock = (name) => p.getByRole("radiogroup", { name: `${name} stock` });
  const homeRow = (name) =>
    p.locator(".stock-row").filter({ has: p.getByText(name, { exact: true }) });
  try {
    await p.goto(base);
    await p.getByRole("textbox", { name: /First name/ }).fill("Food test");
    await p.getByRole("button", { name: /Save and see today/ }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();

    // Groceries: add for the week, check off, finish, put away.
    await p.goto(`${base}#/food/groceries`);
    await p.getByRole("heading", { name: "Your list is empty" }).waitFor();
    await p.getByRole("button", { name: "Add food for this week" }).click();
    const week = p.getByRole("dialog", { name: "Add food for this week" });
    if (!(await week.getByRole("button", { name: "Add selected" }).isDisabled()))
      throw new Error("Weekly suggestions start pre-selected");
    await week.getByRole("checkbox", { name: /^Bananas · / }).check();
    await week.getByRole("checkbox", { name: /^Pretzels · / }).check();
    await week.getByRole("button", { name: "Add selected" }).click();
    await week.waitFor({ state: "hidden" });
    const thisWeek = p.getByRole("region", { name: "For this week" });
    await thisWeek.getByRole("checkbox", { name: "Got Bananas" }).waitFor();
    await thisWeek.getByRole("checkbox", { name: "Got Pretzels" }).waitFor();
    if ((await main().innerText()).includes("$"))
      throw new Error("Groceries shows $ with price estimates off");
    result.checks.push(
      "Add food for this week starts unchecked and adds the chosen staples; no $ with price estimates off.",
    );

    await p.getByRole("checkbox", { name: "Got Bananas" }).click();
    await p.getByRole("button", { name: "Finish shopping (1)" }).waitFor();
    await p.getByRole("checkbox", { name: "Got Pretzels" }).click();
    await p.getByText("Everything's checked. Finish shopping?").waitFor();
    await p.getByRole("button", { name: "Finish shopping (2)" }).click();
    const putAway = p.getByRole("dialog", { name: "Put these away?" });
    await putAway
      .getByRole("combobox", { name: "Place for Bananas" })
      .selectOption({ label: "Bag" });
    await putAway.getByRole("button", { name: "Add to At home" }).click();
    await putAway.waitFor({ state: "hidden" });
    await p.getByRole("status").getByText("2 items added to At home.").waitFor();
    await p.getByRole("heading", { name: "Your list is empty" }).waitFor();
    await p.getByRole("button", { name: "Past trips" }).waitFor();

    await p.goto(`${base}#/food/home`);
    for (const name of ["Bananas", "Pretzels"])
      if (
        (await stock(name)
          .getByRole("radio", { name: "Have" })
          .getAttribute("aria-checked")) !== "true"
      )
        throw new Error(`${name} is not marked Have at home`);
    await p
      .getByRole("region", { name: "In my bag" })
      .getByText("Bananas", { exact: true })
      .waitFor();
    await p
      .getByRole("region", { name: "Kitchen & pantry" })
      .getByText("Pretzels", { exact: true })
      .waitFor();
    result.checks.push(
      "Check off -> Finish shopping -> put-away empties the list; At home shows both as Have, Bananas in my bag.",
    );

    // Give Bananas an exact count in bunches. It must still satisfy an idea that
    // needs "1 banana" (other-unit counts count as available), and a log can use it.
    await p.goto(`${base}#/food/home`);
    await homeRow("Bananas").locator("summary").click();
    await homeRow("Bananas").getByRole("button", { name: "Edit details" }).click();
    const details = p.getByRole("dialog");
    await details
      .getByRole("combobox", { name: "Amount type" })
      .selectOption({ label: "Exact quantity" });
    await details.getByRole("spinbutton", { name: "Amount left" }).fill("3");
    await details.getByRole("button", { name: "Save details" }).click();
    await details.waitFor({ state: "hidden" });
    await homeRow("Bananas").getByText("3 left").waitFor();

    // Ideas: ready -> plan -> pack -> log.
    await p.goto(`${base}#/food/ideas`);
    await p
      .getByRole("group", { name: "Food moment" })
      .getByRole("button", { name: "Now", pressed: true })
      .waitFor();
    const card = p
      .locator("article.idea-card")
      .filter({ has: p.getByRole("heading", { name: "Banana + pretzels" }) });
    await card.getByText("Ready — you have everything").waitFor();
    if ((await card.getByText("To buy").count()) !== 0)
      throw new Error("Ready idea still lists items to buy");
    const bananaLine = await card
      .getByRole("listitem")
      .filter({ hasText: "banana" })
      .innerText();
    if (!bananaLine.includes("At home"))
      throw new Error(`3 bunches at home do not cover 1 banana: ${bananaLine}`);
    await card.getByRole("button", { name: "Plan Banana + pretzels" }).click();
    const planned = p.getByRole("region", { name: "Planned food" });
    await planned.getByRole("button", { name: "Mark packed" }).click();
    await planned.getByText(/· Packed$/).waitFor();
    await planned.getByRole("button", { name: "Log it" }).click();
    const confirmLog = p.getByRole("dialog", { name: "Log what you ate" });
    await confirmLog.getByRole("button", { name: "Yes, as planned" }).click();
    await confirmLog.waitFor({ state: "hidden" });
    result.checks.push(
      "With 3 bunches at home, Ideas marks Banana + pretzels Ready (banana At home); Plan this -> Mark packed -> Log it -> Yes, as planned.",
    );

    await p
      .getByRole("group", { name: "Food moment" })
      .getByRole("button", { name: "Tomorrow" })
      .click();
    await p.waitForURL(/moment=tomorrow/);
    const fig = p
      .locator("article.idea-card")
      .filter({ has: p.getByRole("heading", { name: "Fig bar + fresh fruit" }) });
    await fig.getByText("Buy 1 item").waitFor();
    await fig.getByText("Preparation & storage").click();
    await fig.getByRole("button", { name: "Add missing to groceries" }).click();
    await p.getByRole("status").getByText("Added 1 item to groceries.").waitFor();
    await p.goto(`${base}#/food/groceries`);
    await p
      .getByRole("region", { name: "For your plans" })
      .getByRole("checkbox", { name: /^Got .*fig bar/i })
      .waitFor();
    // Fig bars carry a built-in price estimate; it must stay hidden while the setting is off.
    if ((await main().innerText()).includes("$"))
      throw new Error("Groceries shows $ for a priced item with price estimates off");
    result.checks.push(
      "The Tomorrow moment works; Add missing to groceries adds only the fig bars, with no $ shown.",
    );

    // Log: use from home, then put back.
    await p.goto(`${base}#/food/log`);
    const entry = p.locator("article").filter({ hasText: "Banana + pretzels" });
    await entry.getByRole("button", { name: "Use from home" }).click();
    const use = p.getByRole("dialog", { name: "Use food from home" });
    await use.getByRole("spinbutton", { name: /^Bananas — 3/ }).fill("1");
    await use.getByRole("button", { name: "Save" }).click();
    await use.waitFor({ state: "hidden" });
    await p.goto(`${base}#/food/home`);
    await homeRow("Bananas").getByText("2 left").waitFor();
    await p.goto(`${base}#/food/log`);
    await entry.getByRole("button", { name: "Put back" }).click();
    await p.getByRole("status").getByText("Put the food back at home.").waitFor();
    await p.goto(`${base}#/food/home`);
    await homeRow("Bananas").getByText("3 left").waitFor();
    result.checks.push(
      "Use from home takes 1 banana (3 -> 2 left) and Put back restores it.",
    );

    // Price estimates on: the estimate line and the price field appear.
    await p.goto(`${base}#/you/access`);
    const access = p.getByRole("dialog", { name: "Food access & budget" });
    const prices = access.getByRole("switch", { name: /^Show price estimates/ });
    if (await prices.isChecked())
      throw new Error("Price estimates are not off by default");
    await prices.click();
    await access.getByRole("button", { name: "Save", exact: true }).click();
    await access.waitFor({ state: "hidden" });
    await p.goto(`${base}#/food/groceries`);
    await p.getByText(/^About \$\d+\.\d\d for 1 of 1 item$/).waitFor();
    await p.getByText(/ · about \$\d+\.\d\d$/).waitFor();
    result.checks.push(
      "Turning on price estimates in the Access sheet shows the row price and the About $ total.",
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
