// ADD-06: share Pack & prep, tomorrow's list and groceries as plain text so a
// parent can help without an account. Web Share when the browser has it,
// otherwise copy to the clipboard.
import { formatTime } from "../format.js";
import { shoppingAmount } from "./food.js";

const clean = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

// One task per line, no internal IDs (J7): "[ ] Pack Banana + pretzels · by 7:15 AM".
export function checklistLine(task) {
  const due = task.dueAt ? ` · by ${clean(formatTime(task.dueAt))}` : "";
  return `${task.done ? "[x]" : "[ ]"} ${clean(task.label)}${due}`;
}

/**
 * @param {{title: string, subtitle?: string, context?: string[], tasks: any[]}} list
 */
export function formatChecklistText({ title, subtitle, context = [], tasks }) {
  const heading = [clean(title), clean(subtitle)].filter(Boolean).join(" · ");
  return [
    heading,
    ...context.map(clean).filter(Boolean),
    ...tasks.map(checklistLine),
  ].join("\n");
}

// Groceries: only what is still to buy; checked items are already in the cart.
export function groceryShareItems(items = []) {
  return items.filter((item) => !item.checked && clean(item.name));
}

export function formatGroceryText(items = [], { title = "Groceries" } = {}) {
  const list = groceryShareItems(items);
  return [
    `${title} · ${list.length} ${list.length === 1 ? "item" : "items"}`,
    ...list.map((item) => `[ ] ${clean(item.name)} · ${shoppingAmount(item)}`),
  ].join("\n");
}

export function canWebShare(env = globalThis) {
  return typeof env?.navigator?.share === "function";
}

// Button text follows what will happen (J7 step 4).
export function shareActionLabel(env = globalThis) {
  return canWebShare(env) ? "Share list" : "Copy list";
}

function legacyCopy(text, doc) {
  if (!doc?.createElement || !doc.body) return false;
  const area = doc.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  doc.body.appendChild(area);
  area.select();
  try {
    return Boolean(doc.execCommand?.("copy"));
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

export const SHARE_ERROR = "Couldn't copy the list. Try again.";

/**
 * Share with the Web Share API, falling back to the clipboard.
 * Resolves "shared", "copied" or "cancelled"; rejects with SHARE_ERROR.
 * @param {{title: string, text: string}} payload
 */
export async function shareOrCopy({ title, text }, env = globalThis) {
  const nav = env?.navigator;
  if (canWebShare(env) && nav.canShare?.({ title, text }) !== false) {
    try {
      await nav.share({ title, text });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
      // NotAllowedError and friends: fall through to copying.
    }
  }
  if (typeof nav?.clipboard?.writeText === "function") {
    try {
      await nav.clipboard.writeText(text);
      return "copied";
    } catch {
      // Clipboard can be blocked (permissions, insecure origin); try legacy.
    }
  }
  if (legacyCopy(text, env?.document)) return "copied";
  throw new Error(SHARE_ERROR);
}

export const SHARE_MESSAGES = {
  shared: "List shared.",
  copied: "List copied. Paste it in a message.",
};
