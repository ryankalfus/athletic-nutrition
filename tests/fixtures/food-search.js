// A small ranking test set in the USDA FoodData Central search shape (P1-07).
// Names follow real SR Legacy, Foundation, FNDDS and Branded rows. Each list
// is in a deliberately unhelpful provider order: products before basic foods.
let id = 100000;
const basic = (description, dataType = "SR Legacy", extra = {}) => ({
  fdcId: ++id,
  description,
  dataType,
  ...extra,
});
const branded = (description, brandOwner, extra = {}) => ({
  fdcId: ++id,
  description,
  dataType: "Branded",
  brandOwner,
  gtinUpc: String(10000000000 + id),
  servingSize: 28,
  servingSizeUnit: "g",
  householdServingFullText: "1 cup",
  ...extra,
});

export const SEARCH_FIXTURES = {
  banana: [
    branded("BANANA CHIPS", "Great Value"),
    branded("BANANA NUT MUFFIN", "Otis Spunkmeyer Inc."),
    branded("BANANAS", "Dole Food Company Inc.", {
      householdServingFullText: "1 medium",
      servingSize: 126,
    }),
    branded("ORGANIC BANANA BABY FOOD", "Gerber Products Company"),
    basic("Bread, banana, prepared from recipe, made with margarine"),
    basic("Bananas, dehydrated, or banana powder"),
    basic("Babyfood, fruit, bananas with tapioca, strained"),
    basic("Bananas, overripe, raw", "Foundation"),
    basic("Bananas, ripe and slightly ripe, raw", "Foundation"),
    basic("Banana, raw", "Survey (FNDDS)", {
      foodMeasures: [
        { disseminationText: '1 medium (7" to 7-7/8" long)', gramWeight: 118 },
      ],
    }),
    basic("Bananas, raw"),
  ],
  "peanut butter": [
    branded("PEANUT BUTTER CUPS", "The Hershey Company", {
      allergens_tags: ["en:peanuts", "en:milk"],
    }),
    branded("CREAMY PEANUT BUTTER", "The J.M. Smucker Company", {
      householdServingFullText: "2 Tbsp",
      servingSize: 32,
    }),
    branded("PEANUT BUTTER", "Hormel Foods Corporation", {
      householdServingFullText: "2 Tbsp",
      servingSize: 32,
    }),
    basic("Cookies, peanut butter, commercially prepared, regular"),
    basic("Peanut butter and jelly sandwich, on white bread", "Survey (FNDDS)"),
    basic("Peanut butter, chunk style, with salt"),
    basic("Peanut butter, smooth style, with salt"),
    basic("Peanut butter, smooth, reduced fat"),
    basic("Peanut butter", "Survey (FNDDS)"),
  ],
  cheerios: [
    basic("Cereals ready-to-eat, GENERAL MILLS, CHEERIOS"),
    basic("Cereals ready-to-eat, GENERAL MILLS, Honey Nut CHEERIOS"),
    branded("HONEY NUT CHEERIOS", "General Mills Sales Inc."),
    branded("CHEERIOS", "General Mills Sales Inc.", { brandName: "CHEERIOS" }),
    branded("CHEERIOS", "General Mills Sales Inc.", { brandName: "CHEERIOS" }),
    branded("Cheerios", "General Mills, Inc.", { brandName: "Cheerios" }),
    branded("MULTI GRAIN CHEERIOS", "General Mills Sales Inc."),
    branded("CHEERIOS OAT CRUNCH", "General Mills Sales Inc."),
  ],
  rice: [
    branded("RICE KRISPIES", "Kellogg Company US"),
    branded("RICE", "Great Value", {
      householdServingFullText: "1/4 cup dry",
      servingSize: 45,
    }),
    branded("JASMINE RICE", "Mahatma"),
    branded("SPANISH RICE", "Old El Paso"),
    basic("Beverages, rice milk, unsweetened"),
    basic("Snacks, rice cakes, brown rice, plain"),
    basic("Rice noodles, cooked"),
    basic("Rice crackers", "Survey (FNDDS)"),
    basic("Rice, white, long-grain, regular, enriched, cooked"),
    basic("Rice, brown, long-grain, cooked"),
    basic("Rice, white, cooked, no added fat", "Survey (FNDDS)"),
  ],
};

// Names that count as "a basic <query>" for the acceptance check.
export const BASIC_MATCH = {
  banana: /^Bananas?, (raw|ripe)/,
  "peanut butter": /^Peanut butter(,|$)/,
  cheerios: /^CHEERIOS$|^Cheerios$/,
  rice: /^Rice, /,
};
