// Tab-scoped "signed out" flag shared by the store and the app shell.
// Keeping it outside React state means a profile delete or a remount can
// never leave a stale `signedOut = false` that lets reminders fire on Welcome.
const KEY = "nourally-signed-out";

export function createSignedOutFlag(storage, initial = false) {
  let value = initial;
  try {
    value = value || storage?.getItem(KEY) === "1";
  } catch {
    /* Storage can be unavailable in private windows. */
  }
  const listeners = new Set();
  return {
    get: () => value,
    set(next) {
      value = Boolean(next);
      try {
        if (value) storage?.setItem(KEY, "1");
        else storage?.removeItem(KEY);
      } catch {
        /* The in-memory flag still guards this tab. */
      }
      listeners.forEach((fn) => fn());
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export const signedOutFlag = createSignedOutFlag(
  typeof sessionStorage === "undefined" ? null : sessionStorage,
  typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("signedOut") === "1",
);
