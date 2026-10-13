// P2-07: a class-usage check. Every class selector in the app's CSS must be
// used by a component, so dead rules cannot pile up again.
//
// "Used" means the class name appears as a word in a string the code puts on
// an element: a className="…" attribute, a className={…} expression (string
// literals, template text, conditional and array joins), a classList call, or
// a const whose name says it holds classes (e.g. Button's `variants` map).
// Classes composed from runtime values are listed in COMPOSED below, and each
// entry is checked against the source so the allowlist cannot go stale.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    return statSync(file).isDirectory() ? walk(file) : [file];
  });
const files = walk(src);
const cssFiles = files.filter((f) => f.endsWith(".css"));
const codeFiles = files.filter((f) => /\.jsx?$/.test(f));
const read = (file) => readFileSync(file, "utf8");
const rel = (file) => path.relative(root, file).replaceAll("\\", "/");

// Every class in a selector, with file:line. Skips comments, declaration
// bodies, at-rule preludes and @keyframes steps.
export function cssClasses(css, file = "") {
  const found = new Map();
  const text = css.replace(/\/\*[\s\S]*?\*\//g, (c) =>
    c.replace(/[^\n]/g, " "),
  );
  const stack = [];
  let prelude = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "{") {
      const selector = prelude.trim();
      const parent = stack.at(-1) ?? "";
      stack.push(selector);
      prelude = "";
      if (selector.startsWith("@") || parent.startsWith("@keyframes")) continue;
      const line = text.slice(0, i).split("\n").length;
      const bare = selector.replace(/\[[^\]]*\]/g, "").replace(/"[^"]*"/g, "");
      for (const [, name] of bare.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g))
        found.set(name, [...(found.get(name) ?? []), `${file}:${line}`]);
    } else if (c === "}") {
      stack.pop();
      prelude = "";
    } else if (c === ";") prelude = "";
    else prelude += c;
  }
  return found;
}

// The text of every string literal in a JS snippet: quoted strings and the
// static parts of template literals, with ${…} expressions lexed in turn.
export function stringLiterals(code) {
  const out = [];
  let i = 0;
  const scan = (insideTemplate) => {
    let depth = 0;
    while (i < code.length) {
      const c = code[i];
      if (c === "/" && code[i + 1] === "/") {
        const end = code.indexOf("\n", i);
        i = end < 0 ? code.length : end;
      } else if (c === "/" && code[i + 1] === "*") {
        const end = code.indexOf("*/", i + 2);
        i = end < 0 ? code.length : end + 2;
      } else if (c === '"' || c === "'") {
        let s = "";
        for (i++; i < code.length && code[i] !== c && code[i] !== "\n"; i++)
          s += code[i] === "\\" ? code[++i] : code[i];
        out.push(s);
        i++;
      } else if (c === "`") {
        let s = "";
        for (i++; i < code.length && code[i] !== "`";) {
          if (code[i] === "\\") {
            s += code[i + 1];
            i += 2;
          } else if (code[i] === "$" && code[i + 1] === "{") {
            out.push(s);
            s = "";
            i += 2;
            scan(true);
          } else s += code[i++];
        }
        out.push(s);
        i++;
      } else if (c === "{") {
        depth++;
        i++;
      } else if (c === "}") {
        i++;
        if (insideTemplate && depth === 0) return;
        depth--;
      } else i++;
    }
  };
  scan(false);
  return out;
}

// The source text between a bracket at `start` and its partner.
const balanced = (code, start) => {
  const open = code[start];
  const close = { "{": "}", "(": ")", "[": "]" }[open];
  let depth = 0;
  for (let i = start; i < code.length; i++) {
    if (code[i] === open) depth++;
    else if (code[i] === close && --depth === 0)
      return code.slice(start, i + 1);
  }
  return "";
};

// Blanks // and /* */ comments outside strings. A // only opens a comment at
// the start of a line or after whitespace, so "https://…" stays code.
const stripComments = (code) => {
  let out = "";
  let quote = "";
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (quote) {
      out += c;
      if (c === "\\") out += code[++i] ?? "";
      else if (c === quote || (c === "\n" && quote !== "`")) quote = "";
    } else if (c === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      i = end < 0 ? code.length : end + 1;
      out += " ";
    } else if (
      c === "/" &&
      code[i + 1] === "/" &&
      /(^|\s)$/.test(out.slice(-1))
    ) {
      const end = code.indexOf("\n", i);
      i = (end < 0 ? code.length : end) - 1;
    } else {
      if (c === '"' || c === "'" || c === "`") quote = c;
      out += c;
    }
  }
  return out;
};

// The class-bearing snippets of one source file.
export function classSnippets(source) {
  const code = stripComments(source);
  const snippets = [];
  for (const m of code.matchAll(/\bclassName=|\bclassList\.\w+\(/g)) {
    const at = m.index + m[0].length;
    if (m[0].endsWith("(")) snippets.push(balanced(code, at - 1));
    else if (code[at] === '"')
      snippets.push(code.slice(at, code.indexOf('"', at + 1) + 1));
    else if (code[at] === "{") snippets.push(`(${balanced(code, at)})`);
  }
  // const variants = { … } / const classes = [ … ].filter().join(" ")
  for (const m of code.matchAll(
    /\b(?:const|let)\s+\w*(?:[cC]lass|[vV]ariant)\w*\s*=\s*(?=[[{"'`])/g,
  )) {
    const at = m.index + m[0].length;
    snippets.push(
      /[[{]/.test(code[at])
        ? balanced(code, at)
        : code.slice(at, code.indexOf("\n", at)),
    );
  }
  return snippets;
}

const words = (strings) =>
  new Set(strings.flatMap((s) => s.split(/\s+/)).filter(Boolean));

// Classes built from runtime values. Each entry names the source that composes
// them and the source that proves every listed value is real.
const COMPOSED = [
  {
    // <Avatar size="sm|md|lg"> → `avatar avatar-${size}`; md is the default.
    classes: ["avatar-sm", "avatar-md", "avatar-lg"],
    composedIn: "src/components/ui/Avatar.jsx",
    pattern: "avatar-${size}",
    values: [
      ["src/components/ui/Avatar.jsx", 'size = "md"'],
      ["src/components/AppFrame.jsx", 'size="sm"'],
      ["src/pages/Welcome/WelcomePage.jsx", 'size="lg"'],
    ],
  },
  {
    // Activity rows, dots and chips carry the event type as a class
    // (practice has no class rule: it is the default color).
    classes: ["game", "workout", "other", "school"],
    composedIn: "src/pages/Schedule/ScheduleRow.jsx",
    pattern: "schedule-week-row ${event.type}",
    values: [
      ["src/pages/Schedule/ActivitySheet.jsx", '["game", "Game"]'],
      ["src/pages/Schedule/ActivitySheet.jsx", '["workout", "Workout"]'],
      ["src/pages/Schedule/ActivitySheet.jsx", '["other", "Other"]'],
      ["src/pages/Schedule/SchedulePage.jsx", 'type: "school"'],
    ],
  },
];

const defined = new Map();
for (const file of cssFiles)
  for (const [name, where] of cssClasses(read(file), rel(file)))
    defined.set(name, [...(defined.get(name) ?? []), ...where]);

const used = words(
  codeFiles.flatMap((file) =>
    classSnippets(read(file)).flatMap((snippet) => stringLiterals(snippet)),
  ),
);

test("P2-07: the class-usage parsers see real selectors and class strings", () => {
  const css = cssClasses(
    "/* .gone */ .a > .b:is(.c, [data-x='.no']) { color: red; }\n" +
      "@media (min-width: 768px) { .d { margin: 0.5rem; } }\n" +
      "@keyframes k { 50.5% { opacity: 0.5; } }",
  );
  assert.deepEqual([...css.keys()].sort(), ["a", "b", "c", "d"]);
  const code =
    'const x = <div className={`row${on ? " on" : ""} ${kind}`} />;\n' +
    'const y = <p className="one two" />; // className="dead"\n' +
    'el.classList.toggle("lit", true);\n' +
    'const variants = { text: "text-button" };';
  assert.deepEqual(
    [...words(classSnippets(code).flatMap(stringLiterals))].sort(),
    ["lit", "on", "one", "row", "text-button", "two"],
  );
});

test("P2-07: every allowlisted composed class is still real", () => {
  for (const entry of COMPOSED) {
    assert.ok(
      read(path.join(root, entry.composedIn)).includes(entry.pattern),
      `${entry.composedIn} no longer composes ${entry.pattern}`,
    );
    for (const [file, text] of entry.values)
      assert.ok(read(path.join(root, file)).includes(text), `${file}: ${text}`);
    for (const name of entry.classes)
      assert.ok(
        defined.has(name),
        `.${name} has no CSS; drop it from COMPOSED`,
      );
  }
});

test("P2-07: every CSS class selector is used by a component", (t) => {
  const composed = new Set(COMPOSED.flatMap((entry) => entry.classes));
  assert.ok(defined.size > 200, `only ${defined.size} classes parsed`);
  const unused = [...defined]
    .filter(([name]) => !used.has(name) && !composed.has(name))
    .map(([name, where]) => `.${name} (${where.join(", ")})`);
  assert.deepEqual(unused, [], `Unused CSS classes:\n${unused.join("\n")}`);

  // Report only: class names in JSX with no rule. Many are hooks for tests,
  // :has() parents or data-* styling, so this never fails.
  const unstyled = [...used].filter(
    (name) => /^[a-z][a-z0-9-]*$/.test(name) && !defined.has(name),
  );
  t.diagnostic(`${defined.size} CSS classes, all used`);
  t.diagnostic(`${unstyled.length} JSX class names have no CSS rule`);
});

test("P2-07: refinement.css and styles.css are gone", () => {
  const names = cssFiles.map((file) => path.basename(file));
  assert.ok(!names.includes("refinement.css"));
  assert.ok(!names.includes("styles.css"));
});
