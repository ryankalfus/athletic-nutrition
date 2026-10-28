// Playwright snippet: "Why this?" shows the current Now card state's rule, its
// source links (new tab, rel noopener) and "Source checked Oct 11, 2026"
// (P2-06, KEEP-01). The clock moves through one day around a one-day 3:00-4:30 PM
// practice on Sunday 2026-10-11: setup, plan ahead, meal window, pre, quick,
// during, recovery, no sport and late. The dialog text also passes the 7.6 scan.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 } });
  const at = (h, m) => new Date(2026, 9, 11, h, m, 0);
  await context.clock.setFixedTime(at(9, 0));
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  p.on("pageerror", (e) => result.errors.push(e.message));
  const problems = [];
  const terms = [
    "SR Legacy",
    "FNDDS",
    "Foundation",
    "Branded",
    "VITE_",
    "serving(s)",
    "must",
    "approved",
    "reviewed",
    "reviewer",
    "safe",
  ];
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Leah");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { level: 1, name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/ }).waitFor();
    const rules = await p.evaluate(() =>
      import("/src/domain/rules.js").then((m) => m.RULES),
    );

    const expectWhy = async (expected) => {
      const card = p.locator(".now-card");
      await card.waitFor();
      const state = await card.getAttribute("data-state");
      if (state !== expected)
        problems.push(`expected state ${expected}, saw ${state}`);
      await card.getByRole("button", { name: "Why this?" }).click();
      const dialog = p.getByRole("dialog", { name: "Why this?" });
      await dialog.waitFor();
      const rule = rules[state];
      if (!rule) {
        problems.push(`${state}: no rule in rules.js`);
      } else {
        await dialog.getByText(rule.rule, { exact: true }).waitFor();
        const links = dialog.locator(".why-sources a");
        const count = await links.count();
        if (count < rule.sources.length)
          problems.push(`${state}: ${count} links for ${rule.sources.length}`);
        for (let i = 0; i < count; i++) {
          const link = links.nth(i);
          const href = await link.getAttribute("href");
          const target = await link.getAttribute("target");
          const rel = (await link.getAttribute("rel")) || "";
          if (!/^https:\/\//.test(href || ""))
            problems.push(`${state}: link ${href} is not https`);
          if (target !== "_blank" || !/\bnoopener\b/.test(rel))
            problems.push(`${state}: link ${href} not new tab + noopener`);
        }
        await dialog
          .getByText(/^Sources? checked Oct 11, 2026$/)
          .first()
          .waitFor();
        const text = await dialog.innerText();
        for (const term of terms)
          if (
            new RegExp(`\\b${term.replace(/[()]/g, "\\$&")}\\b`, "i").test(text)
          )
            problems.push(`${state}: dialog shows "${term}"`);
        if (/\b\d{4}-\d{2}-\d{2}\b/.test(text))
          problems.push(`${state}: ISO date in dialog`);
      }
      await dialog.getByRole("button", { name: /close/i }).first().click();
      await dialog.waitFor({ state: "hidden" });
      result.checks.push(
        `${expected}: "Why this?" shows its rule, ${rule?.sources.length} source link(s) and the checked date`,
      );
    };

    // No schedule yet.
    await p.goto(`${base}#/today`);
    await expectWhy("setup");

    // A one-day practice today, 3:00-4:30 PM.
    await p.goto(`${base}#/schedule`);
    await p.getByRole("button", { name: /^(\+ )?Add$/ }).first().click();
    const add = p.getByRole("dialog", { name: "Add practice" });
    await add.getByRole("textbox", { name: "Name" }).fill("Practice");
    await add.getByLabel("Starts").fill("15:00");
    await add.getByLabel("Ends").fill("16:30");
    await add
      .getByRole("button", { name: "Add practice", exact: true })
      .click();
    await add.waitFor({ state: "hidden" });

    for (const [h, m, state] of [
      [9, 0, "plan_ahead"],
      [13, 0, "meal_window"],
      [14, 0, "pre"],
      [14, 45, "quick"],
      [15, 30, "during"],
      [17, 0, "recovery"],
      [20, 0, "no_sport"],
      [22, 0, "late"],
    ]) {
      await context.clock.setFixedTime(at(h, m));
      await p.goto(`${base}#/today`);
      await p.reload();
      await p.getByRole("heading", { level: 1, name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/ }).waitFor();
      await expectWhy(state);
    }
  } catch (error) {
    result.failure = error.message;
  } finally {
    if (problems.length) result.failure = problems.join("; ");
    await context.close();
  }
  return result;
};
