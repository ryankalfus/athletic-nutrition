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
  "you/reminders",
  "welcome",
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
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/${route}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [raw, route]);
  const path = route.split("?")[0];
  const view = routes.has(path) ? path.split("/")[0] : "notFound";
  return [
    view,
    navigate,
    path.split("/").slice(1).join("/") || "ideas",
  ];
}
