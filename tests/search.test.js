// Food search ranking, duplicate collapse, debounce and result lines (P1-07).
// Uses fixture data only; nothing here calls the live USDA API.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { BASIC_MATCH, SEARCH_FIXTURES } from "./fixtures/food-search.js";
import {
  allergenLine,
  collapseFoodMatches,
  debounce,
  foodMatchKey,
  isBrandQuery,
  normalizeFoodText,
  portionHint,
  rankFoods,
  resultSubline,
  searchSchedule,
  sourceLine,
} from "../src/domain/search.js";
import {
  LOCAL_POOL,
  rankFdcResults,
  searchLocal,
  useLocalCatalog,
} from "../server/catalog.js";
import { searchRemote } from "../server/api.js";
import { normalizeFdcFood, normalizeOffFood } from "../src/usda.js";

const QUERIES = ["banana", "peanut butter", "cheerios", "rice"];
const names = (foods) => foods.map((food) => food.description);

// An in-memory catalog with the same schema as scripts/index-usda.py.
function fixtureCatalog(rows) {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE food(id INTEGER PRIMARY KEY, name TEXT, type TEXT, brand TEXT DEFAULT '', barcode TEXT DEFAULT '', serving REAL, unit TEXT, household TEXT, calories REAL, protein REAL, carbs REAL, fat REAL);
    CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT);
    INSERT INTO metadata VALUES('schema','1');
  `);
  const insert = db.prepare(
    "INSERT INTO food(id,name,type,brand,barcode,serving,unit,household) VALUES(?,?,?,?,?,?,?,?)",
  );
  for (const row of rows)
    insert.run(
      row.fdcId,
      row.description,
      row.dataType,
      row.brandOwner || "",
      row.gtinUpc || "",
      row.servingSize ?? null,
      row.servingSizeUnit ?? null,
      row.householdServingFullText ?? null,
    );
  db.exec(`
    CREATE INDEX food_barcode ON food(barcode);
    CREATE VIRTUAL TABLE food_search USING fts5(name, brand, content='food', content_rowid='id', tokenize='unicode61');
    INSERT INTO food_search(food_search) VALUES('rebuild');
  `);
  return db;
}

test("normalizing food text makes plural and case variants equal", () => {
  assert.equal(normalizeFoodText("Bananas, RAW"), "banana raw");
  assert.equal(normalizeFoodText("Banana raw"), "banana raw");
  assert.equal(normalizeFoodText("Berries"), "berry");
  assert.equal(normalizeFoodText("Swiss cheese"), "swiss cheese");
  assert.equal(normalizeFoodText("Hummus"), "hummus");
});

test("API mode: a basic food is in the first three results for each query", () => {
  for (const query of QUERIES) {
    const ranked = names(rankFdcResults(SEARCH_FIXTURES[query], query));
    assert.ok(
      ranked.slice(0, 3).some((name) => BASIC_MATCH[query].test(name)),
      `${query}: ${ranked.slice(0, 3).join(" | ")}`,
    );
  }
});

test("API mode: basic foods rank before products unless the query names a brand", () => {
  const banana = rankFdcResults(SEARCH_FIXTURES.banana, "banana");
  assert.match(banana[0].description, /^Bananas?, raw$/);
  const firstProduct = banana.findIndex((food) => food.dataType === "Branded");
  assert.ok(
    banana.slice(0, firstProduct).every((food) => food.dataType !== "Branded"),
  );
  const peanut = rankFdcResults(
    SEARCH_FIXTURES["peanut butter"],
    "peanut butter",
  );
  assert.equal(peanut[0].description, "Peanut butter");
  assert.match(peanut[1].description, /^Peanut butter, /);
  const rice = rankFdcResults(SEARCH_FIXTURES.rice, "rice");
  assert.deepEqual(
    names(rice.slice(0, 3)).every((name) => name.startsWith("Rice, ")),
    true,
  );
  assert.notEqual(rice[0].dataType, "Branded");
});

test("a brand query ranks the product first and collapses its duplicates", () => {
  assert.equal(isBrandQuery(SEARCH_FIXTURES.cheerios, "cheerios"), true);
  assert.equal(isBrandQuery(SEARCH_FIXTURES.banana, "banana"), false);
  assert.equal(isBrandQuery([], "0016000275287"), true);
  const ranked = rankFdcResults(SEARCH_FIXTURES.cheerios, "cheerios");
  assert.match(ranked[0].description, /^cheerios$/i);
  assert.equal(
    ranked.filter((food) => /^cheerios$/i.test(food.description)).length,
    1,
    "three Cheerios rows from General Mills collapse into one",
  );
  assert.equal(ranked.at(-1).dataType, "SR Legacy");
});

test("near-duplicates collapse by name and brand, not by provider id", () => {
  const foods = [
    { id: 1, name: "Bananas, raw", brand: "" },
    { id: 2, name: "Banana, raw", brand: "" },
    { id: 3, name: "CHEERIOS", brand: "General Mills Sales Inc." },
    { id: 4, name: "Cheerios", brand: "General Mills, Inc." },
    { id: 5, name: "Cheerios", brand: "Store brand" },
  ];
  assert.deepEqual(
    collapseFoodMatches(foods).map((food) => food.id),
    [1, 3, 5],
  );
  assert.equal(
    foodMatchKey({ description: "Bananas, raw" }),
    foodMatchKey({ name: "banana raw" }),
  );
});

test("local catalog mode ranks the same fixture set basic-first", () => {
  const rows = Object.values(SEARCH_FIXTURES).flat();
  useLocalCatalog(fixtureCatalog(rows));
  try {
    for (const query of QUERIES) {
      const result = searchLocal(query, "all", 1);
      const top = names(result.foods.slice(0, 3));
      assert.ok(
        top.some((name) => BASIC_MATCH[query].test(name)),
        `${query}: ${top.join(" | ")}`,
      );
      assert.equal(result.hasMore, false);
    }
    assert.match(
      searchLocal("banana", "all", 1).foods[0].description,
      /^Bananas?, raw$/,
    );
    assert.match(
      searchLocal("cheerios", "all", 1).foods[0].description,
      /^cheerios$/i,
    );
    const barcode = rows.find((row) => row.gtinUpc);
    assert.equal(
      searchLocal(barcode.gtinUpc, "all", 1).foods[0].fdcId,
      barcode.fdcId,
    );
  } finally {
    useLocalCatalog(null);
  }
});

test("local catalog pages past the ranked pool without repeating rows", () => {
  const rows = Array.from({ length: LOCAL_POOL + 30 }, (_, index) => ({
    fdcId: 500000 + index,
    description: `APPLE SNACK ${index}`,
    dataType: "Branded",
    brandOwner: `Brand ${index}`,
  }));
  useLocalCatalog(fixtureCatalog(rows));
  try {
    const seen = new Set();
    let page = 1;
    let result;
    do {
      result = searchLocal("apple", "all", page++);
      for (const food of result.foods) {
        assert.equal(seen.has(food.fdcId), false);
        seen.add(food.fdcId);
      }
    } while (result.hasMore && page < 40);
    assert.equal(seen.size, rows.length);
  } finally {
    useLocalCatalog(null);
  }
});

test("API mode asks for basic foods only when the mixed page has none", async () => {
  const calls = [];
  const productsOnly = SEARCH_FIXTURES.banana.filter(
    (food) => food.dataType === "Branded",
  );
  const basics = SEARCH_FIXTURES.banana.filter(
    (food) => food.dataType !== "Branded",
  );
  // Searches POST a JSON body; the URL carries only the key.
  const typeOf = (url, { body }) => {
    assert.deepEqual([...new URL(url).searchParams.keys()], ["api_key"]);
    return body.dataType?.join(",") || "all";
  };
  const fetchJson = async (url, options) => {
    const dataType = typeOf(url, options);
    calls.push(dataType);
    return dataType !== "all"
      ? { foods: basics, totalHits: basics.length, totalPages: 1 }
      : { foods: productsOnly, totalHits: 400, totalPages: 16 };
  };
  const result = await searchRemote("banana", "all", 1, "KEY", fetchJson);
  assert.deepEqual(calls, ["all", "Foundation,SR Legacy,Survey (FNDDS)"]);
  assert.match(result.foods[0].description, /^Bananas?, raw$/);
  assert.equal(result.hasMore, true);

  calls.length = 0;
  const mixed = async (url, options) => {
    calls.push(typeOf(url, options));
    return { foods: SEARCH_FIXTURES.rice, totalHits: 11, totalPages: 1 };
  };
  const rice = await searchRemote("rice", "all", 1, "KEY", mixed);
  assert.deepEqual(
    calls,
    ["all"],
    "no second request when a basic match exists",
  );
  assert.equal(rice.hasMore, false);

  calls.length = 0;
  await searchRemote("banana", "all", 2, "KEY", fetchJson);
  assert.deepEqual(calls, ["all"], "later pages never add a request");
});

test("result lines: no database labels or kcal; brand, portion and allergen lines", () => {
  for (const query of QUERIES) {
    for (const raw of rankFdcResults(SEARCH_FIXTURES[query], query)) {
      const food = normalizeFdcFood(raw);
      const line = resultSubline(food);
      assert.doesNotMatch(line, /SR Legacy|FNDDS|Foundation|Branded|kcal/);
      if (raw.dataType === "Branded") {
        assert.match(line, /^Brand: /);
        assert.match(allergenLine(food), /Allergens: check the package\./);
      } else {
        assert.match(line, /^Basic food/);
        assert.equal(allergenLine(food), null);
      }
    }
  }
  const banana = normalizeFdcFood(SEARCH_FIXTURES.banana.at(-1));
  assert.equal(resultSubline(banana), "Basic food · 1 medium, 118 g");
  assert.deepEqual(portionHint(banana), {
    label: "1 medium, 118 g",
    amount: 118,
    unit: "g",
  });
  const measured = normalizeFdcFood(
    SEARCH_FIXTURES.banana.find((food) => food.foodMeasures),
  );
  assert.match(resultSubline(measured), /^Basic food · 1 medium .*118 g$/);
  const cereal = normalizeFdcFood(
    SEARCH_FIXTURES.cheerios.find((food) => food.brandName === "CHEERIOS"),
  );
  assert.equal(cereal.name, "Cheerios");
  assert.equal(resultSubline(cereal), "Brand: Cheerios · 1 cup, 28 g");
  assert.equal(portionHint({ name: "Mystery stew" }), null);
});

test("Open Food Facts allergens list with 'may be incomplete' (SRCH-07)", () => {
  const product = normalizeOffFood(
    {
      product_name: "Peanut bar",
      brands: "Test",
      allergens_tags: ["en:peanuts", "en:milk"],
      traces_tags: ["en:tree-nuts", "en:milk"],
    },
    "12345678",
  );
  assert.equal(
    allergenLine(product),
    "Allergens listed: peanuts, milk. May contain: tree nuts. This list may be incomplete. Check the package.",
  );
  assert.equal(
    allergenLine(normalizeOffFood({ product_name: "Water" }, "12345670")),
    "Allergens: check the package.",
  );
  assert.equal(sourceLine(product), "From Open Food Facts (community data)");
  assert.equal(
    sourceLine(normalizeFdcFood(SEARCH_FIXTURES.rice[0])),
    "From USDA food data",
  );
  assert.equal(sourceLine({ source: "Manual" }), "Added by you");
});

test("search runs 300 ms after typing locally and only on Enter with the API", () => {
  assert.deepEqual(searchSchedule("b", { mode: "local" }), {
    run: false,
    delay: 0,
  });
  assert.deepEqual(searchSchedule("banana", { mode: "local" }), {
    run: true,
    delay: 300,
  });
  assert.deepEqual(searchSchedule("banana", { mode: "api" }), {
    run: false,
    delay: 0,
  });
  assert.deepEqual(searchSchedule("banana", { mode: "api", submitted: true }), {
    run: true,
    delay: 0,
  });
  assert.equal(
    searchSchedule("banana", { mode: "local", offline: true }).run,
    false,
  );
});

test("debounce runs once with the last value after the quiet period", () => {
  let now = 0;
  const pending = new Map();
  let next = 1;
  const timers = {
    set: (fn, ms) => {
      pending.set(next, { fn, at: now + ms });
      return next++;
    },
    clear: (id) => pending.delete(id),
  };
  const advance = (ms) => {
    now += ms;
    for (const [id, timer] of [...pending])
      if (timer.at <= now) {
        pending.delete(id);
        timer.fn();
      }
  };
  const calls = [];
  const run = debounce((value) => calls.push(value), 300, timers);
  run("b");
  advance(100);
  run("ba");
  advance(299);
  assert.deepEqual(calls, []);
  run("banana");
  advance(300);
  assert.deepEqual(calls, ["banana"]);
  run("rice");
  run.cancel();
  advance(1000);
  assert.deepEqual(calls, ["banana"]);
});

test("rankFoods also ranks normalized foods from the browser", () => {
  const foods = SEARCH_FIXTURES.banana.map(normalizeFdcFood);
  const ranked = rankFoods(foods, "banana");
  assert.equal(ranked[0].brand, "");
  assert.match(ranked[0].name, /^Bananas?, raw$/);
});
