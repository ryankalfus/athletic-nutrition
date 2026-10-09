// Records live USDA FoodData Central search answers for the ranking test set
// (P1-07, SRCH-01) into tests/fixtures/usda-search.json. Each query records
// the exact requests the live search makes: the mixed first page and both
// basic-food follow-ups. Rows are cut to the fields the app reads
// (slimFdcFood); USDA's order is kept. The key is never written.
//
//   node --env-file=.env scripts/record-search-fixtures.mjs
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASIC_FOLLOW_UPS,
  firstRequest,
  searchBody,
  slimSearch,
} from "../server/api.js";

export const RECORDED_QUERIES = ["banana", "peanut butter", "cheerios", "rice"];

const key = process.env.FDC_API_KEY;
if (!key || key === "DEMO_KEY") {
  console.error("Set FDC_API_KEY in .env to record fixtures.");
  process.exit(1);
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "tests", "fixtures", "usda-search.json");

async function post(body) {
  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok)
    throw new Error(`USDA ${response.status} for ${JSON.stringify(body)}`);
  return slimSearch(await response.json());
}

const queries = {};
for (const query of RECORDED_QUERIES) {
  const requests = [];
  for (const options of [firstRequest("all", 1), ...BASIC_FOLLOW_UPS]) {
    const body = searchBody(query, options);
    requests.push({ body, answer: await post(body) });
  }
  queries[query] = requests;
  console.log(
    query,
    requests
      .map(
        (r) =>
          `${r.body.dataType?.join("+") || "all"}:${r.answer.foods.length}`,
      )
      .join(" "),
  );
}
// One food per line keeps the file small and its diffs readable.
const json = (value) => JSON.stringify(value);
const lines = [
  "{",
  ` "source": ${json("USDA FoodData Central /fdc/v1/foods/search (POST)")},`,
  ` "recordedAt": ${json(new Date().toISOString().slice(0, 10))},`,
  ` "note": ${json("Recorded by scripts/record-search-fixtures.mjs. Rows cut by slimFdcFood; USDA order kept.")},`,
  ' "queries": {',
  Object.entries(queries)
    .map(
      ([query, requests]) =>
        `  ${json(query)}: [\n${requests
          .map(
            ({ body, answer }) =>
              `   {"body": ${json(body)}, "answer": {"totalHits": ${answer.totalHits}, "totalPages": ${answer.totalPages}, "foods": [\n${answer.foods
                .map((food) => `    ${json(food)}`)
                .join(",\n")}\n   ]}}`,
          )
          .join(",\n")}\n  ]`,
    )
    .join(",\n"),
  " }",
  "}",
];
writeFileSync(out, `${lines.join("\n")}\n`);
console.log(`Wrote ${path.relative(root, out)}`);
