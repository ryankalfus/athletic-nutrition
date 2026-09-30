import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  collapseFoodMatches,
  searchFoodDataCentral,
  sentenceCaseFoodName,
} from "../usda.js";
import { uid } from "../domain/storage.js";
import { GROCERY_CATALOG } from "../domain/catalog.js";
import { LabelCheck } from "./ui/LabelCheck.jsx";
import { searchableFavorites } from "../domain/ranking.js";
import {
  portionHint,
  resultSubline,
  searchSchedule,
} from "../domain/search.js";
import { changeData, useStore } from "../store.js";
import { Skeleton } from "./ui/Skeleton.jsx";
import { IconButton } from "./ui/Button.jsx";
import { ScanBarcode, Star } from "lucide-react";
const BarcodeScanner = lazy(() => import("./BarcodeScanner.jsx"));

// One search result (SRCH-01, SRCH-02, SRCH-07): name, one sub-line with the
// brand or "Basic food" and a portion hint, the allergen line for products,
// and one Add button.
function FoodResult({ food, saved, onFavorite, onChoose }) {
  const name = sentenceCaseFoodName(food.name);
  const hint = portionHint(food);
  return (
    <li className="food-result-row">
      <div>
        <h3>{name}</h3>
        <p>{resultSubline(food)}</p>
        <LabelCheck food={food} />
      </div>
      <button
        className="icon-button"
        aria-pressed={saved}
        aria-label={`Save ${name}`}
        onClick={() => onFavorite(food)}
      >
        <Star
          size={20}
          strokeWidth={1.75}
          fill={saved ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>
      <button
        onClick={() => onChoose(food)}
        aria-label={`Add ${name}${hint ? `, ${hint.label}` : ""}`}
      >
        Add
      </button>
    </li>
  );
}

export function FoodSearch({
  onChoose,
  initialQuery = "",
  onQuery,
  searchInputRef,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [providerMode, setProviderMode] = useState("api");
  const [results, setResults] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scan, setScan] = useState(false);
  const [offline, setOffline] = useState(() => navigator.onLine === false);
  const request = useRef(null);
  const serial = useRef(0);
  const { current } = useStore();
  const favorites = current.data.favorites;
  // Saved meal ideas live on Ideas; search lists saved foods only (IDEA-05).
  const savedFoods = searchableFavorites(favorites);
  const recent = current.data.recentFoods.filter(
    (food) => !favorites.some((favorite) => favorite.id === food.id),
  );
  const term = query.trim();
  useEffect(
    () => () => {
      ++serial.current;
      request.current?.abort();
    },
    [],
  );
  useEffect(() => {
    const update = () => setOffline(navigator.onLine === false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    fetch("/api/foods/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((status) =>
        setProviderMode(status?.mode === "local-snapshot" ? "local" : "api"),
      )
      .catch(() => setProviderMode("api"));
  }, []);
  // With the local catalog, search 300 ms after typing stops; the live USDA
  // key is limited, so API mode searches on Enter (6.15 Interactions).
  useEffect(() => {
    const plan = searchSchedule(query, { mode: providerMode, offline });
    if (!plan.run) return;
    const timer = window.setTimeout(() => search(1, query), plan.delay);
    return () => window.clearTimeout(timer);
  }, [query, providerMode, offline]);
  async function search(nextPage = 1, text = query) {
    const needle = text.trim();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const id = ++serial.current;
    setError("");
    setLoading(true);
    try {
      const data = await searchFoodDataCentral(
        needle,
        "all",
        controller.signal,
        nextPage,
      );
      if (id === serial.current) {
        setResults((previous) =>
          nextPage > 1 && previous?.query === needle
            ? {
                ...data,
                query: needle,
                foods: collapseFoodMatches([...previous.foods, ...data.foods]),
              }
            : { ...data, query: needle },
        );
        setPage(nextPage);
      }
    } catch (e) {
      // Offline shows one status line, not a second error (SRCH-06).
      if (id === serial.current && e.name === "OfflineError") setOffline(true);
      else if (id === serial.current && e.name !== "AbortError")
        setError(e.message);
    } finally {
      if (id === serial.current) setLoading(false);
    }
  }
  const favorite = (food) =>
    changeData(
      (data) => {
        data.favorites = data.favorites.some((f) => f.id === food.id)
          ? data.favorites.filter((f) => f.id !== food.id)
          : [...data.favorites, food];
      },
      favorites.some((f) => f.id === food.id)
        ? `Removed ${sentenceCaseFoodName(food.name)} from Saved.`
        : `Saved ${sentenceCaseFoodName(food.name)}.`,
    );
  const list = (foods) => (
    <ul className="food-result-list">
      {foods.map((food) => (
        <FoodResult
          key={food.id}
          food={food}
          saved={favorites.some((item) => item.id === food.id)}
          onFavorite={favorite}
          onChoose={onChoose}
        />
      ))}
    </ul>
  );
  if (scan)
    return (
      <Suspense fallback={<Skeleton label="Opening barcode tools" rows={2} />}>
        <BarcodeScanner onAdd={onChoose} onClose={() => setScan(false)} />
      </Suspense>
    );
  const current$ = results?.query === term;
  return (
    <section className="food-search">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const plan = searchSchedule(query, { submitted: true, offline });
          if (plan.run) search(1, query);
        }}
      >
        <div className="food-search-field">
          <label>
            Search foods
            <input
              ref={searchInputRef}
              type="search"
              enterKeyHint="search"
              maxLength={120}
              value={query}
              onChange={(e) => {
                ++serial.current;
                request.current?.abort();
                setError("");
                setLoading(false);
                setPage(1);
                if (e.target.value.trim().length < 2) setResults(null);
                setQuery(e.target.value);
                onQuery?.(e.target.value);
              }}
              placeholder="Search foods or brands"
            />
          </label>
          <IconButton
            label="Scan barcode"
            icon={ScanBarcode}
            onClick={() => setScan(true)}
          />
        </div>
        {providerMode === "api" &&
          term.length >= 2 &&
          !current$ &&
          !loading && (
            <p className="muted field-hint">Press Enter to search.</p>
          )}
      </form>
      {/* Always rendered so screen readers hear the change (A11Y-07). */}
      <p role="status" className={offline ? "" : "sr-only"}>
        {offline ? "You're offline. Recent and saved foods still work." : ""}
      </p>
      {!term && recent.length > 0 && (
        <section aria-labelledby="search-recent">
          <h3 id="search-recent">Recent</h3>
          {list(recent)}
        </section>
      )}
      {!term && savedFoods.length > 0 && (
        <section aria-labelledby="search-saved">
          <h3 id="search-saved">Saved</h3>
          {list(savedFoods)}
        </section>
      )}
      {!term && !results && (
        <div className="quick-basics">
          <h3>Quick basics</h3>
          <div className="button-row">
            {GROCERY_CATALOG.slice(0, 8).map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  onChoose({
                    id: `basic-${item.id}`,
                    name: item.name,
                    ingredientId: item.id,
                    source: "Manual",
                    nutrientBasis: "g",
                    nutrients: { calories: null },
                  })
                }
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {loading && !results && <Skeleton label="Finding foods" />}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => search(page > 1 ? page : 1)}>Retry</button>
          <p>Saved foods and manual entry remain available.</p>
        </div>
      )}
      <p
        role="status"
        className={current$ && !results.foods.length ? "" : "sr-only"}
      >
        {current$ && !results.foods.length
          ? "No matching foods. Try a simpler name or add it yourself."
          : ""}
      </p>
      {results && results.foods.length > 0 && (
        <div
          className={`food-results${current$ ? "" : " stale"}`}
          aria-busy={loading}
        >
          {list(results.foods)}
        </div>
      )}
      {results && current$ && results.hasMore && (
        <div className="button-row">
          <button disabled={loading} onClick={() => search(page + 1)}>
            {loading ? "Loading…" : "Show more results"}
          </button>
        </div>
      )}
      <button
        className="text-button"
        onClick={() =>
          onChoose({
            id: `manual-${uid()}`,
            name: term || "Food",
            source: "Manual",
            nutrients: { calories: null },
            nutrientBasis: "g",
          })
        }
      >
        Can’t find it? Add it yourself
      </button>
    </section>
  );
}
