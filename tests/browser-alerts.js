// UX-CMP-11: real Discard and irreversible-delete alerts at each review width.
async (page) => {
  const browser = page.context().browser();
  const result = { checks: [], errors: [] };
  for (const width of [320, 390, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    const p = await context.newPage();
    p.setDefaultTimeout(15000);
    p.on("pageerror", (error) => result.errors.push(error.message));
    const base = globalThis.BASE_URL;
    const measure = async (alert, name) => {
      const value = await alert.evaluate((node) => {
        const style = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        const buttons = [...node.querySelectorAll(".confirm-actions > button")];
        return {
          width: box.width,
          max: style.maxWidth,
          radius: style.borderRadius,
          dx: Math.abs(box.left + box.width / 2 - innerWidth / 2),
          dy: Math.abs(box.top + box.height / 2 - innerHeight / 2),
          contentWidth: node.querySelector(".confirm-actions").clientWidth,
          buttons: buttons.map((button) => ({
            width: button.getBoundingClientRect().width,
            top: button.getBoundingClientRect().top,
          })),
          x: Boolean(node.querySelector("header button")),
        };
      });
      if (
        value.width > 320 ||
        value.max !== "320px" ||
        value.radius !== "24px" ||
        value.dx > 1 ||
        value.dy > 1 ||
        value.x
      )
        throw new Error(name + " alert geometry " + JSON.stringify(value));
      if (
        value.buttons.length < 2 ||
        value.buttons.some((b) => Math.abs(b.width - value.contentWidth) > 1) ||
        value.buttons[0].top === value.buttons[1].top
      )
        throw new Error(name + " actions must be full-width and stacked");
    };
    try {
      await p.goto(base, { waitUntil: "domcontentloaded" });
      await p.getByRole("button", { name: "Get started" }).click();
      await p.getByRole("textbox", { name: /First name/ }).fill("Alert");
      await p.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
      await p.getByRole("button", { name: "Next", exact: true }).click();
      await p.getByRole("button", { name: "Skip setup" }).click();
      await p
        .getByRole("heading", {
          name: /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/,
          level: 1,
        })
        .waitFor();
      await p.goto(base + "#/you/sport", { waitUntil: "domcontentloaded" });
      const sheet = p.getByRole("dialog", {
        name: "Sport & season",
        exact: true,
      });
      await sheet.getByRole("radio").first().click();
      await p.keyboard.press("Escape");
      const discard = p.getByRole("dialog", {
        name: "Discard changes?",
        exact: true,
      });
      await discard.waitFor();
      await measure(discard, "Discard");
      if (!(await sheet.evaluate((node) => node.inert)))
        throw new Error("Underlying sheet is not explicitly inert");
      const keep = discard.getByRole("button", { name: "Keep editing" });
      if ((await keep.getAttribute("data-kind")) !== "primary")
        throw new Error("Keep editing must be the primary safe action");
      await p.screenshot({
        animations: "disabled",
        path: "output/playwright/discard-alert-" + width + ".png",
      });
      await keep.click();
      if (await sheet.evaluate((node) => node.inert))
        throw new Error("Sheet stayed inert after Keep editing");
      await p.keyboard.press("Escape");
      await p
        .getByRole("dialog", { name: "Discard changes?", exact: true })
        .getByRole("button", { name: "Discard", exact: true })
        .click();
      await p.goto(base + "#/you/device", { waitUntil: "domcontentloaded" });
      await p
        .getByRole("button", { name: "Delete Alert's data", exact: true })
        .click();
      const deletion = p.getByRole("dialog", {
        name: "Delete Alert's data from this device?",
        exact: true,
      });
      await measure(deletion, "Type DELETE");
      const destructive = deletion.getByRole("button", {
        name: "Delete data",
        exact: true,
      });
      const disabled = await destructive.evaluate((node) => {
        const style = getComputedStyle(node);
        const probe = document.createElement("span");
        probe.style.color = "var(--color-error)";
        document.body.append(probe);
        const error = getComputedStyle(probe).color;
        probe.remove();
        return {
          disabled: node.disabled,
          opacity: style.opacity,
          fill: style.backgroundColor,
          error,
        };
      });
      if (
        !disabled.disabled ||
        disabled.opacity !== "0.4" ||
        disabled.fill !== disabled.error
      )
        throw new Error(
          "Disabled destructive appearance " + JSON.stringify(disabled),
        );
      if (
        (await deletion
          .getByRole("button", { name: "Cancel", exact: true })
          .getAttribute("data-kind")) !== "primary"
      )
        throw new Error("Delete alert's safe Cancel must be primary");
      await p.screenshot({
        animations: "disabled",
        path: "output/playwright/type-delete-alert-" + width + ".png",
      });
      await deletion.getByRole("textbox").fill("DELETE");
      if (await destructive.isDisabled())
        throw new Error("Type DELETE did not enable deletion");
      await p.keyboard.press("Escape");
      result.checks.push(
        width +
          ": centered stacked alerts; inert sheet; safe primary; DELETE error fill at 40% opacity",
      );
    } catch (error) {
      return {
        ...result,
        failure: error.message,
        last: await p.locator("body").innerText(),
      };
    } finally {
      await context.close();
    }
  }
  return result;
};
