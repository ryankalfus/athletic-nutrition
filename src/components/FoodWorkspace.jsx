import HomePage from "../pages/Food/HomePage.jsx";
import IdeasPage from "../pages/Food/IdeasPage.jsx";
import GroceriesPage from "../pages/Food/GroceriesPage.jsx";
import LogPage from "../pages/Food/LogPage.jsx";
import { useEffect, useRef } from "react";
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
              <span className="tab-badge" aria-label={`, ${unchecked} to buy`}>
                {unchecked}
              </span>
            )}
            {key === "home" && lowOrOut > 0 && (
              <span
                aria-label={`, ${lowOrOut} ${plural(lowOrOut, "item")} low or out`}
              >
                {" "}
                ·
              </span>
            )}
          </a>
        ))}
      </nav>

      {section === "home" && <HomePage todayKey={todayKey} />}
      {section === "groceries" && <GroceriesPage todayKey={todayKey} />}
      {section === "ideas" && <IdeasPage now={now} todayKey={todayKey} />}
      {section === "log" && <LogPage todayKey={todayKey} now={now} />}
    </Shell>
  );
}
