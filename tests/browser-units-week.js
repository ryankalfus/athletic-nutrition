// Playwright snippet: water units (P2-04, ADD-14) and the Monday "last week"
// card (P2-05, WEEK-05). Clock: Sunday 2026-10-11 10:00 AM, then Monday
// 2026-10-12 10:00 AM.
// - You › Food access › Water units switches Today's buttons and total, the
//   Custom field, Log › Day water and Log › Week rows between oz and ml.
// - On Monday the prompt slot shows "Last week: …" (counts only), "See last
//   week" opens Log › Week for Oct 5 – 11, and "Hide" persists after reload.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const browser = page.context().browser();
  const result = { checks: [], errors: [] };
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await context.clock.setFixedTime(new Date(2026, 9, 11, 10, 0, 0));
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  p.on("pageerror", (e) => result.errors.push(e.message));
  const waterRow = () => p.getByRole("region", { name: /^Water today/ });
  const total = (text) =>
    waterRow()
      .getByRole("heading", { name: `Water today · ${text}`, exact: true })
      .waitFor();
  const buttons = () =>
    waterRow()
      .getByRole("button")
      .evaluateAll((all) => all.map((b) => b.textContent.trim()));
  const setUnits = async (unit) => {
    await p.goto(`${base}#/you/access`);
    const sheet = p.getByRole("dialog", { name: "Food access & budget" });
    await sheet
      .getByRole("radiogroup", { name: "Water units" })
      .getByRole("radio", { name: unit, exact: true })
      .click();
    await sheet.getByRole("button", { name: "Save", exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
  };
  const today = async () => {
    await p.goto(`${base}#/today`);
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
  };
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Units test");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    // A practice on Sunday, so Monday has a last week to describe.
    await p.goto(`${base}#/schedule`);
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    const add = p.getByRole("dialog", { name: "Add practice" });
    await add.getByRole("textbox", { name: "Name" }).fill("Practice");
    await add.getByLabel("Starts").fill("15:00");
    await add.getByLabel("Ends").fill("16:30");
    await add
      .getByRole("button", { name: "Add practice", exact: true })
      .click();
    await add.waitFor({ state: "hidden" });

    // P2-04: oz by default, then ml.
    await today();
    await total("0 oz");
    if ((await buttons()).join(" ") !== "+8 +16 +24 Custom")
      throw new Error(`oz buttons are ${await buttons()}`);
    await waterRow().getByRole("button", { name: "+8", exact: true }).click();
    await total("8 oz");
    if (await p.locator('aside[aria-label="Last week"]').count())
      throw new Error("The last week card shows on a Sunday");
    await setUnits("ml");
    await p
      .getByRole("link", { name: /Food access & budget — .*Water in ml/ })
      .waitFor();
    await today();
    await total("237 ml");
    if ((await buttons()).join(" ") !== "+250 +500 +750 Custom")
      throw new Error(`ml buttons are ${await buttons()}`);
    await waterRow().getByRole("button", { name: "+250", exact: true }).click();
    await total("487 ml");
    await p
      .locator(".app-toast-region")
      .getByText("Added 250 ml of water.", { exact: true })
      .waitFor();
    await waterRow().getByRole("button", { name: "Custom" }).click();
    const custom = p.getByRole("dialog", { name: "Add water" });
    await custom.getByRole("spinbutton", { name: "Milliliters" }).fill("500");
    await custom
      .getByRole("button", { name: "Add water", exact: true })
      .click();
    await custom.waitFor({ state: "hidden" });
    await total("987 ml");
    result.checks.push(
      "Water units ml: Today reads 237 ml for a stored 8 oz, buttons are +250 +500 +750, +250 toasts in ml and totals 487 ml, Custom asks for Milliliters (987 ml).",
    );
    await p.goto(`${base}#/food/log`);
    const dayWater = p.getByRole("region", { name: "Water" });
    await dayWater.getByText("987 ml", { exact: true }).waitFor();
    await dayWater.getByRole("button", { name: "+ Water" }).click();
    await dayWater.getByText("1237 ml", { exact: true }).waitFor();
    await p.goto(`${base}#/food/log/week`);
    const firstRow = p.locator(".week-day-row").first();
    if (
      !/· 1237 ml$/.test(
        (await firstRow.innerText()).replace(/\s+/g, " ").trim(),
      )
    )
      throw new Error(`Week row: ${await firstRow.innerText()}`);
    await setUnits("oz");
    await p.goto(`${base}#/food/log/week`);
    if (
      !/· 41\.8 oz$/.test(
        (await firstRow.innerText()).replace(/\s+/g, " ").trim(),
      )
    )
      throw new Error(`Week row in oz: ${await firstRow.innerText()}`);
    await today();
    await total("41.8 oz");
    if ((await buttons()).join(" ") !== "+8 +16 +24 Custom")
      throw new Error(`oz buttons came back as ${await buttons()}`);
    result.checks.push(
      "Log › Day and Log › Week read 1237 ml (+ Water adds 250 ml); switching back to oz reads 41.8 oz on Week and Today with +8 +16 +24.",
    );

    // DLG-03: a failed save in Add water shows above its button, in view,
    // and Try again saves once.
    await p.evaluate(() => {
      window.__failSaves = true;
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (window.__failSaves && args[1] === "app")
          throw new DOMException(
            "Quota exceeded for test",
            "QuotaExceededError",
          );
        return original.apply(this, args);
      };
    });
    await waterRow().getByRole("button", { name: "Custom" }).click();
    const retry = p.getByRole("dialog", { name: "Add water" });
    await retry.getByRole("spinbutton", { name: "Ounces" }).fill("8");
    await retry.getByRole("button", { name: "Add water", exact: true }).click();
    const error = retry
      .locator(".inline-error")
      .filter({ hasText: "Not saved:" });
    await error.waitFor();
    const placement = await error.evaluate((node) => {
      const submit = node.nextElementSibling;
      const box = node.getBoundingClientRect();
      return {
        beforeSubmit: submit?.textContent.trim() === "Add water",
        visible: box.top >= 0 && box.bottom <= innerHeight,
      };
    });
    if (!placement.beforeSubmit || !placement.visible)
      throw new Error(
        `Add water error placement: ${JSON.stringify(placement)}`,
      );
    await p.evaluate(() => {
      window.__failSaves = false;
    });
    await error.getByRole("button", { name: "Try again" }).click();
    await retry.waitFor({ state: "hidden" });
    await total("49.8 oz");
    result.checks.push(
      'DLG-03: a failed Add water save shows "Not saved" in the dialog just above its button, in view; Try again adds 8 oz once (49.8 oz).',
    );

    // P2-05: Monday.
    await context.clock.setFixedTime(new Date(2026, 9, 12, 10, 0, 0));
    await today();
    await p.reload();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    const card = p.locator('aside[aria-label="Last week"]');
    await card
      .getByText("Last week: 1 practice. It had no food plan.", { exact: true })
      .waitFor();
    const prompts = await p.locator(".today-prompt").count();
    const sections = await p
      .locator(".today-layout > *")
      .evaluateAll((all) => all.length);
    if (prompts !== 1 || sections > 6)
      throw new Error(`Prompt slot: ${prompts} prompts, ${sections} sections`);
    await card.getByRole("button", { name: "See last week" }).click();
    await p.waitForURL(/#\/food\/log\/week\/2026-10-11$/);
    await p.getByRole("heading", { name: "Oct 5 – 11" }).waitFor();
    await p.getByText("1 practice. It had no food plan.").waitFor();
    await today();
    await card.waitFor();
    result.checks.push(
      'Monday Oct 12: the prompt slot holds one "Last week: 1 practice. It had no food plan." card (at most six sections); See last week opens Log › Week for Oct 5 – 11 and the card stays until hidden.',
    );
    await card.getByRole("button", { name: "Hide" }).click();
    await card.waitFor({ state: "hidden" });
    await p
      .locator(".app-toast-region")
      .getByText("Hidden until next Monday.", { exact: true })
      .waitFor();
    await p.reload();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await waterRow().waitFor();
    if (await card.count())
      throw new Error("The hidden last week card came back after reload");
    result.checks.push(
      'Hide toasts "Hidden until next Monday." and the card stays hidden after reload.',
    );
  } catch (error) {
    result.failure = error.message;
    result.last = await p
      .locator("body")
      .innerText()
      .catch(() => "");
  } finally {
    await context.close();
  }
  return result;
};
