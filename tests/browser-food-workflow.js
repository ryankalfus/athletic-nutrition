// Isolated UI regression: live local USDA catalog -> groceries -> pantry -> meals -> log.
async (page) => {
  const context = await page.context().browser().newContext();
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = {};
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const snap = async (key) => {
    result[key] = await p.locator("main").ariaSnapshot();
  };
  try {
    await p.goto("http://127.0.0.1:5173/");
    await p
      .getByRole("textbox", { name: "First name Optional" })
      .fill("Food test");
    await p
      .getByRole("button", { name: "Save and see today", exact: false })
      .click();
    await p
      .getByRole("heading", { name: "Today, Food test", exact: true })
      .waitFor();
    await p.goto("http://127.0.0.1:5173/#/food/groceries");
    await p.getByRole("button", { name: "+ Add food", exact: true }).click();
    await p.getByRole("searchbox").fill("banana");
    await p.getByRole("button", { name: "Generic", exact: true }).click();
    await p.getByRole("button", { name: "Search foods", exact: true }).click();
    await p.locator(".food-result-row").first().waitFor();
    await snap("search");
    await p
      .locator(".food-result-row")
      .filter({
        has: p.getByRole("heading", { name: "Bananas, raw", exact: true }),
      })
      .getByRole("button", { name: "Choose", exact: true })
      .click();
    await p
      .getByRole("spinbutton", { name: "Quantity", exact: true })
      .fill("2");
    await p
      .getByRole("combobox", { name: "Unit", exact: true })
      .selectOption("piece");
    await p
      .getByRole("button", { name: "Save grocery item", exact: true })
      .click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    if (!(await p.locator(".budget-banner").innerText()).includes("unpriced"))
      throw new Error("Unknown price treated as complete");
    await snap("unpriced");
    await p.getByRole("button", { name: "Add to cart", exact: true }).click();
    await p
      .getByRole("button", { name: "Record cart as bought", exact: true })
      .click();
    await p
      .getByRole("navigation", { name: "Food workspace" })
      .getByRole("button", { name: "At home", exact: true })
      .click();
    await p
      .getByRole("heading", { name: "Bananas, raw", exact: true })
      .waitFor();
    await snap("purchased");
    await p.getByRole("button", { name: "+ Add food", exact: true }).click();
    await p.getByRole("searchbox").fill("Pretzels");
    await p.getByRole("button", { name: "Add manually", exact: true }).click();
    await p
      .getByRole("spinbutton", { name: "Quantity", exact: true })
      .fill("60");
    await p
      .getByRole("combobox", { name: "Unit", exact: true })
      .selectOption("g");
    await p.getByRole("button", { name: "Save at home", exact: true }).click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    await p
      .getByRole("navigation", { name: "Food workspace" })
      .getByRole("button", { name: "Meals", exact: true })
      .click();
    const meal = p
      .locator(".meal-card")
      .filter({
        has: p.getByRole("heading", { name: "Banana + pretzels", exact: true }),
      });
    if (!(await meal.innerText()).includes("READY NOW"))
      throw new Error("Exact pantry requirements not satisfied");
    await meal.getByRole("button", { name: "Plan meal", exact: true }).click();
    await p.locator(".planned-meals").waitFor();
    await p
      .getByRole("navigation", { name: "Nourally sections" })
      .getByRole("button", { name: "Today", exact: true })
      .click();
    await p
      .getByRole("button", {
        name: "Mark complete: Pack Banana + pretzels",
        exact: true,
      })
      .click();
    await snap("prep");
    await p.goto("http://127.0.0.1:5173/#/food/meals");
    await p
      .getByRole("button", { name: "Log what I ate", exact: true })
      .click();
    await snap("actualMeal");
    await p
      .getByRole("button", { name: "Log actual meal", exact: true })
      .click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    await p
      .getByRole("button", { name: "Update pantry used", exact: true })
      .click();
    await snap("deductionConfirmation");
    await p.getByRole("spinbutton", { name: /Bananas, raw/ }).fill("1");
    await p.getByRole("spinbutton", { name: /Pretzels/ }).fill("30");
    await p
      .getByRole("button", { name: "Confirm quantities used", exact: true })
      .click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    await p.goto("http://127.0.0.1:5173/#/food/pantry");
    await snap("deducted");
    const bananas = p
      .locator(".data-row")
      .filter({
        has: p.getByRole("heading", { name: "Bananas, raw", exact: true }),
      });
    if (!(await bananas.innerText()).includes("1 piece"))
      throw new Error("Pantry not deducted");
    await p.goto("http://127.0.0.1:5173/#/food/log");
    await p
      .getByRole("button", { name: "Undo pantry deduction", exact: true })
      .click();
    await p.goto("http://127.0.0.1:5173/#/food/pantry");
    await p
      .getByRole("heading", { name: "Bananas, raw", exact: true })
      .waitFor();
    if (
      !(
        await p
          .locator(".data-row")
          .filter({
            has: p.getByRole("heading", { name: "Bananas, raw", exact: true }),
          })
          .innerText()
      ).includes("2 piece")
    )
      throw new Error("Undo did not restore pantry");
    await snap("undo");
    result.errors = errors;
    if (errors.length) throw new Error(errors.join("; "));
    await p.screenshot({
      path: "output/playwright/food-workflow-complete.png",
      fullPage: true,
    });
    return result;
  } catch (error) {
    result.failure = error.message;
    result.lastScreen = await p.locator("body").innerText();
    return result;
  } finally {
    await context.close();
  }
};
