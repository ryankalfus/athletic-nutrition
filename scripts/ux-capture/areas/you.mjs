import { newPage, seed, go, settle, scenario, D, clearToasts, closeAll, fixturePath } from "../lib.mjs";
import { lived, athletesDoc, dataOf } from "../seeds.mjs";

const T = D(2026, 10, 13, 18, 0);
const PERMISSION = {
  default: () => Object.defineProperty(Notification, "permission", { get: () => "default", configurable: true }),
  granted: () => Object.defineProperty(Notification, "permission", { get: () => "granted", configurable: true }),
  denied: () => Object.defineProperty(Notification, "permission", { get: () => "denied", configurable: true }),
  unsupported: () => { delete window.Notification; },
};

export default async function ({ browser, pass, cap }) {
  const opener = (opened) => async (permission) => {
    const r = await newPage(browser, pass, { clock: T });
    if (permission) await r.context.addInitScript(PERMISSION[permission]);
    opened.push(r.context);
    return r.page;
  };
  const shot = (p, area, state, note, o) => cap.shot(p, area, state, note, o);
  const dialog = (p) => p.getByRole("dialog").first();

  await scenario(cap, 500, "you list + sheets", async (opened) => {
    const p = await opener(opened)("default");
    await seed(p, lived(), "you");
    await shot(p, "you", "list", "You page: athlete header, Sport & season, Food needs & allergies, Food access & budget, Reminders, This device, About");
    await p.getByRole("link", { name: /^Sport & season/ }).click();
    await dialog(p).waitFor();
    await shot(p, "you", "sport-sheet", "Sport & season sheet: Sport combobox, Season");
    await p.getByRole("button", { name: "Sport suggestions" }).click();
    await p.getByRole("option").first().waitFor();
    await shot(p, "you", "sport-sheet-combobox-open", "Sport & season sheet with the Sport suggestions list open");
    await p.keyboard.press("Escape");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("");
    await p.getByRole("combobox", { name: /^Sport/ }).press("Escape");
    await dialog(p).getByRole("button", { name: "Save", exact: true }).click();
    await p.waitForTimeout(300);
    await shot(p, "you", "sport-saved-empty", "After clearing Sport and pressing Save: sheet stays open with 'Enter your sport.'");
    await seed(p, lived(), "you");
    await p.keyboard.press("Escape");
    await p.waitForTimeout(400);
    if (await p.getByRole("dialog", { name: "Discard changes?" }).count())
      await shot(p, "you", "sport-sheet-discard-confirm", "'Discard changes?' over the Sport & season sheet");
    await closeAll(p);
    await go(p, "you/needs");
    await dialog(p).waitFor();
    await shot(p, "you", "food-needs-sheet", "Food needs & allergies sheet: 'Allergy filtering coming soon.', I don't eat, Not a fan of");
    await dialog(p).getByRole("button", { name: "Vegetarian" }).click();
    await dialog(p).getByRole("button", { name: "Pasta" }).click();
    await shot(p, "you", "food-needs-sheet-selected", "Food needs sheet with Vegetarian and Pasta selected", { kind: "fold" });
    await closeAll(p);
    await go(p, "you/access");
    await dialog(p).waitFor();
    await shot(p, "you", "access-sheet", "Food access & budget sheet: where you can get food, at school, low-cost, price estimates, budget, water units");
    const units = dialog(p).getByRole("radiogroup", { name: "Water units" });
    await units.scrollIntoViewIfNeeded();
    await units.getByRole("radio", { name: /ml/i }).click();
    await shot(p, "you", "access-sheet-units-ml", "Access sheet scrolled to Water units with ml selected", { kind: "fold" });
    const where = dialog(p).getByRole("group", { name: "Where you can get food" });
    for (let i = 0; i < 6 && (await where.getByRole("button", { pressed: true }).count()); i++) await where.getByRole("button", { pressed: true }).first().click();
    await dialog(p).getByRole("button", { name: "Save", exact: true }).click({ timeout: 2000 }).catch(() => {});
    await p.waitForTimeout(300);
    await shot(p, "you", "access-sheet-error", "Access sheet saved with no place selected: 'Choose at least one place you can get food.'");
    await closeAll(p);
    await go(p, "you/reminders");
    await dialog(p).waitFor();
    await shot(p, "you", "reminders-sheet-default", "Reminders sheet, permission not asked yet: switch off, browser will ask");
  });

  let n = 520;
  for (const perm of ["granted", "denied", "unsupported"]) {
    await scenario(cap, n, `reminders ${perm}`, async (opened) => {
      const p = await opener(opened)(perm);
      const doc = lived();
      dataOf(doc).reminderSettings.enabled = perm === "granted";
      await seed(p, doc, "you/reminders");
      await dialog(p).waitFor();
      await shot(p, "you", `reminders-sheet-${perm}`, `Reminders sheet with notification permission ${perm}${perm === "granted" ? ", reminders on: How long before, evening reminder" : ""}`);
      if (perm !== "granted") {
        const sw = dialog(p).getByRole("switch").first();
        if (await sw.isEnabled()) {
          await sw.click();
          await p.waitForTimeout(400);
          await shot(p, "you", `reminders-sheet-${perm}-turn-on`, `Trying to turn reminders on with permission ${perm}`);
        }
      }
    });
    n += 3;
  }
  await scenario(cap, 530, "reminder problem on Today", async (opened) => {
    const p = await opener(opened)("denied");
    const doc = lived();
    dataOf(doc).reminderSettings.enabled = true;
    await seed(p, doc, "today");
    const prompt = p.getByRole("complementary", { name: "Reminders" });
    if (await prompt.count()) await prompt.scrollIntoViewIfNeeded();
    await shot(p, "today", "prompt-reminder-problem", "Today with reminders on but notifications blocked: prompt slot shows the problem and Open reminders", { kind: "fold" });
  });

  await scenario(cap, 535, "device", async (opened) => {
    const p = await opener(opened)("default");
    await seed(p, athletesDoc(2, lived()), "you/device");
    await shot(p, "device", "page", "You › This device: athletes list (2), Backup, Restore, Storage, Delete data");
    await p.getByRole("button", { name: "Rename" }).first().click();
    await dialog(p).waitFor();
    await shot(p, "device", "rename-sheet", "Rename athlete sheet");
    await dialog(p).getByRole("textbox").fill("");
    await dialog(p).getByRole("button", { name: /^Save|^Rename/ }).last().click().catch(() => {});
    await p.waitForTimeout(300);
    await shot(p, "device", "rename-sheet-empty", "Rename sheet saved with an empty name");
    await closeAll(p);
    const chooser = p.waitForEvent("filechooser", { timeout: 5000 }).catch(() => null);
    await p.getByRole("button", { name: "Restore from a backup file" }).click().catch(() => {});
    const fc = await chooser;
    if (fc) await fc.setFiles(fixturePath("import-profile.json"));
    else await p.locator("input[type=file]").first().setInputFiles(fixturePath("import-profile.json"));
    await dialog(p).waitFor();
    await settle(p, 300);
    await shot(p, "device", "restore-preview", "'Add from this file?' restore preview for import-profile.json");
    await closeAll(p);
    await p.getByRole("button", { name: /^Delete .*data$/ }).first().click();
    await p.waitForTimeout(400);
    await shot(p, "device", "delete-confirm", "Delete data confirm: type DELETE, backup downloads first");
    await dialog(p).getByRole("textbox").fill("DEL").catch(() => {});
    await shot(p, "device", "delete-confirm-partial", "Delete confirm with incomplete confirmation text", { kind: "fold" });
    await closeAll(p);
    await p.getByRole("button", { name: "Save a backup file" }).click();
    await p.waitForTimeout(500);
    await shot(p, "device", "backup-saved-toast", "After Save a backup file: last backup line and toast");
    await clearToasts(p);
  });

  await scenario(cap, 545, "about + not found", async (opened) => {
    const p = await opener(opened)();
    await seed(p, lived(), "you/about");
    await shot(p, "about", "page", "About Nourally's guidance page");
    await go(p, "this-page-does-not-exist");
    await shot(p, "notfound", "page", "Not found page for an unknown route");
  });
}
