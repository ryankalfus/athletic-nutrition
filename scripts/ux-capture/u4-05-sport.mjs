import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { lived } from "./seeds.mjs";
import { mockApi, seed, settle } from "./lib.mjs";
await mkdir("output/playwright/u4-05", { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [320, 390, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    await mockApi(context);
    const page = await context.newPage();
    await seed(page, lived(), "you/sport");
    await page.getByRole("button", { name: "Sport suggestions" }).click();
    await settle(page);
    await page.screenshot({
      path: `output/playwright/u4-05/sport-picker-${width}.png`,
    });
    await context.close();
  }
} finally {
  await browser.close();
}
