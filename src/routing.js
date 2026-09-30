import { useEffect, useSyncExternalStore } from "react";

const routes = new Set([
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
  "welcome",
  "setup",
]);
const redirects = {
  calendar: "schedule",
  weekly: "food/log/week",
  history: "food/log",
  profile: "you",
  reminders: "you/reminders",
  "food/overview": "food/ideas",
  "food/pantry": "food/home",
  "food/meals": "food/ideas",
  food: "food/ideas",
};
const read = () => window.location.hash.replace(/^#\/?/, "") || "today";
const canonical = (raw) => {
  const [path, query] = raw.split("?", 2);
  const target = redirects[path] || path;
  return query ? `${target}?${query}` : target;
};
const subscribe = (callback) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};
export function navigate(path) {
  if (path === "food")
    path = sessionStorage.getItem("nourally-food-route") || "food/ideas";
  path = canonical(path);
  if (["food/ideas", "food/home", "food/groceries", "food/log"].includes(path))
    sessionStorage.setItem("nourally-food-route", path);
  window.location.hash = `/${path}`;
}
export function useRoute() {
  const raw = useSyncExternalStore(subscribe, read);
  const route = canonical(raw);
  useEffect(() => {
    if (raw !== route)
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}#/${route}`,
      );
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [raw, route]);
  const path = route.split("?")[0];
  const view =
    routes.has(path) || /^food\/log(\/week)?\/\d{4}-\d{2}-\d{2}$/.test(path)
      ? path.split("/")[0]
      : "notFound";
  return [view, navigate, path.split("/").slice(1).join("/") || "ideas"];
}

// Page names for document.title and the route announcer (A11Y-02, A11Y-14).
// Dated Log routes and the You sheets count as their parent page, so moving
// between days or closing a sheet does not move focus.
const pageNames = {
  today: "Today",
  schedule: "Schedule",
  "food/ideas": "Ideas",
  "food/home": "At home",
  "food/groceries": "Groceries",
  "food/log": "Log",
  "food/log/week": "Log › Week",
  you: "You",
  "you/device": "This device",
  "you/about": "About",
  welcome: "Welcome",
  setup: "Setup",
};
export function pageOf(hash) {
  const path = canonical(hash.replace(/^#\/?/, "") || "today").split("?")[0];
  const page = path
    .replace(/\/\d{4}-\d{2}-\d{2}$/, "")
    .replace(/^you\/(sport|needs|access|reminders)$/, "you");
  return pageNames[page] ? page : "notFound";
}
export function pageTitle(page) {
  return `${pageNames[page] || "Page not found"} · Nourally`;
}
