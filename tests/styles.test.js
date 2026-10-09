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
