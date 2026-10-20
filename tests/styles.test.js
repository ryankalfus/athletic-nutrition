import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const stylesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "styles",
);

// RWD-01: viewport queries are mobile-first min-width queries on the audit's
// scale (480, 768, 1024, 1200 px). 1280 px is the Ideas grid's third column
// (9.2). No max-width queries and no off-scale steps such as 360 px.
test("RWD-01: media queries use only the 480/768/1024/1200 px breakpoints", () => {
  const allowed = new Set([480, 768, 1024, 1200, 1280]);
  const found = [];
  for (const file of readdirSync(stylesDir).filter((f) => f.endsWith(".css"))) {
    const css = readFileSync(path.join(stylesDir, file), "utf8");
    for (const match of css.matchAll(/@media\s+([^{]+)\{/g)) {
      const query = match[1].trim();
      assert.doesNotMatch(query, /max-width/, `${file}: ${query}`);
      for (const width of query.matchAll(/min-width:\s*(\d+)px/g)) {
        found.push(Number(width[1]));
        assert.ok(
          allowed.has(Number(width[1])),
          `${file}: off-scale breakpoint ${query}`,
        );
      }
    }
  }
  assert.ok(found.includes(480) && found.includes(768) && found.includes(1024));
});

// U1-02 (UX-BUG-04, UX-NAV-07): iPhones report safe-area insets only with
// viewport-fit=cover. Every sticky or fixed element pinned to the top of the
// window pads its content below the status bar, and every sticky element that
// sits under the top bar moves down by the same inset. A dialog's own header
// is sticky inside the sheet, which never reaches the top (max 92dvh).
test("U1-02: viewport-fit=cover and safe-area top padding on top bars", () => {
  const html = readFileSync(
    path.join(stylesDir, "..", "..", "index.html"),
    "utf8",
  );
  const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/);
  assert.ok(viewport, "index.html has no viewport meta");
  assert.match(viewport[1], /(^|,\s*)viewport-fit=cover(\s*,|$)/);
  const insideSheet = /^\.app-dialog\b/;
  const pinned = [];
  for (const file of readdirSync(stylesDir).filter((f) => f.endsWith(".css"))) {
    const css = readFileSync(path.join(stylesDir, file), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    for (const [, rawSelector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = rawSelector.trim().replace(/\s+/g, " ");
      if (!/position:\s*(sticky|fixed)/.test(body)) continue;
      const top = body.match(/(?:^|;)\s*top:\s*([^;]+)/)?.[1].trim();
      const inset = body.match(/(?:^|;)\s*inset:\s*([^;]+)/)?.[1].trim();
      const atTop = top === "0" || (inset && inset.split(/\s+/)[0] === "0");
      if (atTop && !insideSheet.test(selector)) {
        pinned.push(selector);
        assert.match(
          body.match(/padding-top:\s*([^;]+)/)?.[1] || "",
          /env\(safe-area-inset-top\)/,
          `${file}: ${selector} is pinned to the top without safe-area padding`,
        );
      }
      if (top && /--top-bar/.test(top))
        assert.match(
          top,
          /env\(safe-area-inset-top\)/,
          `${file}: ${selector} sticks under the top bar but ignores its safe-area inset`,
        );
    }
  }
  assert.ok(pinned.includes(".frame-header"), "the top bar was not checked");
});
