import { useEffect, useSyncExternalStore } from "react";
const destinations = new Set([
  "today",
  "food",
  "calendar",
  "weekly",
  "history",
  "profile",
]);
const read = () => window.location.hash.replace(/^#\/?/, "") || "today";
const subscribe = (callback) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};
export function navigate(path) {
  if (path === "food")
    path = sessionStorage.getItem("nourally-food-route") || "food/overview";
  if (path.startsWith("food/"))
    sessionStorage.setItem("nourally-food-route", path);
  window.location.hash = `/${path}`;
}
export function useRoute() {
  const route = useSyncExternalStore(subscribe, read);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document
      .querySelectorAll(".mobile-more[open]")
      .forEach((node) => node.removeAttribute("open"));
  }, [route]);
  const view = route.split("/")[0];
  return [
    destinations.has(view) ? view : "today",
    navigate,
    route.split("/")[1] || "overview",
  ];
}
