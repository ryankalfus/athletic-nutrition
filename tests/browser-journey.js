// Playwright snippet: the core journey end to end (P2-08, REMAINING-APP-CHANGES §6),
// once at 390 px and once at 1440 px, in one continuous session per width:
// Welcome → setup (sport, school day, a practice) → import a team calendar
// (.ics fixture) and re-import it (adds nothing) → food needs (allergy
// filtering is off) → add food at home → Today suggests a snack for the real
// session and time → plan it → Ideas and Today agree → the session moves
// (stale plan prompt) → add the missing item to groceries → finish shopping
// and put away → mark packed → log it → Log › Day shows it → no suitable food
// (empty state on Ideas, no pick on Today).
// After every step the page must not scroll sideways
// (documentElement.scrollWidth <= clientWidth); any overflow fails the run.
// No network: /api/* is answered from fixtures and any request to another
// host fails the run. Clock: Tuesday 2026-10-13 1:00 PM in America/Chicago,
// so the TeamSnap fixture's 5:00 PM practice is later today.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const browser = page.context().browser();
  const result = { checks: [], errors: [] };
  const teamsnap = "tests/fixtures/teamsnap-lightning-u14.ics";
  const practice = "Lightning U14 Practice";
  const snack = "Banana + pretzels";
  const baseHost = new URL(base).host;
  let p;
  let context;
  let width;
  let steps = 0;
  const unexpected = [];

  // /api/* from fixtures; anything else off this host is refused.
  const json = (route, body, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  const mockApi = async (route) => {
    const url = new URL(route.request().url());
    if (url.host !== baseHost) {
      unexpected.push(url.href);
      return route.abort();
    }
    const path = url.pathname;
    if (path === "/api/foods/status")
      return json(route, { mode: "local-snapshot" });
    if (path === "/api/foods/search")
      return json(route, {
        foods: [
          { fdcId: 1, description: "Bananas, raw", dataType: "SR Legacy" },
          { fdcId: 2, description: "Pretzels, hard", dataType: "SR Legacy" },
        ],
        totalHits: 2,
      });
    if (path.startsWith("/api/barcode/"))
      return json(route, { error: "Not found." }, 404);
    if (path === "/api/calendar") {
      const feed = await context.request.get(`${base}${teamsnap}`);
      return route.fulfill({
        status: 200,
        contentType: "text/calendar",
        body: await feed.text(),
      });
    }
    unexpected.push(url.href);
    return json(route, { error: "Not mocked." }, 404);
  };

  // Every step ends here: no sideways scroll and no unmocked request.
  const done = async (name) => {
    await p.waitForTimeout(150);
    const { scroll, client } = await p.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    if (scroll > client)
      throw new Error(
        `${name}: the page scrolls sideways (scrollWidth ${scroll} > clientWidth ${client})`,
      );
    if (unexpected.length)
      throw new Error(`Unmocked request(s): ${unexpected.join(", ")}`);
    steps += 1;
  };
  const next = () =>
    p.getByRole("button", { name: "Next", exact: true }).click();
  const step = (title) =>
    p.getByRole("heading", { name: title, level: 1 }).waitFor();
  const toast = (text) =>
    p.getByRole("status").getByText(text, { exact: true }).first().waitFor();
  const now = () => p.locator(".now-card");
  const primary = () => now().locator(".today-primary");
  const openToday = async () => {
    await p.goto(`${base}#/today`);
    await p.getByRole("heading", { level: 1, name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/ }).waitFor();
  };
  const openIdeas = async () => {
    await p.goto(`${base}#/food/ideas`);
    await p
      .getByRole("radiogroup", { name: "Food moment" })
      .getByRole("radio", { name: "Now", checked: true })
      .waitFor();
  };
  const ideaCards = () => p.locator("article.idea-card");
  const importSheet = async () => {
    await p.getByRole("button", { name: "Import team calendar" }).click();
    const sheet = p.getByRole("dialog", { name: "Import team calendar" });
    await sheet.getByLabel("Calendar file (.ics)").setInputFiles(teamsnap);
    return sheet;
  };

  const journey = async () => {
    steps = 0;
    unexpected.length = 0;
    context = await browser.newContext({
      timezoneId: "America/Chicago",
      viewport: { width, height: width < 768 ? 844 : 900 },
    });
    await context.clock.setFixedTime(new Date("2026-10-13T13:00:00-05:00"));
    await context.route(
      (url) => url.host !== baseHost || url.pathname.startsWith("/api/"),
      mockApi,
    );
    p = await context.newPage();
    p.setDefaultTimeout(15000);
    p.on("pageerror", (e) => result.errors.push(`${width} px: ${e.message}`));

    // 1. Welcome.
    await p.goto(base);
    await p
      .getByRole("heading", { name: "Fuel for the day you actually have." })
      .waitFor();
    await done("Welcome");

    // 2. Setup: sport, school day, a practice, food at school, food needs.
    await p.getByRole("button", { name: "Get started" }).click();
    await step("What do you play?");
    await p.getByRole("textbox", { name: /First name/ }).fill("Jordan");
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await done("setup, sport");
    await next();
    await step("Your school day");
    await done("setup, school day");
    await next();
    await step("Practices and games");
    // A usual Thursday practice; today's session comes from the team calendar.
    await p
      .getByRole("group", { name: "Practice days" })
      .getByRole("button", { name: "Thursday" })
      .click();
    await done("setup, practice");
    await next();
    await step("Food at school");
    await done("setup, food at school");
    await next();
    await step("Food needs");
    await p
      .getByText("Allergy filtering coming soon.", { exact: true })
      .waitFor();
    for (const chip of ["Peanuts", "Tree nuts", "Milk", "Sesame"])
      if (await p.getByRole("button", { name: chip, exact: true }).count())
        throw new Error(`Allergy chip ${chip} shows in setup`);
    await done("setup, food needs");
    await next();
    await step("You're set");
    await done("setup, ready");
    await p.getByRole("button", { name: "Open Today" }).click();
    await p.getByRole("heading", { level: 1, name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/ }).waitFor();
    await done("Today after setup");
    result.checks.push(
      `${width} px: Welcome → setup (Soccer, school day, Thursday practice, food at school, food needs with "Allergy filtering coming soon." and no allergy chips) → Today.`,
    );

    // 3. Import the team calendar, then re-import it: nothing new.
    await p.goto(`${base}#/schedule`);
    await p.getByRole("heading", { level: 1, name: /^(January|February|March|April|May|June|July|August|September|October|November|December)$/ }).waitFor();
    let sheet = await importSheet();
    await sheet.getByText("20 upcoming events").waitFor();
    await done("import preview");
    await sheet.getByRole("button", { name: "Import 20 events" }).click();
    await toast("Added 20 events from Lightning U14 Girls.");
    await sheet.waitFor({ state: "detached" });
    await done("import done");
    sheet = await importSheet();
    // UX-FLOW-05: nothing new ends with Done, which closes the sheet.
    await sheet
      .getByText("Everything in this calendar is already in your schedule.")
      .waitFor();
    if (await sheet.getByRole("button", { name: /^Import \d/ }).count())
      throw new Error("A duplicate re-import still offers to add events");
    await done("duplicate re-import preview");
    await sheet.getByRole("button", { name: "Done", exact: true }).click();
    await sheet.waitFor({ state: "detached" });
    const today = p.getByRole("region", { name: /Tue, Oct 13/ });
    if ((await today.getByText(practice).count()) !== 1)
      throw new Error("Today's imported practice is missing or duplicated");
    await done("schedule after re-import");
    result.checks.push(
      `${width} px: the TeamSnap file imports 20 events; re-importing it flags 20 duplicates, offers nothing to add, and today keeps one practice.`,
    );

    // 4. Athlete preferences: allergy filtering stays off.
    await p.goto(`${base}#/you`);
    await p.getByRole("link", { name: /^Food needs & allergies/ }).click();
    const needs = p.getByRole("dialog", { name: "Food needs & allergies" });
    await needs
      .getByText("Allergy filtering coming soon.", { exact: true })
      .waitFor();
    const needButtons = await needs.getByRole("button").allInnerTexts();
    const allergyChip = needButtons.find((t) =>
      /Peanut|Tree nut|Milk|Sesame|Gluten-free|Dairy-free|Nut-free/i.test(t),
    );
    if (allergyChip) throw new Error(`Allergy chip shows: ${allergyChip}`);
    await done("food needs sheet");
    await needs.getByRole("button", { name: "Cancel" }).click();
    await needs.waitFor({ state: "hidden" });
    result.checks.push(
      `${width} px: You › Food needs & allergies shows "Allergy filtering coming soon." and no allergy chips.`,
    );

    // 5. Add food at home.
    await p.goto(`${base}#/food/home`);
    await p.getByRole("button", { name: "Add Bananas", exact: true }).click();
    await p
      .getByRole("radiogroup", { name: "Bananas stock" })
      .getByRole("radio", { name: "Have", checked: true })
      .waitFor();
    await done("At home with bananas");

    // 6. Today names the real session and time and suggests a snack that
    //    uses the bananas at home.
    await openToday();
    await now().getByText(`${practice} at 5:00 PM`).waitFor();
    const pick = now().locator(".today-pick");
    await pick.getByText(snack, { exact: true }).first().waitFor();
    await pick.getByText("Bananas at home").waitFor();
    await pick.getByText("Pretzels to buy").waitFor();
    await primary().getByText("Plan this", { exact: true }).waitFor();
    await done("Today suggestion");
    result.checks.push(
      `${width} px: Today names "${practice} at 5:00 PM" and suggests ${snack} (bananas at home, pretzels to buy).`,
    );

    // 7. Ideas ranks the same pick first, with the same availability.
    await openIdeas();
    await p.getByText(`${practice} at 5:00 PM`).first().waitFor();
    const top = await ideaCards().first().getByRole("heading").innerText();
    if (top !== snack)
      throw new Error(`Ideas ranks ${top} first; Today picks ${snack}`);
    const chips = await ideaCards()
      .first()
      .getByRole("list", { name: "Ingredients" })
      .getByRole("listitem")
      .allInnerTexts();
    if (
      !chips.some((c) => /^1 banana\s*, at home$/i.test(c)) ||
      !chips.some((c) => /^Buy: .*pretzels/i.test(c))
    )
      throw new Error(`Ideas availability disagrees: ${chips.join(" | ")}`);
    await done("Ideas before planning");

    // 8. Plan it on Today; Ideas shows the same plan.
    await openToday();
    await primary().click();
    await toast("Planned for 3:30 PM.");
    await now()
      .getByRole("heading", { name: `${snack} is planned` })
      .waitFor();
    await primary().getByText("Add 1 item to groceries").waitFor();
    // Planned at 1:00 PM, after school started at 8:00: the 7:30 AM prep time
    // had already passed, so nothing reads as missed.
    const packPrep = p.getByRole("region", { name: "Pack & prep" });
    await packPrep.getByText(`Pack ${snack}`).first().waitFor();
    if (await packPrep.getByText(/Was due/).count())
      throw new Error("A task planned after its due time shows as missed");
    await done("Today planned");
    await openIdeas();
    const planned = p.getByRole("region", { name: "Planned food" });
    await planned.getByText(snack).first().waitFor();
    await done("Ideas planned");
    result.checks.push(
      `${width} px: Ideas ranks ${snack} first with the same at-home and to-buy items; Plan this on Today shows the plan in Ideas › Planned food.`,
      `${width} px: planned at 1:00 PM, after school started, Pack & prep shows no "Was due" time.`,
    );

    // 9. The session moves: Today asks to update the snack time.
    await openToday();
    const rail = p.getByRole("region", { name: "Your day" });
    await rail
      .getByRole("button", { name: new RegExp(`^${practice}`) })
      .click();
    const edit = p.getByRole("dialog", { name: /^Edit / });
    await edit.getByLabel("Starts").fill("17:30");
    await edit.getByLabel("Ends").fill("19:00");
    await done("edit session sheet");
    await edit.getByRole("button", { name: "Save changes" }).click();
    await edit.waitFor({ state: "hidden" });
    const stale = now()
      .getByRole("status")
      .filter({ hasText: `${practice} moved to 5:30 PM.` });
    await stale.getByText("Update your snack time?").waitFor();
    await done("stale plan prompt");
    await stale.getByRole("button", { name: "Update" }).click();
    await toast("Snack time updated.");
    await stale.waitFor({ state: "detached" });
    await now().getByText(`${practice} at 5:30 PM`).waitFor();
    await done("stale plan updated");
    result.checks.push(
      `${width} px: moving the practice to 5:30 PM shows "${practice} moved to 5:30 PM. Update your snack time?"; Update clears it.`,
    );

    // 10. Add the missing item to groceries, shop, put away.
    await primary().click();
    await toast("Added pretzels to groceries.");
    await primary().getByText("Mark packed", { exact: true }).waitFor();
    await done("Today after adding to groceries");
    await p.goto(`${base}#/food/groceries`);
    const got = p
      .getByRole("region", { name: "For your plans" })
      .getByRole("checkbox", { name: /^Got .*pretzels/i });
    await got.click();
    await p.getByRole("button", { name: "Finish shopping (1)" }).click();
    const putAway = p.getByRole("dialog", { name: "Put these away?" });
    await putAway.waitFor();
    await done("put away sheet");
    await putAway.getByRole("button", { name: "Add to At home" }).click();
    await putAway.waitFor({ state: "hidden" });
    await toast("1 item added to At home.");
    await p.getByRole("heading", { name: "Your list is empty" }).waitFor();
    await done("groceries after shopping");
    await openToday();
    await primary().getByText("Mark packed", { exact: true }).waitFor();
    if (await now().getByText("to buy").count())
      throw new Error("Today still lists food to buy after shopping");
    result.checks.push(
      `${width} px: Today adds only the pretzels to groceries; checking them off, Finish shopping and Add to At home empty the list.`,
    );

    // 11. Mark packed, then log it once it is time to eat.
    await primary().click();
    await toast("Marked packed.");
    await primary().getByText("Eat around 4:00 PM", { exact: true }).waitFor();
    await done("Today packed");
    await openIdeas();
    await p
      .getByRole("region", { name: "Planned food" })
      .getByText(/Packed\.$/)
      .waitFor();
    await done("Ideas packed");
    await context.clock.setFixedTime(new Date("2026-10-13T16:00:00-05:00"));
    await openToday();
    await p.reload(); // the app reads the clock on load
    await now().getByText(`${practice} in 1 hr 30 min`).waitFor();
    await primary().getByText("Log it", { exact: true }).waitFor();
    await primary().click();
    await toast("Logged what you ate.");
    await done("Today logged");

    // 12. Log › Day shows it.
    await p.goto(`${base}#/food/log`);
    await p.getByRole("heading", { name: /Today/, level: 2 }).first().waitFor();
    await p
      .locator("li.log-entry")
      .filter({ has: p.getByRole("heading", { name: snack }) })
      .waitFor();
    await done("Log day");
    result.checks.push(
      `${width} px: Mark packed → "Eat around 4:00 PM"; at 4:00 PM Log it, and Food › Log › Day lists ${snack}.`,
    );

    // 13. No suitable food: next school day at noon, food only from the
    //     home kitchen and no cafeteria at school.
    await p.goto(`${base}#/you/access`);
    const access = p.getByRole("dialog", { name: "Food access & budget" });
    const pressed = async (group, name, on) => {
      const chip = access
        .getByRole("group", { name: group })
        .getByRole("button", { name, exact: true });
      if (((await chip.getAttribute("aria-pressed")) === "true") !== on)
        await chip.click();
    };
    await pressed(/Where you can get food/, "Home kitchen", true);
    for (const name of ["Packed from home", "School cafeteria", "Nearby store"])
      await pressed(/Where you can get food/, name, false);
    await pressed(/^At school/, "Cafeteria", false);
    await done("access sheet");
    await access.getByRole("button", { name: "Save", exact: true }).click();
    await access.waitFor({ state: "hidden" });
    // The eaten plan is history: new food needs do not ask to check it.
    await openIdeas();
    await p
      .getByRole("region", { name: "Planned food" })
      .getByText(/Eaten\.$/)
      .waitFor();
    if (await p.getByText(/Your food needs changed/).count())
      throw new Error("An eaten plan asks to check changed food needs");
    await done("Ideas eaten plan after new food needs");
    // Thursday 1:00 PM, in school, with a 4:00 PM practice.
    await context.clock.setFixedTime(new Date("2026-10-15T13:00:00-05:00"));
    await openIdeas();
    await p.reload();
    await p
      .getByRole("heading", {
        name: "Nothing is available at school right now",
      })
      .waitFor();
    if (await ideaCards().count())
      throw new Error("Ideas shows cards with no suitable food");
    await done("Ideas with no suitable food");
    await openToday();
    await now().getByText("Soccer practice in 3 hr").waitFor();
    await now()
      .getByText(
        "Nothing is available at school right now. Pack a snack next time.",
        { exact: true },
      )
      .waitFor();
    if (await now().locator(".today-pick").count())
      throw new Error("Today shows a pick while Ideas has none");
    await done("Today with no suitable food");
    await primary().getByText("Ideas for tomorrow", { exact: true }).click();
    await p.waitForURL(/#\/food\/ideas\?moment=tomorrow$/);
    await p
      .getByRole("radiogroup", { name: "Food moment" })
      .getByRole("radio", { name: "Tomorrow", checked: true })
      .waitFor();
    await ideaCards().first().waitFor();
    await done("Ideas for tomorrow");
    result.checks.push(
      `${width} px: after changing food access, the eaten plan in Ideas › Planned food shows no "Your food needs changed".`,
      `${width} px: at school with no cafeteria and nothing packed, Ideas shows "Nothing is available at school right now", Today says the same with no pick, and its button opens Ideas for tomorrow.`,
      `${width} px: ${steps} steps, none scrolls sideways; no request left this host.`,
    );
    await context.close();
    context = null;
  };

  try {
    for (width of [390, 1440]) await journey();
    return result;
  } catch (e) {
    return {
      ...result,
      failure: `${width} px: ${e.message}`,
      last: p
        ? await p
            .locator("body")
            .innerText()
            .catch(() => "")
        : "",
    };
  } finally {
    await context?.close();
  }
};
