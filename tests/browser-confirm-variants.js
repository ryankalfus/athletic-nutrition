// UX-CMP-11: confirmations reached through recovery, restore, athlete, schedule and trip flows.
async (page) => {
  const base = globalThis.BASE_URL;
  const { readFile } = await import("node:fs/promises");
  const template = JSON.parse(
    await readFile("scripts/ux-capture/seeds/lived.json", "utf8"),
  );
  const result = { checks: [], errors: [] };
  const context = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  p.on("pageerror", (error) => result.errors.push(error.message));
  const seed = async (doc, route) => {
    await p.goto(base + "tests/fixtures/import-profile.json");
    await p.evaluate(async (doc) => {
      await new Promise((resolve, reject) => {
        const request = indexedDB.open("nourally-v2", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("documents");
        request.onsuccess = () => {
          const tx = request.result.transaction("documents", "readwrite");
          tx.objectStore("documents").put(doc, "app");
          tx.oncomplete = () => {
            request.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      });
      sessionStorage.setItem("nourally-profile-id", doc.defaultProfileId);
    }, doc);
    await p.goto(base + "#/" + route);
  };
  const measure = async (name, primary, underneath, tab = p) => {
    const alert = tab.getByRole("dialog", { name, exact: true });
    await alert.waitFor();
    await alert.evaluate(async (node) => {
      await Promise.allSettled(node.getAnimations().map((a) => a.finished));
    });
    const geometry = await alert.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const buttons = [...node.querySelectorAll(".confirm-actions > button")];
      return {
        width: rect.width,
        max: style.maxWidth,
        radius: style.borderRadius,
        dx: Math.abs(rect.left + rect.width / 2 - innerWidth / 2),
        dy: Math.abs(rect.top + rect.height / 2 - innerHeight / 2),
        content: node.querySelector(".confirm-actions").clientWidth,
        buttons: buttons.map((b) => ({
          width: b.getBoundingClientRect().width,
          top: b.getBoundingClientRect().top,
        })),
      };
    });
    if (
      geometry.width > 320 ||
      geometry.max !== "320px" ||
      geometry.radius !== "24px" ||
      geometry.dx > 1 ||
      geometry.dy > 1
    )
      throw new Error(
        name + " centered alert geometry " + JSON.stringify(geometry),
      );
    const buttons = geometry.buttons;
    if (
      buttons.length < 2 ||
      buttons.some((b) => Math.abs(b.width - geometry.content) > 1) ||
      buttons[0].top === buttons[1].top
    )
      throw new Error(name + " actions are not stacked full width");
    const safe = alert.getByRole("button", { name: primary, exact: true });
    if (
      (await safe.getAttribute("data-kind")) !== "primary" &&
      !(await safe.evaluate((n) => n.classList.contains("primary")))
    )
      throw new Error(name + " primary action is incorrect");
    if (underneath && !(await underneath.evaluate((n) => n.inert)))
      throw new Error(name + " leaves the underlying sheet active");
    result.checks.push(
      name +
        ": centered 320 px alert, stacked full-width actions and primary " +
        primary +
        (underneath ? "; underlying sheet inert" : ""),
    );
    await tab.keyboard.press("Escape");
    await alert.waitFor({ state: "hidden" });
  };
  try {
    await seed(structuredClone(template), "you/device");
    await p
      .getByLabel("Backup file")
      .setInputFiles("tests/fixtures/import-profile.json");
    await measure("Add from this file?", "Cancel");

    await p.goto(base + "#/welcome");
    await p.getByRole("button", { name: "Maya options", exact: true }).click();
    await p
      .getByRole("menuitem", { name: "Remove from this device", exact: true })
      .click();
    await measure("Delete Maya's data from this device?", "Cancel");

    const scheduleDoc = structuredClone(template);
    const data = scheduleDoc.profiles[scheduleDoc.defaultProfileId].data;
    data.schedule = [
      {
        id: "alert-oneoff",
        type: "practice",
        title: "Alert practice",
        date: "2026-10-13",
        startTime: "16:00",
        endTime: "17:30",
        location: "home",
        intensity: "medium",
        travelMinutes: 0,
      },
    ];
    await context.clock.setFixedTime(new Date(2026, 9, 13, 10));
    await seed(scheduleDoc, "schedule");
    await p
      .getByRole("button", { name: "Actions for Alert practice", exact: true })
      .click();
    await p.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await measure("Delete Alert practice?", "Cancel");

    await p
      .getByRole("button", { name: /^(\+ )?Add$/, exact: false })
      .first()
      .click();
    const activity = p.getByRole("dialog", {
      name: "Add practice",
      exact: true,
    });
    await activity
      .getByRole("textbox", { name: "Name", exact: true })
      .fill("Overlap");
    await activity.getByLabel("Starts", { exact: true }).fill("16:15");
    await activity.getByLabel("Ends", { exact: true }).fill("17:00");
    await activity
      .getByRole("button", { name: "Add practice", exact: true })
      .click();
    await measure("Overlapping activity", "Cancel", activity);
    await p.keyboard.press("Escape");
    const discard = p.getByRole("dialog", {
      name: "Discard changes?",
      exact: true,
    });
    await discard.getByRole("button", { name: "Discard", exact: true }).click();

    const tripDoc = structuredClone(template);
    const grocery =
      tripDoc.profiles[tripDoc.defaultProfileId].data.groceryState;
    const purchase = grocery.purchases[0];
    grocery.pantry = grocery.pantry.filter(
      (row) => row.id !== purchase.pantryId,
    );
    await seed(tripDoc, "food/groceries");
    await p.getByRole("button", { name: "Past trips", exact: true }).click();
    const trips = p.getByRole("dialog", { name: "Past trips", exact: true });
    await trips.getByRole("button", { name: "Undo trip", exact: true }).click();
    await measure("Undo this trip?", "Keep", trips);
    await p.keyboard.press("Escape");
  } finally {
    await context.close();
  }

  const recovery = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
  try {
    await recovery.addInitScript(() =>
      localStorage.setItem("nourally-groceries", "{broken-json"),
    );
    const r = await recovery.newPage();
    await r.goto(base);
    await r
      .getByRole("button", {
        name: "Open a clean recovery profile",
        exact: true,
      })
      .click();
    await measure("Open a clean recovery profile?", "Cancel", null, r);
  } finally {
    await recovery.close();
  }
  return result;
};
