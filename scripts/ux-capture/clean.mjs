// node clean.mjs <pass> <from> [to]  — removes captures numbered from..to
// (files and their CAPTURES.txt lines) so they are retaken on the next run.
import { readdirSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { HERE, OUT, CAPTURES } from "./lib.mjs";
const [pass, from, to = from] = process.argv.slice(2);
const inRange = (num) => Number(num) >= Number(from) && Number(num) <= Number(to);
const dir = path.join(OUT, pass);
let files = 0;
for (const f of readdirSync(dir)) {
  if (inRange(f.slice(0, 3))) {
    rmSync(path.join(dir, f));
    files++;
  }
}
if (existsSync(CAPTURES)) {
  const lines = readFileSync(CAPTURES, "utf8").split("\n").filter(Boolean);
  const keep = lines.filter((l) => {
    const [p, num] = l.split(" | ");
    return !(p === pass && inRange(num));
  });
  writeFileSync(CAPTURES, keep.map((l) => l + "\n").join(""));
}
console.log(`removed ${files} files`);
