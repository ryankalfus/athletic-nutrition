import {
  searchLocal,
  detailLocal,
  localCatalog,
  rankFdcResults,
} from "./catalog.js";
import {
  hasBasicMatch,
  isBarcodeQuery,
  namesQuery,
  rankFoods,
} from "../src/domain/search.js";
const cache = new Map();
const rates = new Map();
const TTL = 5 * 60 * 1000;
// A `body` sends a JSON POST; the cache keys on the URL plus the body. A
// `transform` shrinks the answer before it is cached.
async function cached(url, { notFoundMessage, body, transform } = {}) {
  const id = body ? `${url} ${JSON.stringify(body)}` : url;
  const prior = cache.get(id);
  if (prior && Date.now() - prior.time < TTL) return prior.data;
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    signal: AbortSignal.timeout(12000),
    headers: {
      "User-Agent": "Nourally/0.2 (food-planning; local development)",
      ...(body && { "Content-Type": "application/json" }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = new Error(
      response.status === 429
        ? "Food provider rate limit reached. Try later or use saved/manual food."
        : response.status === 404 && notFoundMessage
          ? notFoundMessage
          : "Food provider unavailable or product not found.",
    );
    error.status =
      response.status === 429 || (response.status === 404 && notFoundMessage)
        ? response.status
        : 502;
    throw error;
  }
  const answer = await response.json();
  const data = transform ? transform(answer) : answer;
  if (cache.size >= 200) cache.delete(cache.keys().next().value);
  cache.set(id, { time: Date.now(), data });
  return data;
}
const GENERIC_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)"];
export const REMOTE_PAGE_SIZE = 25;
// USDA orders results by text score, which puts "Rice cake", "Rice milk" and
// "Rice paper" before every plain rice row: for "rice" the Foundation and SR
// Legacy rows named "Rice, white, ..." sit at places 39 to 134 of 141, and
// FNDDS "Rice, cooked, NFS" at place 24 and "Rice, white, cooked, no added
// fat" at place 95 of 403 (recorded 2026-10-09). When the mixed
// first page has no plain basic match, two follow-up requests fetch the basic
// forms deep enough to include them; only rows that name the query are kept.
export const BASIC_FOLLOW_UPS = [
  { dataType: ["Foundation", "SR Legacy"], pageSize: 200 },
  { dataType: ["Survey (FNDDS)"], pageSize: 200 },
];
// Basic rows from the follow-ups added to the first page, best first.
const FOLLOW_UP_KEEP = 24;
const SEARCH_NUTRIENTS = new Set([
  "Energy",
  "Energy (Atwater General Factors)",
  "Energy (Atwater Specific Factors)",
  "Protein",
  "Carbohydrate, by difference",
  "Total lipid (fat)",
]);
const SEARCH_FIELDS = [
  "fdcId",
  "description",
  "dataType",
  "brandOwner",
  "brandName",
  "gtinUpc",
  "servingSize",
  "servingSizeUnit",
  "householdServingFullText",
];
/**
 * One USDA search row cut to the fields the app reads, so a 200-row answer
 * (about 4 MB from USDA) is cached and sent to the browser at a few percent
 * of that size. Recorded test fixtures use the same cut.
 */
export function slimFdcFood(food) {
  const keep = {};
  for (const field of SEARCH_FIELDS)
    if (food[field] != null && food[field] !== "") keep[field] = food[field];
  const nutrients = (food.foodNutrients || [])
    .filter((item) => SEARCH_NUTRIENTS.has(item.nutrientName))
    .map(({ nutrientName, unitName, value }) => ({
      nutrientName,
      unitName,
      value,
    }));
  if (nutrients.length) keep.foodNutrients = nutrients;
  const measures = (food.foodMeasures || [])
    .filter((item) => Number(item.gramWeight) > 0 && item.disseminationText)
    .slice(0, 3)
    .map(({ disseminationText, gramWeight }) => ({
      disseminationText,
      gramWeight,
    }));
  if (measures.length) keep.foodMeasures = measures;
  return keep;
}
/** A USDA search answer with slim rows. */
export const slimSearch = (data) => ({
  totalHits: data.totalHits,
  totalPages: data.totalPages,
  foods: (data.foods || []).map(slimFdcFood),
});
/** The JSON body of one USDA search request. */
export function searchBody(query, { dataType, pageSize, pageNumber = 1 }) {
  return { query, pageSize, pageNumber, ...(dataType && { dataType }) };
}
/** The request options for the first USDA request of a search. */
export function firstRequest(type, page) {
  return {
    dataType:
      type === "all" ? null : type === "generic" ? GENERIC_TYPES : ["Branded"],
    pageSize: REMOTE_PAGE_SIZE,
    pageNumber: page,
  };
}
// Live USDA search. The first page asks for basic foods separately only when
// the mixed page has no plain basic food named by the query, so "banana"
// finds "Banana, raw" without spending more requests on most searches.
// Searches POST a JSON body: USDA's GET endpoint answers about half of the
// requests whose dataType holds "Survey (FNDDS)" with an nginx 400 (seen
// 2026-10-09), which failed every basic-food follow-up at random.
export async function searchRemote(query, type, page, key, fetchJson = cached) {
  const request = (options) =>
    fetchJson(
      `https://api.nal.usda.gov/fdc/v1/foods/search?${new URLSearchParams({ api_key: key })}`,
      { body: searchBody(query, options), transform: slimSearch },
    );
  const remote = await request(firstRequest(type, page));
  let foods = remote.foods || [];
  if (
    type === "all" &&
    page === 1 &&
    !isBarcodeQuery(query) &&
    !hasBasicMatch(foods, query)
  ) {
    const answers = await Promise.all(BASIC_FOLLOW_UPS.map(request));
    const ids = new Set(foods.map((item) => item.fdcId));
    const basics = rankFoods(
      answers
        .flatMap((answer) => answer.foods || [])
        .filter((item) => !ids.has(item.fdcId) && namesQuery(item, query)),
      query,
    ).slice(0, FOLLOW_UP_KEEP);
    foods = [...basics, ...foods];
  }
  return {
    foods: rankFdcResults(foods, query),
    totalHits: remote.totalHits ?? foods.length,
    pageNumber: page,
    hasMore: page < Number(remote.totalPages || 0),
  };
}
export async function api(req, res, next) {
  const url = new URL(req.url, "http://localhost");
  if (!url.pathname.startsWith("/api/")) return next();
  const send = (status, payload) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(payload));
  };
  if (req.method !== "GET") return send(405, { error: "GET only." });
  const client = req.socket.remoteAddress || "local";
  const rate = rates.get(client);
  if (!rate || Date.now() - rate.start > 60000) {
    if (rates.size > 1000) rates.clear();
    rates.set(client, { start: Date.now(), count: 1 });
  } else if (++rate.count > 120)
    return send(429, { error: "Too many requests. Retry in one minute." });
  try {
    const key = process.env.FDC_API_KEY || "DEMO_KEY";
    if (url.pathname === "/api/foods/status")
      return send(200, {
        mode: localCatalog()
          ? "local-snapshot"
          : key === "DEMO_KEY"
            ? "limited-demo"
            : "server-key",
      });
    if (url.pathname === "/api/foods/search") {
      const query = (url.searchParams.get("q") || "").trim();
      const type = url.searchParams.get("type") || "all";
      const page = Number(url.searchParams.get("page") || 1);
      if (
        query.length < 2 ||
        query.length > 120 ||
        !["all", "generic", "branded"].includes(type) ||
        !Number.isInteger(page) ||
        page < 1 ||
        page > 10000
      )
        return send(400, { error: "Invalid query, type, or page." });
      const local = searchLocal(query, type, page);
      if (local) return send(200, local);
      return send(200, {
        ...(await searchRemote(query, type, page, key)),
        mode: key === "DEMO_KEY" ? "limited-demo" : "server-key",
      });
    }
    const detail = url.pathname.match(/^\/api\/foods\/(\d+)$/);
    if (detail)
      return send(
        200,
        detailLocal(Number(detail[1])) ||
          (await cached(
            `https://api.nal.usda.gov/fdc/v1/food/${detail[1]}?api_key=${encodeURIComponent(key)}`,
          )),
      );
    const barcode = url.pathname.match(/^\/api\/barcode\/(\d{8,14})$/);
    if (barcode)
      return send(
        200,
        await cached(
          `https://world.openfoodfacts.org/api/v3/product/${barcode[1]}?fields=code,product_name,brands,serving_size,serving_quantity,serving_quantity_unit,nutriments,allergens_tags,traces_tags`,
          {
            notFoundMessage:
              "We couldn't find that barcode. Add the food yourself.",
          },
        ),
      );
    return send(404, { error: "Unknown API endpoint." });
  } catch (error) {
    return send(error.status || 503, {
      error:
        error.name === "TimeoutError"
          ? "Provider timed out. Try again or add manually."
          : error.message,
    });
  }
}
