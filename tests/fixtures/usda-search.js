// Live USDA FoodData Central search answers recorded on the date in
// usda-search.json by scripts/record-search-fixtures.mjs (P1-07, SRCH-01).
// replayUsda() answers searchRemote's requests from the recording, so the
// ranking tests run on real USDA rows in USDA's own order.
import { readFileSync } from "node:fs";

export const USDA_RECORDING = JSON.parse(
  readFileSync(new URL("./usda-search.json", import.meta.url), "utf8"),
);

const sameTypes = (a, b) =>
  (a || []).slice().sort().join("|") === (b || []).slice().sort().join("|");

/**
 * A fetchJson for searchRemote that answers from the recording and records
 * each request's data types in `calls`.
 */
export function replayUsda(calls = []) {
  return async (url, { body }) => {
    calls.push(body.dataType?.join(",") || "all");
    const recorded = USDA_RECORDING.queries[body.query]?.find(
      (request) =>
        sameTypes(request.body.dataType, body.dataType) &&
        request.body.pageSize === body.pageSize &&
        request.body.pageNumber === body.pageNumber,
    );
    if (!recorded)
      throw new Error(`No recorded USDA answer for ${JSON.stringify(body)}`);
    return structuredClone(recorded.answer);
  };
}

/** Every distinct recorded row, for an in-memory local catalog. */
export function recordedRows() {
  const rows = new Map();
  for (const requests of Object.values(USDA_RECORDING.queries))
    for (const { answer } of requests)
      for (const food of answer.foods) rows.set(food.fdcId, food);
  return [...rows.values()];
}
