// UX U3-01: phone navigation geometry, glass, contrast, keyboard behavior,
// content clearance, reduced transparency and scroll stability.
// UX U3-02: the tablet top capsule and the 88px and 232px desktop rails.
async (page) => {
  const base = globalThis.BASE_URL ?? "http://127.0.0.1:5173/";
  const browser = page.context().browser();
  const AxeBuilder = globalThis.AxeBuilder;
  if (!AxeBuilder) throw new Error("Run through scripts/run-browser-checks.mjs");

  const routes = [
    "today",
    "schedule",
    "food/ideas",
    "food/home",
    "food/groceries",
    "food/log",
    "food/log/week",
    "you",
    "you/sport",
    "you/needs",
    "you/access",
    "you/reminders",
    "you/device",
    "you/about",
    "nope",
  ];
  const result = { checks: [], errors: [] };
  const contexts = [];
  let p;
  let stabilityBrowser;

  const parseColor = (value) => {
    const hex = value.trim().match(/^#([\da-f]{6})$/i);
    if (hex) {
      const number = Number.parseInt(hex[1], 16);
      return {
        r: (number >> 16) & 255,
        g: (number >> 8) & 255,
        b: number & 255,
        a: 1,
      };
    }
    const values = value.match(/[\d.]+/g)?.map(Number);
    if (!values || values.length < 3) return null;
    return {
      r: values[0],
      g: values[1],
      b: values[2],
      a: values[3] ?? 1,
    };
  };
  const blend = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const luminance = ({ r, g, b }) => {
    const linear = (value) => {
      value /= 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  };
  const contrast = (a, b) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (high + 0.05) / (low + 0.05);
  };
  const sameColor = (a, b) =>
    a &&
    b &&
    Math.abs(a.r - b.r) < 1 &&
    Math.abs(a.g - b.g) < 1 &&
    Math.abs(a.b - b.b) < 1;

  const start = async (width, height, targetBrowser = browser) => {
    const context = await targetBrowser.newContext({ viewport: { width, height } });
    contexts.push(context);
    const currentPage = await context.newPage();
    currentPage.setDefaultTimeout(15000);
    currentPage.on("pageerror", (error) => result.errors.push(error.message));
    await currentPage.clock.setFixedTime(new Date(2026, 8, 29, 15, 0, 0));
    await context.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      const body = url.pathname.endsWith("/status")
        ? { mode: "local-snapshot" }
        : { foods: [], totalHits: 0, hasMore: false, mode: "local-snapshot" };
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await currentPage.goto(base);
    await currentPage.getByRole("button", { name: "Get started" }).click();
    await currentPage.getByRole("textbox", { name: /First name/ }).fill("Maya");
    await currentPage.getByRole("combobox", { name: /^Sport/ }).fill("Soccer");
    await currentPage.getByRole("button", { name: "Next", exact: true }).click();
    await currentPage.getByRole("heading", { name: "Your school day" }).waitFor();
    await currentPage.getByRole("button", { name: "Skip setup" }).click();
    await currentPage.getByRole("heading", { name: "Today", exact: true }).waitFor();
    return currentPage;
  };

  const waitFrame = async () =>
    p.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );

  try {
    for (const [width, height] of [
      [390, 844],
      [320, 740],
    ]) {
      p = await start(width, height);
      for (const route of routes) {
        await p.goto(base + "#/" + route);
        const nav = p.locator(".frame-nav");
        await nav.waitFor();
        await p.waitForTimeout(250);
        const expected =
          route === "today" || route === "schedule"
            ? route
            : route.startsWith("food/")
              ? "food"
              : route === "nope"
                ? null
                : "you";
        const metrics = await nav.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const active = element.querySelector('[aria-current="page"]');
          const labels = [...element.querySelectorAll(".frame-nav-item span")];
          return {
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
            radius: style.borderRadius,
            background: style.backgroundColor,
            filter: style.backdropFilter || style.webkitBackdropFilter,
            activeLabel: active
              ? getComputedStyle(active.querySelector("span")).color
              : null,
            activeIcon: active
              ? getComputedStyle(active.querySelector("svg")).color
              : null,
            activeName: active?.textContent.trim() ?? null,
            activeCount: element.querySelectorAll('[aria-current="page"]').length,
            pillBackground: getComputedStyle(element, "::before").backgroundColor,
            pillWidth: getComputedStyle(element, "::before").width,
            transitionDuration: getComputedStyle(
              element,
              "::before",
            ).transitionDuration,
            itemHeights: [...element.querySelectorAll(".frame-nav-item")].map(
              (item) => item.getBoundingClientRect().height,
            ),
            inactiveLabels: labels
              .filter(
                (label) =>
                  !label
                    .closest(".frame-nav-item")
                    .matches('[aria-current="page"]'),
              )
              .map((label) => getComputedStyle(label).color),
            pitch: getComputedStyle(document.documentElement)
              .getPropertyValue("--color-pitch")
              .trim(),
            paper: getComputedStyle(document.documentElement)
              .getPropertyValue("--color-paper")
              .trim(),
            activeOffset: element.style.getPropertyValue("--tab-active-offset"),
          };
        });
        const failures = [];
        if (metrics.left < 12 || width - metrics.right < 12)
          failures.push("less than 12px side inset");
        if (height - metrics.bottom < 12)
          failures.push("less than 12px bottom inset");
        if (Math.abs(metrics.height - 64) > 0.5)
          failures.push("height is " + metrics.height + "px");
        if (metrics.radius !== "24px")
          failures.push("radius is " + metrics.radius);
        if (metrics.width > 440)
          failures.push("width exceeds 440px");
        if (metrics.activeCount !== (expected ? 1 : 0))
          failures.push("wrong number of active destinations");
        if (
          expected &&
          metrics.activeName !==
            expected[0].toUpperCase() + expected.slice(1)
        )
          failures.push("active item is " + metrics.activeName);
        if (metrics.itemHeights.some((itemHeight) => itemHeight < 56))
          failures.push("a destination target is under 56px");
        if (!metrics.filter.includes("blur(20px)"))
          failures.push("backdrop blur is " + metrics.filter);
        const background = parseColor(metrics.background);
        if (!background || Math.abs(background.a - 0.82) > 0.01)
          failures.push("glass alpha is " + metrics.background);
        const pitch = parseColor(metrics.pitch);
        const paper = parseColor(metrics.paper);
        const pill = parseColor(metrics.pillBackground);
        if (!sameColor(pill, pitch) || Number.parseFloat(metrics.pillWidth) <= 0)
          failures.push("active pitch pill is missing");
        if (!metrics.transitionDuration.includes("0.2s"))
          failures.push("pill transition is " + metrics.transitionDuration);
        if (expected) {
          const activeLabel = parseColor(metrics.activeLabel);
          const activeIcon = parseColor(metrics.activeIcon);
          if (!sameColor(activeLabel, { r: 255, g: 255, b: 255 }))
            failures.push("active label is " + metrics.activeLabel);
          if (!sameColor(activeIcon, { r: 215, g: 244, b: 95 }))
            failures.push("active icon is not lime");
        }
        if (background && pitch && paper) {
          for (const label of metrics.inactiveLabels) {
            const foreground = parseColor(label);
            const overPitch = contrast(foreground, blend(background, pitch));
            const overPaper = contrast(foreground, blend(background, paper));
            if (overPitch < 4.5 || overPaper < 4.5)
              failures.push(
                "inactive label contrast is " +
                  overPitch.toFixed(2) +
                  ":1 over pitch and " +
                  overPaper.toFixed(2) +
                  ":1 over paper",
              );
          }
        }
        if (failures.length)
          throw new Error(
            route +
              " at " +
              width +
              "px: " +
              [...new Set(failures)].join(", "),
          );

        await p.evaluate(() =>
          window.scrollTo(0, document.documentElement.scrollHeight),
        );
        await waitFrame();
        const clearance = await p.evaluate(() => {
          const main = document.querySelector("main");
          const navElement = document.querySelector(".frame-nav");
          const mainRect = main.getBoundingClientRect();
          const navRect = navElement.getBoundingClientRect();
          const paddingBottom = Number.parseFloat(
            getComputedStyle(main).paddingBottom,
          );
          return navRect.top - (mainRect.bottom - paddingBottom);
        });
        if (clearance < 8)
          throw new Error(
            route +
              " at " +
              width +
              "px: main content ends " +
              clearance.toFixed(1) +
              "px above the nav",
          );
        if (route === "you") {
          const footerClearance = await p.evaluate(() => {
            const footer = document.querySelector(".frame-footer");
            const navElement = document.querySelector(".frame-nav");
            if (!footer || !navElement) return null;
            const text = document.createRange();
            text.selectNodeContents(footer);
            return (
              navElement.getBoundingClientRect().top -
              text.getBoundingClientRect().bottom
            );
          });
          if (footerClearance === null || footerClearance < 8)
            throw new Error(
              "You at " +
                width +
                "px: footer text ends " +
                (footerClearance === null
                  ? "without a footer or nav"
                  : footerClearance.toFixed(1) + "px above the nav"),
            );
        }

        if (width === 390) {
          const { violations } = await new AxeBuilder({ page: p })
            .withTags([
              "wcag2a",
              "wcag2aa",
              "wcag21a",
              "wcag21aa",
              "wcag22aa",
              "best-practice",
            ])
            .analyze();
          const serious = violations.filter(
            ({ impact }) => impact === "serious" || impact === "critical",
          );
          if (serious.length)
            throw new Error(
              route +
                " at 390px: axe found " +
                JSON.stringify(
                  serious.map(({ id, nodes }) => ({
                    id,
                    nodes: nodes.map(({ target, failureSummary }) => ({
                      target,
                      failureSummary,
                    })),
                  })),
                ),
            );
        }

        result.checks.push(
          route +
            " at " +
            width +
            "px: capsule geometry, active state, contrast and content clearance" +
            (route === "you" ? ", including footer clearance." : "."),
        );
      }

      if (width === 390) {
        await p.goto(base + "#/food/home");
        await p.getByRole("button", { name: "Add food", exact: true }).click();
        const input = p.getByRole("dialog", { name: "Add food at home" })
          .getByRole("searchbox");
        await input.waitFor({ state: "visible" });
        await input.focus();
        await p.setViewportSize({ width: 390, height: 422 });
        await p.waitForFunction(
          () => document.querySelector(".frame-nav")?.hidden === true,
        );
        await input.evaluate((element) => element.blur());
        await p.waitForFunction(
          () => document.querySelector(".frame-nav")?.hidden === false,
        );
        result.checks.push(
          "The nav hides for a focused text field when the visual viewport falls below 75%, then returns on blur.",
        );

        const cdp = await p.context().newCDPSession(p);
        for (const feature of [
          { name: "prefers-reduced-transparency", value: "reduce" },
          { name: "prefers-contrast", value: "more" },
        ]) {
          await cdp.send("Emulation.setEmulatedMedia", {
            features: [feature],
          });
          const style = await p.locator(".frame-nav").evaluate((element) => {
            const computed = getComputedStyle(element);
            return {
              background: computed.backgroundColor,
              filter: computed.backdropFilter || computed.webkitBackdropFilter,
              borderWidth: computed.borderTopWidth,
            };
          });
          const background = parseColor(style.background);
          if (
            !background ||
            background.a !== 1 ||
            style.filter !== "none" ||
            style.borderWidth !== "1px"
          )
            throw new Error(
              feature.name +
                " did not produce an opaque, bordered nav: " +
                JSON.stringify(style),
            );
        }
        await cdp.send("Emulation.setEmulatedMedia", { features: [] });
        await cdp.detach();
        result.checks.push(
          "Reduced transparency and increased contrast use a solid paper nav with no blur.",
        );

        await p.setViewportSize({ width: 390, height: 844 });
        await p.goto(base + "#/today");
        await p.locator(".frame-nav").waitFor();
        await p.locator(".frame-nav-item", { hasText: "Food" }).click();
        await p.waitForFunction(
          () =>
            document
              .querySelector('.frame-nav [aria-current="page"]')
              ?.textContent.trim() === "Food",
        );
        const movement = await p.locator(".frame-nav").evaluate((element) => ({
          offset: element.style.getPropertyValue("--tab-active-offset"),
          transform: getComputedStyle(element, "::before").transform,
        }));
        if (
          movement.offset !== "200%" ||
          movement.transform === "none" ||
          movement.transform.endsWith(", 0, 0)")
        )
          throw new Error("The active pitch pill did not move to Food");
        result.checks.push("The pitch pill slides to the selected destination.");

        await p.evaluate(() => {
          document.querySelector("main").style.minHeight = "1800px";
          window.scrollTo(0, 0);
        });
        await waitFrame();
        const before = await p.locator(".frame-nav").boundingBox();
        await p.evaluate(() => window.scrollTo(0, 600));
        await waitFrame();
        const after = await p.locator(".frame-nav").boundingBox();
        if (
          !before ||
          !after ||
          Math.abs(before.x - after.x) > 0.5 ||
          Math.abs(before.y - after.y) > 0.5 ||
          Math.abs(before.width - after.width) > 0.5 ||
          Math.abs(before.height - after.height) > 0.5
        )
          throw new Error("Scrolling changed the floating nav position");
        result.checks.push("Scrolling 600px leaves the nav fixed in place.");
      }

      await p.context().close();
    }
    // U3-02: the tablet top capsule (UX-NAV-09) and the quiet rail
    // (UX-NAV-10). The pitch pill sits exactly on the active item at every
    // width, so it is measured from the pseudo-element's box and transform.
    const wideRoutes = [
      ["today", "Today"],
      ["schedule", "Schedule"],
      ["food/ideas", "Food"],
      ["you", "You"],
    ];
    for (const [width, height, layout] of [
      [768, 1024, "capsule"],
      [1024, 768, "icon rail"],
      [1100, 800, "icon rail"],
      [1280, 800, "label rail"],
      [1440, 900, "label rail"],
    ]) {
      p = await start(width, height);
      for (const [route, name] of wideRoutes) {
        await p.goto(base + "#/" + route);
        await p.locator(".frame-nav").waitFor();
        await p.waitForTimeout(300);
        const m = await p.evaluate(() => {
          const rect = (element) => element.getBoundingClientRect().toJSON();
          const header = document.querySelector(".frame-header");
          const nav = header.querySelector(".frame-nav");
          const items = [...nav.querySelectorAll(".frame-nav-item")];
          const active = nav.querySelector('[aria-current="page"]');
          const navRect = rect(nav);
          const pill = getComputedStyle(nav, "::before");
          const move =
            pill.transform === "none"
              ? new DOMMatrixReadOnly()
              : new DOMMatrixReadOnly(pill.transform);
          const shadows = [header, nav, ...items].map(
            (element) => getComputedStyle(element).boxShadow,
          );
          const borders = [header, nav, ...items].flatMap((element) => {
            const style = getComputedStyle(element);
            return ["Top", "Right", "Bottom", "Left"].map((side) =>
              Number.parseFloat(style[`border${side}Width`]),
            );
          });
          const style = getComputedStyle(nav);
          const athlete = header.querySelector(".frame-athlete");
          const visible = (selector) => {
            const element = athlete.querySelector(selector);
            return !!element && element.getBoundingClientRect().width > 0;
          };
          return {
            viewport: document.documentElement.clientWidth,
            header: rect(header),
            nav: navRect,
            main: rect(document.querySelector("main")),
            active: active ? rect(active) : null,
            activeName: active?.textContent.trim() ?? null,
            activeLabel: active
              ? getComputedStyle(active.querySelector("span")).color
              : null,
            activeIcon: active
              ? getComputedStyle(active.querySelector("svg")).color
              : null,
            pill: {
              x: navRect.left + Number.parseFloat(pill.left) + move.m41,
              y: navRect.top + Number.parseFloat(pill.top) + move.m42,
              width: Number.parseFloat(pill.width),
              height: Number.parseFloat(pill.height),
              background: pill.backgroundColor,
            },
            radius: style.borderRadius,
            background: style.backgroundColor,
            filter: style.backdropFilter || style.webkitBackdropFilter,
            headerBorder: getComputedStyle(header).borderBottomWidth,
            shadows,
            borders,
            pitch: getComputedStyle(document.documentElement)
              .getPropertyValue("--color-pitch")
              .trim(),
            brandName: header.querySelector(".frame-brand span")
              .getBoundingClientRect().width,
            athleteName: visible(".frame-athlete-name"),
            athleteChevron: visible(".frame-athlete-switch svg"),
          };
        });
        const failures = [];
        const off = (a, b) => Math.abs(a - b) > 1;
        if (m.activeName !== name) failures.push("active item is " + m.activeName);
        if (!sameColor(parseColor(m.pill.background), parseColor(m.pitch)))
          failures.push("the pill is not pitch");
        if (
          !m.active ||
          off(m.pill.x, m.active.x) ||
          off(m.pill.y, m.active.y) ||
          off(m.pill.width, m.active.width) ||
          off(m.pill.height, m.active.height)
        )
          failures.push(
            "the pill is not on the active item: " +
              JSON.stringify({ pill: m.pill, active: m.active }),
          );
        if (!sameColor(parseColor(m.activeLabel), { r: 255, g: 255, b: 255 }))
          failures.push("active label is " + m.activeLabel);
        if (!sameColor(parseColor(m.activeIcon), { r: 215, g: 244, b: 95 }))
          failures.push("active icon is not lime");
        if (layout === "capsule") {
          const leftGap = m.nav.x;
          const rightGap = m.viewport - (m.nav.x + m.nav.width);
          if (Math.abs(leftGap - rightGap) > 1)
            failures.push(`capsule gaps are ${leftGap} and ${rightGap}`);
          if (Math.abs(m.nav.height - 52) > 0.5)
            failures.push("capsule height is " + m.nav.height);
          if (m.radius !== "18px") failures.push("capsule radius is " + m.radius);
          if (!m.filter.includes("blur(20px)"))
            failures.push("capsule blur is " + m.filter);
          const glass = parseColor(m.background);
          if (!glass || Math.abs(glass.a - 0.82) > 0.01)
            failures.push("capsule glass is " + m.background);
          if (m.headerBorder !== "0px")
            failures.push("the tablet bar has a rule");
          if (m.nav.y < m.header.y || m.nav.y + m.nav.height > m.header.y + m.header.height)
            failures.push("the capsule overflows the bar");
          if (m.brandName > 0) failures.push("the brand name crowds the capsule");
        } else {
          const railWidth = layout === "icon rail" ? 88 : 232;
          if (Math.abs(m.header.width - railWidth) > 0.5)
            failures.push(`rail is ${m.header.width}px, not ${railWidth}px`);
          if (m.shadows.some((shadow) => shadow !== "none"))
            failures.push("the rail casts a shadow: " + m.shadows.join(" / "));
          if (m.borders.some((border) => border !== 0))
            failures.push("the rail or an item has a border");
          if (m.main.x < m.header.x + m.header.width)
            failures.push("main starts under the rail");
          const labelled = layout === "label rail";
          if ((m.brandName > 0) !== labelled)
            failures.push(`brand name shown: ${m.brandName > 0}`);
          if (m.athleteName !== labelled || m.athleteChevron !== labelled)
            failures.push(
              `athlete row name ${m.athleteName}, chevron ${m.athleteChevron}`,
            );
        }
        if (failures.length)
          throw new Error(`${route} at ${width}px: ${failures.join(", ")}`);
      }
      result.checks.push(
        width === 768
          ? "768px: the floating top capsule is centered (gaps within 1px), 52px tall, radius 18, 82% glass with a 20px blur, in a bar with no rule; the pitch pill sits on the active item with a lime icon and white label on all four tabs."
          : `${width}px: the ${layout === "icon rail" ? "88px icon rail" : "232px rail with labels"} has no border or shadow on the rail or its items, main starts beside it, the pitch pill sits on the active item on all four tabs, and the athlete row shows ${layout === "icon rail" ? "the avatar only" : "avatar, name and chevron"}.`,
      );
      await p.context().close();
    }

    // Route content can add/remove a classic scrollbar. The navigation and
    // every icon/label must retain their geometry, including during real clicks.
    // Chromium normally hides scrollbars in headless mode, masking this bug.
    stabilityBrowser = await browser.browserType().launch({
      headless: true,
      ignoreDefaultArgs: ["--hide-scrollbars"],
      args: ["--disable-features=OverlayScrollbar"],
    });
    for (const width of [320, 390, 768, 1024, 1440]) {
      p = await start(width, 1100, stabilityBrowser);
      const geometry = () =>
        p.evaluate(() =>
          [
            ...document.querySelectorAll(
              ".frame-nav, .frame-nav-item, .frame-nav-item svg, .frame-nav-item span",
            ),
          ].map((element) => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return [x, y, width, height];
          }),
        );
      await p.addStyleTag({
        content:
          "main { height: 1px !important; min-height: 0 !important; overflow: hidden !important; padding-block: 0 !important; } .frame-footer { display: none !important; }",
      });
      await waitFrame();
      const baseline = await geometry();
      const tall = await p.addStyleTag({ content: "/* short page */" });
      for (const label of ["Schedule", "Food", "You", "Today"]) {
        await p.locator(".frame-nav-item", { hasText: label }).click();
        await p.waitForFunction(
          (name) =>
            document
              .querySelector('.frame-nav [aria-current="page"]')
              ?.textContent.trim() === name,
          label,
        );
        for (const overflowing of [true, false]) {
          await tall.evaluate((style, enabled) => {
            style.textContent = enabled
              ? "main { min-height: 200vh !important; }"
              : "";
          }, overflowing);
          await waitFrame();
          const actual = await geometry();
          if (
            actual.some((rect, i) =>
              rect.some((value, j) => Math.abs(value - baseline[i][j]) > 0.5),
            )
          )
            throw new Error(
              `${label} at ${width}px moved navigation, icons or labels with ${overflowing ? "long" : "short"} content: ${JSON.stringify(baseline)} -> ${JSON.stringify(actual)}`,
            );
        }
      }
      result.checks.push(
        `${width}px: tab clicks and alternating short/long pages keep the bar, items, icons and labels in place.`,
      );
      await p.context().close();
    }
    return result;
  } catch (error) {
    return {
      ...result,
      failure: error.message,
      last: p ? await p.locator("body").innerText().catch(() => "") : "",
    };
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await stabilityBrowser?.close();
  }
};
