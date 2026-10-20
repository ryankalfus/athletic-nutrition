// Writes INDEX.txt from CAPTURES.txt, FAILURES.txt and the list of states not reached.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { HERE, OUT, CAPTURES } from "./lib.mjs";

const lines = readFileSync(CAPTURES, "utf8").split("\n").filter(Boolean).map((l) => l.split(" | "));
const out = [];
out.push("Nourally UX review captures — index");
out.push(`Generated ${new Date().toISOString()} from CAPTURES.txt (one line per PNG).`);
out.push("Clock fixed per scenario (week of Mon Oct 12 – Sun Oct 18 2026); /api/* mocked from tests/fixtures.");
out.push("Numbers are in journey order; each area has its own block (0 onboarding, 100 Today, 200 Schedule,");
out.push("300 Food: 300 Ideas / 330 At home / 350 Groceries / 380 Log / 400 Search / 420 Scanner, 500 You, 600 Global, 700 second size),");
out.push("so gaps between numbers are expected. -full = full page, -fold = viewport only.");
out.push("");
for (const pass of ["desktop", "phone"]) {
  const rows = lines.filter((l) => l[0] === pass);
  const files = existsSync(path.join(OUT, pass)) ? readdirSync(path.join(OUT, pass)).filter((f) => f.endsWith(".png")).length : 0;
  const screens = new Set(rows.map((l) => l[1])).size;
  out.push(`== ${pass}: ${rows.length} captures listed, ${files} PNG files, ${screens} distinct states`);
  const widths = {};
  for (const l of rows) widths[l[4]] = (widths[l[4]] || 0) + 1;
  out.push(`   by width: ${Object.entries(widths).map(([w, c]) => `${w}px ${c}`).join(", ")}`);
  const areas = {};
  for (const l of rows) {
    areas[l[2]] ??= { files: 0, states: new Set() };
    areas[l[2]].files++;
    areas[l[2]].states.add(l[1]);
  }
  for (const [a, v] of Object.entries(areas))
    out.push(`   ${a.padEnd(10)} ${String(v.states.size).padStart(3)} states  ${String(v.files).padStart(3)} files`);
  out.push("");
}
out.push("== Scenario steps that stopped early (see FAILURES.txt)");
out.push(existsSync(path.join(OUT, "FAILURES.txt")) ? readFileSync(path.join(OUT, "FAILURES.txt"), "utf8").trim() || "none" : "none");
out.push("");
out.push("== States not captured, and why");
out.push(readFileSync(path.join(HERE, "not-captured.txt"), "utf8").trim());
writeFileSync(path.join(OUT, "INDEX.txt"), out.join("\n") + "\n");
console.log(out.join("\n"));
