// P1-09 allergy model: tags, the gate, idea and grocery filtering,
// profile storage and Open Food Facts label text. Both gate states are tested.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ALLERGY_TAGS_REVIEWED,
  FOOD_IDEAS,
  GROCERY_CATALOG,
  INGREDIENT_ALLERGENS,
  MAJOR_ALLERGENS,
  MEAL_INGREDIENTS,
} from "../src/domain/catalog.js";
import {
  ALLERGY_WAITING,
  activeAllergies,
  allergyStatusLine,
  groceryAllergyMatches,
  ideaAllergens,
  ideaAllergyMatches,
  legacyAllergyNotice,
  normalizeAllergies,
} from "../src/domain/allergens.js";
import * as allergenModule from "../src/domain/allergens.js";
import {
  allergenLine,
  offAllergenNames,
  resultSubline,
} from "../src/domain/search.js";
import { ideasFor } from "../src/domain/ranking.js";
import { ideaFitsProfile } from "../src/domain/timing.js";
import { groceryFitsProfile, weeklyGroceryIdeas } from "../src/domain/food.js";
import { validateData, emptyData } from "../src/domain/storage.js";
import { needsSummary } from "../src/domain/you.js";
import { normalizeOffFood } from "../src/usda.js";

const MAJOR = MAJOR_ALLERGENS.map(([id]) => id);
const MOMENTS = ["quick", "pre", "regular", "recovery", "during"];
const everySource = {
  foodSources: ["packed", "cafeteria", "home", "store"],
  lowCostIdeas: false,
};
const allIdeas = (profile, reviewed) =>
  new Set(
    MOMENTS.flatMap((moment) =>
      ideasFor({
        moment,
        profile: { ...everySource, ...profile },
        allergyTagsReviewed: reviewed,
      }).map((idea) => idea.id),
    ),
  );
const lists = (id, allergen) => {
  const tags = INGREDIENT_ALLERGENS[id];
  return (
    tags.allergens.includes(allergen) || tags.mayContain.includes(allergen)
  );
};

test("P1-09: the allergy gate ships closed", () => {
  assert.equal(ALLERGY_TAGS_REVIEWED, false);
});

test("P1-09: every idea ingredient and grocery item has allergen tags from the nine", () => {
  const ids = new Set([
    ...Object.values(MEAL_INGREDIENTS).flatMap((rows) =>
      rows.map(([, id]) => id),
    ),
    ...GROCERY_CATALOG.map((item) => item.id),
  ]);
  for (const id of ids) {
    const tags = INGREDIENT_ALLERGENS[id];
    assert.ok(tags, `${id} has no allergen tags`);
    for (const a of [...tags.allergens, ...tags.mayContain])
      assert.ok(MAJOR.includes(a), `${id} uses unknown allergen ${a}`);
  }
  for (const item of GROCERY_CATALOG)
    assert.deepEqual(item.allergens, INGREDIENT_ALLERGENS[item.id].allergens);
  assert.ok(FOOD_IDEAS.every((idea) => MEAL_INGREDIENTS[idea.id]));
});

test("P1-09: spot-check draft tags on known ingredients", () => {
  assert.deepEqual(ideaAllergens({ id: "hummus-pita" }).allergens, [
    "wheat",
    "sesame",
  ]);
  assert.ok(lists("tuna-pouches", "fish"));
  assert.ok(
    lists("sunbutter", "peanuts"),
    "sunflower-seed butter cross-contact",
  );
  assert.ok(lists("oats", "wheat"), "oats cross-contact with wheat");
  assert.deepEqual(INGREDIENT_ALLERGENS.bananas, {
    allergens: [],
    mayContain: [],
  });
});

for (const allergen of MAJOR) {
  test(`P1-09: ${allergen} allergy hides every idea that lists it once approved`, () => {
    const profile = { allergies: [allergen] };
    const shown = allIdeas(profile, true);
    const all = allIdeas({}, true);
    for (const id of shown)
      assert.ok(
        !MEAL_INGREDIENTS[id].some(([, ing]) => lists(ing, allergen)),
        `${id} lists ${allergen} but is shown`,
      );
    for (const id of all)
      if (!MEAL_INGREDIENTS[id].some(([, ing]) => lists(ing, allergen)))
        assert.ok(
          shown.has(id),
          `${id} does not list ${allergen} but is hidden`,
        );
    for (const idea of FOOD_IDEAS)
      assert.equal(
        ideaFitsProfile(idea, { ...everySource, ...profile }, true),
        !MEAL_INGREDIENTS[idea.id].some(([, ing]) => lists(ing, allergen)),
      );
  });

  test(`P1-09: ${allergen} allergy filters nothing while the gate is closed`, () => {
    const profile = { allergies: [allergen] };
    assert.deepEqual([...allIdeas(profile, false)], [...allIdeas({}, false)]);
    for (const idea of FOOD_IDEAS)
      assert.equal(
        ideaFitsProfile(idea, { ...everySource, ...profile }, false),
        ideaFitsProfile(idea, everySource, false),
      );
    for (const item of GROCERY_CATALOG)
      assert.equal(groceryFitsProfile(item, profile, false), true);
  });

  test(`P1-09: ${allergen} allergy hides grocery suggestions that list it once approved`, () => {
    const profile = { allergies: [allergen] };
    for (const item of GROCERY_CATALOG)
      assert.equal(
        groceryFitsProfile(item, profile, true),
        !lists(item.id, allergen),
        item.id,
      );
    const week = weeklyGroceryIdeas({
      profile,
      date: "2026-09-28",
      limit: 50,
      allergyTagsReviewed: true,
    });
    const names = new Set(
      GROCERY_CATALOG.filter((item) => lists(item.id, allergen)).map(
        (item) => item.name,
      ),
    );
    assert.ok(week.items.every((item) => !names.has(item.name)));
  });
}

test("P1-09: the default (closed gate) weekly groceries ignore allergies", () => {
  const input = { date: "2026-09-28", limit: 50 };
  assert.deepEqual(
    weeklyGroceryIdeas({
      ...input,
      profile: { allergies: ["wheat"] },
    }).items.map((i) => i.name),
    weeklyGroceryIdeas({ ...input, profile: {} }).items.map((i) => i.name),
  );
});

test("P1-09: activeAllergies is empty while closed and drops Other", () => {
  const profile = { allergies: ["peanuts", "other"] };
  assert.deepEqual(activeAllergies(profile, false), []);
  assert.deepEqual(activeAllergies(profile, true), ["peanuts"]);
  assert.deepEqual(activeAllergies(profile), []);
});

test("P1-09: unknown ingredients count as a match", () => {
  assert.deepEqual(ideaAllergyMatches({ id: "not-a-real-idea" }, ["milk"]), [
    "milk",
  ]);
  assert.deepEqual(groceryAllergyMatches({ id: "mystery" }, ["soy"]), ["soy"]);
  assert.deepEqual(groceryAllergyMatches({ id: "mystery" }, []), []);
});

test("P1-09: status line depends on the gate", () => {
  assert.equal(
    allergyStatusLine({ allergies: ["peanuts"] }, false),
    ALLERGY_WAITING,
  );
  assert.equal(
    allergyStatusLine({ allergies: ["peanuts", "sesame"] }, true),
    "Ideas that list peanuts and sesame are hidden. Check labels on products.",
  );
  assert.equal(allergyStatusLine({ allergies: [] }, true), "");
  assert.equal(
    needsSummary(
      { allergies: ["peanuts"], dietaryNeeds: ["vegetarian"] },
      true,
    ),
    "Peanuts · Vegetarian",
  );
  assert.equal(
    needsSummary(
      { allergies: ["peanuts"], dietaryNeeds: ["vegetarian"] },
      false,
    ),
    "Vegetarian",
  );
});

test("P1-09: profile.allergies is stored, validated and migrated", () => {
  const data = emptyData();
  assert.deepEqual(data.profile.allergies, []);
  data.profile.allergies = ["sesame", "bogus", "peanuts", "sesame"];
  assert.deepEqual(validateData(data).profile.allergies, ["peanuts", "sesame"]);
  assert.throws(
    () =>
      validateData({
        ...data,
        profile: { ...data.profile, allergies: "peanuts" },
      }),
    /preferences/,
  );
  assert.throws(
    () =>
      validateData({ ...data, profile: { ...data.profile, allergies: [1] } }),
    /allergies/,
  );
  const legacy = emptyData();
  delete legacy.profile.allergies;
  legacy.profile.dietaryNeeds = ["nutFree", "vegetarian"];
  const migrated = validateData(legacy).profile;
  assert.deepEqual(migrated.allergies, [], "Nut-free never becomes an allergy");
  assert.deepEqual(migrated.dietaryNeeds, ["nutFree", "vegetarian"]);
  assert.match(
    legacyAllergyNotice(migrated, false),
    /^Your earlier Nut-free choice no longer filters foods\. Review each label/,
  );
  assert.match(legacyAllergyNotice(migrated, true), /Choose each allergy/);
  // Several legacy choices make one notice, not one paragraph each.
  assert.match(
    legacyAllergyNotice(
      { dietaryNeeds: ["nutFree", "glutenFree", "dairyFree"] },
      false,
    ),
    /^Your earlier Nut-free, Gluten-free and Dairy-free choices no longer filter foods\./,
  );
  assert.equal(legacyAllergyNotice({ dietaryNeeds: ["vegan"] }, false), "");
  assert.deepEqual(normalizeAllergies(null), []);
});

test("P1-09: Open Food Facts allergen and trace tags become label text", () => {
  const food = normalizeOffFood(
    {
      product_name: "Granola bar",
      nutriments: {},
      allergens_tags: ["en:milk", "en:nuts", "en:gluten"],
      traces_tags: ["en:peanuts", "en:milk", 7],
    },
    "12345678",
  );
  assert.deepEqual(food.allergenTags, ["en:milk", "en:nuts", "en:gluten"]);
  assert.deepEqual(food.traceTags, ["en:peanuts", "en:milk"]);
  assert.equal(
    allergenLine(food),
    "Allergens listed: milk, tree nuts, gluten. May contain: peanuts. This list may be incomplete. Check the package.",
  );
  // A scanned product without a brand is still a product, never "Basic food".
  assert.equal(resultSubline(food), "Packaged food");
  // No tags never reads as allergen-free.
  const untagged = normalizeOffFood({ product_name: "Water" }, "12345670");
  assert.equal(allergenLine(untagged), "Allergens: check the package.");
  assert.doesNotMatch(allergenLine(untagged), /free|none|safe/i);
  // Basic foods carry no Open Food Facts data, so no product line.
  assert.equal(allergenLine({ name: "Bananas, raw", source: "USDA" }), null);
  // One source of product allergen text (the merge removed the second one).
  assert.equal("productAllergenText" in allergenModule, false);
  assert.deepEqual(offAllergenNames(["fr:lait-de-coco", "en:soybeans"]), [
    "lait de coco",
    "soy",
  ]);
});
