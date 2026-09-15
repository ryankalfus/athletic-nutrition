# Nourally audit implementation checklist

Source: [September 14 audit](Nourally-App-Audit-2026-09-14.md). Created September 14, 2026.

Only `[x]` with strikethrough means implemented **and verified**. Unchecked items remain work, not a claim of completion. Evidence and any limitations are recorded below. The original audit remains an unchanged historical baseline.

## Product decisions and preservation

- [x] ~~D01 Preserve existing profiles, schedules, food records, and uncommitted source changes with an additive, backed-up migration.~~
- [x] ~~D02 Implement separate local device profiles; do not imply authenticated privacy or cloud sync.~~
- [x] ~~D03 Define a per-shop budget; distinguish zero spending from an explicitly unset limit.~~
- [x] ~~D04 Support exact pantry quantity/units and optional Some/Low/Out tracking.~~
- [x] ~~D05 Require explicit, undoable pantry-consumption confirmation when logging.~~
- [x] ~~D06 State that reminders work only while open; do not advertise unverified background delivery.~~
- [x] ~~D07 Keep all six main destinations and five Food destinations accessible; retain useful existing controls.~~
- [x] ~~D08 Do not reintroduce numbered workflow rails, School/Next Sport/Prep cards, feedback questionnaires, tab-card nesting, or new photos.~~
- [x] ~~D09 Keep the USDA snapshot distinction truthful; provide a deliberate indexed ingestion path if enabling local catalog search.~~

## Gate A — correctness and persistence

- [x] ~~A01 / B01 Replace fuzzy ingredient equality with explicit canonical IDs/approved aliases; distinguish peanut/sunflower butter, dairy/soy milk, rice/rice cakes, and unrelated beans.~~
- [x] ~~A02 / B14 Use the same ingredient resolution for meals, pantry, cart, and generated groceries; preserve specific product identity separately.~~
- [x] ~~A03 Show the actual pantry match, flag unresolved identities, and allow correction/explicit substitution.~~
- [x] ~~A04 / B02 Preserve manual/search/meal grocery lines on regeneration; track origin and preview proposed additions.~~
- [x] ~~A05 Preserve quantities, prices, notes, and cart state when accepting recommendations; allow selected additions and undo.~~
- [x] ~~A06 / B06 Enforce zero and small budgets without minimum-basket overspending; explain unmet needs and an affordable subset.~~
- [x] ~~A07 / B07 Keep unknown prices null; show known subtotal/unknown count; avoid claiming a remaining balance when incomplete.~~
- [x] ~~A08 Edit package price, quantity, and package size; clearly label estimates and the per-shop accounting period.~~
- [x] ~~A09 / B03 Isolate new device profiles; add profile selection and honest local-profile/sign-out behavior.~~
- [x] ~~A10 / B04 Serialize cross-tab updates against fresh state; synchronize open tabs; preserve hydration and grocery operations.~~
- [x] ~~A11 Record hydration changes as entries and provide accurate undo without losing concurrent updates.~~
- [x] ~~A12 / B05 Add safe parsing, versioned schemas, validation, migration idempotency, backup, and a non-destructive recovery screen.~~
- [x] ~~A13 Handle unsupported schema versions, malformed shapes, storage unavailable/quota failure, and visible save errors.~~
- [x] ~~A14 Add profile export, validated additive import, and explicit profile deletion with confirmation/backups.~~
- [x] ~~A15 Add a React error boundary that offers recovery without automatically clearing data.~~

## Gate B — food records, logging, and providers

- [x] ~~F01 / B08 Share a portion editor across provider search, pantry, barcode, log editing, and manual entries.~~
- [x] ~~F02 Label nutrient basis per 100 g or per 100 ml; preserve unknown versus zero and prevent invented mass/volume conversions.~~
- [x] ~~F03 Preserve immutable nutrition/source snapshots, provider IDs, retrieval times, and user-adjusted overrides in history.~~
- [x] ~~F04 Support household measures only when a source supplies a valid conversion; offer explicit amount/unit entry otherwise.~~
- [x] ~~F05 / B19 Accept legitimate zero-calorie and unknown-calorie food check-ins.~~
- [x] ~~F06 / B20 Validate serving bounds in both UI and handlers, including barcode amounts above 2000.~~
- [x] ~~F07 Normalize Open Food Facts and USDA into the same food-definition interface; barcode supports pantry/grocery/log destinations.~~
- [x] ~~F08 / B15 Clear stale results on query/filter changes and failed searches; associate results with a query and cancel superseded requests.~~
- [x] ~~F09 Provide loading, retry, no-result, offline/error, manual fallback, and screen-reader status messages.~~
- [x] ~~F10 / B16 Include Foundation, FNDDS, and SR Legacy in Generic; add pagination and source-type labels.~~
- [x] ~~F11 Rank exact name/brand/barcode matches appropriately and preserve meaningful product distinctions.~~
- [x] ~~F12 / B22 Move private provider keys to a server gateway, remove VITE key guidance, ignore private environment files.~~
- [x] ~~F13 Add server validation, provider timeouts/errors, bounded cache, detail lookup, and explicit development-key status.~~
- [x] ~~F14 Add optional USDA archive ingestion with validated metadata, indexed names/brands/barcodes, paginated queries, and documented refresh.~~
- [x] ~~F15 Add recent/favorite foods to avoid repeat lookups; work from saved food records when the provider is unavailable.~~
- [x] ~~F16 Lazy-load camera decoding; stop tracks/timers on close, capture, navigation, and permission failure.~~

## Gate C — pantry, groceries, and meals

- [x] ~~C01 Add pantry quantity/unit, optional package amount, location, dates, expiry, and low-stock threshold.~~
- [x] ~~C02 Support approximate availability and distinguish Ready now from partly stocked meals.~~
- [x] ~~C03 Create idempotent purchase transactions that update list/cart, pantry, date, actual price, and purchase history together.~~
- [x] ~~C04 Add purchase undo and full purchase-history browsing; avoid duplicate stock on repeated checkout.~~
- [x] ~~C05 Allow a purchased product substitution without losing the original grocery requirement.~~
- [x] ~~C06 / B18 Reject future trip dates in the save handler and represent approximate recency without fake exact dates.~~
- [x] ~~C07 Rank suitable meals by pantry readiness, preparation effort, favorites, and context; retain variety.~~
- [x] ~~C08 Make mixed meal alternatives explicit dietary variants; do not apply template flags to arbitrary branded products.~~
- [x] ~~C09 Show readiness, actual ingredients, heating/cold-storage requirements, preparation steps, and missing amounts.~~
- [x] ~~C10 Add missing quantities after subtracting usable pantry and queued groceries; deduplicate shared ingredients.~~
- [x] ~~C11 Store meal-plan ID, template/version, event, intended time, servings, and linked prep tasks.~~
- [x] ~~C12 Replace planned meals deliberately; preserve shared gear tasks; offer undo and rebuild missing prep.~~
- [x] ~~C13 Flag previously planned meals for review after constraints change.~~
- [x] ~~C14 Log a planned meal with actual portions/ingredients; do not equate planning with eating.~~
- [x] ~~C15 Deduct pantry stock only by explicit linked transaction, validate quantities, and support independent undo.~~
- [x] ~~C16 Replace explanatory Food overview panels with actionable low-stock, next meal, grocery, price, and recent-log summaries.~~

## Gate D — schedule, Today, and reminders

- [x] ~~S01 / B10 Detect active lunch/food intervals before the next window; test before/start/middle/end/after boundaries.~~
- [x] ~~S02 / B11 Preserve recent recovery and the next-session context together; cover multi-session days.~~
- [x] ~~S03 Calculate departure/preparation times from travel; label assumptions and avoid implying the athlete is home after departure.~~
- [x] ~~S04 Distinguish missing setup from intentional rest days and remove irrelevant pre-practice copy.~~
- [x] ~~S05 / B12 Use actual start/remaining time in notification text; deduplicate correctly after rescheduling/settings changes.~~
- [x] ~~S06 / B13 Explain why no meals fit; offer relevant access/profile/manual actions instead of Add schedule.~~
- [x] ~~S07 / B17 Show skipped sports occurrences and restore them; distinguish skip, occurrence, and whole-series changes.~~
- [x] ~~S08 Confirm or undo deletion of a series; clearly label scope of recurring edits and end dates.~~
- [x] ~~S09 Add an overlap warning and consistent timing/travel validation, including unsupported overnight events.~~
- [x] ~~S10 Offer a mobile agenda/date strip and optional month view with a focused event editor.~~
- [x] ~~S11 Rename manual school import controls to Save school schedule and retain school exceptions/access settings.~~
- [x] ~~S12 Improve Today information order: compact title/date, next action, event/departure, prep, hydration, relevant tomorrow prep.~~
- [x] ~~S13 Make the primary action progress from plan to missing ingredients/prep/check-in instead of remaining disabled all day.~~
- [x] ~~S14 Keep explanations short with optional detail; preserve the existing 16-pixel Today gap and desktop geometry.~~

## Gate E — navigation, visual system, accessibility, and review

- [x] ~~U01 / B09 Move Food search into a contextual add sheet/view so it never buries the selected subsection.~~
- [x] ~~U02 Keep destination and query context on return; focus the subsection heading and expose selected state.~~
- [x] ~~U03 Add real URL routes, Back/Forward support, refresh persistence, and safe query state without private data in URLs.~~
- [x] ~~U04 Create a consistent compact header; mobile Today/Food/Schedule plus accessible More for remaining destinations.~~
- [x] ~~U05 Use lightweight Food navigation without background-card nesting or repeated numbered explanations.~~
- [x] ~~U06 Standardize teal/navy/lime roles, semantic status colors, borders, radii, and a 4/8/12/16/24/32 spacing scale.~~
- [x] ~~U07 Reduce daily page headlines; use readable body/meta text; reserve editorial serif for onboarding.~~
- [x] ~~U08 Flatten dense pantry/grocery/log/event rows; use restrained shadows and consistent code-native icons.~~
- [x] ~~U09 / B21 Provide comfortable touch targets, persistent field labels, selected states, live status, and visible high-contrast focus.~~
- [x] ~~U10 Validate contrast, keyboard navigation, dialog focus/escape/return, reduced motion, zoom, long labels, and error states.~~
- [x] ~~U11 Compact Weekly summaries/chart; label current streak separately; provide a readable data table and missing-data states.~~
- [x] ~~U12 Add History date selection, correction/detail editing, export, and clear zero versus unknown values.~~
- [x] ~~U13 Warn about unsaved profile changes; use Save changes after onboarding; explain local storage and ownership.~~
- [x] ~~U14 / B23 Add the app favicon and verify no ordinary console/resource errors.~~

## Gate F — architecture, regression tests, and documentation

- [x] ~~T01 Extract tested modules for timing, food/provider normalization, identity, transactions, persistence, and shared UI.~~
- [x] ~~T02 Pin intentional dependency versions; add lint, typecheck, unit/component/browser checks and CI configuration.~~
- [x] ~~T03 Automate every reproduced B01–B23 failure where the environment permits; record precise evidence.~~
- [x] ~~T04 Test migration twice, independent profiles, malformed shapes, quota failure, simultaneous tabs, and additive restore.~~
- [x] ~~T05 Test full search → grocery → purchase → pantry → plan → prep → log → optional deduction → undo workflows.~~
- [x] ~~T06 Test recurrence exclusions, lunch boundaries, multiple sessions, midnight, year boundaries, DST/timezones, and long names.~~
- [x] ~~T07 Test provider no-results/429/offline/stale/cancel, generic coverage, pagination, barcode zero/invalid/oversized portions.~~
- [x] ~~T08 Inspect empty/populated/restrictive/long-content screens at 390/768/1024/1440 widths and narrower/zoomed states.~~
- [x] ~~T09 Verify build, lint, typecheck, tests, local API, browser console, and production server behavior.~~
- [x] ~~T10 Update product/operation documentation with actual supported data, reminder, local-profile, and catalog capabilities.~~
- [x] ~~T11 Document any remaining real-device, credential, service, expert-review, and manual accessibility requirements honestly.~~

## Explicitly deferred or externally dependent (do not silently mark complete)

- [ ] X01 Physical camera success: permission/revocation, focus, poor lighting, real barcode, mobile keyboard, and cleanup on actual phones.
- [ ] X02 Actual OS notification delivery, suspended/closed-app behavior, Safari/Firefox/device-specific testing.
- [ ] X03 Full manual screen-reader and accessibility certification; specialist nutrition/template review.
- [ ] X04 Production authenticated accounts/cloud sync/background notification service require a chosen deployment and credentials; local profiles are the selected implementation for now.
- [ ] X05 Private USDA key and production hosting provisioning remain user-owned; demo mode/local indexed catalog must work without invented credentials.

The audit explicitly defers social feeds, leaderboards, body-weight targets, AI coaching, coach dashboards, retailer checkout, recipe-authoring expansion, and new photography. These are not implementation tasks and must not be added under this request.

## Verification journal

Final verification pass (September 14): `npm run check` passes lint, domain JavaScript typechecking, 17 regressions, and the production build. `npm audit --audit-level=high` reports zero known vulnerabilities. Isolated browser checks cover migration, concurrent tabs, malformed recovery, additive import, selected-profile deletion, quota failure, the complete Food workflow, provider no-result/429/barcode cases, recurring schedules, and every destination at 320/390/768/1024/1440 pixels with no page overflow or page error. The built local production server returns HTTP 200 and the dated local USDA index returns `local-snapshot`. Full evidence is in [IMPLEMENTATION-VERIFICATION.md](IMPLEMENTATION-VERIFICATION.md). Only the explicitly external X01–X05 checks remain open.
