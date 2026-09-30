import HomePage from "../pages/Food/HomePage.jsx";
import IdeasPage from "../pages/Food/IdeasPage.jsx";
import GroceriesPage from "../pages/Food/GroceriesPage.jsx";
import LogPage from "../pages/Food/LogPage.jsx";
import { useEffect, useRef, useState } from "react";
import { stockStatus } from "../domain/food.js";
import { useStore } from "../store.js";
import { useRoute } from "../routing.js";
import { plural } from "../format.js";
import { Shell } from "./AppFrame.jsx";

const tabs = [
  ["ideas", "Ideas"],
  ["home", "At home"],
  ["groceries", "Groceries"],
  ["log", "Log"],
];

export default function FoodHub({ now, todayKey }) {
  const { current } = useStore();
  const data = current.data;
  const grocery = data.groceryState;
  const [, navigate, subroute] = useRoute();
  const first = subroute.split("/")[0];
  const section = tabs.some(([key]) => key === first) ? first : "ideas";
  const foodNav = useRef(null);
  const bar = useRef(null);
  const [stuck, setStuck] = useState(false);
  // A hairline under the section bar once it sticks: the page has scrolled
  // and the bar sits at its sticky offset.
  useEffect(() => {
    const check = () => {
      const node = bar.current;
      if (!node) return;
      const top = parseFloat(getComputedStyle(node).top) || 0;
      setStuck(
        window.scrollY > 0 && node.getBoundingClientRect().top <= top + 1,
      );
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  // Focus and the section name announcement come from RouteAnnouncer (A11Y-02).
  useEffect(() => {
    foodNav.current
      ?.querySelector(".active")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [section]);
  const unchecked = grocery.items.filter(
    (i) => !i.checked && i.status !== "bought",
  ).length;
  const lowOrOut = grocery.pantry.filter(
    (i) => stockStatus(i) !== "have",
  ).length;

  return (
    <Shell>
      <header className="dashboard-head">
        <div>
          <h1 className="page-title">Food</h1>
        </div>
      </header>
      {/* The sticky strip spans the column, so rows never scroll past
          beside it; the track inside keeps its own width. */}
      <div ref={bar} className={`food-sections-bar${stuck ? " is-stuck" : ""}`}>
        <nav className="food-sections" aria-label="Food sections" ref={foodNav}>
          {tabs.map(([key, label]) => (
            <a
              key={key}
              href={`#/food/${key}`}
              aria-current={section === key ? "page" : undefined}
              className={section === key ? "active" : ""}
              onClick={() => navigate(`food/${key}`)}
            >
              {label}
              {key === "groceries" && unchecked > 0 && (
                <span
                  className="tab-badge"
                  aria-label={`, ${unchecked} to buy`}
                >
                  {unchecked}
                </span>
              )}
              {key === "home" && lowOrOut > 0 && (
                <>
                  <span className="tab-dot" aria-hidden="true" />
                  <span className="sr-only">
                    , {lowOrOut} {plural(lowOrOut, "item")} low or out
                  </span>
                </>
              )}
            </a>
          ))}
        </nav>
      </div>

      {section === "home" && <HomePage todayKey={todayKey} />}
      {section === "groceries" && <GroceriesPage todayKey={todayKey} />}
      {section === "ideas" && <IdeasPage now={now} todayKey={todayKey} />}
      {section === "log" && <LogPage todayKey={todayKey} now={now} />}
    </Shell>
  );
}
