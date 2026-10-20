// node run.mjs <desktop|phone|both> [area ...]
// Areas run in journey order; each has its own number block so any area can
// be re-run alone. Existing files are skipped (restart-safe).
import { launch, capturer } from "./lib.mjs";

const AREAS = [
  ["onboarding", 0],
  ["today", 100],
  ["schedule", 200],
  ["food", 300],
  ["you", 500],
  ["global", 600],
  ["sizes", 700],
];
const [which = "both", ...pick] = process.argv.slice(2);
const passes = which === "both" ? ["desktop", "phone"] : [which];
const browser = await launch();
let failed = 0;
for (const pass of passes) {
  for (const [area, start] of AREAS) {
    if (pick.length && !pick.includes(area)) continue;
    const mod = await import(`./areas/${area}.mjs`);
    const cap = capturer(pass, start);
    try {
      await mod.default({ browser, pass, cap });
    } catch (e) {
      failed++;
      console.log(`!! ${pass} ${area} failed at #${cap.n}: ${e.message.split("\n")[0]}`);
    }
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
