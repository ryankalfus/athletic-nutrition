// UX-CMP-23: every catalog ingredient, grocery item and idea maps to an art
// file that exists; unknown foods get the letter tile.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  FOOD_ART,
  artForFood,
  artForIdea,
  foodArtIdeaIds,
  foodArtKeys,
  foodInitial,
} from "../src/domain/foodArt.js";

const dir = path.resolve("src/assets/food-art");

test("UX-CMP-23: every ingredient, grocery item and idea has an art file", () => {
  const missing = foodArtKeys().filter(
    (key) => !artForFood(key) || !existsSync(path.join(dir, artForFood(key))),
  );
  assert.deepEqual(missing, []);
  const ideas = foodArtIdeaIds().filter(
    (id) => !artForIdea(id) || !existsSync(path.join(dir, artForIdea(id))),
  );
  assert.deepEqual(ideas, []);
  assert.equal(artForIdea("banana-pretzels"), "banana_flat.svg");
});

test("UX-CMP-23: only the SVGs in the map are bundled, with the license", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".svg"));
  const used = new Set(Object.values(FOOD_ART));
  assert.deepEqual(
    files.filter((f) => !used.has(f)),
    [],
    "unused art files",
  );
  assert.ok(existsSync(path.join(dir, "LICENSE")));
});

test("UX-CMP-23: unknown foods get a letter tile", () => {
  assert.equal(artForFood("mystery-snack"), null);
  assert.equal(artForIdea("nope"), null);
  assert.equal(foodInitial("  banana chips"), "B");
  assert.equal(foodInitial("3 Musketeers"), "M");
  assert.equal(foodInitial(""), "?");
});
