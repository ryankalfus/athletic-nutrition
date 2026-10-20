// Capture helpers for the UX review. Scripts and seeds live here; screenshots
// and logs are written to output/ux-review/ (gitignored).
import { chromium } from "playwright";
import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "..", "..");
export const OUT = path.join(ROOT, "output", "ux-review");
mkdirSync(OUT, { recursive: true });
export const BASE = (process.env.BASE_URL || "http://127.0.0.1:5271/").replace(
  /\/?$/,
  "/",
);
export const CAPTURES = path.join(OUT, "CAPTURES.txt");
const { SEARCH_FIXTURES } = await import(
  pathToFileURL(path.join(ROOT, "tests/fixtures/food-search.js")).href
);
export { SEARCH_FIXTURES };
export const fixture = (name) =>
  readFileSync(path.join(ROOT, "tests/fixtures", name), "utf8");
export const fixturePath = (name) => path.join(ROOT, "tests/fixtures", name);

export const PASSES = {
  desktop: {
    viewport: { width: 1440, height: 900 },
    extra: { viewport: { width: 1024, height: 768 } },
  },
  phone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    extra: {
      viewport: { width: 320, height: 700 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    },
  },
};

export async function launch() {
  return chromium.launch({ headless: true });
}

// API state the scenarios can flip.
export const api = { searchMode: "ok", status: "local-snapshot" };

export async function mockApi(context) {
  const json = (route, body, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!/^(127\.0\.0\.1|localhost)$/.test(url.hostname)) return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.fallback();
    const p = url.pathname;
    if (p === "/api/foods/status") return json(route, { mode: api.status });
    if (p === "/api/foods/search") {
      if (api.searchMode === "error")
        return json(route, { error: "Food provider unavailable or product not found." }, 502);
      if (api.searchMode === "fail") return route.abort("failed");
      const q = (url.searchParams.get("q") || "").toLowerCase().trim();
      const foods = SEARCH_FIXTURES[q] || [];
      return json(route, {
        foods,
        totalHits: foods.length,
        hasMore: false,
        mode: api.status,
      });
    }
    if (p.startsWith("/api/barcode/")) {
      const code = p.split("/").pop();
      if (code === "00000000") return json(route, { error: "not_found" }, 404);
      return json(route, {
        product: {
          product_name: "Chewy Granola Bar, Oats & Honey",
          brands: "Trail Snacks Co.",
          serving_size: "1 bar (24 g)",
          nutriments: {
            "energy-kcal_100g": 420,
            carbohydrates_100g: 70,
            proteins_100g: 7,
            fat_100g: 13,
          },
          allergens_tags: ["en:gluten", "en:milk"],
          traces_tags: ["en:peanuts"],
        },
      });
    }
    if (p.startsWith("/api/foods/"))
      return json(route, { error: "not_found" }, 404);
    if (p === "/api/calendar")
      return json(route, { ics: fixture("gamechanger-tigers-14u.ics") });
    return json(route, { error: "not mocked" }, 404);
  });
}

export async function newPage(browser, pass, { extra = false, clock } = {}) {
  const cfg = extra ? PASSES[pass].extra : PASSES[pass];
  // eslint-disable-next-line no-unused-vars
  const { extra: _x, ...opts } = cfg;
  const context = await browser.newContext({
    ...opts,
    locale: "en-US",
  });
  await mockApi(context);
  if (clock) await context.clock.setFixedTime(clock);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));
  return { context, page };
}

// Write a whole app document into IndexedDB (from a same-origin static page
// so the app is not running), then open a route.
export async function seed(page, doc, route = "today") {
  await page.goto(`${BASE}tests/fixtures/import-profile.json`);
  await page.evaluate(async (doc) => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open("nourally-v2", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("documents");
      req.onsuccess = () => {
        const tx = req.result.transaction("documents", "readwrite");
        tx.objectStore("documents").put(doc, "app");
        tx.oncomplete = () => {
          req.result.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
    sessionStorage.setItem("nourally-profile-id", doc.defaultProfileId);
  }, doc);
  await go(page, route);
}

export async function go(page, route) {
  await page.goto(`${BASE}#/${route}`);
  await settle(page);
}

export async function dump(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open("nourally-v2", 1);
        req.onsuccess = () => {
          const get = req.result
            .transaction("documents")
            .objectStore("documents")
            .get("app");
          get.onsuccess = () => {
            resolve(get.result);
            req.result.close();
          };
          get.onerror = () => reject(get.error);
        };
      }),
  );
}

export async function settle(page, ms = 450) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(ms);
}

// Auto-generated factual context appended to each note.
async function describe(page) {
  return page.evaluate(() => {
    const t = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
    const parts = [];
    parts.push(`route ${location.hash || "#/"}`);
    const h1 = t(document.querySelector("h1"));
    if (h1) parts.push(`h1 "${h1.slice(0, 50)}"`);
    const dlgs = [
      ...document.querySelectorAll(
        "dialog[open], [role=dialog], [role=alertdialog]",
      ),
    ].filter((d) => d.getClientRects().length);
    const dlg = dlgs.pop();
    if (dlg) {
      const name =
        dlg.getAttribute("aria-label") ||
        t(document.getElementById(dlg.getAttribute("aria-labelledby") || "")) ||
        t(dlg.querySelector("h1,h2,h3"));
      parts.push(`dialog "${(name || "").slice(0, 50)}"`);
    }
    const toast = [...document.querySelectorAll("[class*=toast]")]
      .map(t)
      .filter(Boolean)[0];
    if (toast) parts.push(`toast "${toast.slice(0, 60)}"`);
    return parts.join("; ");
  });
}

export function capturer(pass, start = 0) {
  let n = start;
  const dir = path.join(OUT, pass);
  mkdirSync(dir, { recursive: true });
  const record = (line) => appendFileSync(CAPTURES, line + "\n");
  return {
    get n() {
      return n;
    },
    set n(v) {
      n = v;
    },
    pass,
    dir,
    // kind: "both" | "full" | "fold"
    async shot(page, area, state, note, { kind = "both", wait = 350 } = {}) {
      n += 1;
      const num = String(n).padStart(3, "0");
      const width = page.viewportSize().width;
      const kinds = kind === "both" ? ["full", "fold"] : [kind];
      const todo = kinds.filter(
        (k) => !existsSync(path.join(dir, `${num}-${area}-${state}-${k}.png`)),
      );
      if (!todo.length) return;
      await page.waitForTimeout(wait);
      const auto = await describe(page).catch(() => "");
      for (const k of todo) {
        const file = `${num}-${area}-${state}-${k}.png`;
        await page.screenshot({
          path: path.join(dir, file),
          fullPage: k === "full",
          caret: "hide",
        });
        record(
          `${pass} | ${num} | ${area} | ${state} | ${width} | ${k} | ${note}${auto ? ` [${auto}]` : ""} | ${file}`,
        );
      }
      console.log(`${pass} ${num} ${area} ${state}`);
    },
  };
}

export const D = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min, 0);

// Runs one scenario at a fixed number block; a failure is logged and the
// area continues with the next scenario.
export async function scenario(cap, start, label, fn) {
  cap.n = start;
  const opened = [];
  try {
    await fn(opened);
  } catch (e) {
    const msg = `${cap.pass} | ${label} | stopped after #${cap.n} | ${e.message.split("\n")[0]}`;
    console.log("!! " + msg);
    appendFileSync(path.join(OUT, "FAILURES.txt"), msg + "\n");
  } finally {
    for (const c of opened) await c.close().catch(() => {});
  }
}

// Dismiss every toast (so it does not sit over later screenshots).
export async function clearToasts(page) {
  for (const b of await page.locator(".app-toast .toast-dismiss").all())
    await b.click().catch(() => {});
  await page.waitForTimeout(200);
}

// Close open dialogs with Escape, discarding unsaved changes if asked.
export async function closeAll(page) {
  for (let i = 0; i < 5; i++) {
    const discard = page.getByRole("dialog", { name: "Discard changes?" }).or(page.getByRole("alertdialog", { name: "Discard changes?" }));
    if (await discard.count()) {
      await discard.getByRole("button", { name: "Discard", exact: true }).click();
      await page.waitForTimeout(300);
      continue;
    }
    const open = await page.locator("dialog[open], [role=dialog], [role=alertdialog]").filter({ visible: true }).count();
    if (!open) return;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);
  }
}
