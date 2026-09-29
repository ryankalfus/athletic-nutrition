import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  collapseFoodMatches,
  searchFoodDataCentral,
  sentenceCaseFoodName,
} from "../usda.js";
import { uid } from "../domain/storage.js";
import { GROCERY_CATALOG } from "../domain/catalog.js";
import { LabelCheck } from "./ui/LabelCheck.jsx";
import { changeData, useStore } from "../store.js";
const BarcodeScanner = lazy(() => import("./BarcodeScanner.jsx"));
export function FoodSearch({
  onChoose,
  initialQuery = "",
  onQuery,
  searchInputRef,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [providerMode, setProviderMode] = useState("manual");
  const [results, setResults] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scan, setScan] = useState(false);
  const [offline, setOffline] = useState(() => navigator.onLine === false);
  const request = useRef(null);
  const serial = useRef(0);
  const { current } = useStore();
  const recent = current.data.recentFoods.filter(
    (food) =>
      !current.data.favorites.some((favorite) => favorite.id === food.id),
  );
  function clear() {
    ++serial.current;
    request.current?.abort();
    setError("");
    setLoading(false);
    setPage(1);
  }
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
        setProviderMode(status?.mode === "local-snapshot" ? "local" : "manual"),
      )
      .catch(() => setProviderMode("manual"));
  }, []);
  useEffect(() => {
    if (providerMode !== "local" || query.trim().length < 2 || offline) return;
    const timer = window.setTimeout(() => search(1, query), 300);
    return () => window.clearTimeout(timer);
  }, [query, providerMode, offline]);
  async function search(nextPage = 1, term = query) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const id = ++serial.current;
    setError("");
    setLoading(true);
    try {
      const data = await searchFoodDataCentral(
        term,
        "all",
        controller.signal,
        nextPage,
      );
      if (id === serial.current) {
        setResults((previous) =>
          nextPage > 1 && previous?.query === term
            ? {
                ...data,
                query: term,
                foods: collapseFoodMatches([...previous.foods, ...data.foods]),
              }
            : { ...data, query: term },
        );
        setPage(nextPage);
      }
    } catch (e) {
      if (id === serial.current && e.name !== "AbortError") setError(e.message);
    } finally {
      if (id === serial.current) setLoading(false);
    }
  }
  const favorite = (food) =>
    changeData((data) => {
      data.favorites = data.favorites.some((f) => f.id === food.id)
        ? data.favorites.filter((f) => f.id !== food.id)
        : [...data.favorites, food];
    });
  function foodRow(food) {
    return (
      <article className="food-result-row" key={food.id}>
        <div>
          <h3>{sentenceCaseFoodName(food.name)}</h3>
          <p>
            {food.brand ? `Brand: ${food.brand}` : "Basic food"}
            {food.householdServing
              ? ` · ${food.householdServing}`
              : food.servingSize && ["g", "ml"].includes(food.servingSizeUnit)
                ? ` · ${food.servingSize} ${food.servingSizeUnit || "g"} serving`
                : ""}
          </p>
          <LabelCheck />
        </div>
        <button
          aria-pressed={current.data.favorites.some(
            (item) => item.id === food.id,
          )}
          aria-label={`Favorite ${sentenceCaseFoodName(food.name)}`}
          onClick={() => favorite(food)}
        >
          {current.data.favorites.some((item) => item.id === food.id)
            ? "★"
            : "☆"}
        </button>
        <button
          onClick={() => onChoose(food)}
          aria-label={`Add ${sentenceCaseFoodName(food.name)}${food.householdServing ? `, ${food.householdServing}` : ""}`}
        >
          Add
        </button>
      </article>
    );
  }
  if (scan)
    return (
      <Suspense fallback={<p role="status">Opening barcode tools…</p>}>
        <BarcodeScanner onAdd={onChoose} onClose={() => setScan(false)} />
      </Suspense>
    );
  return (
    <section className="food-search">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim().length >= 2) search(1, query);
        }}
      >
        <div className="food-search-field">
          <label>
            Search foods
            <input
              ref={searchInputRef}
              autoFocus
              type="search"
              maxLength={120}
              value={query}
              onChange={(e) => {
                clear();
                if (e.target.value.trim().length < 2) setResults(null);
                setQuery(e.target.value);
                onQuery?.(e.target.value);
              }}
              placeholder="Search foods or brands"
            />
          </label>
          <button
            type="button"
            onClick={() => setScan(true)}
            aria-label="Scan barcode"
          >
            Barcode
          </button>
        </div>
      </form>
      {offline && (
        <p role="status">You're offline. Recent and saved foods still work.</p>
      )}
      {!query && recent.length > 0 && (
        <section>
          <h3>Recent</h3>
          <div className="food-result-list">{recent.map(foodRow)}</div>
        </section>
      )}
      {!query && current.data.favorites.length > 0 && (
        <section>
          <h3>Saved</h3>
          <div className="food-result-list">
            {current.data.favorites.map(foodRow)}
          </div>
        </section>
      )}
      {!query && !results && (
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
      {loading && !results && (
        <div
          role="status"
          aria-label="Finding foods"
          className="food-search-loading"
        >
          {[0, 1, 2].map((row) => (
            <span key={row} aria-hidden="true" />
          ))}
        </div>
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => search()}>Retry</button>
          <p>Saved foods and manual entry remain available.</p>
        </div>
      )}
      {results?.query === query && results.totalHits === 0 && (
        <p role="status">
          No matching foods. Try a simpler name or add manually.
        </p>
      )}
      {results && (
        <div
          className={`food-result-list${results.query !== query ? " stale" : ""}`}
          aria-busy={loading}
        >
          {results.foods.map(foodRow)}
        </div>
      )}
      {results && page * 18 < results.totalHits && (
        <div className="button-row">
          <button disabled={loading} onClick={() => search(page + 1)}>
            Show more results
          </button>
        </div>
      )}
      <button
        className="text-button"
        onClick={() =>
          onChoose({
            id: `manual-${uid()}`,
            name: query.trim() || "Food",
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
