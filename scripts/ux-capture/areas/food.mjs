import { newPage, seed, go, settle, scenario, D, clearToasts, closeAll, api } from "../lib.mjs";
import { baseDoc, lived, dataOf } from "../seeds.mjs";

const T = D(2026, 10, 13, 13, 30);

export default async function ({ browser, pass, cap }) {
  const opener = (opened) => async (clock = T) => {
    const r = await newPage(browser, pass, { clock });
    opened.push(r.context);
    return { p: r.page, context: r.context };
  };
  const shot = (p, area, state, note, o) => cap.shot(p, area, state, note, o);
  const moment = (p, name) =>
    p.getByRole("radiogroup", { name: "Food moment" }).getByRole("radio", { name }).click();

  // ---------- Ideas ----------
  await scenario(cap, 300, "ideas moments", async (opened) => {
    const { p } = await opener(opened)();
    await seed(p, baseDoc(), "food/ideas");
    await settle(p);
    await shot(p, "ideas", "now-meal-window", "Food › Ideas, moment Now at Tue 1:30 PM (meal window), idea cards with Plan this");
    for (const [name, state] of [["Before practice", "before-practice"], ["After practice", "after-practice"], ["Tomorrow", "tomorrow"]]) {
      await moment(p, name);
      await settle(p, 300);
      await shot(p, "ideas", `moment-${state}`, `Ideas with the ${name} moment selected`);
    }
    await moment(p, "Now");
    await p.getByRole("button", { name: "Banana + pretzels options" }).click();
    await shot(p, "ideas", "card-menu-open", "Idea card '…' menu open: Add missing to groceries, Save as favorite, Not for me", { kind: "fold" });
    await p.keyboard.press("Escape");
    const more = p.getByRole("button", { name: "Show more ideas" });
    if (await more.count()) {
      await more.click();
      await settle(p, 300);
      await shot(p, "ideas", "show-more", "Ideas after Show more ideas", { kind: "full" });
    }
    await p.getByRole("button", { name: "Plan Banana + pretzels" }).click();
    await settle(p, 400);
    await shot(p, "ideas", "planned-card-toast", "Ideas with the Planned today card at the top after Plan this; toast");
    await clearToasts(p);
    await p.getByRole("button", { name: "Banana + pretzels plan options" }).click();
    await shot(p, "ideas", "planned-card-menu", "Planned card menu open: Change idea, Remove plan", { kind: "fold" });
    await p.keyboard.press("Escape");
    await p.getByRole("button", { name: /^Change to / }).first().click().catch(() => {});
    await settle(p, 300);
    await shot(p, "ideas", "after-change-idea", "Ideas after choosing Change to on another card", { kind: "fold" });
  });

  await scenario(cap, 315, "ideas variants", async (opened) => {
    let { p } = await opener(opened)();
    const low = baseDoc();
    dataOf(low).profile.lowCostIdeas = true;
    await seed(p, low, "food/ideas");
    await shot(p, "ideas", "low-cost-banner", "Ideas with low-cost ideas on: 'Showing low-cost ideas.' banner");
    ({ p } = await opener(opened)());
    const empty = baseDoc();
    dataOf(empty).profile.foodSources = ["home"];
    dataOf(empty).profile.familyPrep = false;
    dataOf(empty).schoolSchedule.foodAccess = { cafeteria: false, refrigerator: false, microwave: false, eatInClass: false };
    await seed(p, empty, "food/ideas");
    await shot(p, "ideas", "empty-no-access", "Ideas at 1:30 PM in school with no school food access and no packed food: empty state");
    ({ p } = await opener(opened)());
    const strict = baseDoc();
    dataOf(strict).profile.dietaryNeeds = ["vegan"];
    dataOf(strict).profile.foodSources = ["cafeteria"];
    dataOf(strict).profile.dislikes = ["bananas", "applesauce", "grapes", "dried-fruit", "fig-bars", "granola", "oats", "rice", "rice-cakes", "pasta", "pretzels", "beans", "chickpeas", "salsa", "turkey", "chicken"];
    await seed(p, strict, "food/ideas");
    for (let i = 0; i < 8; i++) {
      const menu = p.locator(".idea-card").first().getByRole("button", { name: / options$/ });
      if (!(await menu.count())) break;
      await menu.click();
      await p.getByRole("menuitem", { name: "Not for me" }).click();
      await p.waitForTimeout(300);
      if (i === 0) await shot(p, "ideas", "not-for-me-toast", "After 'Not for me' on an idea card: card removed, toast with Undo", { kind: "fold" });
    }
    await clearToasts(p);
    await shot(p, "ideas", "empty-no-match", "Ideas (vegan, cafeteria only, many dislikes) after hiding the rest with Not for me: empty state");
    ({ p } = await opener(opened)(D(2026, 10, 18, 12, 0)));
    await seed(p, baseDoc(), "food/ideas");
    await shot(p, "ideas", "no-activity-sunday", "Ideas on Sunday with no activity scheduled");
    ({ p } = await opener(opened)(D(2026, 10, 17, 16, 0)));
    await seed(p, baseDoc(), "food/ideas");
    await shot(p, "ideas", "away-travel", "Ideas Sat 4:00 PM before the away game: 'Away activity. These foods travel well.'");
    ({ p } = await opener(opened)(D(2026, 10, 13, 15, 0)));
    await seed(p, lived(), "food/ideas");
    await shot(p, "ideas", "lived-planned", "Ideas with the lived-in data at 3:00 PM: planned card, home stock on cards");
    const packBtn = p.locator(".meal-plan-card").getByRole("button", { name: "Mark packed" });
    if (await packBtn.count()) {
      await packBtn.click();
      await p.waitForTimeout(400);
      await clearToasts(p);
      await shot(p, "ideas", "planned-card-packed", "Planned card after Mark packed: Log it");
    }
    const logBtn = p.locator(".meal-plan-card").getByRole("button", { name: /Log it/ }).first();
    if (await logBtn.count()) {
      await logBtn.click();
      await p.waitForTimeout(400);
      await shot(p, "ideas", "log-what-you-ate-dialog", "Log what you ate dialog from the planned card");
      await closeAll(p);
    }
  });

  // ---------- At home ----------
  await scenario(cap, 330, "at home", async (opened) => {
    let { p } = await opener(opened)();
    await seed(p, baseDoc(), "food/home");
    await shot(p, "home", "empty", "At home empty: 'What's in your kitchen?' and Quick add list");
    ({ p } = await opener(opened)());
    await seed(p, lived(), "food/home");
    await shot(p, "home", "all", "At home with stock: Kitchen & pantry, Fridge & freezer, In my bag; Have/Low/Out controls");
    const filter = p.getByRole("radiogroup", { name: "Stock filter" });
    await filter.getByRole("radio", { name: /Low or out/ }).click();
    await settle(p, 300);
    await shot(p, "home", "filter-low-or-out", "At home filtered to Low or out (Apples low, Tortillas out) with add-to-groceries action");
    await filter.getByRole("radio", { name: /In my bag/ }).click();
    await settle(p, 300);
    await shot(p, "home", "filter-in-my-bag", "At home filtered to In my bag (Granola bars)");
    await filter.getByRole("radio", { name: /^All/ }).click();
    await p.getByRole("button", { name: "Tortillas options" }).click();
    await shot(p, "home", "row-menu-out", "Row menu for an Out item: Back in stock, Edit details, Add to groceries, Remove", { kind: "fold" });
    await p.keyboard.press("Escape");
    await p.getByRole("button", { name: "Bananas options" }).click();
    await shot(p, "home", "row-menu-have", "Row menu for a Have item", { kind: "fold" });
    await p.getByRole("menuitem", { name: "Edit details" }).click();
    await p.getByRole("dialog").waitFor();
    await shot(p, "home", "details-sheet", "Edit Bananas details sheet: place, amount type, counts as, price");
    const amount = p.getByRole("dialog").getByRole("combobox", { name: "Amount type" });
    if (await amount.count()) {
      await amount.selectOption({ label: "Exact quantity" }).catch(() => {});
      await settle(p, 200);
      await shot(p, "home", "details-sheet-exact", "Details sheet with Exact quantity (Amount left field)");
      const left = p.getByRole("dialog").getByRole("spinbutton", { name: "Amount left" });
      if (await left.count()) {
        await left.fill("0");
        await p.getByRole("dialog").getByRole("button", { name: /^Save/ }).click();
        await p.waitForTimeout(300);
        await shot(p, "home", "details-sheet-error", "Details sheet error with amount 0");
      }
    }
    await closeAll(p);
    const stock = p.getByRole("radiogroup", { name: "Oats stock" });
    await stock.getByRole("radio", { name: /Low/ }).click();
    await p.waitForTimeout(300);
    await shot(p, "home", "stock-set-low-toast", "Oats set to Low: row updates and toast", { kind: "fold" });
    await clearToasts(p);
    await p.getByRole("button", { name: /^Add food/ }).first().click();
    const add = p.getByRole("dialog", { name: "Add food at home" });
    await add.waitFor();
    await shot(p, "home", "add-food-dialog", "Add food at home dialog: search field, Scan barcode, Quick basics");
    await add.getByRole("button", { name: "Add Bananas", exact: true }).click();
    await p.getByRole("dialog", { name: "Food already at home" }).waitFor();
    await shot(p, "home", "merge-prompt", "'Food already at home' prompt for Bananas: update existing or add both");
    await closeAll(p);
    await p.getByRole("button", { name: /^Add food/ }).first().click();
    await add.waitFor();
    await add.getByRole("searchbox").fill("cheerios");
    await add.locator(".food-results li").first().waitFor();
    await settle(p, 300);
    await shot(p, "home", "add-food-search-results", "Add food at home search results for 'cheerios'");
    await add.locator(".food-results li").getByRole("button", { name: /^Add / }).first().click();
    await p.waitForTimeout(500);
    if (await p.getByRole("dialog", { name: "Counts as?" }).count())
      await shot(p, "home", "counts-as-dialog", "'Counts as?' dialog for a product that matches no ingredient");
    await closeAll(p);
  });

  // ---------- Groceries ----------
  await scenario(cap, 350, "groceries", async (opened) => {
    let { p } = await opener(opened)();
    await seed(p, baseDoc(), "food/groceries");
    await shot(p, "groceries", "empty", "Groceries empty: 'Your list is empty', Suggest for this week");
    await p.getByRole("button", { name: /Suggest for this week/ }).click();
    const s = p.getByRole("dialog", { name: "Add food for this week" });
    await s.waitFor();
    await shot(p, "groceries", "week-suggestions-sheet", "Add food for this week sheet: suggestions with reasons, all selected (Add n to list)");
    const cb = s.getByRole("checkbox");
    for (let i = 0; i < 3; i++) await cb.nth(i).click();
    await shot(p, "groceries", "week-suggestions-selected", "Suggestions sheet with 3 unchecked, the count follows", { kind: "fold" });
    await closeAll(p);
    ({ p } = await opener(opened)());
    await seed(p, lived(), "food/groceries");
    await shot(p, "groceries", "list-checked-item", "Groceries list: For this week items, 1 checked, Past trips, Finish shopping (1)");
    await p.getByRole("button", { name: "Crackers options" }).click();
    await shot(p, "groceries", "row-menu", "Grocery row menu: Edit, Swap for another food, Remove", { kind: "fold" });
    await p.getByRole("menuitem", { name: "Swap for another food" }).click();
    await p.getByRole("dialog").waitFor();
    await settle(p, 400);
    await shot(p, "groceries", "swap-sheet", "Swap Crackers sheet (food search prefilled)");
    await closeAll(p);
    await p.getByRole("button", { name: "Crackers options" }).click();
    await p.getByRole("menuitem", { name: "Edit" }).click();
    await p.getByRole("dialog").waitFor();
    await shot(p, "groceries", "edit-item-sheet", "Edit Crackers grocery item sheet");
    await closeAll(p);
    await p.getByRole("button", { name: "Past trips" }).click();
    await p.getByRole("dialog", { name: "Past trips" }).waitFor();
    await shot(p, "groceries", "past-trips-sheet", "Past trips sheet with one trip and Undo");
    const undo = p.getByRole("dialog", { name: "Past trips" }).getByRole("button", { name: /Undo/ }).first();
    if (await undo.count()) {
      await undo.click();
      await p.waitForTimeout(400);
      await shot(p, "groceries", "undo-trip-confirm", "'Undo this trip?' confirm");
    }
    await closeAll(p);
    for (const name of ["Crackers", "Canned beans", "Eggs"])
      await p.getByRole("checkbox", { name: `Got ${name}` }).click();
    await p.waitForTimeout(300);
    await shot(p, "groceries", "all-checked", "All items checked: 'Everything's checked. Finish shopping?'");
    await p.getByRole("button", { name: /Finish shopping/ }).first().click();
    await p.getByRole("dialog", { name: "Put these away?" }).waitFor();
    await shot(p, "groceries", "put-away-sheet", "Put these away? sheet: place per item (Kitchen/Fridge/Freezer/Bag), Add to At home");
    await p.getByRole("dialog", { name: "Put these away?" }).getByRole("button", { name: "Add to At home" }).click();
    await p.waitForTimeout(500);
    await shot(p, "groceries", "after-put-away-toast", "Groceries after putting away: empty list and toast");
    await p.getByRole("button", { name: /^Add food/ }).first().click();
    await p.getByRole("dialog").waitFor();
    await shot(p, "groceries", "add-food-dialog", "Add food to groceries dialog");
    await closeAll(p);
    ({ p } = await opener(opened)());
    const priced = lived();
    dataOf(priced).groceryState.showPrices = true;
    dataOf(priced).groceryState.budgetAmount = 40;
    await seed(p, priced, "food/groceries");
    await shot(p, "groceries", "price-estimates-on", "Groceries with price estimates on and a $40 budget");
  });

  // ---------- Log ----------
  await scenario(cap, 380, "log", async (opened) => {
    let { p } = await opener(opened)(D(2026, 10, 13, 18, 0));
    await seed(p, lived(), "food/log");
    await shot(p, "log", "day-today-entries", "Log › Day for today with entries, planned food prompt, water, activity rows, nearby days");
    await p.getByRole("button", { name: /^Previous day/ }).click();
    await settle(p, 300);
    await shot(p, "log", "day-yesterday", "Log › Day for yesterday (Mon Oct 12), Back to today");
    await go(p, "food/log/2026-10-11");
    await shot(p, "log", "day-empty", "Log › Day with nothing logged (Sun Oct 11)");
    await go(p, "food/log");
    const entry = p.locator("li.log-entry").first();
    const name = (await entry.getByRole("heading").first().innerText()).trim();
    await entry.getByRole("button", { name: `${name} options` }).click();
    await shot(p, "log", "entry-menu", `Log entry menu for ${name}: Edit, Delete`, { kind: "fold" });
    await p.getByRole("menuitem", { name: "Edit" }).click();
    await p.getByRole("dialog").waitFor();
    await shot(p, "log", "edit-entry-sheet", "Edit food sheet: amount eaten, unit, time");
    const amt = p.getByRole("dialog").getByLabel("Amount eaten");
    await amt.fill("0");
    await p.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click({ timeout: 2000 }).catch(() => {});
    await p.waitForTimeout(300);
    await shot(p, "log", "edit-entry-error", "Edit food sheet with amount 0: error");
    await closeAll(p);
    const yes = p.getByRole("button", { name: /Yes, as planned/ });
    if (await yes.count()) {
      await yes.click();
      await p.waitForTimeout(400);
      await shot(p, "log", "planned-yes-toast", "After 'Yes, as planned': plan logged, toast");
      await clearToasts(p);
    }
    const water = p.getByRole("region", { name: "Water" });
    if (await water.count()) {
      await water.getByRole("button", { name: "+ Water" }).click();
      await p.waitForTimeout(300);
      await shot(p, "log", "water-added-home-prompt", "Water from Log (+ Water)");
      await closeAll(p);
    }
    await p.getByRole("radiogroup", { name: "Log view" }).getByRole("radio", { name: "Week" }).click();
    await settle(p, 300);
    await shot(p, "log", "week", "Log › Week with logs on several days, practices and water");
    await p.getByText("View as table").click();
    await settle(p, 300);
    await shot(p, "log", "week-table", "Log › Week with View as table open");
    await p.getByRole("button", { name: /^Previous week/ }).click();
    await settle(p, 300);
    await shot(p, "log", "week-previous-empty", "Log › previous week with nothing logged");
    ({ p } = await opener(opened)(D(2026, 10, 13, 18, 0)));
    await seed(p, baseDoc(), "food/log/week");
    await shot(p, "log", "week-empty-new-user", "Log › Week for a new athlete: nothing logged");
  });

  // ---------- Food search + portion (from Log) ----------
  await scenario(cap, 400, "search", async (opened) => {
    const { p, context } = await opener(opened)(D(2026, 10, 13, 18, 0));
    await seed(p, lived(), "food/log");
    const openSearch = async () => {
      await p.getByRole("button", { name: "Log food", exact: true }).click();
      const d = p.getByRole("dialog", { name: "Log food" });
      await d.getByRole("searchbox").waitFor();
      return d;
    };
    let d = await openSearch();
    await shot(p, "search", "dialog-initial", "Log food dialog: search field, Scan barcode, Recent, Quick basics");
    await d.getByRole("searchbox").pressSequentially("banana", { delay: 30 });
    await d.locator(".food-results li").first().waitFor();
    await settle(p, 400);
    await shot(p, "search", "results-banana", "Search results for 'banana': basic foods first, brands with portion hints");
    await d.locator(".food-results li").getByRole("button", { name: /^Add / }).first().click();
    await p.waitForTimeout(400);
    await shot(p, "search", "portion-step", "Portion step after choosing a result: amount, unit, time eaten, Save");
    const amount = d.getByLabel("Amount eaten");
    if (await amount.count()) {
      await amount.fill("0");
      await d.getByRole("button", { name: "Save", exact: true }).click({ timeout: 2000 }).catch(() => {});
      await p.waitForTimeout(300);
      await shot(p, "search", "portion-error", "Portion step with amount 0: error");
      await amount.fill("1");
    }
    await d.getByRole("button", { name: "Save", exact: true }).click();
    await p.waitForTimeout(500);
    await shot(p, "search", "logged-toast", "After saving: toast 'Logged …' or the Food from home prompt");
    await closeAll(p);
    await clearToasts(p);
    d = await openSearch();
    await d.getByRole("searchbox").fill("zzqx");
    await p.waitForTimeout(900);
    await shot(p, "search", "no-results", "Search with no matches: 'No matching foods' empty state");
    api.searchMode = "error";
    await d.getByRole("searchbox").fill("rice");
    await p.waitForTimeout(900);
    await shot(p, "search", "error", "Search when the food service fails (502): error with Retry");
    api.searchMode = "ok";
    await context.setOffline(true);
    await d.getByRole("searchbox").fill("peanut butter");
    await p.waitForTimeout(900);
    await shot(p, "search", "offline", "Search while offline: 'You're offline. Recent and saved foods still work.'");
    await context.setOffline(false);
    await d.getByRole("searchbox").fill("");
    await d.getByRole("button", { name: "Add it yourself" }).or(d.getByText(/Add it yourself/)).first().click().catch(() => {});
    await p.waitForTimeout(400);
    await shot(p, "search", "add-it-yourself", "Manual food entry ('Can't find it? Add it yourself')");
    await closeAll(p);
  });

  // ---------- Barcode scanner ----------
  await scenario(cap, 420, "scanner", async (opened) => {
    const { p } = await opener(opened)(D(2026, 10, 13, 18, 0));
    await seed(p, lived(), "food/log");
    await p.getByRole("button", { name: "Log food", exact: true }).click();
    const d = p.getByRole("dialog", { name: "Log food" });
    await d.getByRole("button", { name: "Scan barcode" }).click();
    await p.getByRole("textbox", { name: "Barcode number" }).waitFor();
    await settle(p, 500);
    await shot(p, "scanner", "dialog-no-camera", "Scan barcode view in headless (no camera): manual Barcode number entry");
    await p.getByRole("textbox", { name: "Barcode number" }).fill("1234");
    await p.getByRole("button", { name: "Look up product" }).click();
    await p.waitForTimeout(300);
    await shot(p, "scanner", "invalid-code", "Barcode error: 8–14 digit message");
    await p.getByRole("textbox", { name: "Barcode number" }).fill("00000000");
    await p.getByRole("button", { name: "Look up product" }).click();
    await p.waitForTimeout(500);
    await shot(p, "scanner", "not-found", "Barcode not found: 'We couldn't find that barcode. Add the food yourself.'");
    await p.getByRole("textbox", { name: "Barcode number" }).fill("012345678905");
    await p.getByRole("button", { name: "Look up product" }).click();
    await p.waitForTimeout(800);
    await shot(p, "scanner", "product-found", "Barcode product found: Chewy Granola Bar with allergens line and 'Allergies: check every label.'");
    await closeAll(p);
  });
}
