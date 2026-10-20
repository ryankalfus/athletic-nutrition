import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const stylesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "styles",
);

// RWD-01: viewport queries are mobile-first min-width queries on the audit's
// scale (480, 768, 1024, 1200 px). 1280 px is the Ideas grid's third column
// (9.2). No max-width queries and no off-scale steps such as 360 px.
test("RWD-01: media queries use only the 480/768/1024/1200 px breakpoints", () => {
  const allowed = new Set([480, 768, 1024, 1200, 1280]);
  const found = [];
  for (const file of readdirSync(stylesDir).filter((f) => f.endsWith(".css"))) {
    const css = readFileSync(path.join(stylesDir, file), "utf8");
    for (const match of css.matchAll(/@media\s+([^{]+)\{/g)) {
      const query = match[1].trim();
      assert.doesNotMatch(query, /max-width/, `${file}: ${query}`);
      for (const width of query.matchAll(/min-width:\s*(\d+)px/g)) {
        found.push(Number(width[1]));
        assert.ok(
          allowed.has(Number(width[1])),
          `${file}: off-scale breakpoint ${query}`,
        );
      }
    }
  }
  assert.ok(found.includes(480) && found.includes(768) && found.includes(1024));
});

// U1-02 (UX-BUG-04, UX-NAV-07): iPhones report safe-area insets only with
// viewport-fit=cover. Every sticky or fixed element pinned to the top of the
// window pads its content below the status bar, and every sticky element that
// sits under the top bar moves down by the same inset. A dialog's own header
// is sticky inside the sheet, which never reaches the top (max 92dvh).
test("U1-02: viewport-fit=cover and safe-area top padding on top bars", () => {
  const html = readFileSync(
    path.join(stylesDir, "..", "..", "index.html"),
    "utf8",
  );
  const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/);
  assert.ok(viewport, "index.html has no viewport meta");
  assert.match(viewport[1], /(^|,\s*)viewport-fit=cover(\s*,|$)/);
  const insideSheet = /^\.app-dialog\b/;
  const pinned = [];
  for (const file of readdirSync(stylesDir).filter((f) => f.endsWith(".css"))) {
    const css = readFileSync(path.join(stylesDir, file), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    for (const [, rawSelector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = rawSelector.trim().replace(/\s+/g, " ");
      if (!/position:\s*(sticky|fixed)/.test(body)) continue;
      const top = body.match(/(?:^|;)\s*top:\s*([^;]+)/)?.[1].trim();
      const inset = body.match(/(?:^|;)\s*inset:\s*([^;]+)/)?.[1].trim();
      const atTop = top === "0" || (inset && inset.split(/\s+/)[0] === "0");
      if (atTop && !insideSheet.test(selector)) {
        pinned.push(selector);
        assert.match(
          body.match(/padding-top:\s*([^;]+)/)?.[1] || "",
          /env\(safe-area-inset-top\)/,
          `${file}: ${selector} is pinned to the top without safe-area padding`,
        );
      }
      if (top && /--top-bar/.test(top))
        assert.match(
          top,
          /env\(safe-area-inset-top\)/,
          `${file}: ${selector} sticks under the top bar but ignores its safe-area inset`,
        );
    }
  }
  assert.ok(pinned.includes(".frame-header"), "the top bar was not checked");
});

// Custom properties set in tokens.css: the base :root block and the :root
// block inside each min-width media query, keyed by width (0 = base).
const tokenBlocks = () => {
  const css = readFileSync(path.join(stylesDir, "tokens.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const read = (body) =>
    new Map(
      [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, n, v]) => [
        n,
        v.trim().replace(/\s+/g, " "),
      ]),
    );
  const blocks = new Map([[0, read(css.match(/^:root\s*\{([^}]*)\}/m)[1])]]);
  for (const [, width, body] of css.matchAll(
    /@media \(min-width: (\d+)px\) \{\s*:root \{([^}]*)\}\s*\}/g,
  ))
    blocks.set(Number(width), read(body));
  return blocks;
};

// U2-01 (UX-DS-01): the redesign keeps every color. The 42 color values in
// tokens.css as of 2026.10.15 (unchanged since 2026.10.09) are pinned; any
// other --color-* token is a role alias of one of them, never a new value.
const PINNED_COLORS = {
  "--color-paper": "#f7f6f2",
  "--color-surface": "#fff",
  "--color-surface-muted": "#efeee8",
  "--color-hover": "#eef3f1",
  "--color-ink": "#14333c",
  "--color-ink-muted": "#52656b",
  "--color-ink-subtle": "#66746f",
  "--color-on-dark": "#fff",
  "--color-on-dark-muted": "#d3e0e0",
  "--color-line": "#dddbd2",
  "--color-line-strong": "#7a847f",
  "--color-line-dark": "rgb(255 255 255 / 0.24)",
  "--color-on-dark-hover": "rgb(255 255 255 / 0.08)",
  "--color-on-dark-fill": "rgb(255 255 255 / 0.12)",
  "--color-on-dark-disabled": "rgb(255 255 255 / 0.16)",
  "--color-pitch": "#0f3640",
  "--color-pitch-end": "#16484a",
  "--color-lime": "#d7f45f",
  "--color-lime-hover": "#c8e64c",
  "--color-primary": "#08777c",
  "--color-primary-hover": "#065f65",
  "--color-primary-pressed": "#054f54",
  "--color-focus": "#05666d",
  "--color-focus-dark": "#e5ff91",
  "--color-selected-bg": "#e3f1ef",
  "--color-backdrop": "rgb(15 44 56 / 0.48)",
  "--color-success": "#1e6b3a",
  "--color-success-tint": "#e6f2e9",
  "--color-warning": "#8a5300",
  "--color-warning-tint": "#fdf1dc",
  "--color-error": "#a12c24",
  "--color-error-hover": "#862019",
  "--color-error-tint": "#fbeae8",
  "--color-info": "#1f5a96",
  "--color-info-tint": "#e7f0fa",
  "--color-school": "#5b6b8a",
  "--color-practice": "#08777c",
  "--color-game": "#c2410c",
  "--color-workout": "#6d4fb3",
  "--color-travel": "#9a6700",
  "--color-food-moment": "#3f7d20",
  "--color-other": "#52656b",
};

test("U2-01 (UX-DS-01): all 42 color values are pinned", () => {
  assert.equal(Object.keys(PINNED_COLORS).length, 42);
  const blocks = tokenBlocks();
  for (const [name, value] of Object.entries(PINNED_COLORS))
    assert.equal(blocks.get(0).get(name), value, `${name} changed`);
  for (const [width, block] of blocks)
    for (const [name, value] of block) {
      if (!name.startsWith("--color-")) continue;
      if (width === 0 && name in PINNED_COLORS) continue;
      const alias = value.match(/^var\((--color-[\w-]+)\)$/)?.[1];
      assert.ok(
        alias in PINNED_COLORS,
        `${name} at ${width}px is ${value}: a new color, not a role alias`,
      );
    }
});

test("U2-01: tokens.css is the only stylesheet with literal colors", () => {
  for (const file of readdirSync(stylesDir).filter((f) => f.endsWith(".css"))) {
    if (file === "tokens.css") continue;
    const css = readFileSync(path.join(stylesDir, file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/url\("data:[^"]*"\)/g, "");
    const literal = css.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/);
    assert.equal(literal, null, `${file} has a literal color: ${literal?.[0]}`);
  }
});

// U2-01: every token the plan's 4.4 adds exists with the plan's value, and
// the UX-DS-09 type scale holds on phones and from 1024px (UX-DS-03,
// UX-DS-06, UX-DS-08, UX-DS-09).
test("U2-01: the 4.4 token plan and the UX-DS-09 type scale", () => {
  const blocks = tokenBlocks();
  const base = blocks.get(0);
  const tablet = new Map([...base, ...blocks.get(768)]);
  const desk = new Map([...base, ...blocks.get(1024)]);
  const plan = {
    "--surface-glass": "rgb(247 246 242 / 0.82)",
    "--surface-glass-solid": "rgb(247 246 242 / 0.97)",
    "--surface-glass-dark": "rgb(20 51 60 / 0.92)",
    "--blur-glass": "blur(20px) saturate(180%)",
    "--color-hero": "var(--color-pitch)",
    "--color-hero-inset": "var(--color-pitch-end)",
    "--radius-segment": "10px",
    "--radius-control": "14px",
    "--radius-float": "24px",
    "--radius-toast": "16px",
    "--radius-sheet": "28px",
    "--radius-hero": "28px",
    "--radius-full": "999px",
    "--elev-float":
      "0 0 0 1px rgb(20 51 60 / 0.06), 0 8px 32px rgb(15 44 56 / 0.16)",
    "--elev-sheet": "0 -8px 40px rgb(15 44 56 / 0.2)",
    "--elev-menu":
      "0 0 0 1px rgb(20 51 60 / 0.08), 0 12px 32px rgb(15 44 56 / 0.18)",
    "--control-height": "52px",
    "--cta-height": "56px",
    "--row-min": "56px",
    "--tab-bar": "64px",
    "--tab-inset": "12px",
    "--tab-bar-max": "440px",
    "--top-bar-glass": "52px",
    "--hero-track": "4px",
  };
  for (const [name, value] of Object.entries(plan))
    assert.equal(base.get(name), value, name);
  // Role: [phone size/leading, 1024px size/leading].
  const scale = {
    display: ["44/46", "64/68"],
    "large-title": ["34/40", "40/44"],
    hero: ["40/42", "56/58"],
    h2: ["20/26", "22/28"],
    h3: ["17/22", "18/24"],
    time: ["17/22", "18/24"],
    body: ["16/24", "16/24"],
    small: ["14/20", "14/20"],
    caption: ["13/18", "13/18"],
    label: ["15/20", "15/20"],
    tab: ["12/16", "12/16"],
  };
  const pair = (block, role) =>
    [`--text-${role}`, `--leading-${role}`]
      .map((name) => parseFloat(block.get(name)))
      .join("/");
  for (const [role, [phone, desktop]] of Object.entries(scale)) {
    assert.equal(pair(base, role), phone, `${role} on phones`);
    assert.equal(pair(desk, role), desktop, `${role} from 1024px`);
  }
  assert.equal(base.get("--weight-h2"), "650");
  assert.equal(base.get("--tracking-display"), "-0.025em");
  assert.equal(base.get("--tracking-title"), "-0.02em");
  // UX-DS-08: gutters 16 / 24 / 32; sections 32, then 40 from 1024px;
  // title to first row 8; rows 12; flow fields 24.
  const px = (block, name) => {
    const value = block.get(name);
    return base.get(value.match(/^var\((--space-\d+)\)$/)?.[1]) ?? value;
  };
  assert.equal(px(base, "--gutter"), "16px");
  assert.equal(px(tablet, "--gutter"), "24px");
  assert.equal(px(desk, "--gutter"), "32px");
  assert.equal(px(base, "--rhythm-section"), "32px");
  assert.equal(px(desk, "--rhythm-section"), "40px");
  assert.equal(px(base, "--rhythm-title"), "8px");
  assert.equal(px(base, "--rhythm-row"), "12px");
  assert.equal(px(base, "--rhythm-field"), "24px");
  // Renamed in U2-01: h1 is the large title, Numeral M is the time size.
  for (const old of [
    "--text-h1",
    "--leading-h1",
    "--text-numeral-m",
    "--leading-numeral-m",
  ])
    assert.ok(!base.has(old), `${old} was renamed in U2-01`);
});

// U2-01: base elements use the scale: h1 is the large title, h2 the section
// title at 650, small and field hints are Small 14/20, labels are Label.
test("U2-01: base elements use the UX-DS-09 roles", () => {
  const css = readFileSync(path.join(stylesDir, "base.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const rule = (selector) => {
    const match = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
      ([, s]) => s.trim() === selector,
    );
    assert.ok(match, `base.css has no ${selector} rule`);
    return match[2];
  };
  assert.match(rule("h1"), /font-size: var\(--text-large-title\)/);
  assert.match(rule("h1"), /letter-spacing: var\(--tracking-title\)/);
  assert.match(rule("h2"), /font-size: var\(--text-h2\)/);
  assert.match(rule("h2"), /font-weight: var\(--weight-h2\)/);
  assert.match(rule("h3"), /font-size: var\(--text-h3\)/);
  assert.match(rule("body"), /font-size: var\(--text-body\)/);
  assert.match(rule("small"), /font-size: var\(--text-small\)/);
  assert.match(rule(".field-hint"), /font-size: var\(--text-small\)/);
  assert.match(rule("label"), /font-size: var\(--text-label\)/);
  assert.match(rule("legend"), /font-size: var\(--text-label\)/);
});
