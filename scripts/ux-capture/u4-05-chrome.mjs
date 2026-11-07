// Capture the clean and dirty form chrome using the same seeds as the UX review.
import path from "node:path";
import { mkdirSync } from "node:fs";
import { launch, mockApi, seed, settle, ROOT } from "./lib.mjs";
import { lived } from "./seeds.mjs";

const out = path.join(ROOT, "output", "playwright", "u4-05");
mkdirSync(out, { recursive: true });
const browser = await launch();
try {
  for (const width of [320, 390, 1280]) {
    const context = await browser.newContext({
      viewport: {
        width,
        height: width === 320 ? 700 : width === 390 ? 844 : 900,
      },
      reducedMotion: "reduce",
    });
    await mockApi(context);
    const p = await context.newPage();
    await seed(p, lived(), "you/sport");
    const sheet = p.getByRole("dialog", {
      name: "Sport & season",
      exact: true,
    });
    await sheet.waitFor();
    await settle(p);
    await p.screenshot({ path: path.join(out, `form-clean-${width}.png`) });
    await sheet.getByRole("radio").first().click();
    await sheet.getByRole("button", { name: "Cancel", exact: true }).waitFor();
    await settle(p);
    await p.screenshot({ path: path.join(out, `form-dirty-${width}.png`) });
    await context.close();
  }
} finally {
  await browser.close();
}
