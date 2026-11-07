// UX-CMP-20 / STATE-15. Two real pages share IndexedDB and BroadcastChannel.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
    });
  await context.clock.setFixedTime(new Date(2026, 9, 13, 10));
  await context.addInitScript(() => {
    window.__holdItemUpdates = false;
    const descriptor = Object.getOwnPropertyDescriptor(
      BroadcastChannel.prototype,
      "onmessage",
    );
    Object.defineProperty(BroadcastChannel.prototype, "onmessage", {
      ...descriptor,
      set(listener) {
        descriptor.set.call(this, (event) => {
          if (!window.__holdItemUpdates) listener(event);
        });
      },
    });
  });

  const p = await context.newPage();
  const other = await context.newPage();
  p.setDefaultTimeout(15000);
  other.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  for (const tab of [p, other])
    tab.on("pageerror", (e) => result.errors.push(e.message));
  const message =
    "This item changed on another screen. Showing the latest version.";
  const open = async (tab, route, name) => {
    await tab.goto(`${base}#/${route}`, { waitUntil: "domcontentloaded" });
    await tab
      .getByRole("button", {
        name: route === "schedule" ? `Actions for ${name}` : `${name} options`,
        exact: true,
      })
      .click();
    await tab.getByRole("menuitem", { name: /^Edit(?: details)?$/ }).click();
    const sheet = tab.getByRole("dialog").filter({
      has: tab.getByRole("textbox", { name: /^(Food name|Name)$/ }),
    });
    await sheet.waitFor();
    return sheet;
  };
  try {
    // Capture the module URL the app actually imports. Vite can version it
    // after a source change, and a second store would have no UI subscribers.
    const [appStore] = await Promise.all([
      p.waitForRequest(
        (request) => new URL(request.url()).pathname === "/src/store.js",
      ),
      p.goto(base, { waitUntil: "domcontentloaded" }),
    ]);
    const storeUrl = appStore.url();
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
    await p.evaluate(async (storeUrl) => {
      const { changeData } = await import(storeUrl);
      const { makeFoodRecord, makeLog } = await import("/src/domain/food.js");
      await changeData((data) => {
        data.groceryState.pantry = [
          makeFoodRecord({
            name: "Home apples",
            quantity: 2,
            unit: "piece",
            availability: "exact",
            location: "pantry",
          }),
        ];
        data.groceryState.items = [
          makeFoodRecord({
            name: "Grocery oats",
            quantity: 1,
            unit: "package",
            notes: "",
            checked: false,
          }),
        ];
        data.dailyLogs["2026-10-13"] = {
          entries: [
            makeLog(
              {
                id: "manual-toast",
                name: "Logged toast",
                source: "Manual",
                nutrientBasis: "g",
                nutrients: { calories: null },
              },
              { amount: 1, unit: "piece", override: "" },
              "2026-10-13",
              { time: "09:00" },
            ),
          ],
          water: 0,
        };
        data.schedule = [
          {
            id: "remote-practice",
            date: "2026-10-13",
            title: "Morning training",
            type: "practice",
            startTime: "16:00",
            endTime: "17:30",
            intensity: "medium",
            location: "home",
            travelMinutes: 0,
          },
        ];
      }, null);
    }, storeUrl);

    for (const [route, name, save] of [
      ["food/home", "Home apples", "Save details"],
      ["food/groceries", "Grocery oats", "Save"],
      ["food/log", "Logged toast", "Save"],
      ["schedule", "Morning training", "Save changes"],
    ]) {
      const sheet = await open(p, route, name);
      const field = sheet.getByRole("textbox", { name: /^(Food name|Name)$/ });
      await field.fill("My unsaved draft");
      // An unrelated real write from the second tab preserves this draft.
      await other.goto(`${base}#/today`, { waitUntil: "domcontentloaded" });
      await other.getByRole("button", { name: "+8", exact: true }).click();
      await other
        .getByRole("region", { name: "Water" })
        .getByText(/Water today:/)
        .waitFor();
      await p.waitForTimeout(250);
      if (
        (await field.inputValue()) !== "My unsaved draft" ||
        (await sheet.getByText(message, { exact: true }).count())
      )
        throw new Error(
          `${route}: unrelated remote write reset the draft or showed the change notice`,
        );
      const remote = await open(other, route, name);
      await remote
        .getByRole("textbox", { name: /^(Food name|Name)$/ })
        .fill(`${name} latest`);
      await remote.getByRole("button", { name: save, exact: true }).click();
      await remote.waitFor({ state: "hidden" });
      const refreshed = p.getByRole("dialog").filter({ hasText: message });
      await refreshed.getByText(message, { exact: true }).waitFor();
      if (
        (await refreshed
          .getByRole("textbox", { name: /^(Food name|Name)$/ })
          .inputValue()) !== `${name} latest`
      )
        throw new Error(
          `${route}: latest record did not replace the form draft`,
        );
      const placement = await refreshed
        .getByText(message, { exact: true })
        .evaluate((node) => node.previousElementSibling?.tagName);
      if (placement !== "HEADER")
        throw new Error(
          `${route}: change notice is not immediately under the title`,
        );
      await p.keyboard.press("Escape");
      await refreshed.waitFor({ state: "hidden" });
      if (await p.getByRole("dialog", { name: "Discard changes?" }).count())
        throw new Error(`${route}: reloaded form stayed dirty`);
      result.checks.push(
        `${route}: second-tab edit reloads the form, reports the latest version under its title and resets dirty state; unrelated remote writes preserve the draft.`,
      );
    }
    // Action flows keep captured items too. Change their source through the
    // second page's production transaction, which uses the real broadcast.
    await p.goto(`${base}#/food/groceries`, { waitUntil: "domcontentloaded" });
    await p
      .getByRole("button", { name: "Grocery oats latest options", exact: true })
      .click();
    await p
      .getByRole("menuitem", { name: "Swap for another food", exact: true })
      .click();
    await other.evaluate(async (storeUrl) => {
      const { changeData } = await import(storeUrl);
      await changeData((data) => {
        data.groceryState.items[0].name = "Fresh oats";
      }, null);
    }, storeUrl);
    let updated = p.getByRole("dialog").filter({ hasText: message });
    await updated.getByRole("heading", { name: "Swap Fresh oats" }).focus();
    await p.keyboard.press("Escape");
    await updated.waitFor({ state: "hidden" });
    result.checks.push(
      "Grocery swap reloads its source item and shows the change notice.",
    );

    await p.goto(`${base}#/food/log`, { waitUntil: "domcontentloaded" });
    await p
      .getByRole("button", { name: "Logged toast latest options", exact: true })
      .click();
    await p
      .getByRole("menuitem", { name: "Used from At home…", exact: true })
      .click();
    await p.getByRole("dialog", { name: "Use food from home" }).waitFor();
    await other.evaluate(async (storeUrl) => {
      const { changeData } = await import(storeUrl);
      await changeData((data) => {
        data.dailyLogs["2026-10-13"].entries[0].name = "Fresh toast";
      }, null);
    }, storeUrl);
    updated = p.getByRole("dialog").filter({ hasText: message });
    await updated.waitFor();
    await p.keyboard.press("Escape");
    await updated.waitFor({ state: "hidden" });
    result.checks.push(
      "Use food from home reloads a changed log entry with the notice.",
    );

    await other.evaluate(async (storeUrl) => {
      const { changeData } = await import(storeUrl);
      await changeData((data) => {
        data.mealPlans = [
          {
            id: "changed-plan",
            date: "2026-10-13",
            template: { id: "sunbutter-sandwich", name: "Planned snack" },
            servings: 1,
            status: "planned",
          },
        ];
      }, null);
    }, storeUrl);
    await p.getByRole("button", { name: "Changed it", exact: true }).click();
    const changed = p.getByRole("dialog", {
      name: "Log Planned snack",
      exact: true,
    });
    const amount = changed.getByRole("spinbutton").first();
    const initialAmount = Number(await amount.inputValue());
    await amount.fill("20");
    await other.evaluate(async (storeUrl) => {
      const { changeData } = await import(storeUrl);
      await changeData((data) => {
        data.mealPlans[0].servings = 2;
      }, null);
    }, storeUrl);
    await changed.getByText(message, { exact: true }).waitFor();
    if (
      Number(await changed.getByRole("spinbutton").first().inputValue()) !==
      initialAmount * 2
    )
      throw new Error("Changed-plan flow did not load the latest servings");
    await p.keyboard.press("Escape");
    await changed.waitFor({ state: "hidden" });
    result.checks.push(
      "Changed-plan sheet reloads amounts from the latest plan and clears the old draft.",
    );

    await p.goto(`${base}#/food/home`, { waitUntil: "domcontentloaded" });
    await p.getByRole("button", { name: "Add food", exact: true }).click();
    await p.getByRole("searchbox").fill("Remote snack");
    await p
      .getByRole("button", {
        name: "Can’t find it? Add it yourself",
        exact: true,
      })
      .click();
    const counts = p.getByRole("dialog", { name: "Counts as?", exact: true });
    await counts.getByRole("combobox").selectOption("bread");
    await other.evaluate(async (storeUrl) => {
      const { changeData } = await import(storeUrl);
      await changeData((data) => {
        const item = data.groceryState.pantry.find(
          (item) => item.name === "Remote snack",
        );
        item.name = "Latest snack";
        item.ingredientId = "bread";
      }, null);
    }, storeUrl);
    await counts.getByText(message, { exact: true }).waitFor();
    await counts.getByLabel("What does Latest snack count as?").waitFor();
    if ((await counts.getByRole("combobox").inputValue()) !== "bread")
      throw new Error("Counts as did not load the latest ingredient");
    await counts.getByRole("combobox").selectOption("");
    await counts.getByRole("button", { name: "Save", exact: true }).click();
    await counts.waitFor({ state: "hidden" });
    const latestSnack = await open(p, "food/home", "Latest snack");
    if (
      (await latestSnack
        .getByRole("combobox", { name: /^Counts as/ })
        .inputValue()) !== ""
    )
      throw new Error(
        "Clearing the remotely assigned ingredient was not saved",
      );
    await p.keyboard.press("Escape");
    await latestSnack.waitFor({ state: "hidden" });
    result.checks.push(
      "Counts as reloads the latest pantry item and ingredient with the notice, and clearing that ingredient is saved.",
    );
    await p.getByRole("button", { name: "Add food", exact: true }).click();
    await p
      .getByRole("dialog", { name: "Add food at home", exact: true })
      .getByRole("button", { name: "Add Bananas", exact: true })
      .click();
    const editAdded = p
      .locator(".app-toast")
      .getByRole("button", { name: "Edit details" });
    await editAdded.waitFor();
    await other.evaluate(async (storeUrl) => {
      const store = await import(storeUrl);
      await store.changeData((data) => {
        data.groceryState.pantry.find((row) => row.name === "Bananas").name =
          "Latest bananas";
      }, null);
    }, storeUrl);
    await p
      .getByRole("button", { name: "Latest bananas options", exact: true })
      .waitFor();
    await editAdded.click();
    const added = p.getByRole("dialog", {
      name: "Edit Latest bananas",
      exact: true,
    });
    if (
      (await added
        .getByRole("textbox", { name: "Name", exact: true })
        .inputValue()) !== "Latest bananas"
    )
      throw new Error("Edit details toast opened stale values");
    await p.keyboard.press("Escape");
    await added.waitFor({ state: "hidden" });
    result.checks.push(
      "The Add toast opens the latest saved item when another tab edits it before Edit details is pressed.",
    );
    const original = await open(other, "food/home", "Latest bananas");
    await original
      .getByRole("textbox", { name: "Name", exact: true })
      .fill("Bananas");
    await original
      .getByRole("button", { name: "Save details", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Bananas options", exact: true })
      .waitFor();
    await p.getByRole("button", { name: "Add food", exact: true }).click();
    await p
      .getByRole("dialog", { name: "Add food at home", exact: true })
      .getByRole("button", { name: "Add Bananas", exact: true })
      .click();
    const duplicate = p.getByRole("dialog", { name: "Food already at home" });
    await duplicate.waitFor();
    await other.evaluate(async (storeUrl) => {
      const { changeData } = await import(storeUrl);
      await changeData((data) => {
        data.groceryState.pantry.find(
          (row) => row.name === "Bananas",
        ).availability = "low";
      }, null);
    }, storeUrl);
    await duplicate.getByText(message, { exact: true }).waitFor();
    await duplicate.getByText(/You already have Bananas \(Low\)/).waitFor();
    await other.goto(`${base}#/food/home`);
    await other.getByRole("button", { name: "Bananas options" }).click();
    await other.getByRole("menuitem", { name: "Remove", exact: true }).click();
    await p.waitForFunction(
      () => !document.querySelector('button[aria-label="Bananas options"]'),
    );
    await duplicate.getByRole("button", { name: "Update it" }).click();
    await duplicate
      .getByText(/This item was removed on another screen/)
      .waitFor();
    if (
      await other
        .getByRole("button", { name: "Bananas options", exact: true })
        .count()
    )
      throw new Error("Updating the removed item inserted another pantry row");
    await duplicate.getByRole("button", { name: "Cancel" }).click();
    result.checks.push(
      "The duplicate alert reloads changed stock. Update it reports a removed item and never recreates it.",
    );
    const removed = await open(p, "food/home", "Home apples latest");
    await other.goto(`${base}#/food/home`, { waitUntil: "domcontentloaded" });
    await other
      .getByRole("button", { name: "Home apples latest options", exact: true })
      .click();
    await other.getByRole("menuitem", { name: "Remove", exact: true }).click();
    await other
      .getByRole("button", { name: "Home apples latest options", exact: true })
      .waitFor({ state: "hidden" });
    await removed
      .getByRole("button", { name: "Save details", exact: true })
      .click();
    await removed
      .getByText(/Not saved: This item was removed on another screen/)
      .waitFor();
    if (
      (await removed
        .getByRole("textbox", { name: "Name", exact: true })
        .inputValue()) !== "Home apples latest"
    )
      throw new Error("Remote removal lost the original item name");
    result.checks.push(
      "A remotely removed pantry item keeps its original form name and fails Save visibly instead of claiming success.",
    );
    await p.keyboard.press("Escape");
    await removed.waitFor({ state: "hidden" });

    for (const [route, name, save] of [
      ["food/home", "Latest snack", "Save details"],
      ["food/groceries", "Fresh oats", "Save"],
      ["food/log", "Fresh toast", "Save"],
      ["schedule", "Morning training latest", "Save changes"],
    ]) {
      const sheet = await open(p, route, name);
      await p.evaluate(() => {
        window.__holdItemUpdates = true;
      });
      await sheet
        .getByRole("textbox", { name: /^(Food name|Name)$/ })
        .fill("Stale blocked save");
      const remote = await open(other, route, name);
      await remote
        .getByRole("textbox", { name: /^(Food name|Name)$/ })
        .fill(`${name} fresh`);
      await remote.getByRole("button", { name: save, exact: true }).click();
      await remote.waitFor({ state: "hidden" });
      if (
        (await sheet
          .getByRole("textbox", { name: /^(Food name|Name)$/ })
          .inputValue()) !== "Stale blocked save"
      )
        throw new Error(
          `${route}: delayed-notification test did not retain the stale draft`,
        );
      await sheet.getByRole("button", { name: save, exact: true }).click();
      const reloaded = p.getByRole("dialog").filter({ hasText: message });
      await reloaded.getByText(message, { exact: true }).waitFor();
      const latestName = reloaded.getByRole("textbox", {
        name: /^(Food name|Name)$/,
      });
      if ((await latestName.inputValue()) !== `${name} fresh`)
        throw new Error(
          `${route}: transaction-time conflict failed to reload the committed record`,
        );
      if (
        await reloaded
          .getByRole("button", { name: "Try again", exact: true })
          .count()
      )
        throw new Error(`${route}: stale save was offered as a retry`);
      await latestName.fill(`Saved after refresh ${route}`);
      await reloaded.getByRole("button", { name: save, exact: true }).click();
      await reloaded.waitFor({ state: "hidden" });
      await p.evaluate(() => {
        window.__holdItemUpdates = false;
      });
      result.checks.push(
        `${route}: a save before the other tab's notification is refused, reloads latest with the notice, exposes no stale retry and allows a fresh save.`,
      );
    }

    await other.evaluate(async (storeUrl) => {
      const { changeData } = await import(storeUrl);
      await changeData((data) => {
        data.schedule.push({
          id: "overlap-check",
          title: "Another practice",
          type: "practice",
          date: "2026-10-13",
          startTime: "16:00",
          endTime: "17:30",
          location: "home",
        });
      }, null);
    }, storeUrl);
    const activity = await open(p, "schedule", "Saved after refresh schedule");
    await activity
      .getByRole("textbox", { name: "Name", exact: true })
      .fill("Stale overlapping draft");
    await activity
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    const staleOverlap = p.getByRole("dialog", {
      name: "Overlapping activity",
      exact: true,
    });
    await staleOverlap.waitFor();
    const remoteActivity = await open(
      other,
      "schedule",
      "Saved after refresh schedule",
    );
    await remoteActivity
      .getByRole("textbox", { name: "Name", exact: true })
      .fill("Fresh during overlap");
    await remoteActivity
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await other
      .getByRole("dialog", { name: "Overlapping activity", exact: true })
      .getByRole("button", { name: "Save anyway", exact: true })
      .click();
    await remoteActivity.waitFor({ state: "hidden" });
    await staleOverlap.waitFor({ state: "hidden" });
    const refreshedActivity = p
      .getByRole("dialog")
      .filter({ hasText: message });
    await refreshedActivity.getByText(message, { exact: true }).waitFor();
    if (
      (await refreshedActivity
        .getByRole("textbox", { name: "Name", exact: true })
        .inputValue()) !== "Fresh during overlap"
    )
      throw new Error(
        "Activity did not reload after invalidating its captured overlap callback",
      );
    result.checks.push(
      "A remote activity edit closes the stale overlap confirmation and reloads the latest draft with the notice.",
    );

    await other
      .getByRole("button", {
        name: "Actions for Fresh during overlap",
        exact: true,
      })
      .click();
    await other.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await other
      .getByRole("dialog", {
        name: "Delete Fresh during overlap?",
        exact: true,
      })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await other
      .getByRole("button", {
        name: "Actions for Fresh during overlap",
        exact: true,
      })
      .waitFor({ state: "hidden" });
    await refreshedActivity
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    const removedOverlap = p.getByRole("dialog", {
      name: "Overlapping activity",
      exact: true,
    });
    await removedOverlap
      .getByRole("button", { name: "Save anyway", exact: true })
      .click();
    await removedOverlap
      .getByText(/Not saved: This activity was removed on another screen/)
      .waitFor();
    if (!(await p.locator("dialog.activity-sheet[open]").isVisible()))
      throw new Error(
        "Saving a remotely removed activity falsely closed its editor",
      );
    result.checks.push(
      "Saving a remotely removed activity fails visibly and keeps the editor open instead of claiming success.",
    );

    const retryRace = await p.evaluate(async (storeUrl) => {
      const store = await import(storeUrl);
      const get = IDBObjectStore.prototype.get;
      const success = Object.getOwnPropertyDescriptor(
        IDBRequest.prototype,
        "onsuccess",
      );
      let release;
      let attempts = 0;
      IDBObjectStore.prototype.get = function (...args) {
        const request = get.apply(this, args);
        if (this.transaction.mode === "readonly") {
          Object.defineProperty(request, "onsuccess", {
            set(callback) {
              success.set.call(this, (event) => {
                release = () => callback(event);
              });
            },
          });
        }
        return request;
      };
      try {
        const conflict = store.changeData(
          () =>
            store.assertUnchangedItem({ value: "latest" }, { value: "stale" }),
          null,
        );
        for (let wait = 0; !release && wait < 500; wait += 1)
          await new Promise((resolve) => setTimeout(resolve, 10));
        if (!release) throw new Error("Conflict refresh read was not reached");
        const failed = await store.changeData(() => {
          attempts += 1;
          throw new Error("newer retry test");
        }, null);
        IDBObjectStore.prototype.get = get;
        release();
        const refused = await conflict;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const errorVisible =
          document.body.innerText.includes("newer retry test");
        const retried = await store.retryLastWrite();
        await store.changeData(() => {}, null);
        return { refused, failed, retried, attempts, errorVisible };
      } finally {
        IDBObjectStore.prototype.get = get;
      }
    }, storeUrl);
    if (
      retryRace.refused !== false ||
      retryRace.failed !== false ||
      retryRace.retried !== false ||
      retryRace.attempts !== 2 ||
      !retryRace.errorVisible
    )
      throw new Error(
        `Conflict refresh lost a newer failure or its retry: ${JSON.stringify(retryRace)}`,
      );
    result.checks.push(
      "A conflict refresh preserves the visible error and Retry owned by a separate newer failed write.",
    );

    // Same tab, not another screen: a count step is still waiting to write
    // (600 ms) when Edit details opens. The sheet opens on the saved count,
    // the draft is kept, and Save lands with the stepped count. The notice's
    // live region is in the sheet before anything changes, so it is announced.
    await p.goto(`${base}#/food/home`, { waitUntil: "domcontentloaded" });
    const bananasRow = p.locator(".stock-row").filter({ hasText: "Bananas" });
    if (!(await bananasRow.count())) {
      await p.getByRole("button", { name: "Add Bananas", exact: true }).click();
      await bananasRow.first().waitFor();
    }
    await p
      .getByRole("button", { name: "Bananas options", exact: true })
      .click();
    await p.getByRole("menuitem", { name: "Edit details" }).click();
    let details = p.getByRole("dialog", { name: /Edit Bananas/ });
    await details.waitFor();
    const region = details.locator('[role="status"].dialog-changed');
    if ((await region.count()) !== 1 || (await region.textContent()).trim())
      throw new Error(
        "The changed-elsewhere live region is missing or not empty",
      );
    await details
      .getByRole("combobox", { name: /Amount type/ })
      .selectOption({ label: "Exact quantity" });
    await details.getByRole("spinbutton").first().fill("3");
    await details.getByRole("button", { name: "Save details" }).click();
    await details.waitFor({ state: "hidden" });
    await bananasRow.first().getByText("3 left").waitFor();
    await bananasRow
      .first()
      .getByRole("button", { name: "Decrease Bananas", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Bananas options", exact: true })
      .click();
    await p.getByRole("menuitem", { name: "Edit details" }).click();
    details = p.getByRole("dialog", { name: /Edit Bananas/ });
    await details.waitFor();
    await p.waitForTimeout(1000);
    await details
      .getByRole("textbox", { name: "Name" })
      .fill("Bananas (green)");
    await details.getByRole("button", { name: "Save details" }).click();
    await details.waitFor({ state: "hidden", timeout: 5000 });
    const renamed = p
      .locator(".stock-row")
      .filter({ hasText: "Bananas (green)" });
    await renamed.first().getByText("2 left").waitFor();
    result.checks.push(
      "A count step still waiting to write when Edit details opens lands first: the rename saves, the row reads 2 left, and no changed-elsewhere notice appears; the notice's live region is in the sheet from the start (UX-CMP-20).",
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
