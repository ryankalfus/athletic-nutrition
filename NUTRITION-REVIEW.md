# Nourally nutrition and allergen review record

Prepared 2026.09.29. **Approval reported by the owner:** Emily Cornelius, RDN, approved the audit's timing rules, recovery window, idea notes and example portions, allergen handling, game-day copy, and sports-drink guidance on September 29, 2026. The owner supplied the reviewer name, credential, date, and “Everything confirmed and approved” in this task. This record preserves that supplied approval; it is not an independent credential verification. Implementation must follow the approved audit and still pass its acceptance criteria.

## Timing rules currently in the local draft

| Rule or state | Current implementation / proposed copy | Reviewer decision needed |
|---|---|---|
| More than 180 minutes before activity | Plan-ahead state; invites choosing food before the activity. | Confirm whether 180 minutes is appropriate for the target age range and varied sports, or replace it. Review the action and explanation copy. |
| 91–180 minutes before | Meal-window state; suggests a meal or substantial snack. | Confirm threshold and whether the terms imply a requirement. |
| 31–90 minutes before | Pre-activity state; suggests a familiar snack. | Confirm threshold and content. |
| 0–30 minutes before | Quick state; suggests something small and fluids. | Confirm threshold and content, including cases where eating immediately before activity is unsuitable. |
| Session in progress | `during` for a session at least 75 minutes or marked high intensity; otherwise `quick`. The text mentions water and, for longer or harder sessions, a familiar carbohydrate option. | Review the 75-minute trigger, the intensity flag, and every mid-session food/fluid claim. Review separately for games. |
| Up to 90 minutes after activity | Recovery state suggests carbs, protein, and fluids; after 90 minutes it returns to regular guidance. | Confirm or replace the window and wording. Avoid implying food is ineffective after a deadline. |
| School food window | Lunch uses entered school times. Optional snack time is treated as a 15-minute active window if no end time is stored. | Confirm whether the app may call this an active food window, and whether the 15-minute assumption should be displayed or removed. |
| After 9:30 PM with nothing tomorrow | LATE state says nothing needs planning tonight. | Review wording for late sessions, skipped meals, and users with no entered schedule; this is a product heuristic rather than a nutrition threshold. |
| Evening planning after 7:00 PM | Audit proposal for P1-03/P1-12; not implemented yet. | Review whether time-based prompting should be used or whether it should follow a next-day schedule instead. |
| Pack and prep due offsets | Audit §3.5 proposes 30 minutes before school starts and 30 minutes before an away-session Leave by time; not implemented. | **Owner input** is required by the audit before selecting either offset. Reviewer should also check any nutrition implications. |

The rule code is in `src/domain/timing.js` (`getFuelingGuidance` and `isSchoolDay`). The 30/90/180 boundary tests are in `tests/domain.test.js` under P0-10. Review the exact user-visible `label`, `title`, `explanation`, `timing`, and idea notes together, not thresholds in isolation.

## Other required safety review

- **Ideas and amounts (IDEA-07):** Review all built-in idea notes and display portions as examples rather than targets. The audit lists this as required before release.
- **Allergens (P0-06, ADD-03, P1-09, SRCH-07):** Review ingredient-level tags, product `allergens_tags` and `traces_tags` interpretation, missing-data wording, exclusion behavior, and the label-check line. Product views now list Open Food Facts tags with "may be incomplete"; nothing filters on allergies until the pending ingredient table below is signed off (`ALLERGY_TAGS_REVIEWED`). No item should be called safe solely from incomplete tags.
- **Game-day guidance (ACT-04):** Review the GAME chip context and every game-specific food/fluid sentence before it is shown. No game-specific nutrition copy is accepted yet.
- **Sports drinks:** Review any proposed wording against the American Academy of Pediatrics report below. No new sports-drink recommendation is accepted here.

## Source starting points and limits

These are candidate sources to evaluate, not a source-to-rule validation. The available abstracts and report do **not** by themselves establish Nourally's exact 30/90/180-minute cutoffs, 75-minute during trigger, 90-minute recovery cutoff, or suitability for all student-athletes.

1. [Academy of Nutrition and Dietetics, Dietitians of Canada, and ACSM position statement (2016)](https://pubmed.ncbi.nlm.nih.gov/26920240/) addresses food and fluid timing for performance and recovery and recommends individualized planning by a registered dietitian nutritionist. The review must decide how it applies to Nourally's age range and exact rules.
2. [American Academy of Pediatrics clinical report on sports and energy drinks for children and adolescents (2011)](https://publications.aap.org/pediatrics/article/127/6/1182/30098/) distinguishes sports drinks from energy drinks and describes a limited role for sports drinks during prolonged vigorous activity. It does not validate Nourally's meal timing cutoffs.
3. [Review on carbohydrate and protein replacement after endurance exercise (2015)](https://pubmed.ncbi.nlm.nih.gov/26166054/) discusses recovery nutrition, especially when another session follows soon. It does not validate a universal 90-minute deadline for this product.

## Sign-off record

- Reviewer: **Emily Cornelius, RDN** (provided by the owner).
- Approval date: **2026.09.29**.
- Scope: audit timing thresholds and state copy, recovery window, idea notes and example portions, ingredient allergen tags and exclusion behavior, product label reminders, game-day copy, and sports-drink guidance.
- Approval: **“Everything confirmed and approved.”** Reported by Ryan Kalfus in this task on 2026.09.29.
- Implementation acceptance: remains item-specific in `REDESIGN-CHECKLIST.md`; approval does not mark unimplemented features complete.
- Next review date: not provided. Further changes outside the approved audit require review.

## Owner decisions

The owner confirmed all previously presented recommended options on 2026.09.29: high-school ages 14–18; hide ideas with matching tagged allergens; local athletes with backups; shareable lists for the MVP; desktop-browser reminders for the MVP; local USDA index with the existing server fallback; four primary destinations and four Food sections; preparation due 30 minutes before school starts or an away activity's Leave by time. Optional future enhancements retain their audit phase and scope.

## Pending qualified review — household amounts (2026.09.29)

**Status: not approved.** The household display strings below were added after the 2026.09.29 approval recorded above, so that approval does not cover them. The audit gives only three example strings: "1 banana", "2 slices of bread", and "1 small bag of pretzels" (IDEA-07, audit §6). Every other string is new. This section prepares the review and approves nothing. Nutrient figures in the notes are rough estimates that depend on the label; the reviewer should check them. They are not claims.

**Where the strings live and how they show:** they are `displayAmounts` in `src/domain/catalog.js` (lines ~496–550) and apply to every `MEAL_INGREDIENTS` row. `ingredientsForMeal` in `src/domain/food.js` passes them to the Ideas card (`src/pages/Food/IdeasPage.jsx`). There the string **replaces the ingredient name**. Below the list, the Ideas page shows "Ideas are examples, not amounts you must eat. Check labels for…".
- Internal gram/ml amounts (`exampleAmounts`) are used only for pantry checks and are never displayed: pretzels 30 g, sunflower-seed butter 30 g, soy/chocolate milk 250 ml, oats 40 g, cereal 30 g, jam 20 g.
- `GROCERY_CATALOG` has no size or portion field. Shopping rows default to "package".
- The fallback "{Name}, to suit your appetite" can't be reached today, because every ingredient ID has a string.

**Moment meanings (from `src/domain/timing.js`):**
- `quick`: 0–30 min before activity, **and** a session in progress that is under 75 min and not high intensity.
- `pre`: 31–90 min before.
- `regular`: 91–180 min before, or no activity nearby.
- `recovery`: up to 90 min after.
- `during`: a session in progress that is at least 75 min or high intensity.

**Source keys:**
- [S1] AND/DC/ACSM position (2016): about 0.25–0.3 g/kg (or 15–25 g) protein in early recovery; about 1.0–1.2 g/kg/h carbohydrate when recovery time is short. ([PubMed 26920240](https://pubmed.ncbi.nlm.nih.gov/26920240/))
- [S2] AAP clinical report on sports and energy drinks (2011). ([link](https://publications.aap.org/pediatrics/article/127/6/1182/30098/))
- [S3] Sports Dietitians Australia, "Eating and Drinking Before Sport": pre-sport food should be carbohydrate-rich, low in fat, easy to digest and familiar; lower fibre can prevent stomach discomfort. ([PDF](https://www.sportsdietitians.com.au/wp-content/uploads/2015/04/Eating_Drinking_Before_Sport.pdf))
- [S4] Better Health Channel (Victoria): carbohydrate during exercise longer than 60 min, about 30–60 g/h. ([link](https://www.betterhealth.vic.gov.au/health/healthyliving/sporting-performance-and-food))
- [S5] "Optimizing Performance Nutrition for Adolescent Athletes" review (Nutrients, 2025): 0.25–0.30 g/kg protein after exercise, ideally within the first hour. ([PMC12430154](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12430154/))
- [S6] FDA food allergies; the FASTER Act made sesame the ninth major allergen from 2023.01.01. ([FDA](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies), [FoodSafety.gov](https://www.foodsafety.gov/blog/food-allergy-safety-treatment-education-and-research-act-2021))
- [S7] Sunflower-seed products are often made on equipment shared with peanuts or tree nuts; check with the manufacturer. ([Medical News Today](https://www.medicalnewstoday.com/articles/sunflower-seeds-nut-allergy))
- [S8] Chocolate milk has about 2 mg caffeine per 8 oz. ([U.S. Dairy](https://www.usdairy.com/news-articles/how-much-caffeine-is-in-chocolate-milk))
- [A] `CLAUDE-REDESIGN-AUDIT.md` IDEA-07 and §7.5.
- [T] `src/domain/timing.js` state copy.

### Amount table

| # | Idea | Moments | Ingredient | Amount shown | Reviewer note | Reason + source |
|---|---|---|---|---|---|---|
| 1 | Banana + pretzels | quick, pre, regular | Bananas | 1 banana | OK | Audit example [A]. Carbohydrate-forward, low fat [S3]. |
| 2 | Banana + pretzels | quick, pre, regular | Pretzels | 1 small bag of pretzels | Question | Audit example [A]. With the banana, roughly 45–50 g carbohydrate. The quick state says "something small" [T], and quick also covers short sessions in progress. Is this OK 0–30 min before and mid-session? [S3] |
| 3 | Applesauce pouch + rice cakes | quick, pre | Applesauce pouches | 1 applesauce pouch | OK | Small, low-fat carbohydrate [S3]. |
| 4 | Applesauce pouch + rice cakes | quick, pre | Rice cakes | 2 rice cakes | OK | Low fat, low fibre [S3]. |
| 5 | Fig bar + fresh fruit | quick, pre, regular | Fig bars | 2 fig bars | OK | Carbohydrate snack [S3]. Contains wheat (label reminder applies). |
| 6 | Fig bar + fresh fruit | quick, pre, regular | Fresh fruit | 1 banana | Change suggested | The idea name says "fresh fruit" but the card shows "1 banana". Other ideas map "Fresh fruit" to "1 apple or other fruit". Use one wording. |
| 7 | Cereal cup + shelf-stable soy milk | quick, pre, regular, recovery | Cereal | 1 cup of cereal | Question | "Cereal cup" in the name suggests a single-serve cup, but "1 cup" reads as a measure. Cereal fibre varies widely, which matters for quick and pre [S3]. |
| 8 | Cereal cup + shelf-stable soy milk | quick, pre, regular, recovery | Shelf-stable soy milk | 1 cup of soy milk | Question | 1 cup of liquid in the quick state, which includes mid-session. Roughly 7–8 g protein, below the 15–25 g recovery reference when shown for recovery [S1]. Soy is a major allergen [S6]. |
| 9 | Bagel or toast + jam | pre, regular, recovery | Bagels or bread | 2 slices of bread | Change suggested | The name offers a bagel, but the amount names only bread. Suggest "1 bagel or 2 slices of toast". Low protein for recovery (roughly 6–10 g) [S1]. |
| 10 | Bagel or toast + jam | pre, regular, recovery | Jam | 1 spoonful of jam | OK | Small carbohydrate add-on. |
| 11 | Sunflower-butter banana sandwich | pre, regular, recovery | Whole-grain bread | 2 slices of bread | OK | Audit example [A]. Whole-grain fibre in pre is a minor point [S3]. |
| 12 | Sunflower-butter banana sandwich | pre, regular, recovery | Sunflower-seed butter | 2 tablespoons of sunflower-seed butter | Question | About 16 g fat (label-dependent). The pre state says to avoid heavy foods [T], and SDA advises low-fat pre-sport food [S3], so a smaller amount may suit pre. Possible peanut or tree-nut cross-contact [S7]. Must not read as nut-safe while the nut filter is hidden. |
| 13 | Sunflower-butter banana sandwich | pre, regular, recovery | Bananas | 1 banana | OK | [S3] |
| 14 | Oatmeal + fruit | regular, pre, recovery | Oats | 1 bowl of oatmeal | Question | "Bowl" has no defined size (the internal amount is 40 g dry). Oats add fibre 31–90 min before [S3]. Needs a kitchen or microwave. |
| 15 | Oatmeal + fruit | regular, pre, recovery | Fresh or frozen fruit | 1 cup of fruit | OK | Common household measure. |
| 16 | Hummus + pita + grapes | regular, recovery | Hummus | 1 small cup of hummus | Question | Hummus usually contains tahini, and sesame is a major allergen [S6]. Ingredient tags are unreviewed (ADD-03). "Small cup" (a container) vs "1 cup" (a measure) is ambiguous. |
| 17 | Hummus + pita + grapes | regular, recovery | Pita | 1 pita | OK | Contains wheat. |
| 18 | Hummus + pita + grapes | regular, recovery | Grapes | 1 handful of grapes | OK | Whole grapes are not the choking concern for ages 14–18 that they are for small children. |
| 19 | Turkey sandwich + fruit | regular, recovery | Whole-grain bread | 2 slices of bread | OK | [A] |
| 20 | Turkey sandwich + fruit | regular, recovery | Turkey | A few slices of turkey | Question | Not a count, unlike most other strings. With the bread, protein is about 15–20 g depending on slices [S1]. Needs cold storage. |
| 21 | Turkey sandwich + fruit | regular, recovery | Fresh fruit | 1 apple or other fruit | OK | — |
| 22 | Tuna pouch + crackers + fruit cup | regular, recovery | Tuna pouches | 1 tuna pouch | OK | Roughly 15–17 g protein, within the reference [S1]. Fish is a major allergen [S6]. |
| 23 | Tuna pouch + crackers + fruit cup | regular, recovery | Crackers | 1 handful of crackers | OK | Contains wheat. |
| 24 | Tuna pouch + crackers + fruit cup | regular, recovery | Fruit cups | 1 fruit cup | OK | — |
| 25 | Yogurt + fruit + cereal | regular, recovery | Yogurt | 1 yogurt cup | Question | Protein ranges from about 5 g to 15+ g by type (regular vs Greek) [S1][S5]. Should the example name a type? |
| 26 | Yogurt + fruit + cereal | regular, recovery | Fresh fruit | 1 banana | Change suggested | Same fruit wording mismatch as #6. |
| 27 | Yogurt + fruit + cereal | regular, recovery | Cereal | 1 cup of cereal | Question | Same "cup" ambiguity as #7. A full cup is large as a topping in a three-part snack. |
| 28 | Soy yogurt + berries + granola | regular, recovery | Soy yogurt | 1 soy yogurt cup | Question | Protein varies widely by brand. Soy allergen [S6]. |
| 29 | Soy yogurt + berries + granola | regular, recovery | Frozen berries | 1 cup of fruit | OK | — |
| 30 | Soy yogurt + berries + granola | regular, recovery | Granola | 1 handful of granola | Question | Granola often contains nuts or is made on shared lines [S7]. The idea note calls this "dairy-free" while the Dairy-free filter is hidden as unreviewed. Should the note wording change until ADD-03? |
| 31 | Bean-and-rice bowl + fruit | regular, recovery | Canned beans | 1 scoop of beans | Question | "Scoop" has no defined size. Protein with rice is roughly 10–12 g if the scoop is about ½ cup of beans [S1]. |
| 32 | Bean-and-rice bowl + fruit | regular, recovery | Rice | 1 scoop of rice | Question | "Scoop" has no defined size. |
| 33 | Bean-and-rice bowl + fruit | regular, recovery | Fresh fruit | 1 apple or other fruit | OK | — |
| 34 | Chicken rice bowl | regular, recovery | Chicken | A few strips of chicken | Question | Vague, not a count. Protein is likely at or above the reference [S1]. |
| 35 | Chicken rice bowl | regular, recovery | Rice | 1 scoop of rice | Question | "Scoop" has no defined size. |
| 36 | Chicken rice bowl | regular, recovery | Vegetables | 1 handful of vegetables | OK | The ingredient ID is baby carrots; the display is generic. |
| 37 | Bean burrito + salsa | regular, recovery | Canned beans | 1 scoop of beans | Question | "Scoop" has no defined size. |
| 38 | Bean burrito + salsa | regular, recovery | Tortillas | 2 tortillas | Change suggested | The idea is one burrito, and "2 tortillas" reads as two burritos. Suggest "1 large tortilla (or 2 small)". |
| 39 | Bean burrito + salsa | regular, recovery | Salsa | 1 spoonful of salsa | OK | — |
| 40 | Pasta salad + chickpeas | regular, recovery | Pasta | 1 bowl of pasta | Question | "Bowl" has no defined size. |
| 41 | Pasta salad + chickpeas | regular, recovery | Chickpeas | 1 scoop of chickpeas | Question | "Scoop" has no defined size. Total protein roughly 12–15 g [S1]. |
| 42 | Pasta salad + chickpeas | regular, recovery | Vegetables | 1 handful of vegetables | OK | — |
| 43 | Eggs + toast + fruit | regular, recovery | Eggs | 2 eggs | OK | About 12 g protein, or about 18–20 g with the toast [S1]. Egg is a major allergen [S6]. |
| 44 | Eggs + toast + fruit | regular, recovery | Whole-grain bread | 2 slices of bread | OK | [A] |
| 45 | Eggs + toast + fruit | regular, recovery | Fresh fruit | 1 banana | Change suggested | Same fruit wording mismatch as #6. |
| 46 | Edamame + rice + fruit | regular, recovery | Edamame | 1 cup of edamame | Question | Shelled vs in-pod roughly halves the edible amount, so name one. Soy allergen [S6]. |
| 47 | Edamame + rice + fruit | regular, recovery | Rice | 1 scoop of rice | Question | "Scoop" has no defined size. |
| 48 | Edamame + rice + fruit | regular, recovery | Fresh fruit | 1 apple or other fruit | OK | — |
| 49 | Chocolate milk + banana | recovery | Chocolate milk | 1 carton of chocolate milk | Question | A carton can be an 8 oz school carton or a 14–16 oz retail one; the internal amount is 250 ml. 8 oz gives about 8 g protein, below the 15–25 g reference [S1]. Trace caffeine, about 2 mg per 8 oz [S8]: negligible, noted for the caffeine check. |
| 50 | Chocolate milk + banana | recovery | Bananas | 1 banana | OK | Adds recovery carbohydrate [S1]. |
| 51 | Soy milk + banana | recovery | Soy milk | 1 cup of soy milk | Question | About 7–8 g protein [S1]. The code builds this idea from the chocolate-milk idea and reuses its note ("Fast recovery fuel…"). Confirm the approved note carries over. Soy allergen [S6]. |
| 52 | Soy milk + banana | recovery | Bananas | 1 banana | OK | — |
| 53 | Fruit cup + crackers + cheese | regular, recovery | Fruit cups | 1 fruit cup | OK | — |
| 54 | Fruit cup + crackers + cheese | regular, recovery | Crackers | 1 handful of crackers | OK | — |
| 55 | Fruit cup + crackers + cheese | regular, recovery | Cheese sticks | 1 cheese stick | Question | About 6–7 g protein, so the whole idea is roughly 8–10 g. Low if presented as recovery [S1]. |
| 56 | Seed mix + dried fruit | quick, regular, during | Seed mix | 1 small handful of seed mix | Change suggested | High fat and fibre, yet shown in quick (0–30 min before, or mid-session) and during. Guidance favours low-fat, low-fibre carbohydrate close to and during activity [S3][S4]. Suggest regular only, or drop the seed mix for quick/during. Possible nut cross-contact [S7]. The pantry alias "nut free seed mix" matches this ingredient (`food.js`) and must not imply safety. |
| 57 | Seed mix + dried fruit | quick, regular, during | Dried fruit | 1 small box of dried fruit | Question | A suitable carbohydrate for sessions over 60 min [S4], but higher in fibre than sports foods [S3]. |
| 58 | Fruit smoothie + toast | pre, regular, recovery | Fresh or frozen fruit | 1 cup of fruit | Change suggested | No liquid or base is listed (milk, yogurt, soy milk, juice), so the amount doesn't describe a smoothie. Recovery protein depends entirely on the missing base [S1]. |
| 59 | Fruit smoothie + toast | pre, regular, recovery | Whole-grain bread | 2 slices of bread | OK | [A] |
| 60 | Familiar sports drink + crackers | during, quick | Sports drink | 1 bottle of sports drink | Change suggested | Bottles range from 12 to 32 oz. Quick includes 0–30 min before and short, not-high-intensity sessions in progress, where approved copy says "Water works for most practices" [A §7.5][S2]. That line currently appears only on Groceries (`GroceriesPage.jsx`), not on the Ideas card. Suggest: name a size, limit it to during or long/hot sessions, and show the approved line on the card. |
| 61 | Familiar sports drink + crackers | during, quick | Crackers | 1 handful of crackers | OK | — |
| 62 | Juice box + applesauce pouch | quick, during | Juice boxes | 1 juice box | Question | A reasonable carbohydrate example for sessions over 60 min [S4]. Water usually suffices for short sessions [S2]. |
| 63 | Juice box + applesauce pouch | quick, during | Applesauce pouches | 1 applesauce pouch | OK | [S3] |
| 64 | Tofu rice bowl | regular, recovery | Tofu | 1 scoop of tofu | Question | "Scoop" has no defined size and is odd for tofu (it comes as a block or cubes). Soy allergen [S6]. The code builds this idea from the chicken bowl. |
| 65 | Tofu rice bowl | regular, recovery | Rice | 1 scoop of rice | Question | "Scoop" has no defined size. |
| 66 | Tofu rice bowl | regular, recovery | Vegetables | 1 handful of vegetables | OK | — |

**Counts:** 66 displayed amounts: 31 OK, 27 Question, 8 Change suggested.
- Prescription/calorie check: no string states calories, a target, or "must", and the Ideas page line frames the strings as examples.
- Energy drinks: none.
- Caffeine: trace only, in chocolate milk (#49).

### Top issues

1. **Sports drink amount and moment (#60):** "1 bottle" has no size. It shows in the quick state, which covers short practices where the approved copy says water works [A §7.5][S2]. The approved line is not on the Ideas card.
2. **Seed mix in quick and during (#56–57):** a high-fat, high-fibre food right before or during activity goes against [S3][S4]. Possible nut cross-contact [S7].
3. **Amounts that contradict the idea name (#6, #9, #26, #38, #45, #58):**
   - "Fresh fruit" shows as "1 banana".
   - The bagel option has no bagel amount.
   - The single burrito lists "2 tortillas".
   - The smoothie has no liquid base.
4. **Recovery examples well below the ~15–25 g protein reference (#8, #9, #49, #51, #55; possibly #25, #28, #31):** the reviewer should decide whether to leave these as they are (examples, not targets) or drop low-protein ideas from the recovery tag [S1][S5].
5. **Undefined household units:** "scoop", "bowl" and "a few" have no set size (#14, #20, #31–32, #34–35, #37, #40–41, #47, #64–65), and "cup" can mean a container or a measure (#7, #16, #27). Separately, 2 tbsp sunflower-seed butter is shown for pre (#12) [S3].
6. **Allergen wording (#12, #16, #30):** sesame in hummus [S6]; nut cross-contact for sunflower-seed butter and granola [S7]; a "dairy-free" idea note while the Dairy-free filter is hidden.

### Hidden allergen filters

- **The Gluten-free, Nut-free and Dairy-free filters are hidden, pending per-ingredient tag review (ADD-03, P0-06).** `DIET_FILTERS` in `src/domain/catalog.js` holds only vegan and vegetarian. The hand-coded `glutenFree` / `dairyFree` flags on `FOOD_IDEAS` and `GROCERY_CATALOG` are unreviewed, so the app must not show them or filter on them until that review is done.

### Copy changes applied 2026.09.29 (pending the same review)

These edits fix wording that contradicted the idea name or used undefined units. They change what users see, so they are **not approved** and belong to this review. Moments, protein content, and the seed mix and sports drink placement are unchanged and wait for the reviewer.

| Row(s) | Before | After |
|---|---|---|
| #6, #26, #45 | 1 banana | 1 banana or other fruit |
| #7 (cereal cup idea) | 1 cup of cereal | 1 single-serve cereal cup |
| #27 (yogurt idea) | 1 cup of cereal | ¼ cup of cereal on top |
| #9 | 2 slices of bread | 1 bagel or 2 slices of toast |
| #38 | 2 tortillas | 1 large tortilla (or 2 small) |
| #58 | (no liquid) | added "1 cup of soy milk to blend" |
| #14 | 1 bowl of oatmeal | ½ cup of dry oats |
| #16 | 1 small cup of hummus | 1 snack-size hummus cup |
| #20 | A few slices of turkey | 3 slices of turkey |
| #31, #37 | 1 scoop of beans | ½ cup of beans |
| #32, #35, #47, #65 | 1 scoop of rice | 1 cup of cooked rice |
| #34 | A few strips of chicken | A palm-size amount of chicken |
| #40 | 1 bowl of pasta | 1 cup of cooked pasta |
| #41 | 1 scoop of chickpeas | ½ cup of chickpeas |
| #46 | 1 cup of edamame | 1 cup of shelled edamame |
| #49 | 1 carton of chocolate milk | 1 carton (8 oz) of chocolate milk |
| #60 | 1 bottle of sports drink | 1 small bottle (about 12 oz) of sports drink |
| #64 | 1 scoop of tofu | ½ cup of tofu cubes |
| #30 idea note | "A dairy-free recovery option…" | "A plant-based recovery option…" |

The approved line "Water works for most practices. Sports drinks can help in long or hot sessions." now also shows on any Ideas card that includes a sports drink.

**Still for the reviewer to decide:** sports drink moments (#60), seed mix in quick and during (#56–57), low-protein recovery examples (#8, #9, #49, #51, #55), sunflower-seed butter amount for pre (#12), and the allergen wording for hummus, sunflower-seed butter and granola.

### Sign-off (household amounts)

- Reviewer name: ______________________
- Credential: ______________________
- Date: ______________________
- Decision (Approve as written / Approve with changes listed / Not approved): ______________________
- Changes required: ______________________

## Pending qualified review — Tonight planner and sport context (2026.09.29)

**Status: not approved.** Added in P1-12 after the approval above. No new food amounts, thresholds, or sport-specific nutrition were added. The wording below is new or newly shown, so it waits for review.

| Where | Text | Note |
|---|---|---|
| Tonight task (school tomorrow, cafeteria access off) | "Pack lunch for school" | Logistics only; follows the approved BEFORE_SCHOOL title "Pack lunch and your after-school snack". |
| Tonight tasks | Existing `tomorrowPrepTasks` labels ("Choose and set out breakfast", "Pack a familiar pre-activity snack", "Fill a water bottle", "Put uniform, shoes, and gear by the door", "Check the route and allow N minutes for travel", "Pack one extra shelf-stable snack") | Unchanged wording, but now built for any activity day after 7:00 PM, not only early starts. Due 30 min before school or the earliest Leave by (owner decision); breakfast only before a start before 10:00 AM. |
| Tonight card | "Build the list to set out food, water, and gear tonight." · "Choose tomorrow's snack" | Links to Ideas › Tomorrow; no new guidance. |
| Now card, Day rail, Tonight | "Game day" / "Game" chip | Label only. No game-specific food or fluid copy is shown (ACT-04 stays as reviewed). |
| Today titles | "Soccer practice", "Soccer game" from You › Sport | Names only (audit 13.4: no sport-specific nutrition without review). |

Code: `src/domain/tonight.js`, `src/domain/timing.js` (`sportEventTitle`), `src/pages/Today/TonightCard.jsx`.
## Pending qualified review — ingredient allergen tags (P1-09, 2026.09.29)

**Status: not approved.** These tags were drafted on 2026.09.29 for P1-09 (ADD-03). The earlier approval above names "ingredient allergen tags and exclusion behavior", but no tags existed when it was given, so it does not cover this table. This section approves nothing.

**Safety gate:** `ALLERGY_TAGS_REVIEWED = false` in `src/domain/catalog.js`. While it is false:
- You › Food needs & allergies and setup step 5 show no allergy chips. They show "Allergy filtering is waiting for review. Check every label."
- Ideas, Today and grocery suggestions are **not** filtered by allergy (`activeAllergies` returns nothing).
- Product views (search portion editor, barcode result, grocery item sheet) list allergens that Open Food Facts reports in `allergens_tags` / `traces_tags`, followed by "From Open Food Facts; this list may be incomplete." and the existing "Allergies: check every label." USDA results carry no allergen fields, so nothing extra shows for them.

Flip the flag to `true` only after the sign-off below is filled in. `tests/allergens.test.js` covers both states.

**How the tags are used once the gate opens** (`src/domain/allergens.js`):
- The allergy list is the nine FDA major allergens [S6] plus "Other". "Other" never filters. It shows "Nourally can't filter other allergies. Check every label."
- An idea lists an allergen when **any** of its ingredients has it under Contains **or** May contain. Ideas and grocery suggestions that list a chosen allergy are hidden. An ingredient with no tags counts as a match, so it is hidden too.
- "May contain" here covers typical cross-contact and brand-to-brand variation. A tag that is too broad only hides more ideas. A missing tag is the dangerous error.
- A legacy "Nut-free" (or Gluten-free / Dairy-free) choice is **not** turned into an allergy. The Food needs sheet shows a prompt to choose allergies instead.
- Status copy (new, pending): "Ideas that list peanuts are hidden. Check labels on products." Setup step 5 line: "Nourally hides ideas that list your allergies, but always check labels." (audit ONB-04).
- Gluten-free and Dairy-free stay hidden even with the gate open. Gluten also comes from barley and rye, which are not FDA major allergens and are not tagged.

### Ingredient table

Columns: Contains = typical U.S. product lists it in ingredients or a "Contains" statement. May contain = typical precautionary label or shared-equipment risk, or varies by brand. Ideas = how many built-in ideas use the ingredient. Grocery = appears as a grocery suggestion.

| # | Ingredient (`id`) | Contains | May contain | Ideas | Grocery |
|---|---|---|---|---|---|
| A1 | Fresh fruit / Apples (`apples`) | none | none | 3 | yes |
| A2 | Applesauce pouches (`applesauce`) | none | none | 2 | yes |
| A3 | Vegetables / Baby carrots (`baby-carrots`) | none | none | 3 | yes |
| A4 | Bananas / Fresh fruit (`bananas`) | none | none | 7 | yes |
| A5 | Canned beans (`beans`) | none | none | 2 | yes |
| A6 | Bagels or bread / Whole-grain bread (`bread`) | Wheat, Soy | Milk, Eggs, Sesame | 5 | yes |
| A7 | Cereal (`cereal`) | Wheat | Milk, Soy, Tree nuts, Peanuts | 2 | no |
| A8 | Cheese sticks (`cheese-sticks`) | Milk | none | 1 | yes |
| A9 | Chicken (`chicken`) | none | none | 1 | yes |
| A10 | Chickpeas (`chickpeas`) | none | none | 1 | no |
| A11 | Chocolate milk (`chocolate-milk`) | Milk | none | 1 | no |
| A12 | Crackers (`crackers`) | Wheat | Milk, Soy, Sesame | 3 | yes |
| A13 | Dried fruit (`dried-fruit`) | none | Tree nuts, Peanuts | 1 | no |
| A14 | Edamame (`edamame`) | Soy | none | 1 | no |
| A15 | Eggs (`eggs`) | Eggs | none | 1 | yes |
| A16 | Fig bars (`fig-bars`) | Wheat | Soy, Milk, Tree nuts | 1 | yes |
| A17 | Fresh or frozen fruit / Frozen berries (`frozen-berries`) | none | none | 3 | yes |
| A18 | Fruit cups (`fruit-cups`) | none | none | 2 | no |
| A19 | Granola (`granola`) | none | Wheat, Tree nuts, Peanuts, Milk, Soy, Sesame | 1 | no |
| A20 | Grapes (`grapes`) | none | none | 1 | no |
| A21 | Hummus (`hummus`) | Sesame | none | 1 | yes |
| A22 | Jam (`jam`) | none | none | 1 | no |
| A23 | Juice boxes (`juice`) | none | none | 1 | no |
| A24 | Oats (`oats`) | none | Wheat | 1 | yes |
| A25 | Pasta (`pasta`) | Wheat | Eggs | 1 | no |
| A26 | Pita (`pita`) | Wheat | Sesame, Soy, Milk | 1 | no |
| A27 | Pretzels (`pretzels`) | Wheat | Soy, Sesame | 1 | yes |
| A28 | Rice (`rice`) | none | none | 4 | yes |
| A29 | Rice cakes (`rice-cakes`) | none | none | 1 | no |
| A30 | Salsa (`salsa`) | none | none | 1 | no |
| A31 | Seed mix (`seed-mix`) | none | Tree nuts, Peanuts, Sesame | 1 | no |
| A32 | Shelf-stable soy milk / Soy milk (`soy-milk`) | Soy | Tree nuts | 3 | yes |
| A33 | Soy yogurt (`soy-yogurt`) | Soy | Tree nuts | 1 | no |
| A34 | Sports drink (`sports-drink`) | none | none | 1 | yes |
| A35 | Sunflower-seed butter (`sunbutter`) | none | Peanuts, Tree nuts | 1 | yes |
| A36 | Tofu (`tofu`) | Soy | none | 1 | yes |
| A37 | Tortillas (`tortillas`) | Wheat | Soy, Milk | 1 | yes |
| A38 | Tuna pouches (`tuna-pouches`) | Fish | Soy | 1 | yes |
| A39 | Turkey (`turkey`) | none | Milk, Soy | 1 | no |
| A40 | Yogurt (`yogurt`) | Milk | none | 1 | yes |

Shellfish: no built-in ingredient is tagged, so a shellfish allergy hides nothing. The reviewer should confirm this.

### Questions for the reviewer

1. **Brand-dependent items (A7 cereal, A19 granola, A12 crackers, A16 fig bars, A26 pita, A37 tortillas):** is a broad "may contain" list the right way to handle products that vary this much? The other option is to drop the idea for anyone with any major allergy.
2. **Oats (A24):** tagged may contain wheat for cross-contact. Confirm.
3. **Sunflower-seed butter (A35):** tagged may contain peanuts and tree nuts because of shared equipment [S7]. Some brands are made in dedicated facilities. Confirm keeping the tag.
4. **Turkey (A39) and chicken (A9):** some deli meats and cafeteria chicken contain milk or soy (broth, marinade, soy sauce). Turkey is tagged may contain milk and soy. Chicken is untagged. Decide whether chicken needs soy and wheat.
5. **Soy milk and soy yogurt (A32–A33):** tagged may contain tree nuts for plants that also make almond products. Confirm.
6. **Rice cakes (A29), fruit cups (A18), juice (A23), sports drink (A34), salsa (A30), jam (A22):** untagged. Flavored rice cakes can contain milk. Confirm plain versions only.
7. **Tuna pouches (A38):** tagged Contains fish and may contain soy (vegetable broth). Confirm.
8. **Filtering rule:** hiding on "may contain" as well as "contains" is stricter than some allergy plans need. Confirm or change.
9. **Open Food Facts wording:** "Label lists: … May contain: … From Open Food Facts; this list may be incomplete." Confirm that it does not read as a safety claim. Nothing is shown when Open Food Facts lists no allergens.

### Setup copy added with P1-11 (pending the same review)

- Step 6 preview: "Here's your first plan: [Soccer practice] today at 4:00 PM. Plan a snack for about 2:30." It uses the audit's sample copy and the same 90-minute pre-activity point that Today already uses. There is no snack time when that time has passed. With no activity it says "Add a practice or game any time on Schedule. Today will time your snacks around it." (`firstPlanPreview` in `src/domain/setup.js`).
- Step 5 shows the audit ONB-04 line "Nourally hides ideas that list your allergies, but always check labels." only once the allergen gate is open. Until then it shows the waiting line.
- New athletes now start with "Keep ideas low-cost" off (ONB-03), so higher-cost ideas show by default.

### Sign-off (ingredient allergen tags)

- Reviewer name: ______________________
- Credential: ______________________
- Date: ______________________
- Decision (Approve as written / Approve with changes listed / Not approved): ______________________
- Changes required: ______________________
- After approval: set `ALLERGY_TAGS_REVIEWED = true` in `src/domain/catalog.js`, run `npm run check` and the browser checks, then tick P1-09, YOU-03 and ADD-03 in `REDESIGN-CHECKLIST.md`.
## Pending qualified review — search portions, allergen line and Log copy (2026.09.29)

Added with P1-07 and P1-08. Not approved; recorded for the reviewer.

- **Search portion hints (`BASIC_PORTIONS` in `src/domain/search.js`).** Common household portions for basic foods, taken from USDA SR Legacy food measures, shown under results ("Basic food · 1 medium, 118 g") and used as the starting amount in the log portion sheet: apple 1 medium 182 g; banana 1 medium 118 g; orange 1 medium 131 g; grapes 1 cup 151 g; rice 1 cup cooked 158 g; pasta 1 cup cooked 140 g; oats 1 cup cooked 234 g; peanut butter 2 tbsp 32 g; egg 1 large 50 g; bread 1 slice 28 g; milk 1 cup 244 g; yogurt 1 container 170 g; baby carrots 10 carrots 100 g; pretzels 1 oz 28 g; bagel 1 medium 105 g; sweet potato 1 medium 114 g; potato 1 medium 173 g; chicken breast 3 oz cooked 85 g. Reviewer: confirm these read as a typical portion, not an amount to eat. Packaged foods use the label serving; USDA food measures are used when the API returns them.
- **Product allergen line (SRCH-07, `allergenLine`).** Products with no Open Food Facts data: "Allergens: check the package." With data: "Allergens listed: peanuts, milk. May contain: tree nuts. This list may be incomplete. Check the package." Tag names are shown as Open Food Facts spells them after removing the language prefix. "Allergies: check every label." still shows on every result.
- **Log › Week sentence (`weekSentence`).** Counts only: "3 practices and 1 game. You planned food for 3 of them.", "None had a food plan.", "Nothing logged this week. That's fine — logging is optional.", footer "This is a record of what you logged. It is not a score."
