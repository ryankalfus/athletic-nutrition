import {
  searchLocal,
  detailLocal,
  localCatalog,
  rankFdcResults,
} from "./catalog.js";
import { hasBasicMatch, isBarcodeQuery } from "../src/domain/search.js";
const cache = new Map();
const rates = new Map();
const TTL = 5 * 60 * 1000;
// A `body` sends a JSON POST; the cache keys on the URL plus the body.
async function cached(url, { notFoundMessage, body } = {}) {
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
  const data = await response.json();
  if (cache.size >= 200) cache.delete(cache.keys().next().value);
  cache.set(id, { time: Date.now(), data });
  return data;
}
const GENERIC_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)"];
const REMOTE_PAGE_SIZE = 25;
// Live USDA search. The first page asks for basic foods separately only when
// the mixed page has no basic food named by the query, so "banana" finds
// "Bananas, raw" without spending a second request on most searches.
// Searches POST a JSON body: USDA's GET endpoint answers about half of the
// requests whose dataType holds "Survey (FNDDS)" with an nginx 400 (seen
// 2026-10-09), which failed every basic-food follow-up at random.
export async function searchRemote(query, type, page, key, fetchJson = cached) {
  const request = (dataType, pageSize, pageNumber) =>
    fetchJson(
      `https://api.nal.usda.gov/fdc/v1/foods/search?${new URLSearchParams({ api_key: key })}`,
      {
        body: {
          query,
          pageSize,
          pageNumber,
          ...(dataType && { dataType }),
        },
      },
    );
  const remote = await request(
    type === "all" ? null : type === "generic" ? GENERIC_TYPES : ["Branded"],
    REMOTE_PAGE_SIZE,
    page,
  );
  let foods = remote.foods || [];
  if (
    type === "all" &&
    page === 1 &&
    !isBarcodeQuery(query) &&
    !hasBasicMatch(foods, query)
  ) {
    const basics = (await request(GENERIC_TYPES, 10, 1)).foods || [];
    const ids = new Set(foods.map((item) => item.fdcId));
    foods = [...basics.filter((item) => !ids.has(item.fdcId)), ...foods];
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
