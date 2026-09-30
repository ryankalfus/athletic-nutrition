// Playwright snippet: P1-12 — Tonight evening planner (ADD-11) with sport titles
// and the Game day chip (ADD-09), Copy list clipboard fallback and Web Share
// (ADD-06), and the monthly backup nudge on Today (ADD-12, DATA-08).
// Uses a fixed clock at 8:00 PM today; fresh contexts leave other data alone.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const browser = page.context().browser();
  const result = { checks: [], errors: [] };
  const pad = (n) => String(n).padStart(2, "0");
  const key = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const evening = new Date();
  evening.setHours(20, 0, 0, 0);
  const tomorrow = new Date(evening);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const later = (days) => new Date(evening.getTime() + days * 86400000);
  const contexts = [];
  let active;
  const open = async (init) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    contexts.push(context);
    await context.clock.setFixedTime(evening);
    if (init) await context.addInitScript(init);
    const p = await context.newPage();
    active = p;
    p.setDefaultTimeout(15000);
    p.on("pageerror", (e) => result.errors.push(e.message));
    return { context, p };
  };
  const toast = (p, text) =>
    p.getByRole("status").getByText(text, { exact: true }).waitFor();
  const setup = async (p, name) => {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill(name);
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
  };
  try {
    // --- Clipboard fallback: no Web Share in this browser. ---
    const { context, p } = await open(() => {
      delete Navigator.prototype.share;
      delete Navigator.prototype.canShare;
    });
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: new URL(base).origin,
    });
    await setup(p, "Evening test");

    // An away game tomorrow at 4:00 PM, left unnamed.
    await p.goto(`${base}#/schedule`);
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    const sheet = p.getByRole("dialog");
    await sheet.getByRole("button", { name: "Game", exact: true }).click();
    await sheet.getByLabel("Activity date").fill(key(tomorrow));
    await sheet.getByLabel("Starts").fill("16:00");
    await sheet.getByLabel("Ends").fill("17:30");
    await sheet.getByRole("button", { name: "Away", exact: true }).click();
    await sheet.getByLabel("Travel time (min)").fill("45");
    await sheet.getByRole("button", { name: /^Add (game|practice)$/ }).click();
    await sheet.waitFor({ state: "hidden" });

    await p.goto(`${base}#/today`);
    const now = p.getByRole("region", { name: "Set up tomorrow tonight" });
    await now.waitFor();
    const tonight = p.getByRole("region", { name: "Tonight", exact: true });
    // Tomorrow's activity reads like a Day rail row: time, title, sub-line.
    const row = tonight
      .getByRole("listitem")
      .filter({ hasText: "Soccer game" });
    await row.getByText("Away · Leave by 3:15 PM", { exact: true }).waitFor();
    if (!(await row.innerText()).includes("4:00 PM"))
      throw new Error(
        `Tonight row has no start time: ${await row.innerText()}`,
      );
    await tonight.getByText("Game day", { exact: true }).waitFor();
    result.checks.push(
      "At 8:00 PM a 4:00 PM game tomorrow shows the Evening Now card and Tonight with 'Soccer game', Leave by, and a Game day chip.",
    );

    await now.getByRole("button", { name: "Build tomorrow’s list" }).click();
    await toast(p, "Tomorrow’s list is ready.");
    await now.getByRole("button", { name: "Open tomorrow’s list" }).waitFor();
    const water = tonight.getByRole("checkbox", {
      name: /^Fill a water bottle/,
    });
    await water.waitFor();
    if (!(await tonight.innerText()).includes("By 2:45 PM"))
      throw new Error(
        "Tomorrow's tasks have no due time 30 min before Leave by",
      );
    await water.click();
    await tonight.getByText(/^1 of \d+ done$/).waitFor();
    result.checks.push(
      "Build tomorrow’s list adds tasks due 2:45 PM (30 min before Leave by); the Now card switches to Open tomorrow’s list; checking a task counts 1 of N done.",
    );

    const extra = "Pack one extra shelf-stable snack";
    await tonight.getByRole("button", { name: `Remove ${extra}` }).click();
    await p.getByRole("status").getByRole("button", { name: "Undo" }).click();
    await tonight
      .getByRole("checkbox", { name: new RegExp(`^${extra}`) })
      .waitFor();
    result.checks.push("Removing a task offers Undo, which restores it.");

    await tonight
      .getByRole("button", { name: "Copy list: Tomorrow’s list" })
      .click();
    await toast(p, "List copied. Paste it in a message.");
    const copied = await p.evaluate(() => navigator.clipboard.readText());
    // Windows clipboards hand text back with CRLF line ends.
    const lines = copied.split(/\r?\n/);
    if (!/^Tomorrow’s list · \w{3}, \w{3} \d+$/.test(lines[0]))
      throw new Error(`Copied list heading: ${lines[0]}`);
    for (const line of [
      "Soccer game · 4:00–5:30 PM · Away · Leave by 3:15 PM",
      "[x] Fill a water bottle · by 2:45 PM",
      `[ ] ${extra} · by 2:45 PM`,
    ])
      if (!lines.includes(line))
        throw new Error(`Copied list is missing "${line}":\n${copied}`);
    if (/[0-9a-f]{8}-[0-9a-f]{4}|\b(FOOD|GEAR|PREP)\b/.test(copied))
      throw new Error("Copied list leaks internal IDs or kind tags");
    result.checks.push(
      "Without Web Share the button reads Copy list and copies a plain-text checklist (one task per line, no IDs).",
    );

    // Phone to desktop: the Tonight card fits without sideways scroll.
    for (const width of [320, 390, 1280]) {
      await p.setViewportSize({ width, height: 900 });
      await tonight.waitFor();
      const overflow = await p.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      if (overflow > 0)
        throw new Error(`Today scrolls sideways by ${overflow}px at ${width}`);
    }
    result.checks.push(
      "Tonight renders at 320, 390 and 1280 px without sideways scroll.",
    );

    // --- Backup nudge (monthly) on the same athlete. ---
    await p.goto(`${base}#/you/device`);
    const download = p.waitForEvent("download");
    await p.getByRole("button", { name: "Save a backup file" }).click();
    await download;
    await p.goto(`${base}#/today`);
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    if (await p.getByRole("complementary", { name: "Backup" }).count())
      throw new Error("Backup nudge shows right after a backup");
    await context.clock.setFixedTime(later(32));
    await p.reload();
    const nudge = p.getByRole("complementary", { name: "Backup" });
    await nudge
      .getByText("Last backup 32 days ago. Save a backup file?", {
        exact: true,
      })
      .waitFor();
    await nudge.getByRole("button", { name: "Not now" }).click();
    await nudge.waitFor({ state: "hidden" });
    await p.reload();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
    if (await nudge.count())
      throw new Error("Not now did not snooze the nudge");
    await context.clock.setFixedTime(later(65));
    await p.reload();
    await nudge
      .getByText("Last backup 65 days ago. Save a backup file?")
      .waitFor();
    const again = p.waitForEvent("download");
    await nudge.getByRole("button", { name: "Save backup" }).click();
    const file = await again;
    if (
      !/^nourally-evening-test-\d{4}-\d{2}-\d{2}\.json$/.test(
        file.suggestedFilename(),
      )
    )
      throw new Error(`Backup filename: ${file.suggestedFilename()}`);
    await nudge.waitFor({ state: "hidden" });
    result.checks.push(
      "The backup nudge stays away after a backup, shows 'Last backup 32 days ago' a month later, snoozes on Not now, and Save backup downloads the file and clears it.",
    );

    // --- Web Share: groceries share through navigator.share. ---
    const { p: q } = await open(() => {
      Object.defineProperty(Navigator.prototype, "share", {
        configurable: true,
        value: async (data) => {
          window.__shared = data;
        },
      });
    });
    await setup(q, "Share test");
    await q.goto(`${base}#/food/groceries`);
    await q.getByRole("heading", { name: "Your list is empty" }).waitFor();
    if (await q.getByRole("button", { name: /^Share list/ }).count())
      throw new Error("Share list shows for an empty grocery list");
    await q.getByRole("button", { name: "Suggest for this week" }).click();
    const week = q.getByRole("dialog", { name: "Add food for this week" });
    await week.getByRole("checkbox", { name: /^Bananas · / }).check();
    await week.getByRole("checkbox", { name: /^Pretzels · / }).check();
    await week.getByRole("button", { name: "Add selected" }).click();
    await week.waitFor({ state: "hidden" });
    await q.getByRole("checkbox", { name: "Got Pretzels" }).click();
    await q.getByRole("button", { name: "Share list: Groceries" }).click();
    await toast(q, "List shared.");
    const shared = await q.evaluate(() => window.__shared);
    if (shared?.title !== "Groceries") throw new Error("Share title missing");
    const text = shared.text.split("\n");
    if (text[0] !== "Groceries · 1 item" || !/^\[ \] Bananas · /.test(text[1]))
      throw new Error(`Shared grocery text:\n${shared.text}`);
    if (shared.text.includes("Pretzels"))
      throw new Error("Checked items were shared as still to buy");
    result.checks.push(
      "With Web Share the Groceries button reads Share list and shares only what is left to buy.",
    );
  } catch (error) {
    result.failure = error.message || String(error);
    result.last = await active
      ?.locator("body")
      .innerText()
      .catch(() => "");
  } finally {
    for (const context of contexts) await context.close();
  }
  return result;
};
