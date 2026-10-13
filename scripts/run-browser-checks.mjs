// Runs every tests/browser-*.js snippet against a Vite dev server in headless Chromium.
// Snippets keep the Playwright CLI format: a single `async (page) => { ... }` expression
// that returns { checks, errors, failure? } or throws.
//
//   npx playwright install chromium      # one-time setup
//   npm run test:browser                 # start Vite on 5184 (or reuse one already there)
//   npm run test:browser -- schedule     # only files whose name contains "schedule"
//   npm run test:browser -- --exclude journey   # every file except those matching "journey"
//   BASE_URL=http://127.0.0.1:5173/ npm run test:browser   # use an existing server
//   HEADED=1 npm run test:browser        # watch it run
//
// Live checks (LIVE_CHECKS below) call the real USDA API; every other snippet
// mocks /api/*. Live checks run only when a USDA key is available, from
// FDC_API_KEY in the environment or in .env. Without one (CI without the
// FDC_API_KEY secret, forks) they print SKIP and do not fail the run.
// LIVE=1 forces them (the server falls back to the rate-limited DEMO_KEY);
// LIVE=0 always skips them.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 5184);
const base = (process.env.BASE_URL || `http://127.0.0.1:${port}/`).replace(/\/?$/, "/");
const args = process.argv.slice(2);
const excludes = args.filter((_, i) => args[i - 1] === "--exclude");
const filters = args.filter(
  (arg, i) => arg !== "--exclude" && args[i - 1] !== "--exclude",
);
const testsDir = path.join(root, "tests");
const files = readdirSync(testsDir)
  .filter((name) => /^browser-.+\.js$/.test(name))
  .filter((name) => !filters.length || filters.some((f) => name.includes(f)))
  .filter((name) => !excludes.some((f) => name.includes(f)))
  .sort();

// Snippets that need the network and a USDA key.
const LIVE_CHECKS = new Set(["browser-provider.js"]);
const hasUsdaKey = () => {
  if (process.env.FDC_API_KEY?.trim()) return true;
  const env = path.join(root, ".env");
  return (
    existsSync(env) &&
    /^\s*FDC_API_KEY\s*=\s*["']?[^\s"'#]/m.test(readFileSync(env, "utf8"))
  );
};
const runLive =
  process.env.LIVE === "1" || (process.env.LIVE !== "0" && hasUsdaKey());

const reachable = async () => {
  try {
    return (await fetch(base, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
};

let server;
const stopServer = () => {
  if (!server || server.exitCode !== null) return;
  if (process.platform === "win32")
    spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else server.kill("SIGTERM");
};

async function ensureServer() {
  if (await reachable()) return console.log(`Using server at ${base}`);
  if (process.env.BASE_URL) throw new Error(`No server at ${base}`);
  console.log(`Starting Vite on port ${port}...`);
  const vite = path.join(root, "node_modules", "vite", "bin", "vite.js");
  server = spawn(
    process.execPath,
    [vite, "--port", String(port), "--strictPort", "--host", "127.0.0.1"],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );
  let log = "";
  server.stdout.on("data", (d) => (log += d));
  server.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 120; i++) {
    if (await reachable()) return;
    if (server.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Vite did not start on ${base}\n${log}`);
}

const load = (file) => {
  const source = readFileSync(path.join(testsDir, file), "utf8").trim().replace(/;\s*$/, "");
  return (0, eval)(`(${source}\n)`);
};

const failureOf = (result) => {
  if (!result || typeof result !== "object") return null;
  if (result.failure) return result.failure;
  if (result.errors?.length) return `Page errors: ${result.errors.join("; ")}`;
  return null;
};

async function main() {
  if (!files.length) throw new Error("No tests/browser-*.js files matched.");
  mkdirSync(path.join(root, "output", "playwright"), { recursive: true });
  process.chdir(root); // snippets use repo-relative paths (fixtures, screenshots)
  await ensureServer();
  globalThis.BASE_URL = base;
  // Snippets are eval'd, so they cannot import; hand them axe (tests/browser-a11y.js).
  globalThis.AxeBuilder = (await import("@axe-core/playwright")).AxeBuilder;
  const browser = await chromium
    .launch({ headless: !process.env.HEADED })
    .catch((error) => {
      throw new Error(
        `${error.message}\nRun "npx playwright install chromium" once, then retry.`,
      );
    });
  const page = await browser.newPage();
  const summary = [];
  for (const file of files) {
    if (LIVE_CHECKS.has(file) && !runLive) {
      summary.push({ file, ok: true, skipped: true, checks: 0, seconds: "0.0" });
      console.log(`\nSKIP ${file} (live USDA check: no FDC_API_KEY; LIVE=1 forces it)`);
      continue;
    }
    const started = Date.now();
    let result;
    let failure;
    try {
      result = await load(file)(page);
      failure = failureOf(result);
    } catch (error) {
      failure = error?.message || String(error);
    }
    const checks = Array.isArray(result?.checks) ? result.checks : [];
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    summary.push({ file, ok: !failure, checks: checks.length, seconds });
    console.log(`\n${failure ? "FAIL" : "PASS"} ${file} (${checks.length} checks, ${seconds}s)`);
    for (const check of checks)
      console.log(`  ok  ${typeof check === "string" ? check : JSON.stringify(check)}`);
    for (const warning of result?.warnings || []) console.log(`  !   ${warning}`);
    if (failure) {
      console.log(`  x   ${failure}`);
      if (result?.last) console.log(`  --- page text ---\n${String(result.last).slice(0, 1500)}`);
    }
  }
  await browser.close();
  const failed = summary.filter((s) => !s.ok);
  const skipped = summary.filter((s) => s.skipped);
  const ran = summary.length - skipped.length;
  console.log("\nSummary");
  for (const s of summary)
    console.log(`  ${s.skipped ? "SKIP" : s.ok ? "PASS" : "FAIL"}  ${s.file.padEnd(28)} ${String(s.checks).padStart(2)} checks  ${s.seconds}s`);
  console.log(
    `${ran - failed.length}/${ran} scripts passed` +
      (skipped.length ? `, ${skipped.length} skipped (live USDA checks need FDC_API_KEY)` : ""),
  );
  return failed.length ? 1 : 0;
}

main()
  .then((code) => {
    stopServer();
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error);
    stopServer();
    process.exitCode = 1;
  });
