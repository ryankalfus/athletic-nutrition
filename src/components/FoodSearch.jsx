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
import { EmptyState } from "./ui/EmptyState.jsx";
import { QuickAddList } from "./ui/QuickAddList.jsx";
import { allergenLine } from "../domain/search.js";
import { IconButton } from "./ui/Button.jsx";
import { SearchX, ScanBarcode, Star, WifiOff } from "lucide-react";
import { useAsyncAction } from "../hooks/useAsyncAction.js";
const BarcodeScanner = lazy(() => import("./BarcodeScanner.jsx"));
// A double tap lands within this window after the first save settles.
const REPEAT_TAP_MS = 350;

// One search result (SRCH-01, SRCH-02, SRCH-07): name, one sub-line with the
// brand or "Basic food" and a portion hint, the product's allergen line as
// one muted line, and one Add button. The "check every label" banner shows
// once above the list.
function FoodResult({ food, saved, saving, onFavorite, onChoose }) {
  const name = sentenceCaseFoodName(food.name);
  const hint = portionHint(food);
  const allergens = allergenLine(food);
  return (
    <li className="food-result-row">
      <div>
        <h3>{name}</h3>
        <p>{resultSubline(food)}</p>
        {allergens && <p className="allergen-line">{allergens}</p>}
      </div>
      <button
        className="icon-button"
        aria-pressed={saved}
        aria-label={`Save ${name}`}
        aria-busy={saving || undefined}
        aria-disabled={saving || undefined}
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
  const { pending, run } = useAsyncAction();
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
  // FOOD-05: the star ignores repeat taps until the save settles, and stays
  // quiet for a moment after, so a double tap saves once instead of saving
  // and then unsaving.
  const favorite = (food) =>
    run(food.id, async () => {
      await changeData(
        (data) => {
          data.favorites = data.favorites.some((f) => f.id === food.id)
            ? data.favorites.filter((f) => f.id !== food.id)
            : [...data.favorites, food];
        },
        favorites.some((f) => f.id === food.id)
          ? `Removed ${sentenceCaseFoodName(food.name)} from Saved.`
          : `Saved ${sentenceCaseFoodName(food.name)}.`,
      );
      await new Promise((resolve) => setTimeout(resolve, REPEAT_TAP_MS));
    });
  const list = (foods) => (
    <ul className="food-result-list">
      {foods.map((food) => (
        <FoodResult
          key={food.id}
          food={food}
          saved={favorites.some((item) => item.id === food.id)}
          saving={pending === food.id}
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
              placeholder="Food or brand"
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
      <p role="status" className={offline ? "search-offline" : "sr-only"}>
        {offline && <WifiOff size={20} strokeWidth={1.75} aria-hidden="true" />}
        {offline ? "You're offline. Recent and saved foods still work." : ""}
      </p>
      {/* P0-06: Recent and Saved hold products too, so the label line shows
          once above them, as above search results. */}
      {!term && (recent.length > 0 || savedFoods.length > 0) && <LabelCheck />}
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
        <section className="quick-basics" aria-labelledby="quick-basics">
          <h3 id="quick-basics">Quick basics</h3>
          <QuickAddList
            label="Quick basics"
            items={GROCERY_CATALOG.slice(0, 6)}
            onAdd={(item) =>
              onChoose({
                id: `basic-${item.id}`,
                name: item.name,
                ingredientId: item.id,
                source: "Manual",
                nutrientBasis: "g",
                nutrients: { calories: null },
              })
            }
          />
        </section>
      )}
      {loading && !results && <Skeleton label="Finding foods" />}
      {/* Icon beside the message, Retry under it; the reassurance sits
          outside the red box. */}
      {error && (
        <>
          <div className="inline-error search-error" role="alert">
            <span>{error}</span>
            <button onClick={() => search(page > 1 ? page : 1)}>Retry</button>
          </div>
          <p className="muted">
            Saved foods and manual entry remain available.
          </p>
        </>
      )}
      <div role="status">
        {current$ && !results.foods.length && (
          <EmptyState icon={SearchX} title="No matching foods">
            Try a simpler name or add it yourself.
          </EmptyState>
        )}
      </div>
      {results && results.foods.length > 0 && (
        <div
          className={`food-results${current$ ? "" : " stale"}`}
          aria-busy={loading}
        >
          <LabelCheck />
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
      <div className="search-footer">
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
      </div>
    </section>
  );
}
