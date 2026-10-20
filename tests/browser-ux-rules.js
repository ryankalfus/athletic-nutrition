// Playwright snippet: the UX rules check (UX-REDESIGN-PLAN.md 11.1, UX-TEST-03).
// Visits Welcome and every route at 390 × 844 and 1440 × 900 (R10 also at
// 320 × 740) with the standard fixture athlete (Maya, from
// scripts/ux-capture/seeds/lived.json; clock Tue 2026-10-13 1:30 PM) and
// counts violations of rules R1–R13 on each route. A route listed in STRICT
// ("390 today") fails the run on any violation; every other route only prints
// its counts (report mode). U1-06 adds the check with STRICT empty to record
// the baseline; each screen phase adds its routes and U8-06 makes every route
// strict. "–" means the rule does not apply there (R6, R7, R9 phone only; R12
// Food routes at 390 only).
//
// Notes on how the rules are measured (the plan's wording is in 11.1):
// - R2 counts an element as a pill only when its rounded shape is visible (a
//   background or a border), so an unstyled rounded span is not a pill.
// - R5 counts [data-kind=primary], [data-kind=hero] and, until U4 moves the
//   buttons to data-kind, .primary.
// - R6 is U3-01 (a) and (b); (c) needs media emulation and runs in
//   browser-ux-nav.js. R7 is U3-01 (d) without axe (browser-a11y.js runs axe).
// - R8 adds the visible area of outermost pitch-filled elements (fill or
//   gradient) at scroll 0; it counts 1 when that is over 60 % of the window.
// - R11's allowlist is UX-DS-10: the hero instruction, clock times,
//   durations, counts and amounts.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const STRICT = [];
  const ROUTES = [
    "welcome",
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
  ];
  // UX-DS-11: the only routes that may show one hero.
  const HERO_ROUTES = [
    "welcome",
    "today",
    "food/ideas",
    "food/groceries",
    "food/log",
  ];
  // UX-DS-10: where the scoreboard face (Barlow Semi Condensed) may appear.
  const NUMERAL_ALLOW = [
    "[data-surface=hero]",
    ".numeral",
    ".badge",
    ".tab-badge",
    ".today-countdown",
    ".day-rail time",
    ".rail-list time",
    ".schedule-week-time",
    ".stock-amount > span",
  ];
  const RULES = Array.from({ length: 13 }, (_, i) => `R${i + 1}`);
  const browser = page.context().browser();
  const result = { checks: [], warnings: [], errors: [] };
  const totals = {};
  const strictFailures = [];
  const seedDoc = await (
    await page
      .context()
      .request.get(`${base}scripts/ux-capture/seeds/lived.json`)
  ).json();

  const open = async (width, height) => {
    const context = await browser.newContext({
      viewport: { width, height },
      locale: "en-US",
    });
    await context.clock.setFixedTime(new Date(2026, 9, 13, 13, 30, 0));
    await context.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/foods/status")
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ mode: "local-snapshot" }),
        });
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: "{}",
      });
    });
    const p = await context.newPage();
    p.setDefaultTimeout(15000);
    p.on("pageerror", (e) => result.errors.push(`${width}: ${e.message}`));
    return { context, p };
  };
  const settle = async (p) => {
    await p.waitForLoadState("domcontentloaded");
    await p.evaluate(() => document.fonts?.ready).catch(() => {});
    await p.waitForTimeout(450);
  };
  const seed = async (p) => {
    await p.goto(`${base}tests/fixtures/import-profile.json`);
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
    }, seedDoc);
  };

  // Every rule, measured in the page. Returns a count per rule (null where
  // the rule does not apply) and a few measured values for the report.
  const measure = (p, options) =>
    p.evaluate((o) => {
      const main = document.querySelector("main");
      const dialogs = [...document.querySelectorAll("dialog[open]")];
      const visible = (el) => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return (
          box.width > 0 &&
          box.height > 0 &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0
        );
      };
      const inside = (root) =>
        root ? [...root.querySelectorAll("*")].filter(visible) : [];
      const inMain = inside(main);
      const scoped = [...inMain, ...dialogs.flatMap(inside)];
      const clear = (color) =>
        color === "transparent" || /rgba\(.*,\s*0\)$/.test(color);
      const rgb = (color) => {
        const m = color.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const [r, g, b, a = 1] = m[1]
          .split(/[,\s/]+/)
          .filter(Boolean)
          .map(Number);
        return { r, g, b, a };
      };
      const hex = (value) => {
        const probe = document.createElement("span");
        probe.style.color = value;
        document.body.append(probe);
        const color = rgb(getComputedStyle(probe).color);
        probe.remove();
        return color;
      };
      const token = (name) =>
        getComputedStyle(document.documentElement)
          .getPropertyValue(name)
          .trim();
      const ownText = (el) =>
        [...el.childNodes].some(
          (node) => node.nodeType === 3 && node.textContent.trim(),
        );
      const counts = {};
      const values = {};

      // R1 flat content: no shadows in main outside the hero.
      counts.R1 = inMain.filter(
        (el) =>
          !el.closest("[data-surface=hero]") &&
          getComputedStyle(el).boxShadow !== "none",
      ).length;

      // R2 no pills for little text.
      counts.R2 = inMain.filter((el) => {
        if (el.matches("[role=switch], .avatar, .avatar *")) return false;
        if (!el.innerText?.trim()) return false;
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const radius = parseFloat(style.borderTopLeftRadius) || 0;
        const surface =
          !clear(style.backgroundColor) ||
          (parseFloat(style.borderTopWidth) > 0 &&
            !clear(style.borderTopColor));
        return (
          box.height < 40 && radius > 0 && radius >= box.height / 2 && surface
        );
      }).length;

      // R3 text: no " · ", no spaced dash between words, no uppercase.
      const text = main?.innerText || "";
      counts.R3 =
        (text.match(/ · /g) || []).length +
        (text.match(/\w\s[–—]\s\w/g) || []).length +
        inMain.filter(
          (el) => getComputedStyle(el).textTransform === "uppercase",
        ).length;

      // R4 hero: at most one, only on the allowed routes.
      const heroes = document.querySelectorAll("[data-surface=hero]").length;
      counts.R4 = heroes > (o.heroAllowed ? 1 : 0) ? heroes : 0;

      // R5 one primary in main and in each open dialog.
      const primaries = (root) =>
        root
          ? [
              ...root.querySelectorAll(
                "[data-kind=primary], [data-kind=hero], .primary",
              ),
            ].filter(
              (el) =>
                visible(el) &&
                (root.matches("dialog") || !el.closest("dialog")),
            ).length
          : 0;
      counts.R5 = [main, ...dialogs].reduce(
        (n, root) => n + Math.max(0, primaries(root) - 1),
        0,
      );

      // R6 and R7: the phone tab bar (U3-01 a, b, d).
      const nav = document.querySelector(".frame-nav");
      const navShown = o.phone && nav && visible(nav);
      if (navShown) {
        const box = nav.getBoundingClientRect();
        const style = getComputedStyle(nav);
        const bg = rgb(style.backgroundColor) || {
          r: 255,
          g: 255,
          b: 255,
          a: 0,
        };
        const blur = `${style.backdropFilter} ${style.webkitBackdropFilter || ""}`;
        counts.R6 = [
          box.left >= 12,
          innerWidth - box.right >= 12,
          innerHeight - box.bottom >= 12,
          Math.round(box.height) === 64,
          style.borderTopLeftRadius === "24px",
          box.width <= 440,
          blur.includes("blur(20px)"),
          Math.abs(bg.a - 0.82) < 0.01,
        ].filter((ok) => !ok).length;
        const over = (under) => ({
          r: bg.r * bg.a + under.r * (1 - bg.a),
          g: bg.g * bg.a + under.g * (1 - bg.a),
          b: bg.b * bg.a + under.b * (1 - bg.a),
        });
        const lum = ({ r, g, b }) => {
          const c = [r, g, b].map((v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
        };
        const ratio = (a, b) => {
          const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
          return (hi + 0.05) / (lo + 0.05);
        };
        const grounds = [
          hex(token("--color-pitch")),
          hex(token("--color-paper")),
        ]
          .filter(Boolean)
          .map(over);
        const items = [...nav.querySelectorAll("a, button")].filter(visible);
        const active = items.filter(
          (el) => el.getAttribute("aria-current") === "page",
        );
        counts.R7 =
          (active.length === 1 ? 0 : 1) +
          items
            .filter((el) => !el.getAttribute("aria-current"))
            .filter((el) => {
              const ink = rgb(getComputedStyle(el).color);
              return grounds.some((ground) => ratio(ink, ground) < 4.5);
            }).length;
      } else {
        counts.R6 = null;
        counts.R7 = null;
      }

      // R8 pitch budget at scroll 0.
      const pitch = hex(token("--color-pitch"));
      const pitchText = pitch ? `rgb(${pitch.r}, ${pitch.g}, ${pitch.b})` : "";
      const pitchy = (el) => {
        const style = getComputedStyle(el);
        return (
          style.backgroundColor === pitchText ||
          (pitchText && style.backgroundImage.includes(pitchText))
        );
      };
      const ancestors = (el) => {
        const list = [];
        for (
          let n = el.parentElement;
          n && n !== document.body;
          n = n.parentElement
        )
          list.push(n);
        return list;
      };
      // Outermost pitch elements only, so nested fills are not added twice.
      const filled = [...document.body.querySelectorAll("*")].filter(
        (el) => visible(el) && pitchy(el) && !ancestors(el).some(pitchy),
      );
      const area = filled.reduce((sum, el) => {
        const box = el.getBoundingClientRect();
        const w = Math.max(
          0,
          Math.min(box.right, innerWidth) - Math.max(box.left, 0),
        );
        const h = Math.max(
          0,
          Math.min(box.bottom, innerHeight) - Math.max(box.top, 0),
        );
        return sum + w * h;
      }, 0);
      values.pitch = Math.round((area / (innerWidth * innerHeight)) * 100);
      counts.R8 = values.pitch > 60 ? 1 : 0;

      // R10 no sideways scroll.
      counts.R10 = document.scrollingElement.scrollWidth > innerWidth ? 1 : 0;

      // R11 scoreboard voice only where UX-DS-10 allows it.
      counts.R11 = scoped.filter(
        (el) =>
          ownText(el) &&
          /^["']?Barlow/.test(getComputedStyle(el).fontFamily) &&
          !el.closest(o.allow.join(", ")),
      ).length;

      // R12 Food chrome: the first item starts at y ≤ 260 (390 only).
      if (o.food) {
        const first = inMain.find(
          (el) =>
            el.matches("li, article, [data-surface=hero]") &&
            !el.closest(
              ".food-sections-bar, nav, [role=tablist], [role=radiogroup], .segmented, .day-switcher, .week-strip",
            ),
        );
        values.firstItem = first
          ? Math.round(first.getBoundingClientRect().top + scrollY)
          : null;
        counts.R12 = values.firstItem != null && values.firstItem > 260 ? 1 : 0;
      } else counts.R12 = null;

      // R13 no outlined buttons (1 px border on a clear or white fill).
      counts.R13 = scoped.filter((el) => {
        if (!el.matches("button")) return false;
        const style = getComputedStyle(el);
        const sides = ["Top", "Right", "Bottom", "Left"];
        const outlined = sides.every(
          (side) =>
            Math.round(parseFloat(style[`border${side}Width`])) === 1 &&
            !clear(style[`border${side}Color`]),
        );
        return (
          outlined &&
          (clear(style.backgroundColor) ||
            style.backgroundColor === "rgb(255, 255, 255)")
        );
      }).length;

      // R9 clearance: scrolled to the end, main ends 8 px above the bar.
      if (navShown) {
        document.scrollingElement.scrollTo(
          0,
          document.scrollingElement.scrollHeight,
        );
        const last = [...(main?.children || [])].filter(visible).at(-1);
        const top = nav.getBoundingClientRect().top;
        values.clearance = last
          ? Math.round(top - last.getBoundingClientRect().bottom)
          : null;
        counts.R9 = values.clearance != null && values.clearance < 8 ? 1 : 0;
        document.scrollingElement.scrollTo(0, 0);
      } else counts.R9 = null;
      return { counts, values };
    }, options);

  const report = async (p, width, route) => {
    const { counts, values } = await measure(p, {
      phone: width < 768,
      food: width < 768 && route.startsWith("food/"),
      heroAllowed: HERO_ROUTES.includes(route),
      allow: NUMERAL_ALLOW,
    });
    // R10 again at 320 × 740 on the phone pass.
    if (width === 390) {
      await p.setViewportSize({ width: 320, height: 740 });
      await p.waitForTimeout(150);
      const narrow = await p.evaluate(
        () => document.scrollingElement.scrollWidth > innerWidth,
      );
      counts.R10 += narrow ? 1 : 0;
      await p.setViewportSize({ width: 390, height: 844 });
      await p.waitForTimeout(100);
    }
    const line = RULES.map((rule) => `${rule} ${counts[rule] ?? "–"}`).join(
      ", ",
    );
    const extra = [
      `pitch ${values.pitch}%`,
      values.clearance != null ? `clearance ${values.clearance}px` : "",
      values.firstItem != null ? `first item at ${values.firstItem}px` : "",
    ]
      .filter(Boolean)
      .join(", ");
    const key = `${width} ${route}`;
    const strict = STRICT.includes(key);
    result.checks.push(`${strict ? "STRICT " : ""}${key}: ${line} (${extra})`);
    for (const rule of RULES) {
      totals[width] ??= {};
      totals[width][rule] = (totals[width][rule] || 0) + (counts[rule] || 0);
    }
    const sum = RULES.reduce((n, rule) => n + (counts[rule] || 0), 0);
    if (strict && sum) strictFailures.push(`${key} (${line})`);
  };

  let context;
  try {
    for (const [width, height] of [
      [390, 844],
      [1440, 900],
    ]) {
      // Welcome on a first visit, then the fixture athlete on every route.
      const first = await open(width, height);
      context = first.context;
      await first.p.goto(base);
      await first.p.getByRole("button", { name: "Get started" }).waitFor();
      await settle(first.p);
      await report(first.p, width, "welcome");
      await context.close();
      const opened = await open(width, height);
      context = opened.context;
      const p = opened.p;
      await seed(p);
      for (const route of ROUTES.filter((r) => r !== "welcome")) {
        await p.goto(`${base}#/${route}`);
        await p.locator("main").first().waitFor();
        await settle(p);
        await report(p, width, route);
      }
      await context.close();
      context = null;
    }
    for (const [width, rules] of Object.entries(totals))
      result.checks.push(
        `Total at ${width}: ${RULES.map((rule) => `${rule} ${rules[rule]}`).join(", ")}`,
      );
    result.checks.push(
      `Report mode: ${STRICT.length} strict routes (${STRICT.join(", ") || "none yet"}); counts are the U1-06 baseline.`,
    );
    if (strictFailures.length)
      result.failure = `Strict routes break the UX rules: ${strictFailures.join("; ")}`;
    return result;
  } catch (e) {
    return { ...result, failure: e.message };
  } finally {
    await context?.close();
  }
};
