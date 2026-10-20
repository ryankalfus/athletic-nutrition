// npm run ux:capture -- <desktop|phone|both> [area ...]
// (or node scripts/ux-capture/run.mjs <desktop|phone|both> [area ...])
// Areas run in journey order; each has its own number block so any area can
// be re-run alone. Existing files are skipped (restart-safe; clean.mjs removes
// a range to retake it). Screenshots, CAPTURES.txt and INDEX.txt go to
// output/ux-review/ (git-ignored). Uses the server at BASE_URL, or starts Vite
// on the BASE port (5271) and stops it at the end.
import { spawn } from "node:child_process";
import path from "node:path";
import { BASE, ROOT, launch, capturer } from "./lib.mjs";

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
if (!["desktop", "phone", "both"].includes(which)) {
  console.error("Usage: npm run ux:capture -- <desktop|phone|both> [area ...]");
  process.exit(2);
}
const unknown = pick.filter((area) => !AREAS.some(([name]) => name === area));
if (unknown.length) {
  console.error(
    `Unknown area: ${unknown.join(", ")}. Areas: ${AREAS.map(([a]) => a).join(", ")}.`,
  );
  process.exit(2);
}
const passes = which === "both" ? ["desktop", "phone"] : [which];

const reachable = async () => {
  try {
    return (await fetch(BASE, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
};
let server;
const stopServer = () => {
  if (!server || server.exitCode !== null) return;
  if (process.platform === "win32")
    spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  else server.kill("SIGTERM");
};
if (!(await reachable())) {
  const { hostname, port } = new URL(BASE);
  console.log(`Starting Vite on ${BASE}...`);
  server = spawn(
    process.execPath,
    [
      path.join(ROOT, "node_modules", "vite", "bin", "vite.js"),
      "--port",
      port,
      "--strictPort",
      "--host",
      hostname,
    ],
    { cwd: ROOT, stdio: "ignore" },
  );
  for (let i = 0; i < 120 && !(await reachable()); i++)
    await new Promise((resolve) => setTimeout(resolve, 250));
  if (!(await reachable())) {
    stopServer();
    throw new Error(`Vite did not start on ${BASE}`);
  }
}

const browser = await launch();
let failed = 0;
try {
  for (const pass of passes) {
    for (const [area, start] of AREAS) {
      if (pick.length && !pick.includes(area)) continue;
      const mod = await import(`./areas/${area}.mjs`);
      const cap = capturer(pass, start);
      try {
        await mod.default({ browser, pass, cap });
      } catch (e) {
        failed++;
        console.log(
          `!! ${pass} ${area} failed at #${cap.n}: ${e.message.split("\n")[0]}`,
        );
      }
    }
  }
} finally {
  await browser.close();
  stopServer();
}
// INDEX.txt from CAPTURES.txt (make-index.mjs runs on import).
await import("./make-index.mjs");
process.exit(failed ? 1 : 0);
