import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

let db;
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
export function searchLocal(query, type, page) {
  const db = localCatalog();
  if (!db) return null;
  const tokens = query.match(/[\p{L}\p{N}]+/gu) || [];
  if (!tokens.length) return { foods: [], totalHits: 0, pageNumber: page };
  const filter =
    type === "branded"
      ? " AND f.type='Branded'"
      : type === "generic"
        ? " AND f.type!='Branded'"
        : "";
  const barcode = /^\d{8,14}$/.test(query);
  const from = barcode
    ? "food f"
    : "food_search JOIN food f ON f.id=food_search.rowid";
  const where = barcode ? "f.barcode=?" : "food_search MATCH ?";
  const term = barcode ? query : tokens.map((t) => `"${t}"*`).join(" AND ");
  const totalHits = db
    .prepare(`SELECT COUNT(*) count FROM ${from} WHERE ${where}${filter}`)
    .get(term).count;
  const rows = db
    .prepare(
      `SELECT f.* FROM ${from} WHERE ${where}${filter} ORDER BY CASE WHEN lower(f.name)=lower(?) THEN 0 WHEN lower(f.brand)=lower(?) THEN 1 WHEN f.type!='Branded' AND lower(f.name) IN (lower(?) || ', raw', lower(?) || 's, raw') THEN 2 ELSE 3 END, ${barcode ? "f.id" : "bm25(food_search)"}, f.id LIMIT 18 OFFSET ?`,
    )
    .all(term, query, query, query, query, (page - 1) * 18);
  return {
    foods: rows.map(food),
    totalHits,
    pageNumber: page,
    totalPages: Math.ceil(totalHits / 18),
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
