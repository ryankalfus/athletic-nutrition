// Playwright snippet: Today Now card groceries step (TODAY-01), Day rail rows
// open their sheets (TODAY-02), water and reminder prompt copy (COPY-23,
// COPY-34) and sport titles at phone width (ADD-09). Fixed clock: Friday
// 2026-10-09 1:00 PM; a one-day 3:00–4:30 PM practice puts Today in the
// meal window ("Plan this").
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const browser = page.context().browser();
  const result = { checks: [], errors: [] };
  const contexts = [];
  let p;
  const open = async (viewport) => {
    const context = await browser.newContext({ viewport });
    contexts.push(context);
    await context.clock.setFixedTime(new Date(2026, 9, 9, 13, 0, 0));
    p = await context.newPage();
    p.setDefaultTimeout(15000);
    p.on("pageerror", (e) => result.errors.push(e.message));
  };
  const setup = async () => {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("textbox", { name: /First name/ }).fill("Today test");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
  };
  const groceryCount = () =>
    p.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open("nourally-v2", 1);
          req.onsuccess = () => {
            const get = req.result
              .transaction("documents")
              .objectStore("documents")
              .get("app");
            get.onsuccess = () => {
              const doc = get.result;
              const id = sessionStorage.getItem("nourally-profile-id");
              resolve(doc.profiles[id].data.groceryState.items.length);
            };
            get.onerror = () => reject(get.error);
          };
          req.onerror = () => reject(req.error);
        }),
    );
  try {
    await open({ width: 1280, height: 800 });
    await setup();
    // A one-day practice today, named "Practice" (shown as Soccer practice).
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
    // And a school day, so the rail has a school row.
    await p.getByRole("button", { name: "Set up school day" }).click();
    const schoolSheet = p.getByRole("dialog", { name: "School day" });
    await schoolSheet.getByRole("button", { name: "Save school day" }).click();
    await schoolSheet.waitFor({ state: "hidden" });
    await p.goto(`${base}#/today`);
    await p.getByRole("heading", { name: "Today", exact: true }).waitFor();

    // COPY-23 and COPY-34.
    await p
      .getByRole("region", { name: /^Water today/ })
      .getByText(
        "Bring a full bottle. Follow your coach's or doctor's plan if you have one.",
        { exact: true },
      )
      .waitFor();
    await p
      .getByRole("complementary", { name: "Reminders" })
      .getByText(
        "Get a heads-up 60 min before practice? Works while Nourally is open in your browser.",
        { exact: true },
      )
      .waitFor();
    result.checks.push(
      "Water row says “Bring a full bottle. Follow your coach's or doctor's plan if you have one.”; the reminder prompt adds “Works while Nourally is open in your browser.”",
    );

    // TODAY-01: Plan this → Add N items to groceries → Mark packed.
    const now = p.locator(".now-card");
    const primary = now.locator(".today-primary");
    await primary.getByText("Plan this", { exact: true }).waitFor();
    await primary.click();
    await p
      .getByRole("status")
      .getByText(/^Planned for /)
      .waitFor();
    await primary.getByText(/^Add \d+ items? to groceries$/).waitFor();
    const label = await primary.innerText();
    const n = Number(label.match(/\d+/)[0]);
    const before = await groceryCount();
    await primary.click();
    const toast = p
      .getByRole("status")
      .filter({ hasText: /^Added .* to groceries\./ });
    await toast.getByRole("button", { name: "View list" }).waitFor();
    await toast.getByRole("button", { name: "Undo" }).waitFor();
    await primary.getByText("Mark packed", { exact: true }).waitFor();
    if ((await groceryCount()) !== before + n)
      throw new Error(`Expected ${n} grocery items to be added once`);
    // View list opens Groceries with the added items.
    await toast.getByRole("button", { name: "View list" }).click();
    await p.waitForURL(/#\/food\/groceries$/);
    // Back on Today the step holds: items already on the list count as handled.
    await p.goto(`${base}#/today`);
    await primary.getByText("Mark packed", { exact: true }).waitFor();
    if ((await groceryCount()) !== before + n)
      throw new Error("Grocery items were added more than once");
    await p.reload();
    await primary.getByText("Mark packed", { exact: true }).waitFor();
    result.checks.push(
      `“${label}” adds ${n} item(s) once, toasts with Undo and View list, and the button moves on to “Mark packed”; View list opens Groceries and the step holds on return.`,
    );
    await primary.click();
    await primary.getByText(/^Eat around |^Log it$/).waitFor();
    await p.goto(`${base}#/today`);

    // TODAY-02: activity and school rows open their sheets on Today.
    const rail = p.getByRole("region", { name: "Your day" });
    await rail.getByRole("button", { name: /^Soccer practice/ }).click();
    const edit = p.getByRole("dialog", { name: "Edit Friday practice" });
    await edit.waitFor();
    if (!p.url().endsWith("#/today"))
      throw new Error(`Activity row navigated away: ${p.url()}`);
    await edit.getByRole("button", { name: "Cancel" }).click();
    await edit.waitFor({ state: "hidden" });
    await rail.getByRole("button", { name: /^School/ }).click();
    const school = p.getByRole("dialog", { name: "School day" });
    await school.waitFor();
    if (!p.url().endsWith("#/today"))
      throw new Error(`School row navigated away: ${p.url()}`);
    await school.getByRole("button", { name: "Cancel" }).click();
    await school.waitFor({ state: "hidden" });
    result.checks.push(
      "Day rail: the practice row opens “Edit Friday practice” and the school row opens “School day” on Today, without leaving #/today.",
    );

    // Editing from the rail saves like Schedule.
    await rail.getByRole("button", { name: /^Soccer practice/ }).click();
    await edit.getByLabel("Ends").fill("17:00");
    await edit.getByRole("button", { name: "Save changes" }).click();
    await edit.waitFor({ state: "hidden" });
    await rail.getByText("3:00 PM–5:00 PM", { exact: false }).waitFor();
    result.checks.push(
      "Saving the activity sheet from the rail updates the rail.",
    );

    // ADD-09 at phone width: Schedule rows and Today read "Soccer practice".
    await open({ width: 390, height: 844 });
    await setup();
    await p.goto(`${base}#/schedule`);
    await p.getByRole("button", { name: "+ Add", exact: true }).first().click();
    const phoneAdd = p.getByRole("dialog", { name: "Add practice" });
    await phoneAdd.getByRole("textbox", { name: "Name" }).fill("Practice");
    await phoneAdd
      .getByRole("button", { name: "Add practice", exact: true })
      .click();
    await phoneAdd.waitFor({ state: "hidden" });
    await p
      .locator("article.schedule-week-row")
      .getByText("Soccer practice", { exact: true })
      .waitFor();
    await p
      .getByRole("button", { name: "Actions for Soccer practice", exact: true })
      .waitFor();
    await p.goto(`${base}#/today`);
    await p
      .getByRole("region", { name: "Your day" })
      .getByText("Soccer practice", { exact: true })
      .waitFor();
    result.checks.push(
      "390 px: a practice named Practice reads Soccer practice in Schedule rows, its row menu, and Today's rail.",
    );
    return result;
  } catch (e) {
    return {
      ...result,
      failure: e.message,
      last: p ? await p.locator("body").innerText() : "",
    };
  } finally {
    for (const context of contexts) await context.close();
  }
};
