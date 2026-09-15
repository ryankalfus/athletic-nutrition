import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { searchFoodDataCentral } from "../usda.js";
import { uid } from "../domain/storage.js";
import { GROCERY_CATALOG } from "../domain/catalog.js";
import { changeData, useStore } from "../store.js";
const BarcodeScanner = lazy(() => import("./BarcodeScanner.jsx"));
export function FoodSearch({ onChoose, initialQuery = "", onQuery }) {
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState("all");
  const [results, setResults] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scan, setScan] = useState(false);
  const request = useRef(null);
  const serial = useRef(0);
  const { current } = useStore();
  const saved = [...current.data.favorites, ...current.data.recentFoods].filter(
    (food, index, foods) => foods.findIndex((f) => f.id === food.id) === index,
  );
  function clear() {
    ++serial.current;
    request.current?.abort();
    setResults(null);
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
  async function search(nextPage = 1) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const id = ++serial.current;
    setResults(null);
    setError("");
    setLoading(true);
    try {
      const data = await searchFoodDataCentral(
        query,
        type,
        controller.signal,
        nextPage,
      );
      if (id === serial.current) {
        setResults({ ...data, query });
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
  if (scan)
    return (
      <Suspense fallback={<p role="status">Opening barcode tools…</p>}>
        <BarcodeScanner onAdd={onChoose} onClose={() => setScan(false)} />
      </Suspense>
    );
  return (
    <section>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <label>
          Search generic or branded food
          <input
            autoFocus
            type="search"
            maxLength={120}
            value={query}
            onChange={(e) => {
              clear();
              setQuery(e.target.value);
              onQuery?.(e.target.value);
            }}
            placeholder="Bread, peanut butter, brand or barcode"
          />
        </label>
        <div className="choice-grid">
          {[
            ["all", "All foods"],
            ["generic", "Generic"],
            ["branded", "Branded"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={type === id}
              className={type === id ? "selected" : ""}
              onClick={() => {
                clear();
                setType(id);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="button-row">
          <button
            className="primary"
            disabled={loading || query.trim().length < 2}
          >
            {loading ? "Searching…" : "Search foods"}
          </button>
          <button type="button" onClick={() => setScan(true)}>
            Barcode
          </button>
          <button
            type="button"
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
            Add manually
          </button>
        </div>
      </form>
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
      <p role="status" aria-live="polite">
        {loading
          ? "Searching food catalog…"
          : results
            ? `${results.totalHits.toLocaleString()} results for ${results.query}. Page ${page}. ${results.mode === "local-snapshot" ? "Local USDA snapshot — not live inventory or prices." : results.mode === "limited-demo" ? "Limited USDA demo connection." : "USDA server connection."}`
            : "Search or choose a saved food."}
      </p>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => search()}>Retry</button>
          <p>Saved foods and manual entry remain available.</p>
        </div>
      )}
      {results?.totalHits === 0 && (
        <p>No matching foods. Try a simpler name or add manually.</p>
      )}
      <div className="food-result-list">
        {(results?.foods || saved).map((food) => (
          <article className="food-result-row" key={food.id}>
            <div>
              <h3>{food.displayName || food.name}</h3>
              <p>
                {food.dataType || food.source} ·{" "}
                {food.nutrients?.calories == null
                  ? "Energy unknown"
                  : `${food.nutrients.calories} kcal / 100 ${food.nutrientBasis || "g"}`}
              </p>
            </div>
            <button
              aria-pressed={current.data.favorites.some(
                (f) => f.id === food.id,
              )}
              aria-label={`Favorite ${food.name}`}
              onClick={() => favorite(food)}
            >
              {current.data.favorites.some((f) => f.id === food.id) ? "★" : "☆"}
            </button>
            <button onClick={() => onChoose(food)}>Choose</button>
          </article>
        ))}
      </div>
      {results && (
        <div className="button-row">
          <button
            disabled={page <= 1 || loading}
            onClick={() => search(page - 1)}
          >
            Previous results
          </button>
          <button
            disabled={page * 18 >= results.totalHits || loading}
            onClick={() => search(page + 1)}
          >
            Next results
          </button>
        </div>
      )}
    </section>
  );
}
