// U4-04: exercise every selection primitive through its browser entry point.
// Each family reports separately so old-src regression runs identify all gaps.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const context = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
      permissions: ["notifications"],
    });
  await context.addInitScript(() => {
    if (typeof Notification === "undefined") return;
    Object.defineProperty(Notification, "permission", {
      get: () => "granted",
      configurable: true,
    });
    Notification.requestPermission = () => Promise.resolve("granted");
  });
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const result = { checks: [], errors: [] };
  const failures = [];
  p.on("pageerror", (error) => result.errors.push(error.message));
  const expect = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const attempt = async (name, run) => {
    try {
      await run();
      result.checks.push(name);
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
    }
  };
  // Measure the resting surface after the sheet fades in and colors settle.
  const settle = () =>
    p.evaluate(() =>
      Promise.allSettled(
        document
          .getAnimations()
          .filter(
            (animation) => animation.effect.getTiming().iterations !== Infinity,
          )
          .map((animation) => animation.finished),
      ),
    );
  const axe = async (selector) => {
    await settle();
    const { violations } = await new globalThis.AxeBuilder({ page: p })
      .include(selector)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      !violations.length,
      `axe ${selector}: ${violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.failureSummary).join(", ")}`).join(", ")}`,
    );
  };
  const toggleButton = async (button) => {
    const initial = await button.getAttribute("aria-pressed");
    await button.focus();
    await p.keyboard.press("Space");
    expect(
      (await button.getAttribute("aria-pressed")) !== initial,
      "Space did not toggle aria-pressed",
    );
    await p.keyboard.press("Enter");
    expect(
      (await button.getAttribute("aria-pressed")) === initial,
      "Enter did not toggle aria-pressed back",
    );
  };
  const selectedStyle = async (button) => {
    await settle();
    const value = await button.evaluate((node) => {
      const style = getComputedStyle(node);
      const probe = document.createElement("span");
      probe.style.color = "var(--color-pitch)";
      document.body.append(probe);
      const pitch = getComputedStyle(probe).color;
      probe.style.color = "var(--color-surface)";
      const white = getComputedStyle(probe).color;
      probe.remove();
      const luminance = (color) =>
        color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((v) => v / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      const [hi, lo] = [
        luminance(style.color),
        luminance(style.backgroundColor),
      ].sort((a, b) => b - a);
      return {
        pitch,
        white,
        fill: style.backgroundColor,
        text: style.color,
        contrast: (hi + 0.05) / (lo + 0.05),
      };
    });
    expect(
      value.fill === value.pitch &&
        value.text === value.white &&
        value.contrast >= 4.5,
      `Selected fill/text/contrast: ${JSON.stringify(value)}`,
    );
    return value.contrast.toFixed(2);
  };
  const joined = async (selector, count) => {
    const value = await p.locator(selector).evaluate((bar) => {
      const buttons = [...bar.querySelectorAll(":scope > button")];
      const boxes = buttons.map((button) => button.getBoundingClientRect());
      return {
        count: buttons.length,
        height: bar.getBoundingClientRect().height,
        gap: getComputedStyle(bar).gap,
        tops: [...new Set(boxes.map((box) => box.top))],
        gaps: boxes.slice(1).map((box, i) => box.left - boxes[i].right),
      };
    });
    expect(
      value.count === count &&
        value.height === 48 &&
        value.gap === "0px" &&
        value.tops.length === 1 &&
        value.gaps.every((gap) => Math.abs(gap) <= 0.01),
      `${selector} joined geometry: ${JSON.stringify(value)}`,
    );
  };
  const route = async (name) => {
    await p.goto(`${base}#/${name}`);
    if (name.startsWith("you/")) await p.getByRole("dialog").waitFor();
    else await p.locator("main").waitFor();
    await settle();
  };
  try {
    await p.goto(base);
    await p.getByRole("button", { name: "Get started" }).click();
    await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await p
      .getByRole("radiogroup", { name: "Season", exact: true })
      .getByRole("radio")
      .first()
      .click();
    await p.getByRole("button", { name: "Next", exact: true }).click();
    await p.getByRole("heading", { name: "Your school day" }).waitFor();
    await attempt(
      "Weekdays: joined 48 px bar, zero gaps, no badges, pitch/white ≥4.5:1, axe, Space and Enter",
      async () => {
        for (const width of [320, 390, 1280]) {
          await p.setViewportSize({ width, height: 900 });
          await joined(".school-weekdays", 7);
          const badges = await p
            .locator(".school-weekdays button")
            .evaluateAll((buttons) =>
              buttons.some(
                (button) =>
                  button.children.length ||
                  !["none", "normal"].includes(
                    getComputedStyle(button, "::before").content,
                  ),
              ),
            );
          expect(!badges, "Weekdays contain a child or pseudo check badge");
          await selectedStyle(
            p.getByRole("button", { name: "Monday", exact: true }),
          );
        }
        await toggleButton(
          p.getByRole("button", { name: "Monday", exact: true }),
        );
        await axe(".school-weekdays");
      },
    );
    await p.getByRole("button", { name: "Skip setup" }).click();
    await p
      .getByRole("heading", {
        level: 1,
        name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/,
      })
      .waitFor();
    await attempt(
      "Checklist rows: 56 px rows, trailing 24 px checks, axe, Space and Enter",
      async () => {
        await route("you/access");
        const group = p.locator(".checklist-group").first();
        expect(await group.count(), "ChecklistGroup is absent");
        const rows = await group
          .locator(":scope > button")
          .evaluateAll((buttons) =>
            buttons.map((button) => {
              const row = button.getBoundingClientRect();
              const check = button
                .querySelector(".checklist-check")
                ?.getBoundingClientRect();
              return {
                height: row.height,
                check: check && {
                  width: check.width,
                  height: check.height,
                  right: check.right,
                },
                right: row.right,
              };
            }),
          );
        expect(
          rows.length &&
            rows.every(
              (row) =>
                row.height >= 56 &&
                row.check?.width === 24 &&
                row.check?.height === 24 &&
                row.right - row.check.right <= 1,
            ),
          `Checklist geometry: ${JSON.stringify(rows)}`,
        );
        await toggleButton(group.getByRole("button").first());
        await axe(".checklist-group");
      },
    );
    await attempt(
      "Segments: 48 px track, pitch/white ≥4.5:1, axe, one radio tab stop and arrow selection",
      async () => {
        await route("you/sport");
        const group = p.getByRole("radiogroup", {
          name: "Season",
          exact: true,
        });
        const selected = group.locator('[aria-checked="true"]');
        expect(
          (await group.evaluate(
            (node) => node.getBoundingClientRect().height,
          )) === 48,
          "Segment track is not 48 px",
        );
        await selectedStyle(selected);
        await selected.hover();
        await selectedStyle(selected);
        const before = await selected.innerText();
        await selected.focus();
        await p.keyboard.press("ArrowRight");
        expect(
          (await selected.innerText()) !== before,
          "ArrowRight did not select another segment",
        );
        expect(
          await selected.evaluate((node) => node === document.activeElement),
          "ArrowRight did not move focus with selection",
        );
        expect(
          (await group.locator('button:not([tabindex="-1"])').count()) === 1,
          "Radio group has multiple tab stops",
        );
        await axe(".segmented");
        await p.emulateMedia({ forcedColors: "active" });
        await selected.evaluate((node) => node.blur());
        expect(
          (await selected.evaluate(
            (node) => getComputedStyle(node).outlineStyle,
          )) === "solid",
          "Checked segment lost its forced-colors solid outline",
        );
        const unselected = group.locator('[aria-checked="false"]').first();
        expect(
          (await unselected.evaluate(
            (node) => getComputedStyle(node).outlineStyle,
          )) === "none",
          "An unselected segment has a forced-colors selection outline",
        );
        await p.emulateMedia({ forcedColors: "none" });
      },
    );
    await attempt(
      "Switch rows: right edge within 1 px at all widths, axe, Space toggles and dependents disable/dim",
      async () => {
        await route("you/reminders");
        const sheet = p.getByRole("dialog", { name: "Reminders", exact: true });
        for (const width of [320, 390, 1280]) {
          await p.setViewportSize({ width, height: 900 });
          const rows = await sheet.locator(".switch-row").evaluateAll((nodes) =>
            nodes.map((row) => {
              const style = getComputedStyle(row);
              const contentRight =
                row.getBoundingClientRect().right -
                parseFloat(style.paddingRight) -
                parseFloat(style.borderRightWidth);
              const control = row.querySelector('[role="switch"]');
              return Math.abs(
                control.getBoundingClientRect().right - contentRight,
              );
            }),
          );
          expect(
            rows.length && rows.every((distance) => distance <= 1),
            `Switch right-edge distances: ${rows}`,
          );
        }
        const master = sheet.getByRole("switch", {
          name: /^Remind me before activities/,
        });
        await master.focus();
        const before = await master.isChecked();
        await p.keyboard.press("Space");
        expect(
          (await master.isChecked()) !== before,
          "Space did not toggle the switch",
        );
        if (!(await master.isChecked())) await p.keyboard.press("Space");
        const dependent = sheet.getByRole("radiogroup", {
          name: "How long before",
        });
        const evening = sheet.getByRole("checkbox", {
          name: /^Evening reminder/,
        });
        expect(
          !(await dependent.getByRole("radio").first().isDisabled()) &&
            !(await evening.isDisabled()),
          "Enabled reminders keep dependents disabled",
        );
        const enabledOpacity = await dependent.evaluate((node) => {
          let opacity = 1;
          for (let n = node; n; n = n.parentElement)
            opacity *= Number(getComputedStyle(n).opacity);
          return opacity;
        });
        await master.focus();
        await p.keyboard.press("Space");
        expect(
          (await dependent.getByRole("radio").first().isDisabled()) &&
            (await evening.isDisabled()),
          "Off reminders leave active dependent controls",
        );
        const offOpacity = await dependent.evaluate((node) => {
          let opacity = 1;
          for (let n = node; n; n = n.parentElement)
            opacity *= Number(getComputedStyle(n).opacity);
          return opacity;
        });
        expect(
          offOpacity < enabledOpacity,
          `Dependent opacity, enabled ${enabledOpacity}, off ${offOpacity}`,
        );
        await axe(".reminders-sheet");
      },
    );
    await attempt(
      "Quick amounts: joined 48 px bar, Barlow numerals, Custom last, axe and keyboard actions",
      async () => {
        await route("today");
        expect(
          await p.locator(".quick-amount-bar").count(),
          "QuickAmountBar is absent",
        );
        for (const width of [320, 390, 1280]) {
          await p.setViewportSize({ width, height: 900 });
          await joined(".quick-amount-bar", 4);
        }
        const buttons = p.locator(".quick-amount-bar > button");
        expect(
          (await buttons.last().innerText()) === "Custom",
          "Custom is not the last amount",
        );
        expect(
          (
            await buttons
              .first()
              .locator(".numeral")
              .evaluate((node) => getComputedStyle(node).fontFamily)
          ).includes("Barlow"),
          "Quick amounts do not use Barlow numerals",
        );
        await axe(".water-row");
        await buttons.first().focus();
        await p.keyboard.press("Enter");
        await p
          .locator(".app-toast")
          .getByText(/Added 8 oz/)
          .waitFor();
        await buttons.last().focus();
        await p.keyboard.press("Space");
        await p
          .getByRole("dialog", { name: "Add water", exact: true })
          .waitFor();
      },
    );
    await attempt(
      "Tiles: 2–3 columns, 96 px tall, radius 14, 28 px glyphs, pitch selection, axe and keyboard",
      async () => {
        await p.goto(`${base}?ui=rows`);
        await p.getByRole("heading", { name: "Rows", exact: true }).waitFor();
        const tiles = p.getByRole("list", {
          name: "Choose foods",
          exact: true,
        });
        expect(await tiles.count(), "Tiles fixture is absent");
        for (const width of [320, 390, 1280]) {
          await p.setViewportSize({ width, height: 900 });
          const geometry = await tiles.evaluate((group) => {
            const buttons = [...group.querySelectorAll("button")];
            const boxes = buttons.map((node) => node.getBoundingClientRect());
            return {
              columns: boxes.filter((box) => box.top === boxes[0].top).length,
              rows: buttons.map((node) => ({
                height: node.getBoundingClientRect().height,
                radius: getComputedStyle(node).borderRadius,
                icon: node.querySelector("svg")?.getBoundingClientRect().width,
              })),
            };
          });
          expect(
            [2, 3].includes(geometry.columns) &&
              geometry.rows.every(
                (row) =>
                  row.height === 96 && row.radius === "14px" && row.icon === 28,
              ),
            `Tile geometry: ${JSON.stringify(geometry)}`,
          );
        }
        const tile = tiles.getByRole("button", {
          name: "Bananas",
          exact: true,
        });
        await toggleButton(tile);
        if ((await tile.getAttribute("aria-pressed")) !== "true")
          await tile.click();
        await selectedStyle(tile);
        await axe(".tiles");
      },
    );
    return {
      ...result,
      ...(failures.length ? { failure: failures.join("\n") } : {}),
    };
  } finally {
    await context.close();
  }
};
