import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  SEARCH_PAGE_SIZE,
  collapseFoodMatches,
  isBarcodeQuery,
  rankFoods,
} from "../src/domain/search.js";

let db;
/** Tests pass an in-memory catalog; null restores the file lookup. */
export function useLocalCatalog(database) {
  db = database;
}
export function localCatalog() {
  if (db) return db;
  const path = process.env.USDA_DB_PATH || "data/usda/catalog.sqlite";
  if (!existsSync(path)) return null;
  const candidate = new DatabaseSync(path, { readOnly: true });
  if (
    candidate.prepare("SELECT value FROM metadata WHERE key='schema'").get()
      ?.value !== "1"
  ) {
    candidate.close();
    throw new Error("Unsupported local USDA index.");
  }
  db = candidate;
  return db;
}
function food(row) {
  return {
    fdcId: row.id,
    description: row.name,
    dataType: row.type,
    brandOwner: row.brand,
    gtinUpc: row.barcode,
    servingSize: row.serving,
    servingSizeUnit: row.unit,
    householdServingFullText: row.household,
    foodNutrients: [
      ["Energy", "KCAL", row.calories],
      ["Protein", "G", row.protein],
      ["Carbohydrate, by difference", "G", row.carbs],
      ["Total lipid (fat)", "G", row.fat],
    ]
      .filter(([, , value]) => value != null)
      .map(([nutrientName, unitName, value]) => ({
        nutrientName,
        unitName,
        value,
      })),
  };
}
// Basic foods first, closest match first, near-duplicates collapsed, in both
// the local catalog and the live USDA API (P1-07).
export function rankFdcResults(foods, query) {
  return collapseFoodMatches(rankFoods(foods, query));
}
// Rows ranked in JavaScript before paging; later pages continue in SQL order.
export const LOCAL_POOL = 360;
export function searchLocal(query, type, page) {
  const db = localCatalog();
  if (!db) return null;
  const tokens = query.match(/[\p{L}\p{N}]+/gu) || [];
  if (!tokens.length)
    return { foods: [], totalHits: 0, pageNumber: page, hasMore: false };
  const filter =
    type === "branded"
      ? " AND f.type='Branded'"
      : type === "generic"
        ? " AND f.type!='Branded'"
        : "";
  const barcode = isBarcodeQuery(query);
  const from = barcode
    ? "food f"
    : "food_search JOIN food f ON f.id=food_search.rowid";
  const where = barcode ? "f.barcode=?" : "food_search MATCH ?";
  const term = barcode ? query : tokens.map((t) => `"${t}"*`).join(" AND ");
  const totalHits = db
    .prepare(`SELECT COUNT(*) count FROM ${from} WHERE ${where}${filter}`)
    .get(term).count;
  // The coarse SQL order puts every likely match in the pool: basic foods,
  // then names or brands that start with the query, then full-text relevance.
  const order = barcode
    ? "f.id"
    : "f.type='Branded', CASE WHEN lower(f.name) LIKE lower(?) || '%' OR lower(f.brand) LIKE lower(?) || '%' THEN 0 ELSE 1 END, bm25(food_search), f.id";
  const select = (limit, offset) =>
    db
      .prepare(
        `SELECT f.* FROM ${from} WHERE ${where}${filter} ORDER BY ${order} LIMIT ? OFFSET ?`,
      )
      .all(term, ...(barcode ? [] : [query, query]), limit, offset)
      .map(food);
  const pool = rankFdcResults(select(LOCAL_POOL, 0), query);
  const poolPages = Math.ceil(pool.length / SEARCH_PAGE_SIZE);
  const beyond = Math.max(0, page - poolPages);
  const foods =
    page <= poolPages
      ? pool.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE)
      : select(SEARCH_PAGE_SIZE, LOCAL_POOL + (beyond - 1) * SEARCH_PAGE_SIZE);
  return {
    foods,
    totalHits,
    pageNumber: page,
    hasMore:
      page < poolPages || totalHits > LOCAL_POOL + beyond * SEARCH_PAGE_SIZE,
    mode: "local-snapshot",
    snapshot: Object.fromEntries(
      db
        .prepare("SELECT key,value FROM metadata")
        .all()
        .map((r) => [r.key, r.value]),
    ),
  };
}
export function detailLocal(id) {
  const row = localCatalog()?.prepare("SELECT * FROM food WHERE id=?").get(id);
  return row ? food(row) : null;
}
