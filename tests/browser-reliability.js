// Playwright snippet: legacy migration, cross-tab writes, profile isolation, route restore, the offline line, corrupt-data recovery.
// Creates fresh browser contexts, so existing Nourally data is untouched.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const result = { checks: [], errors: [] };
  const browser = page.context().browser();
  const context = await browser.newContext();
  const water = (tab, oz) =>
    tab
      .getByRole("region", { name: "Water" })
      .getByText(`Water today: ${oz} oz`, { exact: true })
      .waitFor();
  let a;
  try {
    await context.addInitScript(() => {
      if (localStorage.getItem("fixture-installed")) return;
      localStorage.setItem("fixture-installed", "true");
      localStorage.setItem("nourally-step", "dashboard");
      localStorage.setItem(
        "nourally-profile",
        JSON.stringify({
          name: "Isaac",
          budget: "save",
          dietaryNeeds: [],
          foodSources: ["packed", "home"],
          familyPrep: true,
        }),
      );
      const d = new Date();
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      localStorage.setItem(
        "nourally-daily-logs",
        JSON.stringify({
          [day]: {
            entries: [{ id: "legacy", name: "Preserved toast", calories: 100 }],
            water: 52,
          },
        }),
      );
    });
    a = await context.newPage();
    const b = await context.newPage();
    for (const tab of [a, b]) {
      tab.setDefaultTimeout(12000);
      tab.on("pageerror", (e) => result.errors.push(e.message));
    }
    await a.goto(`${base}#/today`);
    await water(a, 52);
    await b.goto(`${base}#/today`);
    await water(b, 52);
    if (!(await a.getByRole("banner").innerText()).includes("Isaac"))
      throw new Error("Legacy profile name was not migrated");
    result.checks.push("Legacy localStorage profile and 52 oz water migrate.");

    await Promise.all([
      a.getByRole("button", { name: "+8", exact: true }).click(),
      b.getByRole("button", { name: "+16", exact: true }).click(),
    ]);
    await Promise.all([water(a, 76), water(b, 76)]);
    await a.reload();
    await water(a, 76);
    result.checks.push(
      "Simultaneous +8 and +16 in two tabs both land (76 oz) and survive reload without re-migrating.",
    );

    await a.goto(`${base}?signedOut=1`);
    await a.getByRole("button", { name: "Add another athlete" }).click();
    const add = a.getByRole("dialog", { name: "Add athlete" });
    await add
      .getByRole("textbox", { name: "First name" })
      .fill("Separate athlete");
    await add.getByRole("button", { name: "Add athlete", exact: true }).click();
    // A new athlete goes straight to setup step 1 (6.1).
    await a.getByRole("heading", { name: "What do you play?" }).waitFor();
    await a.getByRole("combobox", { name: /^Sport/ }).fill("Tennis");
    await a.getByRole("button", { name: "Next", exact: true }).click();
    await a.getByRole("heading", { name: "Your school day" }).waitFor();
    await a.getByRole("button", { name: "Skip setup" }).click();
    await water(a, 0);
    await b.reload();
    await water(b, 76);
    await a.goto(`${base}#/food/log`);
    await a.getByRole("button", { name: "Log food", exact: true }).waitFor();
    if (await a.getByText("Preserved toast").count())
      throw new Error("New profile inherited another profile's food");
    await a.reload();
    await a.getByRole("button", { name: "Log food", exact: true }).waitFor();
    if (!a.url().endsWith("#/food/log"))
      throw new Error(`Route lost after reload: ${a.url()}`);
    await b.goto(`${base}#/food/log`);
    await b.getByText("Preserved toast").waitFor();
    result.checks.push(
      "A new profile starts at 0 oz with an empty log, the original keeps its data, and #/food/log survives reload.",
    );

    const saved = await a.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open("nourally-v2");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      return await new Promise((resolve) => {
        const r = db
          .transaction("documents")
          .objectStore("documents")
          .get("app");
        r.onsuccess = () => {
          db.close();
          resolve(r.result);
        };
      });
    });
    if (
      Object.keys(saved.profiles).length !== 2 ||
      !saved.legacyBackup?.["nourally-daily-logs"]
    )
      throw new Error("Migration backup or profiles missing in IndexedDB");
    result.checks.push(
      "IndexedDB holds both profiles and a backup of the legacy keys.",
    );

    // UX-CMP-16 / STATE-03: offline, every route shows the frame's offline
    // line; it goes away when the connection is back. Hash changes keep the
    // loaded app, so nothing is fetched while offline.
    const offlineLine = "You're offline. Saved foods and your plan still work.";
    await context.setOffline(true);
    for (const route of [
      "today",
      "schedule",
      "food/ideas",
      "food/home",
      "food/groceries",
      "food/log",
      "food/log/week",
      "you",
      "you/sport",
      "you/needs",
      "you/access",
      "you/reminders",
      "you/device",
      "you/about",
      "nope",
    ]) {
      await a.evaluate((hash) => (location.hash = hash), `#/${route}`);
      await a.locator("main h1").waitFor();
      await a
        .getByRole("main")
        .getByRole("status")
        .getByText(offlineLine, { exact: true })
        .waitFor();
    }
    await context.setOffline(false);
    await a.getByText(offlineLine).waitFor({ state: "detached" });
    result.checks.push(
      "Offline, all 15 routes show “You're offline. Saved foods and your plan still work.” under the header; it disappears when back online (UX-CMP-16, STATE-03).",
    );
    await context.close();

    const broken = await browser.newContext();
    await broken.addInitScript(() =>
      localStorage.setItem("nourally-groceries", "{broken-json"),
    );
    a = await broken.newPage();
    a.setDefaultTimeout(12000);
    await a.goto(base);
    await a
      .getByRole("heading", { name: "Your data needs attention", exact: true })
      .waitFor();
    if (
      (await a.evaluate(() => localStorage.getItem("nourally-groceries"))) !==
      "{broken-json"
    )
      throw new Error("Original corrupt data changed");
    await a
      .getByRole("button", { name: "Download original device data" })
      .waitFor();
    await broken.close();
    result.checks.push(
      "Corrupt legacy data opens recovery without touching the original.",
    );
    return result;
  } catch (error) {
    return {
      ...result,
      failure: error.message,
      last: a
        ? await a
            .locator("body")
            .innerText()
            .catch(() => "")
        : "",
    };
  } finally {
    await context.close().catch(() => {});
  }
};
