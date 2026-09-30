import { useEffect, useRef } from "react";
import { pageTitle } from "../routing.js";

// A11Y-02 and A11Y-14: every page sets document.title ("Groceries · Nourally").
// After a route change (not the first load), focus moves to the page H1 and the
// page name is read out by the persistent live region in index.html. While a
// dialog is open (a You sheet route), focus stays in the dialog.
export function RouteAnnouncer({ page }) {
  const first = useRef(true);
  useEffect(() => {
    document.title = pageTitle(page);
    if (first.current) {
      first.current = false;
      return undefined;
    }
    const before = document.activeElement;
    const timer = window.setTimeout(() => {
      const heading = document.querySelector("main h1");
      // Leave focus alone if something already took it (a dialog, a field).
      const moved =
        document.activeElement !== before &&
        document.activeElement !== document.body;
      if (heading && !moved && !document.querySelector("dialog[open]")) {
        if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      const region = document.getElementById("route-announcer");
      if (region)
        region.textContent = pageTitle(page).replace(/ · Nourally$/, "");
    }, 60);
    return () => window.clearTimeout(timer);
  }, [page]);
  return null;
}
