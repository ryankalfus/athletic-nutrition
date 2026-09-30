# Nourally — remaining app changes

This checklist translates the meeting summary into unfinished app work, checked against the current source and running interface. It is not a new feature wishlist. Existing functionality should be extended, not rebuilt. Suggested implementation details below are acceptance criteria, not additional commitments from the meeting.

## 1. Real schedule import

The app already supports manually entered school schedules, recurring sports, exceptions, travel, and schedule-aware fueling. It does not yet import an external school/team calendar. Profile backup import is a different feature.

- [ ] Add an actual schedule-import entry point in Schedule and initial setup. A calendar-file import such as ICS is a reasonable first supported format; retain manual entry. Do not require third-party account integrations to complete the initial version.
- [ ] Add an import preview before saving. Let the athlete select events, identify school/practice/game/workout entries, and supply missing activity details. Handle dates, time zones, recurring occurrences, unsupported entries, and duplicates explicitly; do not silently invent times or overwrite existing schedules.
- [ ] Feed confirmed imports into the existing timeline, fueling logic, reminders, preparation, and activity-based groceries. Imported events must remain editable, and changes or cancellations must update the downstream guidance.

## 2. Schedule-first setup and athlete personalization

Current setup starts with food preferences and then Today. It has budget, dietary categories, food access, and family-preparation settings, but no dedicated sport or explicit allergy profile.

- [ ] Rework first-run setup around the intended journey: import or enter schedule → athlete/sport details and food preferences → food available at home → personalized Today. Allow skipping and returning to incomplete steps, including a clear rest-day path. Reuse existing screens and preserve existing profiles.
- [ ] Add sport selection to the athlete profile and relevant activities. Keep sport distinct from activity type: “practice” is not a sport. Use this context in activity labels and explanations; only change nutrition recommendations by sport where sourced guidance supports the distinction.
- [ ] Separate explicit allergies from general dietary preferences. Persist selections and apply them consistently to meal candidates, substitutions, and generated groceries. Distinguish unknown product/allergen information from confirmed compatibility; do not label a food allergy-safe merely because its database record lacks a warning. Retain product-label checking guidance.
- [ ] Make food likes/dislikes or preferred/avoided ingredients usable by the recommendation system. Reuse existing favorites where appropriate, but ensure actual meal selection respects these preferences across Today and Food rather than only saving favorite search results.

## 3. Consistent, practical fueling recommendations

The timing engine already handles pre-activity, activity, recovery, travel, school access, and dietary/budget filters. Food → Meals already ranks candidates by pantry availability. Today still selects the first timing-filtered catalog idea before checking inventory for an existing plan.

- [ ] Use one shared personalized meal-ranking path for Today and Food. Account for actual pantry quantities, food access, preferences, restrictions, and upcoming activity before choosing the primary suggestion. Clearly distinguish “available now” from “needs ingredients.”
- [ ] Remove misleading default-food behavior, including automatically elevating “Banana + pretzels” solely because it is first in the catalog. Keep ordinary foods as valid options when they genuinely fit. When information or suitable food is missing, show a specific setup or shopping action instead of implying a fully personalized meal has been found.
- [ ] Extend the existing hydration support into clear activity-timed guidance. Connect the relevant upcoming practice/game and supported duration/intensity context to preparation and hydration cues, not just an ounce log or generic reminder to drink. Keep logging optional and avoid independently prescribed fluid targets.

## 4. Focused interface cleanup

The app already has a consistent palette, shared navigation, a dominant next-action card, and responsive layouts. The remaining work is clearer athlete context and less generic/database-style presentation—not replacing those foundations or adding more dashboard cards.

- [ ] Refine the entry/setup screen into a clear schedule-first starting point. Replace generic setup language such as “Set your food reality” with direct labels and explain what the athlete will get from completing the next step. Do not add an unnecessary separate Home tab.
- [ ] Refine Today so its main action communicates the relevant activity, timing, and practical food/preparation decision at a glance. Make incomplete-schedule states precise: distinguish missing sports, a confirmed rest day, and missing school food-window details. Replace passive “Lunch Time TBD” with an actionable way to complete the missing information. Keep one dominant action and preserve the previously removed workflow strip and summary cards as removed.
- [ ] Improve Schedule around the new import workflow: make import/manual entry easy to find, show which entries were imported, and make the selected day's school-to-sport sequence easy to scan. Provide a clear route to fix missing timing or food-access details without losing the selected day.
- [ ] Make food presentation more human-readable wherever it supports the core flow. For example, long all-capital database product names currently appear in Food overview alerts. Present readable names and secondary brand details while retaining the original source identity and nutrition metadata in details. Use concise, concrete copy instead of technical record terminology in primary actions.

## 5. Credible guidance and visible boundaries

An educational/non-medical disclaimer already exists on Profile, and meal guidance already warns that amounts are examples. Food database attribution is not the same as evidence supporting meal-timing or hydration rules.

- [ ] Replace unsupported temporary recommendation assumptions with a documented, source-backed rule/content set. Associate meal-timing thresholds, recovery advice, hydration cues, and example portions with their supporting references. Do not treat USDA food composition data as endorsement of a fueling rule.
- [ ] Add accessible source and rationale details alongside recommendations, extending the existing “Why this action?” interaction. Clearly separate the reason this suggestion fits the athlete's schedule from the reference supporting the general guidance.
- [ ] Surface the existing general-guidance boundary where advice is consumed, not only in Profile. Keep it concise and consistently state that Nourally supports fueling, timing, hydration, and planning—not medical treatment or independently prescribed calorie targets. Preserve the current non-prescriptive approach rather than adding a calorie-goal system.

## 6. Verify the completed core journey

- [ ] Add end-to-end coverage for the new journey: import schedule → confirm athlete/preferences/allergies → add available food → receive a relevant suggestion → plan/prepare → log food → add missing ingredients to groceries. Cover import errors/duplicates, schedule changes, no suitable food, unknown allergens, and consistency between Today and Food. Check the revised screens on phone and desktop widths without changing existing user data.

## Scope boundaries

This list excludes already-built food search, pantry, grocery budget/cart/purchase workflows, food logging, history, basic hydration tracking, manual scheduling, and the existing timing engine. It also excludes interviews, contacting experts, competitive research documents, recordings/submissions, and academic tasks. Chatbot AI and an “ask a nutritionist” service remain deferred. No app changes were implemented while producing this checklist.

## Implementation reference

- [Main screens and current first-run flow](../src/main.jsx)
- [Timing and access rules](../src/domain/timing.js)
- [Food templates and default profile](../src/domain/catalog.js)
- [Connected Food workspace and meal ranking](../src/components/FoodWorkspace.jsx)
- [Food identities and ingredient matching](../src/domain/food.js)
- [Meal plans and profile signature](../src/domain/plans.js)
- [Reminders](../src/domain/reminders.js) and [hydration records](../src/domain/hydration.js)
- [Existing implementation verification](../AUDIT/IMPLEMENTATION-VERIFICATION.md)
