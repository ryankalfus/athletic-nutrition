// U4-03 (UX-CMP-09): time and date entry go through TimeField and DateField,
// so no native time or date input is left in src/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(path.join(dir, entry.name))
      : /\.jsx?$/.test(entry.name)
        ? [path.join(dir, entry.name)]
        : [],
  );

test("UX-CMP-09: no native time or date input in src/", () => {
  const found = files("src").filter((file) =>
    /type=["'{]*(time|date)\b/.test(readFileSync(file, "utf8")),
  );
  assert.deepEqual(found, []);
});
