// Run only through the isolated Playwright CLI browser; this creates fresh test contexts.
async (page) => {
  const result = {};
  const browser = page.context().browser();
  const context = await browser.newContext();
  await context.addInitScript(() => {
    if (localStorage.getItem("fixture-installed")) return;
    localStorage.setItem("fixture-installed", "true");
    localStorage.setItem("nourally-step", "dashboard");
    localStorage.setItem(
      "nourally-profile",
      JSON.stringify({
        name: "Legacy test",
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
  const a = await context.newPage();
  const b = await context.newPage();
  a.setDefaultTimeout(12000);
  b.setDefaultTimeout(12000);
  await Promise.all([
    a.goto("http://127.0.0.1:5173/#/today"),
    b.goto("http://127.0.0.1:5173/#/today"),
  ]);
  await a
    .getByRole("heading", { name: "52 oz logged today", exact: true })
    .waitFor();
  await b
    .getByRole("heading", { name: "52 oz logged today", exact: true })
    .waitFor();
  result.migration = await a.locator("main").ariaSnapshot();
  await Promise.all([
    a.getByRole("button", { name: "+8 oz", exact: true }).click(),
    b.getByRole("button", { name: "+12 oz", exact: true }).click(),
  ]);
  await Promise.all([
    a
      .getByRole("heading", { name: "72 oz logged today", exact: true })
      .waitFor(),
    b
      .getByRole("heading", { name: "72 oz logged today", exact: true })
      .waitFor(),
  ]);
  result.crossTab =
    "Both tabs show 72 oz after simultaneous +8 and +12 from 52.";
  await a.reload();
  await a
    .getByRole("heading", { name: "72 oz logged today", exact: true })
    .waitFor();
  result.reload = "72 oz retained; migration not repeated.";
  await a.goto("http://127.0.0.1:5173/?signedOut=1");
  result.profiles = await a.locator("main").ariaSnapshot();
  await a.getByLabel("New profile name").fill("Separate athlete");
  await a
    .getByRole("button", { name: "Create separate profile", exact: true })
    .click();
  await a
    .getByRole("button", { name: "Save and see today", exact: false })
    .click();
  await a
    .getByRole("heading", { name: "0 oz logged today", exact: true })
    .waitFor();
  await b
    .getByRole("heading", { name: "72 oz logged today", exact: true })
    .waitFor();
  result.isolation = "New profile starts with zero; original tab remains 72.";
  await a.goto("http://127.0.0.1:5173/#/food/log");
  if (
    await a
      .getByRole("heading", { name: "Preserved toast", exact: true })
      .count()
  )
    throw new Error("Inherited another profile food");
  await a.reload();
  if (!a.url().endsWith("#/food/log"))
    throw new Error("Route lost after reload");
  result.route = a.url();
  const saved = await a.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("nourally-v2");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return await new Promise((resolve) => {
      const r = db.transaction("documents").objectStore("documents").get("app");
      r.onsuccess = () => {
        db.close();
        resolve(r.result);
      };
    });
  });
  result.profileCount = Object.keys(saved.profiles).length;
  if (result.profileCount !== 2 || !saved.legacyBackup["nourally-daily-logs"])
    throw new Error("Migration backup/profiles missing");
  await context.close();
  const broken = await browser.newContext();
  await broken.addInitScript(() =>
    localStorage.setItem("nourally-groceries", "{broken-json"),
  );
  const p = await broken.newPage();
  await p.goto("http://127.0.0.1:5173/");
  await p
    .getByRole("heading", { name: "Your data needs attention", exact: true })
    .waitFor();
  result.recovery = await p.locator("main").innerText();
  if (
    (await p.evaluate(() => localStorage.getItem("nourally-groceries"))) !==
    "{broken-json"
  )
    throw new Error("Original corrupt data changed");
  await broken.close();
  return result;
};
