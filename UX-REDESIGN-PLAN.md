# Nourally UX/UI redesign plan

The visual and interaction redesign that follows the product redesign in
[CLAUDE-REDESIGN-AUDIT.md](CLAUDE-REDESIGN-AUDIT.md). The audit settled what the app does and
how it is organised. This plan settles how it looks and feels: far fewer cards, no pill chips
for short text, a floating translucent tab bar on phones, and a sleeker, more modern,
phone-first layout that still works at every width. Status lives in
[UX-REDESIGN-CHECKLIST.md](UX-REDESIGN-CHECKLIST.md).

This plan recommends changes. Apart from phase U0 (the review, done 2026.10.15) it does not
claim that any change exists.

## How to read this plan

**Relation to the audit.** The audit stays the source of truth for product rules: safety
rules, owner decisions (audit §13.7, all recorded 2026.09.29), copy and voice (audit §7),
routes and information architecture (audit §4, §13.1). This plan is the source of truth for
visual design, layout, component look and the interaction details it lists. If the two
disagree on a product rule, the audit wins. If they disagree on looks, this plan wins.

**Evidence labels.**

| Label | Meaning |
|---|---|
| `p101` | Phone capture 101 at 390 × 844: `output/ux-review/phone/101-*-fold.png` (plus `-full.png` where it exists). |
| `p701`–`p718` | Phone captures at 320 × 740 (the w320 block). |
| `d101` | Desktop capture 101 at 1440 × 900: `output/ux-review/desktop/101-*-fold.png`. |
| `d641`–`d646` | Tablet captures at 768 × 1024. `d701`–`d718` are 1024 px captures. |
| `TS T2`, `TS S4`, `TS D1` | Review note `output/ux-review/review/today-schedule.md`, section T2, S4, D1. |
| `FD Ideas`, `FD Log` | Review note `output/ux-review/review/food.md`, named section. |
| `SY A4`, `SY G1` | Review note `output/ux-review/review/setup-you-global.md`, section A4, G1. |
| `file.jsx:57` | Source in this repo (paths under `src/` unless shown). |

`output/` is git-ignored, so the captures exist on the machine that made them. Build item
U1-06 moves the capture harness into `scripts/ux-review/` so anyone can regenerate them.

**IDs.** Every recommendation has a stable ID, `UX-<AREA>-<nn>`. Areas: `DS` tokens and
surfaces, `NAV` navigation and page frame, `CMP` shared components, `COPY` copy rules this
layout needs, `WEL` Welcome, `SET` setup, `TODAY`, `SCH` Schedule, `FOOD` Food frame, `IDEA`,
`HOME` (At home), `GROC`, `LOG`, `SRCH` (search, portion, barcode), `YOU`, `DEV` (This device
and data recovery), `MISC` (About, Not found, footer), `FLOW` flow fixes, `BUG` defects found
in the review, `RWD` tablet and desktop adaptation, `TEST` test and tooling. Build items in
section 10 use `U1-01` style IDs and list the recommendation IDs they close.

**Sizes.** XS < 2 h, S ≤ 1 day, M 2–3 days, L about a week, XL more than a week.

**Done when.** Every build item ends with a testable condition. Where the condition is a
browser assertion, section 11 names the helper and the test file. An item closes only when
its condition passes and `npm run check` and `npm run test:browser` pass (AGENTS.md).

## Contents

1. Executive summary
2. The owner brief, line by line
3. Evidence: the U0 review
4. Design direction: "Under the lights"
5. Global patterns
6. Page-by-page specification
7. Flow fixes
8. Bug list
9. Responsive adaptation
10. Phased build plan (U0–U10)
11. Test plan and shared assertions
12. Platform note
Appendix A. ID index

## 1. Executive summary

**What is wrong.** The colors and the product logic are good; the structure is not. Almost
every piece of content sits in its own white, bordered, shadowed, 16 px-radius card
(`styles/components.css:302` `.card`, `--shadow-1`, `--rhythm-card`). A normal Today is five
stacked boxes (`p101`–`p116`, `TS T1`). You is "a separated card above two connected cards"
(`p501`, `SY B1`). Schedule opens on two settings cards before the week (`p204`, `TS S1`).
Short facts are wrapped in small pills: "School 8–3" under the date, "Bananas to buy",
"For Tue practice", Cafeteria and Fridge chips, 17 "Not a fan of" pills (`p102`, `p124`,
`p354`, `p013`, `p015`). Four look-alike grey segmented trays stack on Food
(`FD Food section tabs`). The bottom tab bar is a flush white slab with a 6 px active dot
(`p608`–`p611`, `SY G1`). The review also found 21 defects, from an empty sport being saved
(`p504`) to error messages that stay after the field is fixed (`p007`, `p012`, `p228`) to
`viewport-fit=cover` missing from `index.html`, which makes every safe-area inset 0 on iPhones.

**The direction.** "Under the lights" (section 4). Each screen has at most one lit field, the
flat pitch-green hero, and everything else is the sideline: flat paper, plain hairline rows,
sentence-case group titles, no boxes. Lime is the floodlight and is spent in three places
only: the one primary action on the hero, the active tab, and the now marker. Times and the
hero instruction speak in Barlow Semi Condensed, the scoreboard voice; everything else is DM
Sans. Today's hero gets one signature element: the run-up line, a short track from now to the
next session with the eat-by mark on it. On phones the tab bar floats 12 px from the edges as
a translucent paper capsule with backdrop blur and a pitch active pill with a lime icon. Every
color in `tokens.css` is kept.

**What changes, in numbers.**

| Measure | Now | Target |
|---|---|---|
| Content elements with a border and a shadow (inside `main`, outside the hero) | 11 `--shadow-1` uses in 6 page and component CSS files, plus its definition in `tokens.css` | 0 |
| Pill chips for status or meta inside `main` | dozens per route | 0 |
| Selection idioms | 5 (pill chips, circle chips with badges, white-segment trays, left switches, checkboxes) | 3 (checklist rows, pitch-fill segmented, right switch rows) |
| Exits per bottom sheet | 3 (grabber, X, Cancel) | 2 (grabber or scrim, plus Cancel only when there are edits) |
| Rendered " · " meta strings, ALL-CAPS text, spaced em dashes | many | 0, enforced by a route scan |
| Primary-styled buttons visible per screen | up to 6 (Ideas, `p301`) | 1 |
| Control rows above the first Food item at 390 | 4 (~300 px, `p301`) | 2 (≤ 120 px) |

**How it is built.** Ten build phases after the review: U1 bugs and tooling, U2 tokens, U3 the
frame and floating tab bar, U4 shared components, U5 Today, U6 Schedule, U7 Food, U8 Welcome,
setup, You and This device, U9 tablet and desktop adaptation, U10 a full screenshot re-review
at 390, 320, 768 and 1440 px against the brief. The 11 open items from REDESIGN-CHECKLIST.md
are folded into the phase where their screen is rebuilt (section 10.12).

**What does not change.** Allergy filtering stays off (`ALLERGY_TAGS_REVIEWED = false`). No
control claims to filter an allergen; Gluten-free, Nut-free and Dairy-free stay hidden.
"Allergies: check every label." stays on every product view. No food is ever called safe. No
calorie target, goal, fill-to-target meter or prescription appears; ideas stay examples.
Routes, stored data, domain rules and the four destinations (owner decision 7) stay.

## 2. The owner brief, line by line

| Brief | What this plan does | IDs |
|---|---|---|
| "Way less cards. The stacked cards look pretty ugly." | Retire the content card. Content sits on paper as rows and sections separated by space. Only floating layers (tab bar, sheets, menus, toasts) and one hero per screen are surfaces. | UX-DS-04, UX-DS-05, UX-TODAY-01, UX-SCH-01, UX-IDEA-01, UX-YOU-01, UX-DEV-01, UX-WEL-03 |
| "A separated card above two connected cards looks unappealing." | That exact pattern on You (`p501`), Schedule settings (`p204`), Ideas planned card over the idea grid (`p322`, `d643`) and This device (`p536`) is removed; settings become plain row groups with titles. | UX-YOU-01, UX-SCH-02, UX-IDEA-02, UX-DEV-01 |
| "More sleek, modern, more minimal and cooler design." | One hero and one primary per screen; larger type and fewer things; a radius ladder instead of one radius; glass only on floating chrome; the run-up line and the Barlow scoreboard voice as the memorable moments. | Section 4, UX-DS-01–12, UX-TODAY-02 |
| "Many unnecessary small circular cards for little text look ugly, e.g. under the date in Today that says 'School 8-3'." | Every pill chip for short text goes: Today date chips, "to buy" chips, alternate-food pills, ingredient chips, grocery reason tags, Quick add pills, access and food-needs pills, weekday circles with badges, ALL-CAPS badges. They become plain text, colored dots, checklist rows, a joined weekday bar and segmented controls. | UX-DS-07, UX-CMP-05–08, UX-TODAY-03 |
| "The current color scheme is good." | Every color token stays unchanged. Only where colors are used changes (section 4.4). | UX-DS-01 |
| "I especially like the part at the bottom where you pick the tab, but we need to get with the times and make it a floating slightly transparent tab selector on phone." | Same four items, labels and icons, now a floating capsule 12 px from the edges, paper at 82 % with blur, pitch active pill with a lime icon, safe-area aware, with solid fallbacks. | UX-NAV-01–08 |
| "A UI mainly built for phone but can handle every dimension." | Specs are written phone first (390, checked at 320). Tablet gets a floating top capsule. Desktop keeps the rail and gains two-pane You and Food and a 7-column week. | Section 9, UX-RWD-01–12 |
| Reference apps: Spotify, Cash App, Dunkin. | Spotify: plain list rows whose left column carries data, one accent for active and play. Cash App: one focus, big type, one action, quick-amount bars. Dunkin: brand-color moments, "ready by" time framing, big tappable tiles for quantities and quick add. | Section 4.1 |
| A full review of every screen, modal and pop-up, computer then phone, is the first item. | Phase U0, done 2026.10.15, evidence in section 3. | U0 |

## 3. Evidence: the U0 review

Phase U0 is done (2026.10.15). It reviewed every route, state, sheet, dialog, menu and toast,
desktop first and then phone, with a fixed clock (week of Mon Oct 12 – Sun Oct 18 2026) and
mocked `/api/*`.

| Evidence | Path | Count |
|---|---|---|
| Desktop captures (1440, plus 1024 and 768) | `output/ux-review/desktop/` | 462 PNG, 257 states |
| Phone captures (390, plus 320) | `output/ux-review/phone/` | 450 PNG, 251 states |
| One line per capture (pass, number, area, state, width, fold/full, description) | `output/ux-review/CAPTURES.txt` | 912 lines |
| Index by area and the states that could not be captured | `output/ux-review/INDEX.txt`, `not-captured.txt` | 10 uncaptured states, each with a reason |
| Scenario failures | `output/ux-review/FAILURES.txt` | none |
| Contact sheets used for the review | `output/ux-review/review/sheets/` | 56 sheets |
| Review: Today and Schedule | `output/ux-review/review/today-schedule.md` | 352 lines |
| Review: Food (Ideas, At home, Groceries, Log, search, barcode) | `output/ux-review/review/food.md` | 335 lines |
| Review: Welcome, setup, You, device, About, Not found, global patterns | `output/ux-review/review/setup-you-global.md` | 451 lines |
| Capture harness | `output/ux-review/run.mjs`, `lib.mjs`, `seeds.mjs`, `areas/*.mjs` | 7 area scripts |

Capture numbering (from `INDEX.txt`): 0xx onboarding and Welcome, 1xx Today, 2xx Schedule,
30x Ideas, 33x At home, 35x Groceries, 38x Log, 40x search, 42x scanner, 5xx You, device,
About and Not found, 6xx global (focus, nav, toasts, athlete switcher, data recovery,
tablet), 7xx second size (320 phone, 1024 desktop).

Not captured, with reason (from `not-captured.txt`): live camera scanning, the OS permission
prompt, a Sport & season error (none exists, see UX-BUG-01), setup step 3's second error,
the "Not saved" write-failure banner, the team-calendar refresh toast, the follow-up sheets
after the stale-plan and "Changed it" prompts, loading skeletons, the tablet bar in the phone
pass, and search pagination. U10 re-checks these by code reading or a forced state.

### 3.1 Ranked findings across the app

High (breaks the brief or blocks a task):

1. Card stacking on every main screen: Today 5–6 boxes (`p101`–`p116`, `d101`), Schedule one
   card above two joined cards plus seven day cards (`p204`, `d204`), Ideas a planned card
   above a grid of cards with six primary buttons (`p301`, `p322`, `d643`), You and This
   device card above card group (`p501`, `p536`), Welcome athlete tiles (`p042`).
2. Pill and circle chips for short text everywhere (`p102`, `p121`, `p124`, `p354`, `p013`,
   `p015`, `p008`, `p229`, `p332`).
3. Docked, dated tab bar with a 6 px active dot (`p608`–`p611`).
4. Today's hero has two competing headlines, a paragraph, four pills, a CTA and two
   underlined links (`p106`, `TS T2`); the evening checklist sits a screen below its hero
   (`p161`, `p162`).
5. Four look-alike segmented trays; navigation and filters look equal (`p301`, `p332`, `p381`).
6. Schedule opens on settings; the week starts at y ≈ 490 of 844 (`p204`, `p707`).
7. Defects: empty sport saved (`p504`), stale errors (`p007`, `p012`, `p228`, `p229`), lunch
   fields red with no message (`p009`), plan details only offers Close (`p132`, `p142`),
   barcode not-found dead end (`p423`), `viewport-fit=cover` missing.
8. Setup has four competing exits (Back, Skip step, Skip setup, Next: `p008`–`p016`) and a
   flat done screen (`p017`).

Medium: dot-meta strings and the 320 px orphan dot (`p707`); ALL-CAPS badges ("GAME DAY",
"PLANNED", "TODAY", "BUY 2 ITEMS", "READY – YOU HAVE EVERYTHING": `p114`, `p124`, `p204`,
`p301`, `p322`); spaced em dash headlines (`p104`, `p112`, `p317`); per-row X beside
checkboxes (`p126`); blue info-tint prompt card (`p171`); inverted delete-scope emphasis
(`p215`); sheet-on-sheet confirms (`p619`); button soup on This device (`p536`); hidden page
titles; desktop and tablet widths that jump per tab or stretch (`d332`, `d354`, `d645`).

Low: "Oct 12 - 18" hyphen (`p204`), "Copy list" icon mismatch, repeated device footer on
every page, focus ring on the sheet X after open (`p524`), tiny 404 (`p547`).

### 3.2 What the review says to keep

- The palette, including pitch + lime as the brand pair (`p106`, `p603`).
- Barlow Semi Condensed numerals; the countdown is the most characterful type in the app.
- One lime primary on the hero; the plan button that tracks the plan state (Plan this → Mark
  packed → Log it: `p121`–`p134`, `p322`, `p323`).
- Undo toasts with a lime Undo (`p123`, `p616`).
- Hairline rows already used by At home, Groceries and the Log week (`p332`, `p354`, `p389`).
- The Day rail's time column (`p106`), the Log timeline that mixes food and sessions
  (`p381`), "Did you eat X? Yes, as planned" (`p381`), the put-away loop (`p361`, `p362`).
- Explicit scope dialogs ("Change only Tue, Oct 13" / "Change all Tuesday practices": `p143`).
- About's plain reading layout (`p546`) and the honest privacy and safety copy.
- Four destinations with their current labels and Lucide icons.

## 4. Design direction: "Under the lights"

Subject, audience and job (frontend-design SKILL, "ground your designs in the subject"):
Nourally times food to a teenager's school-to-sport day. The audience is 14–18-year-old
athletes on a phone, between classes, usually one-handed, often with a few minutes before a
bus or practice. The primary job of every screen is one answer: what to eat or prepare now,
with what is actually available. The vernacular is the sports day: the pitch, the sideline,
the floodlights at evening practice, the scoreboard clock, the run-up before kickoff.

### 4.1 First pass (brainstorm)

This is the compact plan as first drafted, before the review in 4.2.

**Color (kept from `tokens.css`):** Paper `#f7f6f2` (canvas), Ink `#14333c` (text), Pitch
`#0f3640` → Pitch end `#16484a` (hero gradient), Lime `#d7f45f` (accent), Teal `#08777c`
(action on paper), Game `#c2410c` (game-day moment).

**Type:** DM Sans Variable for UI and body; Barlow Semi Condensed for numerals; hero
countdown at 80 px lime numerals with a small white label under it.

**Layout concept:** a full-bleed pitch hero at the top of Today, plain list rows below,
a floating glass tab bar. Welcome and the setup done screen as full-bleed pitch screens with
lime buttons. Food rows with 56 px food-art tiles on the left (Spotify cover-art rhythm).
Water as a fill bar that grows with ounces. Active tab marked with a lime dot.

```
v1 Today (phone)
┌──────────────────────────────┐
│░░ pitch gradient, full bleed ░│
│ 2:30                         │  80 px lime numeral
│ hr until practice            │  small label
│ Eat a snack by 2:30.         │
│ [      Plan this (lime)    ] │
╰──────────────────────────────╯
 [art] Banana + pretzels    +
 [art] Fig bar + fruit      +
 Water 16 oz ━━━━━━──────
   ╭ Today Schedule Food You ╮   lime dot on active
```

**Principles (v1):** no cards; one hero; lime once; glass for floating chrome.

**References and what each gives:** Spotify, rows with art on the left and one accent for
play and active nav. Cash App, single focus, large type, depth from scale and space instead of
shadows. Dunkin, the brand color as a moment, ordering through big tappable product tiles.

### 4.2 Review of the first pass against the brief

Each part was checked against the owner brief, the safety rules and the SKILL's list of
generated-design defaults. Six parts read as defaults or broke a rule; they were revised.

| v1 choice | Problem | Revision | Why |
|---|---|---|---|
| 80 px countdown numeral + small label, on a pitch → pitch-end gradient | This is the SKILL's named default hero ("a big number with a small label… and a gradient accent") and a gradient wash used as decoration (tell 4). It also keeps the two competing headlines (`TS T2`). | The hero headline is the instruction itself, set as one line of Barlow Semi Condensed 600 ("Snack by 2:30."). Under it sits the **run-up line**: a 4 px track from now to the next session with a lime now-dot, an eat-by tick and the session tick, labelled with plain times. The countdown becomes the track's label ("Practice 4:00, in 2 hr 30 min"). The hero fill is flat pitch; `--color-pitch-end` is used only for the food row inset inside the hero. | The run-up line is specific to this product: it draws the one relationship Nourally exists to explain (now, eat by, play). The headline says the action, which is what the athlete needs in two seconds. |
| Full-bleed pitch Welcome and done screens with lime buttons | Pitch is a very dark teal; a full-screen dark field with one acid-green accent is the SKILL's tell 2 and would make the app's first impression generic. | Welcome and the done screen open on paper with a pitch **field panel** covering the top 56 % of the viewport (radius 28 at the bottom corners, the same shape as Today's hero) holding the run-up line motif; the action sits on paper below it. No route paints pitch on more than 60 % of the viewport at scroll 0. | Keeps paper as the dominant canvas, ties the first screen to Today's hero shape, and still gives the Dunkin-style brand moment. |
| Water fill bar that grows with ounces | A fill implies a target, and a target is a prescription. Breaks the safety rule "never show a calorie target or a prescription" in spirit, and the bar has no honest end point. | Water shows the total as a Barlow numeral ("16 oz") and a quick-amount bar (+8, +16, Custom). No meter, no fraction, no goal. | Safety rule wins; the number alone is the record. |
| 56 px food-art tiles on idea and stock rows | The app has no food photography or illustrations; emoji or initial tiles would be filler that looks templated. | The left column of every list always carries data instead of art: time on Today, Schedule and Log rows; a state glyph on food rows (success check for "Have it all", a Barlow count for "Need 2"); a check circle on grocery and pack rows. | Spotify's rhythm comes from a consistent left column; here the column earns its place with information (SKILL: structure is information). |
| Active tab = lime dot | Same weak signal as today (`p608`); a dot does not read at arm's length. | Active tab = a pitch pill behind icon and label, icon in lime, label in white. The pill slides between tabs (200 ms). | Nav and hero share the pitch + lime pair, so the floodlight is consistent: lime only appears where the athlete's attention belongs. |
| Every page with an iOS large title | A default that adds a title row to screens whose content is the title. | Today has no page title: the date is the header and the hero follows. Schedule's title is the month ("October"). Food, You keep a one-word large title that collapses into the glass top bar after 40 px of scroll. | The header carries information on the two most used screens. |

Kept after review: the colors, DM Sans + Barlow, flat rows, one hero, one lime action per
screen, glass only on floating layers, the floating capsule tab bar (the owner asked for it,
and it matches the 2025–26 platform direction: Apple WWDC25 session 284; see `TS Sources`).

### 4.3 Final direction

**Name:** Under the lights.

**Concept:** the screen is a sideline at evening practice. Most of it is calm paper with
plain lists. At most one part of it, the thing to do now, is the lit field: a flat pitch-green
panel where the instruction is written in the scoreboard face and the only lime button sits.
The floating tab bar is the bench: always there, light, slightly see-through.

**Base palette (unchanged hex values, new roles):**

| Name | Hex | Role |
|---|---|---|
| Paper | `#f7f6f2` | The canvas on every route; 82 % paper is the tab bar glass. |
| Ink | `#14333c` | All text on paper, inactive tab labels, toasts (at 92 %). |
| Pitch | `#0f3640` | The one hero per screen, the Welcome and done field panel, the active tab pill, selected segments and selected weekdays. |
| Lime | `#d7f45f` | The floodlight: the hero's primary button, the active tab icon, the now-dot and now rule, Undo in toasts. Never on paper as a fill. |
| Teal | `#08777c` | The action color on paper: primary buttons outside the hero, text buttons, links, checks, switch tracks, focus ring. |
| Game | `#c2410c` | Game-day moment: the hero's run-up session tick and event dots for games; never a fill larger than a dot or a 4 px bar. |

Status tints (success, warning, error, info) and session colors (school, practice, workout,
travel) stay as they are and are used as text, dots and 3 px bars, never as box fills except
the error tint behind a blocking error line.

**Type:** two families, clearly distinct.

- Barlow Semi Condensed 600, the scoreboard voice: the hero instruction, every clock time in
  a row's left column, countdowns, amounts on Water and Groceries totals, step progress
  numbers. Never for sentences longer than one line.
- DM Sans Variable, the coach's voice: titles, body, labels, buttons.
- Scale in 5.5. No uppercase anywhere; no letter-spaced eyebrows; one weight change per line.

**Layout concept (phone, 390):**

```
┌──────────────────────────────────────┐
│ Tue, Oct 13                     (M)  │  the date is the header, avatar right
│╭────────────────────────────────────╮│
││ Snack by 2:30.                     ││  Barlow 600 40/42, white
││ ●━━━━━━━━━━│━━━━━━━━━━━━━━━━━━━│   ││  run-up line: now ● lime, eat-by tick, session tick
││ 1:30 now   2:30 eat     4:00 practice│  Barlow 15, on-dark-muted
││ ┌────────────────────────────────┐ ││
││ │ Banana + pretzels    Need 2    │ ││  inset row on pitch-end
││ └────────────────────────────────┘ ││
││ [          Plan this           ]   ││  lime, ink text, 56 px
││ Other ideas                 Why?   ││  text buttons on dark
│╰────────────────────────────────────╯│  radius 28 bottom, 12 top (sits under date)
│                                      │
│ Your day                             │  section title, no box
│ 8:00   School            until 3:00  │  Barlow time column
│ 1:30  ───── now ─────────────────    │  1 px lime rule
│ 4:00   Soccer practice         Home  │
│                                      │
│ Water            16 oz  [+8|+16| + ] │  one row
│                                      │
│  ╭────────────────────────────────╮  │
│  │ [Today]  Schedule  Food   You  │  │  floating glass capsule
│  ╰────────────────────────────────╯  │
└──────────────────────────────────────┘
```

**Alignment:** everything left-aligned to one gutter (16 px on phones, 24 px tablet, 32 px
desktop: unchanged, UX-DS-08). Values in rows right-aligned. Centered text only
in the tab bar, in alerts and on the Not found page.

**Principles:**

1. **One lit field.** At most one hero surface per screen, and only when there is a timed
   decision. Everything else is sideline: on paper, no border, no shadow.
2. **Space groups, titles name.** Sections are separated by 32 px and named by a plain
   sentence-case title. Boxes are never used to group.
3. **The left column carries data.** Every list row starts with a time, a state glyph or a
   check. No decorative leading art.
4. **Lime is the floodlight.** Lime appears only on the hero's primary, the active tab and the
   now marker (plus toast Undo). One lime action per screen.
5. **Words, not stickers.** Status is a word in a color or a glyph, never a pill or an
   ALL-CAPS badge. Meta is a short sentence, never "A · B · C".
6. **Floating means glass, content means flat.** Only the tab bar, the collapsed top bar and
   toasts are translucent; only floating layers cast shadows.
7. **Big and few.** Cash App's lesson: fewer things, bigger type, 52–56 px controls, one
   primary per screen.
8. **Motion answers taps.** The only unprompted motion is the now-dot settling onto the
   run-up line when Today opens (once, 400 ms, none under reduced motion).

### 4.4 Token plan

All color values stay. Tokens are added, renamed or retired as below. `tokens.css` stays the
only file with literal values.

```css
/* Kept exactly: every --color-* value in tokens.css today. */

/* Added: surfaces (UX-DS-02) */
--surface-glass: rgb(247 246 242 / 0.82);     /* paper at 82 %: tab bar, collapsed top bar */
--surface-glass-solid: rgb(247 246 242 / 0.97);/* fallback without backdrop-filter */
--surface-glass-dark: rgb(20 51 60 / 0.92);   /* ink at 92 %: toasts */
--blur-glass: blur(20px) saturate(180%);
--color-hero: var(--color-pitch);              /* flat; pitch-end only for the inset row */
--color-hero-inset: var(--color-pitch-end);

/* Added: radius ladder (UX-DS-03); replaces one-radius-everywhere */
--radius-segment: 10px;   /* segments inside a segmented control */
--radius-control: 14px;   /* fields, buttons, segmented track */
--radius-float: 24px;     /* tab bar, alerts, menus, toasts at 16 */
--radius-toast: 16px;
--radius-sheet: 28px;     /* sheet top corners */
--radius-hero: 28px;      /* hero bottom corners; 12 px top corners */
/* --radius-full stays for avatars, switches, the nav pill and dots only */

/* Added: elevation (UX-DS-04). Content is flat; only floating layers cast shadows. */
--elev-float: 0 0 0 1px rgb(20 51 60 / 0.06), 0 8px 32px rgb(15 44 56 / 0.16);
--elev-sheet: 0 -8px 40px rgb(15 44 56 / 0.20);
--elev-menu: 0 0 0 1px rgb(20 51 60 / 0.08), 0 12px 32px rgb(15 44 56 / 0.18);

/* Added: sizes (UX-DS-06) */
--control-height: 52px;   /* was 48px */
--cta-height: 56px;
--row-min: 56px;
--tab-bar: 64px;          /* unchanged */
--tab-inset: 12px;
--tab-bar-max: 440px;
--top-bar-glass: 52px;
--hero-track: 4px;

/* Added: type (UX-DS-09) */
--text-large-title: 34px;   --leading-large-title: 40px;
--text-hero: 40px;          --leading-hero: 42px;    /* Barlow 600 */
--text-time: 17px;          --leading-time: 22px;    /* Barlow 600, row time column */
--text-tab: 12px;           --leading-tab: 16px;     /* replaces --text-badge */

/* Retired (removed once the last user is gone; css-usage.test.js proves it) */
--shadow-1;          /* content shadow */
--shadow-2;          /* docked tab bar */
--rhythm-card;  --card-padding;  --text-badge;  --leading-badge;
--radius-lg as a card radius (kept only if a non-card user remains)
```

Desktop overrides at 1024 px: `--text-large-title: 40px / 44px`, `--text-hero: 56px / 58px`,
`--text-time: 18px / 24px`, `--gutter: 32px` (unchanged).

## 5. Global patterns

Each pattern lists its IDs. Page specs in section 6 use these patterns and do not repeat them.

### 5.1 Tokens and surfaces

- **UX-DS-01 — Keep every color.** No `--color-*` value in `tokens.css` changes. Only roles
  change (4.3). A unit test pins the current hex values.
- **UX-DS-02 — Glass is for floating chrome only.** `--surface-glass` and `--blur-glass` are
  used by exactly three things: the phone tab bar, the tablet nav capsule and the collapsed
  top bar. Toasts use `--surface-glass-dark`. No content surface, sheet or hero uses
  `backdrop-filter` (Apple's guidance keeps glass on the navigation layer; `SY G1` sources).
- **UX-DS-03 — Radius ladder.** Segments 10, controls 14, toasts 16, floating bars, menus and
  alerts 24, sheets and the hero 28 (hero top corners 12). Full radius only for avatars,
  switches, the nav pill and dots. The radius encodes containment: a thing inside another
  always has a smaller radius.
- **UX-DS-04 — Content is flat.** Inside `main`, no element except the hero has a non-`none`
  `box-shadow`, and no element has both a visible border and a shadow. Only floating layers
  (tab bar, sheets, alerts, menus, toasts, the floating action bar) use `--elev-*`.
- **UX-DS-05 — Retire the card.** Remove `.card` and `.card-list` (`components.css:302-325`)
  and every page rule that draws a bordered white box around content (Today section cards,
  Schedule day cards and settings cards, idea cards, planned card, You and device groups,
  Welcome tiles, Water card, prompt card, Tonight card). Replace with `Section` (UX-CMP-03):
  a sentence-case title and its rows on paper, 32 px apart.
- **UX-DS-06 — Bigger, fewer controls.** `--control-height` 52 px, `--cta-height` 56 px at the
  bottom of flows and on the hero, `--row-min` 56 px. Tap targets stay ≥ 44 px.
- **UX-DS-07 — No pills for short text.** Remove `.badge`, `.reason-chip`, `.idea-chip`,
  `.tab-badge` and the pill look of `.chip-group` (`components.css:193-238, 561-620`). Status
  becomes a word in a status color or a glyph; counts become plain numerals after a label
  ("Groceries 3"); categories become dots or section titles. Chips survive only as removable
  filters if one is ever needed (36 px, radius 10).
- **UX-DS-08 — Spacing.** Gutters unchanged (16 / 24 / 32). Section gap 32 (40 at 1024+).
  Section title to first row 8. Row vertical padding 12. Flow screens: 24 between fields.
  Inset hairline from the text start to the right edge, `--color-line`.
- **UX-DS-09 — Type scale.** Where two sizes are given, the first is phones and the second 1024 px and up:

  | Role | Face | Size / leading | Weight |
  |---|---|---|---|
  | Display (Welcome, done) | DM Sans | 44/46, then 64/68 | 700, −0.025em |
  | Large title (page, setup question) | DM Sans | 34/40, then 40/44 | 700, −0.02em |
  | Hero instruction | Barlow Semi Condensed | 40/42, then 56/58 | 600 |
  | H2 / section title | DM Sans | 20/26, then 22/28 | 650 |
  | H3 / row title | DM Sans | 17/22, then 18/24 | 600 |
  | Time column, amounts | Barlow Semi Condensed | 17/22, then 18/24 | 600, tabular |
  | Body | DM Sans | 16/24 | 400 |
  | Small (row meta, helper) | DM Sans | 14/20 | 400 |
  | Caption (metadata only, never instructions) | DM Sans | 13/18 | 400 |
  | Label | DM Sans | 15/20 | 600 |
  | Tab label | DM Sans | 12/16 | 600 |

  No `text-transform: uppercase` anywhere. Helper text is 14 px, not 13 px.
- **UX-DS-10 — Scoreboard voice.** Barlow Semi Condensed is used only for the hero
  instruction, clock times, durations, counts and amounts. A test lists the selectors allowed
  to use `--font-numeral`.
- **UX-DS-11 — Hero rule.** At most one element per route has `data-surface="hero"`. It is
  allowed only on Today (Now), Ideas (planned meal or top pick), Groceries (week suggestion,
  only when the list is empty), Log (the "Did you eat" prompt, only when a plan is due),
  Welcome and setup done (field panel). Schedule, At home, You, This device, About and Not
  found have none.
- **UX-DS-12 — Pitch budget.** At scroll 0, pitch covers at most 60 % of the viewport on any
  route at 390 × 844 and 1440 × 900.
- **UX-DS-13 — Status tints.** Tinted boxes only for a blocking error or a blocked
  permission, drawn as tint + 3 px left bar in the status color, no outline. The info tint
  (`--color-info-tint`) is no longer a surface; info is a line with an icon.
- **UX-DS-14 — Icons and avatars.** Lucide at 1.75 stroke: 24 px in nav, 20 px leading in
  settings rows (This device, You), 16 px inline. Avatars use solid fills from the session
  colors with a white letter (contrast ≥ 4.5:1), never pale tints.
- **UX-DS-15 — Motion.** Durations stay (150 / 200 / 250 ms, `--ease-out`). Allowed motion:
  the now-dot settling on the run-up line once when Today opens (400 ms); the nav pill
  sliding between tabs (200 ms); sheets rising (250 ms); checks filling (250 ms); rows
  collapsing into "In cart" (200 ms). Nothing else animates on its own. Everything is instant
  under `prefers-reduced-motion: reduce`.

### 5.2 Navigation and page frame

**Phone (below 768 px): the floating tab bar.**

```
          content scrolls under the bar
 │                                          │
 │   ╭──────────────────────────────────╮   │  12 px side inset (+ safe-area left/right)
 │   │ ┌──────┐                         │   │  64 px tall, radius 24
 │   │ │ ⌂    │ Schedule  Food    You   │   │  active: pitch pill, lime icon, white label
 │   │ │Today │                         │   │
 │   │ └──────┘                         │   │
 │   ╰──────────────────────────────────╯   │
 │      bottom = max(12px, safe-area − 8px)  │
 └──────────────────────────────────────────┘
```

- **UX-NAV-01 — Geometry.** `position: fixed`; `left` and `right` =
  `max(12px, env(safe-area-inset-left|right) + 12px)`; `bottom` =
  `max(12px, env(safe-area-inset-bottom) - 8px)`; height 64 px; radius 24 px; `max-width`
  440 px centered. Four equal columns; 4 px inner padding; each item ≥ 56 px tall.
- **UX-NAV-02 — Material and fallbacks.** Background `--surface-glass` (paper at 82 %),
  `backdrop-filter` and `-webkit-backdrop-filter: blur(20px) saturate(180%)`, shadow
  `--elev-float` plus `inset 0 0 0 1px rgb(255 255 255 / 0.5)`. Fallbacks:
  `@supports not (backdrop-filter: blur(1px))` → `--surface-glass-solid`;
  `prefers-reduced-transparency: reduce` and `prefers-contrast: more` → solid paper and a 1 px
  `--color-line-strong` border; `forced-colors: active` → `Canvas` with a `CanvasText` border
  (extend the forced-colors block in `base.css`).
- **UX-NAV-03 — Items and active state.** Icon 24 px, label 12/16 600, sentence case.
  Inactive icon and label in `--color-ink` (not ink-muted: ink-muted on the glass over the
  pitch hero computes to about 4.0:1, below 4.5:1). Active: a pitch pill inset 4 px, radius
  20, behind icon and label; icon lime, label white (white on pitch ≈ 12.9:1, lime on pitch
  ≈ 10.5:1). The pill slides between items in 200 ms (UX-DS-15). `aria-current="page"` on
  the active item. Focus ring drawn inside the item.
- **UX-NAV-04 — Content clearance.** `main` gets `padding-bottom: calc(var(--tab-bar) +
  max(12px, env(safe-area-inset-bottom) - 8px) + 24px)`. The last row of every route is fully
  visible above the bar when scrolled to the end (the footer line in `p501` is clipped today).
- **UX-NAV-05 — Keyboard.** While a text field has focus and `visualViewport.height` is less
  than 75 % of `window.innerHeight`, the bar is hidden (`hidden` attribute, not just
  transparent) so it never floats over the keyboard.
- **UX-NAV-06 — Stacking above the bar.** Toasts and the page's floating action bar (Log food,
  Finish shopping) sit 8 px above the tab bar, same side insets. Sheets, alerts and menus cover
  the bar (they are portalled to `body`, `2654d5f`).
- **UX-NAV-07 — Safe areas.** Add `viewport-fit=cover` to the viewport meta in `index.html`
  (UX-BUG-04) and give the top bar `padding-top: env(safe-area-inset-top)` so content never
  sits under the status bar or notch.
- **UX-NAV-08 — Stable bar.** The bar does not hide or shrink on scroll. Decision: the app has
  four items used one-handed between classes; a stable target beats the extra 76 px.

**Tablet (768–1023 px).**

```
[N] nourally        ╭ [Today]  Schedule  Food  You ╮        (M)
                    ╰──────────────────────────────╯
```

- **UX-NAV-09 — Floating top capsule.** The same glass material and pitch active pill, sized
  to its items and centered in a transparent sticky header, 52 px tall, radius 18. Logo left,
  athlete avatar right. Mirrors iPadOS 26's top tab bar (`SY Sources`, Ben Dodson).

**Desktop (1024 px and up).**

- **UX-NAV-10 — Quiet rail.** Keep the left rail (bar on compact, rail on expanded: Android
  adaptive navigation guidance, `SY Sources`). Remove its border and shadow; it sits on paper.
  Active item = the same pitch pill with a lime icon and white label. 1024–1199 px: an 88 px
  icon-over-label rail; 1200 px and up: the 232 px rail with labels. The athlete switcher is a
  plain row at the bottom (avatar, name, chevron), not a boxed chip.

**Page headers.**

- **UX-NAV-11 — Large titles that collapse.** Phone: the page title is a 34/40 large title in
  the scroll content. After 40 px of scroll a 52 px glass top bar fades in with the title at
  17 px centered. Today's header is the date ("Tue, Oct 13"); Schedule's is the month
  ("October"); Food and You use their names. Sub-pages (This device, About) show a back
  chevron with the parent's name ("‹ You"), not a boxed button.
- **UX-NAV-12 — One avatar.** The athlete avatar appears once per screen, top right on phone
  and tablet and in the rail on desktop. It opens the athlete switcher. Content never repeats
  it (You shows the name large, not a second avatar button).
- **UX-NAV-13 — Browser chrome color.** `theme-color` stays paper; on Welcome and setup done
  it switches to pitch while the field panel is at the top, so the status bar area matches.

### 5.3 Lists and rows

- **UX-CMP-02 — One row component.** `Row` renders: a leading column (time in Barlow, state
  glyph or check, 48 px wide), a title (17/22 600, one line, truncates only after two lines on
  phone), one meta line (14/20, a short sentence), and one trailing element (value text,
  chevron, status word, a single icon button, or a switch). Min height 56. Inset hairline.
  Pressed state = `--color-hover` full-bleed. No background, border or shadow. Rows that open
  something are one button (whole row), with any secondary action in a trailing menu.
- **UX-CMP-03 — Section.** `Section` = sentence-case title (20/26 650) with an optional
  trailing text button, then its content. Replaces `.card`, `.today-section-header` and the
  grouped-card patterns. Never draws a box.

### 5.4 Buttons

- **UX-CMP-01 — Four button kinds, one primary per screen.**

  | Kind | Look | Use |
  |---|---|---|
  | Primary | Teal fill, white text, 52 px (56 px at the bottom of a flow), radius 14, 16/20 600 | The one main action on paper |
  | Hero primary | Lime fill, ink text, 56 px, radius 14 | The one main action on the hero (replaces the teal primary on that screen) |
  | Secondary | `--color-surface-muted` fill, ink text, no border | Second action beside a primary; replaces every outlined button |
  | Text | Teal text, no fill, no underline, 600 | Tertiary actions, "Other ideas", "Why?", section actions |
  | Destructive | Error-color text button; error fill only inside a confirm alert | Delete, Remove |

  Full width on phones inside sheets and flows; hug width (min 160 px) on desktop. Underlines
  only for inline links in prose (About, Why this?). No text arrows. At most one primary or
  hero primary is visible per screen (sheets count as their own screen).

### 5.5 Inputs

- **UX-CMP-04 — Fields.** 52 px, white fill, 1 px `--color-line` border, radius 14, label
  above (15/20 600). Focus = 2 px teal border (no outer ring plus border). Invalid = 2 px error
  border, error icon and message below, and the focus border turns error-colored too
  (`p004` shows teal ring on a red field). The error clears on the first change that makes the
  value valid, and re-validates on blur (UX-BUG-02). Prefixes and suffixes sit inside the field
  ("$", "oz", "min"). "(optional)" goes in the label text only when a form mixes required and
  optional fields.
- **UX-CMP-09 — Time and date fields show app formats.** `TimeField` = the existing accessible
  `Combobox` (`ui/Combobox.jsx`) with times in 15-minute steps, typed input accepted ("4:10",
  "4p"), displayed via `format.js` ("4:00 PM", never "04:00 PM": `p144`, `p008`). `DateField`
  = a button showing "Tue, Oct 13" that opens a month grid (reuses `MonthGrid.jsx`) in a sheet
  on phone and a popover on desktop. Start and end times sit side by side at every width,
  including 320 px ("4:00 PM → 5:30 PM").

### 5.6 Selection controls (replacing pills)

| Need | Control | ID |
|---|---|---|
| Pick several from a short list (food access, diet, dislikes, imports) | Checklist rows: label left, 24 px check right, 56 px rows, hairlines | **UX-CMP-05** |
| Pick one of 2–4 short options (Season, Home/Away, Day/Week, Type, units) | Segmented control: full width, 48 px, track `--color-surface-muted` radius 14, selected segment pitch fill + white text radius 10 | **UX-CMP-06** |
| Pick weekdays | Weekday bar: one joined 7-segment control, 48 px, letters, selected = pitch fill + white letter, no badges; accessible name per day ("Monday, selected") | **UX-CMP-07** |
| On or off | Switch row: label left, optional 14 px helper under it, switch right; dependent controls are disabled and dimmed while the switch is off or blocked | **UX-CMP-08** |
| Quick amounts (water, portion size) | Quick-amount bar: 2–4 joined buttons, 48 px, secondary fill, Barlow numerals; last button "Custom" | **UX-CMP-21** |
| Choose a food or category visually (Quick add, empty At home, Counts as?, portion) | Tiles: 2–3 per row, 96 px tall, radius 14, `--color-surface-muted` fill, Lucide food icon 28 px + name; selected = pitch fill | **UX-CMP-22** |

`ChipGroup` (`ui/SelectionControls.jsx:64`) is removed once no screen uses it.

### 5.7 Sheets, dialogs, confirms and menus

```
Bottom sheet (phone)                    Alert (every confirm)
╭──────────────────────────────╮               ╭────────────────────╮
│            ────              │  grabber      │ Discard changes?   │ 20/26
│ Sport & season               │  22/28 left   │ Your edits to Food │
│                              │  no rule      │ needs aren't saved.│
│ [ fields …                 ] │               │ [     Discard    ] │ error fill
│                              │               │ [  Keep editing  ] │ secondary
│ [           Save           ] │  56 px sticky ╰────────────────────╯
│            Cancel            │  only if dirty   max 320 px, radius 24
╰──────────────────────────────╯  radius 28 top
```

- **UX-CMP-10 — Bottom sheet.** Grabber, left-aligned title 22/28, no header or footer
  hairlines, sticky full-width primary, a Cancel text button only when there are unsaved edits.
  Closing = grabber drag, scrim tap or Escape. The X stays only on full-height sheets (Log food
  search, import) where the grabber is far from the thumb. Top radius 28, `--elev-sheet`.
  Initial focus goes to the sheet title (`tabindex="-1"`), so no focus ring shows on open
  (UX-BUG-16). Desktop: centered dialog, 520 px wide, radius 24.
- **UX-CMP-11 — Alert for every confirm.** Discard changes, delete, scope choices, overlap,
  undo trip, restore and data recovery confirms use a centered alert (max 320 px, radius 24,
  title + one sentence + stacked full-width buttons, safe action as the primary). Never a
  sheet on a sheet (`p619`). Type-DELETE stays for irreversible data loss; its disabled
  button is error color at 40 % opacity so it reads as disabled and destructive (`p540`).
- **UX-CMP-12 — Menus.** Phone: the row "…" opens an action sheet (title = the item's name,
  actions as rows, destructive last in error color) instead of a popover that covers the row
  (`p210`). Desktop and tablet: the existing anchored menu, restyled with `--elev-menu` and
  radius 24. Long menus group: At home's three "Move to …" items become one "Move to…" row
  that opens a second step.
- **UX-CMP-18 — Pickers inside sheets.** On phone, a long option list inside a sheet (Sport)
  opens as a pushed page within the sheet (search field on top, plain rows, check on the
  selected row, back chevron) instead of a popover over the sheet title (`p503`). At 768 px
  and up the combobox popover stays.
- **UX-CMP-20 — Changed elsewhere.** When an open sheet's item is edited in another tab, the
  sheet reloads the item and shows one line under the title: "This item changed on another
  screen. Showing the latest version." (closes STATE-15).

### 5.8 Toasts

- **UX-CMP-13 — Toast.** 48 px tall, radius 16, `--surface-glass-dark` with blur, white
  14/20 text, lime Undo text button. Centered, max 440 px, 8 px above the tab bar on phone;
  centered at the bottom of the content column on desktop (not against the rail: `d616`).
  When a toast has Undo and auto-dismisses, it has no X. Toasts never cover a primary action:
  the floating action bar and the toast stack (toast above). Copy pattern: "<Thing> <past
  verb>." ("Bagel or toast + jam hidden." not "Hidden Bagel or toast + jam": `p318`).

### 5.9 Empty, loading, offline and inline status

- **UX-CMP-14 — Empty states.** Left-aligned: a 20/26 title saying what is missing, one
  sentence, one primary, optionally one text button. No dashed box, no centered grey text
  (`p317`, `p331`, `p351`). Row values that are empty read "Not set" in ink-subtle and the
  row itself is the action.
- **UX-CMP-15 — Loading.** `Skeleton` shows for at least 300 ms once shown, marks the region
  `aria-busy="true"` instead of `role="status"`, and is used on Today, Ideas and Log, not only
  at app load (closes STATE-07).
- **UX-CMP-16 — Offline line.** When `navigator.onLine` is false, the frame shows one line
  under the header on every route: wifi-off icon + "You're offline. Saved foods and your plan
  still work." It disappears when back online (closes STATE-03).
- **UX-CMP-17 — Inline status line.** Prompts (reminder offer, backup nudge, last week,
  reminder problem, school-day prompt) are one line on paper: 20 px icon, one sentence, one
  text action, a dismiss icon button. No tinted card, no outlined buttons (`p171`–`p174`,
  `p531`).
- **UX-CMP-19 — Disclosure.** Show/Hide toggles are text buttons with a rotating chevron and
  `aria-expanded`, never outlined buttons (`p127`, `p128`).

### 5.10 Copy rules this layout needs

These extend audit §7; they do not replace it.

- **UX-COPY-01 — No dot-meta.** No rendered text contains " · ". Formatters that join parts
  with a middle dot return short sentences instead ("Until 3:00 PM, lunch 11:30 AM",
  "Away, leave by 5:15 PM", "2 foods, 8 oz water"). Fixes the 320 px orphan dot (`p707`).
- **UX-COPY-02 — No spaced em dash.** No rendered text contains " — " or " – " between words.
  Two sentences instead ("Rest day. Keep regular meals.": `p112`, `p104`, `p317`, `p391`).
- **UX-COPY-03 — No uppercase.** No element has computed `text-transform: uppercase` and no
  label is typed in capitals ("GAME DAY", "PLANNED", "TODAY", "BUY 2 ITEMS", "READY – YOU HAVE
  EVERYTHING", "SOCCER PRACTICE": `p114`, `p124`, `p204`, `p301`, `p322`, `p389`).
- **UX-COPY-04 — Times and ranges hold together.** `format.js` joins a time and its AM/PM
  with a no-break space (U+00A0) so "5:15 PM" never wraps (`p115`), and writes ranges with an
  en dash and no spaces ("Oct 12–18", "8:00–3:00": `p204`).
- **UX-COPY-05 — One-line helpers.** Helper text is one sentence of at most 14 words at
  14 px; cut helpers that describe the system ("New activities are named after it…": `p003`).
- **UX-COPY-06 — Meta without negatives.** Week and day summaries show what exists and omit
  "Nothing logged · No water logged" style negatives (`p389`).

### 5.11 Safety rules in the new layout

- **UX-DS-16 — Label line placement.** "Allergies: check every label." stays on every
  product view (search, results, portion, barcode, food details, Ideas, At home details,
  Counts as?), rendered once per view as a caption line in `--color-warning` with the alert
  icon, not a tinted box. Brand-name product rows keep their own allergen line (audit 7.5,
  P0-06) as 13/18 caption text; the redesign makes the row quieter around it but does not drop
  it. The food review's suggestion to drop the per-row line is rejected for that reason.
- **UX-DS-17 — No targets in visuals.** No meter, ring, fill bar, fraction ("16 of 64 oz"),
  progress color or "goal" on food or water. Ingredient "have/need" is availability, not
  intake, and stays.

## 6. Page-by-page specification

Wireframes are phone (390) first. "Desktop" notes give the 1024 px+ adaptation; section 9
collects the breakpoints. Each page lists its capture evidence.

### 6.1 Welcome and athlete chooser

Evidence: `p001`, `p002`, `p041`–`p047`, `p705`, `d001`, `d042`; `SY A1`, `SY A9`, `SY C`.

**First visit (phone).**

```
┌──────────────────────────────────────┐
│╭────────────────────────────────────╮│  field panel: pitch, top 56 % of viewport
││ [N] nourally                       ││  radius 28 bottom
││                                    ││
││ Fuel for the                       ││  display 44/46 white
││ day you                            ││
││ actually have.                     ││
││  ●━━━━━━━━│━━━━━━━━━━━━│           ││  run-up line motif (decorative, aria-hidden)
│╰────────────────────────────────────╯│
│ Snacks and meals timed around        │  body 17/24 ink
│ school and practice.                 │
│                                      │
│ [          Get started           ]   │  primary teal, 56 px
│ How Nourally works                   │  text button
│ Saved on this phone only.            │  caption, one line
└──────────────────────────────────────┘
```

- **UX-WEL-01 — Field panel first screen.** Replace the paper-only first screen and its 45 %
  dead zone (`p001`) with the field panel above; one primary on paper; the privacy line cut to
  one caption line (the full text stays on "How Nourally works" and About). The panel is the
  route's hero (UX-DS-11) and stays within the pitch budget (UX-DS-12).
- **UX-WEL-02 — Returning: chooser first.** When athletes exist, the headline and lede go;
  the screen is the large title "Who's using Nourally?" and the chooser, with "How Nourally
  works" at the bottom (`p041`, `p042`).
- **UX-WEL-03 — Athletes as rows.** One borderless list: 44 px solid avatar, name 17/22 600,
  one meta line ("Soccer, used today"), trailing "…" menu. "Add athlete" is the last row with
  a plus avatar. No tiles, no outlined button (`p042`, `p705`).

```
Who's using Nourally?             34/40
(M)  Maya                     …
     Soccer, used today
(S)  Sam                      …
     Tennis, used yesterday
(+)  Add athlete
```

- **UX-WEL-04 — Rename, add and remove.** Rename and add athlete are bottom sheets (UX-CMP-10)
  with one field and one primary; the empty-name error stays inline (`p047`). Remove uses the
  alert with type-DELETE (UX-CMP-11), title on one line at 390 (`p045`).
- Desktop: UX-RWD-08 (split screen).

### 6.2 Setup (steps 1–6)

Evidence: `p003`–`p017`, `p031`, `p032`, `p702`–`p704`, `d003`–`d017`; `SY A2`–`SY A8`.

**Chrome for every step.**

```
┌──────────────────────────────────────┐
│ ‹    ▬▬▬▬ ▬▬▬▬ ▬▬▬▬ ──── ──── ────   │  back chevron 44 px; 6 dashes, done = pitch
│                                      │
│ What do you                          │  large title 34/40
│ play?                                │
│                                      │
│ Sport                                │
│ [ Soccer                        ⌄ ]  │  52 px field
│ Season                               │
│ [ Pre-season | In season | Off   ]   │  segmented, pitch selected
│ First name (optional)                │
│ [                                ]   │
│                                      │
│ [              Next              ]   │  56 px, pinned above a paper fade
│            Set up later              │  text button, step 1 only
└──────────────────────────────────────┘
```

- **UX-SET-01 — One way forward, one way out.** Top: back chevron (none on step 1) and a
  6-dash progress bar (`aria-valuetext="Step 2 of 6"`). Bottom: one full-width primary. Optional
  steps (2–5) show "Skip for now" as a text button under the primary. "Set up later" appears
  only on step 1. The logo row, the "Step n of 6" caption, the top-right "Skip step" and the
  footer hairline go (`p008`–`p016`, `SY A2`).
- **UX-SET-02 — Step 1 order and controls.** Sport first (required), Season (segmented,
  UX-CMP-06), First name last (optional). Remove the helper under Sport (UX-COPY-05). On phone
  the Sport list opens as a full-height picker sheet (UX-CMP-18); at 768 px and up the combobox
  popover stays (`p005`).
- **UX-SET-03 — Step 2 school day.** Weekday bar (UX-CMP-07) replaces the circles with badges
  (`p008`). "School" and "Lunch" are each one row of two `TimeField`s side by side
  (UX-CMP-09). "No school right now" becomes a switch row at the top (UX-CMP-08). The lunch
  error gets its message (UX-BUG-03).
- **UX-SET-04 — Step 3 practices and games.** One "Practice" section: weekday bar, one time
  row ("4:00 PM → 5:30 PM"), Home/Away segmented. Then "Next game (optional)": "Add a game" is a
  plain row with a plus icon, not an outlined button (`p010`–`p012`).
- **UX-SET-05 — Step 4 food at school.** Checklist rows "At school I have": Cafeteria, Fridge,
  Microwave, Can eat in class; then a switch row "Someone at home can help cook" in the same
  list (`p013`, `p014`).
- **UX-SET-06 — Step 5 food needs.** "I don't eat": two checklist rows (Vegetarian, Vegan).
  "Not a fan of": a 2-column checklist of the 8 most-chosen foods plus a "More foods" row that
  opens a searchable full-height sheet; the row shows the chosen ones ("Grapes, Pasta"). The
  safety footnote moves under the section title at 14 px. "Allergies": one line with the info
  icon, "Allergy filtering isn't ready yet. Check every label.", no pill (`p015`, `p016`).
  No allergy, Gluten-free, Nut-free or Dairy-free control appears while
  `ALLERGY_TAGS_REVIEWED` is false. The same `FoodNeedsFields` renders here and in You
  (UX-YOU-05).
- **UX-SET-07 — Step 6 done.** Field panel (as Welcome) with "You're set, Maya." in display
  type, then on the panel: "Today" label and the first plan in Barlow ("Soccer practice 4:00 PM",
  "Snack around 2:30 PM"). On paper: "Change any of this in You." and the primary "Open
  Today". No Back (`p017`).
- Desktop: UX-RWD-08 (split screen: steps listed on the field panel, question on paper).

### 6.3 Today

Evidence: `p018`, `p032`, `p056`, `p101`–`p175`, `p531`, `p706`, `d101`–`d175`; `TS T1`–`T10`,
`TS D1`.

**Normal day (phone).**

```
┌──────────────────────────────────────┐
│ Tue, Oct 13                     (M)  │  large title = date; no chips
│╭────────────────────────────────────╮│
││ Practice 4:00, in 2 hr 30 min      ││  15/20 on-dark-muted
││ Snack by 2:30.                     ││  hero instruction, Barlow 40/42 white
││ ●━━━━━━━━━━━│━━━━━━━━━━━━━━━━━│    ││  run-up line
││ now 1:30    eat 2:30    practice 4:00│ Barlow 15 on-dark-muted
││ ┌────────────────────────────────┐ ││
││ │ Banana + pretzels       Need 2 │ ││  inset row, pitch-end; tap = details
││ │ Pack it in your school bag.    │ ││
││ └────────────────────────────────┘ ││
││ [          Plan this           ]   ││  lime 56 px
││ Other ideas                 Why?   ││  text buttons on dark
│╰────────────────────────────────────╯│
│                                      │
│ Pack & prep                     1/2  │  only once a plan exists
│ (✓) Banana + pretzels in school bag  │
│ ( ) Fill water bottle                │
│                                      │
│ Your day                             │
│ 8:00   School          until 3:00 PM │  slate dot
│ 1:30  ──────── now ───────────────   │  1 px lime rule + Barlow label
│ 4:00   Soccer practice          Home │  teal dot
│                                      │
│ Water           16 oz  [+8|+16|  + ] │
│                                      │
│ (bell) Heads-up before practice?  Turn on  ✕ │ inline status line
│                                      │
│   ╭ [Today]  Schedule  Food  You ╮   │
└──────────────────────────────────────┘
```

- **UX-TODAY-01 — No cards on Today.** The hero is the only surface. "Pack & prep", "Your day",
  "Water", "Tonight" and the prompt sit on paper as sections (UX-CMP-03). At 390 on a normal
  day (`p106` state), the page has 1 element with a shadow (the hero) instead of 5–6.
- **UX-TODAY-02 — Hero anatomy.** In order: a context line (session and countdown, 15/20),
  the instruction as the only headline (Barlow 40/42; one sentence, no em dash), the run-up
  line, the chosen food as an inset row (name, availability word, one prep line), the lime
  primary, and two text buttons ("Other ideas", "Why?"). Removed: the second headline, the
  body paragraph (moves into Why this?), "to buy" pills, alternate pills, underlined links
  (`p106`, `TS T2`).
- **UX-TODAY-03 — No chips under the date.** Remove "School 8–3", "Practice 4:00", "Game 6:00"
  (`p102`, `p114`); the Day section already lists them.
- **UX-TODAY-04 — The run-up line.** A 4 px track on the hero from now to the next session
  start, with a lime 12 px now-dot, a white 2 × 12 px eat-by tick and a session tick in the
  session color (game orange on game days). Labels in Barlow under the ticks; if two labels
  would overlap (< 64 px apart), the earlier label moves above the track. Shown only when a
  session starts within 6 hours; hidden for rest, no-sport, weekend, late and evening states.
  `aria-hidden="true"`; the context line carries the same facts as text. The dot settles once
  on load (UX-DS-15).
- **UX-TODAY-05 — Hero by state.**

  | State (capture) | Hero |
  |---|---|
  | Setup (`p101`) | Instruction "Add your practice times." Primary "Add practice"; text button "Add school day". No Water section until a session exists. |
  | Before school, plan ahead, meal window (`p102`, `p103`, `p105`) | Standard hero; instruction names the meal and time ("Breakfast before 7:30."). |
  | School lunch window (`p104`) | "Lunch at 11:30. Choose something familiar." (two sentences, no em dash). |
  | Pre-session, quick (`p106`, `p107`) | Standard hero with the run-up line; quick state shows "Eat something small now." |
  | During (`p108`) | Instruction "Drink water at breaks."; run-up line filled to the session end; no food row; no primary. |
  | Recovery (`p109`) | "Eat within an hour."; food row; primary "Plan this". |
  | Evening (`p110`, `p161`–`p164`) | The hero becomes tomorrow's checklist (UX-TODAY-09). |
  | Late (`p111`), rest (`p112`), no sport (`p113`), weekend (`p116`) | Compact hero: no pitch. A 20/26 line on paper ("Rest day. Keep regular meals.") with a secondary button "Plan tomorrow". The Day section moves up. "Rest day" is said once. |
  | Game day (`p114`) | Standard hero; the session tick and context line use the game color ("Game 6:00, in 3 hr"); no "GAME DAY" badge. |
  | Travel (`p115`) | Context line "Away game 6:00. Leave by 5:15 PM." and a separate meta line "45 min drive" (no mid-time wrap, UX-COPY-04). |
  | First open after setup (`p018`), opened from Welcome (`p056`) | Standard hero; no extra welcome card. |

- **UX-TODAY-06 — Plan state is a step, not a headline.** After "Plan this", the instruction
  and food stay; a three-step indicator under the food row shows Planned → Packed → Eaten
  (Barlow 13, current step in lime). The primary follows the steps: Plan this → Mark packed →
  Log it. Missing items show as "Need 2: banana, pretzels" with a text button "Add to
  groceries" in the food row, not as the primary (`p124`, `p125`, `p131`, `p133`, UX-FLOW-02).
  The dimmed "Eat around 2:30 PM" pseudo-button goes (`p132`).
- **UX-TODAY-07 — Pack & prep.** Keeps its name. Directly under the hero, on paper. One task per real action
  ("Pack banana + pretzels in your school bag" replaces the two near-identical tasks: `p126`,
  `p531`). Check circle on the left (UX-CMP-02); no X per row: remove is in the row's action
  sheet (swipe-left reveals Remove as a shortcut, with the menu as the accessible path). Header:
  "Pack & prep" + Barlow count "1/2" + one "Copy list" text button with a copy icon (not the share
  icon). When all are done the section collapses to one line, "Packed. Eat around 2:30 PM.",
  with a Show list disclosure (UX-CMP-19). Empty: "Nothing to pack yet. Plan a snack to get a
  list." with a "See ideas" text button (closes STATE-11).
- **UX-TODAY-08 — Your day.** No box, no "Edit schedule" button (tapping a row opens it:
  `p144`, `p145`). Left column: Barlow start time. Dot in the session color. Title, then a
  sentence meta ("Until 3:00 PM, lunch 11:30 AM"; "Away, leave by 5:15 PM"). The Now marker is
  a 1 px lime rule with "now 1:30" in Barlow, not a full-height lime bar. Planned food rows
  show "about 2:30 PM" and the food, with no PLANNED/PACKED tag (the step indicator lives on
  the hero). No GAME badge (`p111`).
- **UX-TODAY-09 — Evening hero is tomorrow's checklist.** From the evening state, the hero
  title is "Ready by 7:30 tomorrow." and its rows are tomorrow's tasks as checkable rows on
  pitch (lime checks), with "Choose tomorrow's snack" as the lime primary. The separate
  Tonight card and its mini-rail go; "By 7:30 AM" is said once in the title, not per row
  (`p161`–`p164`).
- **UX-TODAY-10 — Water row.** One row: "Water", the total in Barlow ("16 oz"), and a
  quick-amount bar (+8, +16, Custom: UX-CMP-21). Custom opens a small sheet with one field
  (`p153`, `p154`). No meter, goal or fraction (UX-DS-17). The helper ("Bring a full bottle…")
  moves to Why this?. Units follow the setting (`p155`, `p156`).
- **UX-TODAY-11 — Prompt slot as a status line.** Reminder offer, backup nudge, last-week
  summary and reminder problem use the inline status line (UX-CMP-17), at most one at a time,
  below Water (`p171`–`p174`, `p531`). Last-week (`p174`, `p175`) reads as one sentence with a
  "See week" text action.
- **UX-TODAY-12 — Why this? sheet.** Lead with one sentence (the reason for this food now);
  the body paragraph moved from the hero follows; sources sit in a "Sources" disclosure with
  the checked date. Links underlined only inside prose (`p141`).
- **UX-TODAY-13 — Moved session prompt names the time.** When a planned session moves, the
  hero's food row shows "Practice moved to 4:30. Move your snack to about 3:00?" with Move
  (lime primary) and Keep (text). The same prompt appears on the Ideas hero (UX-IDEA-02)
  (`p146`; closes STATE-04).
- **UX-TODAY-14 — School-day prompt.** When sessions exist and no school day is set, the
  status line reads "Add your school day to plan lunch and after-school snacks." with "Add
  school day" (closes STATE-16).
- **UX-TODAY-15 — Sheets opened from Today.** Activity and school day sheets follow the
  Schedule specs (UX-SCH-13, UX-SCH-14). The "Changing Tue, Oct 13 only." banner becomes the
  sheet subtitle (`p144`). The scope choice is an alert (UX-SCH-12, `p143`).
- Plan details sheet: UX-FLOW-01. Desktop: UX-RWD-03.

### 6.4 Schedule

Evidence: `p201`–`p255`, `p707`, `p708`, `d201`–`d255`; `TS S1`–`S7`, `TS D2`.

**Week (phone).**

```
┌──────────────────────────────────────┐
│ October                     (+)  (M) │  large title = month; + = add activity
│ [       Week       |     Month     ] │  segmented, full width
│ ‹   Oct 12–18                 Today › │  one nav row for both views
│                                      │
│  M   T   W   T   F   S   S           │  week strip: tap jumps to the day
│  12 (13) 14  15  16  17  18          │  today = lime ring, selected = pitch fill
│  ·   ·   ·   ·       •               │  session dots
│                                      │
│ Mon 12                               │  day header, sticky under the top bar
│ 4:00   Soccer practice          Home │  Barlow time, teal dot, trailing …
│ Tue 13  ● today                      │  lime dot + word, no chip
│ 4:00   Soccer practice          Home │
│ Sat 17                               │
│ 6:00   Soccer game   Away, leave 5:15│  orange dot
│ Sun 18                               │
│        Rest day                      │  rest icon + word
│                                      │
│ Your week                            │  settings at the end, quiet rows
│ School      Mon–Fri, 8:00–3:00    ›  │
│ Rest days   Sunday                ›  │
│ Team calendar  Tigers 14U         ›  │
└──────────────────────────────────────┘
```

- **UX-SCH-01 — No day cards.** Days are a sticky day header (17/22 600) followed by rows
  (UX-CMP-02). No boxes, no hairline under the header, no per-day "+" on phone (`p204`).
- **UX-SCH-02 — Schedule opens on the schedule.** The School day card and the joined Rest days
  + Team calendar card move to a "Your week" section at the end of the page as three plain
  rows with values and chevrons; each opens its sheet. At 390 × 844 the first event row starts
  above y = 320 (today ≈ 490: `p204`; 320 px: `p707`). One verb on every row: the row is the
  action; no "Set up" / "Set" / "Edit" / "Import" buttons, and no row shows both a button and a
  "…" menu (`p254`).
- **UX-SCH-03 — Header and navigation.** Large title = the month of the visible week. "+"
  icon button (44 px) for Add activity replaces the "+ Add" pill. Week/Month segmented at full
  width. One navigation row in both views: ‹ › around the range ("Oct 12–18", en dash) and a
  "Today" text button, the same layout in Month (`p202`, `p206`).
- **UX-SCH-04 — Week strip.** Seven day columns with session dots (session colors, max three
  dots then "+"). Today = lime ring; the selected day = pitch filled circle with white numeral.
  Tapping a day scrolls the list to it.
- **UX-SCH-05 — School once, not per day.** School no longer repeats as a row on every
  weekday (5 of 9 rows on `p204`). It appears once, as the "School" row in "Your week", and
  as a slate 3 px band beside the day header of school days ("Mon 12" with a slate band). Days
  off from school show "No school" in the day header meta.
- **UX-SCH-06 — Today marker.** "Tue 13" + a lime dot + "today" in 15 px ink, not a tinted
  "TODAY" chip (`p204`).
- **UX-SCH-07 — Rest days are labelled.** A rest day shows a row with a moon icon and "Rest
  day" in ink (not grey small text: `p239`); an empty non-rest day shows "Nothing scheduled" in
  ink-subtle with no row border.
- **UX-SCH-08 — Empty week.** Left-aligned empty state: "No practices yet." / "Add your usual
  practice and Nourally plans snacks around it." / primary "Add practice" / text button
  "Import team calendar" (`p201`, `p202`).
- **UX-SCH-09 — Month view.** Header and nav as Week. The grid is full-bleed on paper (no
  card); selected day = pitch filled circle, today = lime ring (not two outline shapes:
  `p207`). The selected day's sessions list below as plain rows (`p206`–`p208`).
- **UX-SCH-10 — Skipped day.** The skipped session shows as a row with its title struck
  through, "Skipped" in ink-subtle and a "Restore" text button (no grey box inside a card:
  `p217`). The Undo toast stays (`p216`).
- **UX-SCH-11 — Row menu.** Phone: the "…" opens an action sheet (UX-CMP-12): Edit, Skip this
  day, Delete (error, last). Desktop: anchored menu (`p209`, `p210`).
- **UX-SCH-12 — Scope choices as alerts.** "Change only Tue, Oct 13" (primary), "Change all
  Tuesday practices" (secondary), Cancel (text). Delete: "Delete only Tue, Oct 13" is the
  primary-weight button in error fill; "Delete all Tuesday practices" is an error text button
  (UX-BUG-17; `p143`, `p211`, `p215`, `p218`).
- **UX-SCH-13 — Add or edit activity sheet.**

```
╭──────────────────────────────────────╮
│                ────                  │
│ New practice                         │  title follows Type
│ [Practice | Game | Workout | Other ] │  segmented
│ Name                                 │
│ [ Soccer practice                  ] │
│ Repeats every week            ( on ) │  switch row; on = weekday bar below
│ [ M | T | W | T | F | S | S ]        │
│ Date            Tue, Oct 13       ›  │  DateField (one-day only)
│ Time   [ 4:00 PM ] → [ 5:30 PM ]     │  two TimeFields, one row
│ Where  [   Home   |   Away   ]       │
│ Travel time      [ 45      min ]     │  Away only; suffix inside
│ More options                      ⌄  │
│                                      │
│ [          Add practice          ]   │
╰──────────────────────────────────────╯
```

  "One day / Every week" becomes the "Repeats every week" switch; the grey Repeat box goes
  (`p229`). Times use TimeField (no "04:00 PM": `p226`). The edit scope banner becomes the sheet
  subtitle ("Changing all Tuesday practices. Other days stay as they are.": `p212`). Errors
  clear on fix (UX-BUG-02, `p227`–`p229`). The overlap confirm becomes an alert with "Save
  anyway" (`p230`). Discard is an alert (`p214`).
- **UX-SCH-14 — School day sheet in two groups.** "Hours" (weekday bar, School times row,
  Lunch times row, optional snack time) first; "School year and food access" second, behind a
  disclosure when already set. Same TimeField and weekday bar as setup (`p236`, `p237`,
  `p240`). The error message names the rule (UX-BUG-03 shares the validator).
- **UX-SCH-15 — Rest days sheet.** Keep its content (`p238`); weekday bar instead of chips.
- **UX-SCH-16 — Import preview without 40 dropdowns.** Each event is one row: checkbox,
  title, date and time, and a sentence meta with the inferred type and place ("Practice,
  home"). Tapping the row opens a small sheet to change Type and Where. The status lines merge
  into one sentence above the list ("20 upcoming events from Lightning U14 Girls. 1 past and
  1 all-day event are not shown."). Primary "Import 20 events" (`p247`, `p253`).
- **UX-SCH-17 — Team calendar row.** Subscribed: one row "Tigers 14U Baseball, updated
  10:00 AM" with a chevron; the sheet it opens holds Refresh, Import again and Unsubscribe
  (`p254`, `p255`). Link import keeps its explainer (`p251`, `p252`).
- **UX-SCH-18 — No unrelated footer.** The "Saved on this device…" line leaves Schedule
  (UX-MISC-01).
- Duplicate re-import: UX-FLOW-05. Desktop: UX-RWD-04, UX-RWD-05.

### 6.5 Food frame (all four sections)

Evidence: `p301`, `p332`, `p354`, `p381`, `p610`, `p709`–`p713`, `d301`, `d332`, `d354`,
`d381`, `d643`, `d644`; `FD Food section tabs`, `FD TABLET and DESKTOP`.

```
┌──────────────────────────────────────┐
│ Food                            (M)  │  large title, collapses on scroll
│ Ideas   At home •   Groceries 3   Log│  underline tabs, 17 px 600
│ ━━━━━                                │  3 px pitch bar under the active tab
│ Now   Before practice   After   Tmrw │  second level: 15 px text toggles
│ …                                    │
```

- **UX-FOOD-01 — Underline section tabs.** The four sections become left-aligned text tabs
  (17/22 600, ink-muted; active ink with a 3 px pitch bar), not a grey tray with a white
  selected box. Counts are plain numerals after the label ("Groceries 3"); the low-stock dot
  stays. At 320 px the row scrolls horizontally with an 24 px fade mask on the clipped edge,
  and the active tab scrolls into view (`p709`–`p713`). `role="tablist"` semantics stay.
- **UX-FOOD-02 — Second-level choices are text toggles.** Moments (Ideas), filters (At home),
  Day/Week (Log) are 15/20 text toggles with a 2 px underline on the active one, or a
  segmented control where there are exactly two options (Day/Week). Never a second tray. The
  moment row scrolls with a fade mask instead of clipping "To…" (`p301`, UX-BUG-12).
- **UX-FOOD-03 — Chrome budget.** At 390 × 844 the first Ideas item (hero or row) starts at
  y ≤ 260 (today ≈ 300 px of chrome: `p301`), and the same content start applies on every Food
  section (no jump when switching tabs).
- **UX-FOOD-04 — Label line as a caption.** "Allergies: check every label." is one caption
  line (UX-DS-16) under the section's list title, not a tinted box.

### 6.6 Ideas

Evidence: `p301`–`p324`, `p709`, `d301`, `d322`, `d643`; `FD Ideas`, `FD Ideas states`,
`FD Phone full-page pass`.

```
┌──────────────────────────────────────┐
│ Food                                 │
│ Ideas   At home •   Groceries 3   Log│
│ Now   Before practice   After   Tmrw │
│ Soccer practice at 4:00 PM, in 2 hr  │  one context line
│╭────────────────────────────────────╮│
││ Eat around 2:30 PM                 ││  hero = planned meal or top pick; Barlow 40/42
││ Sunflower-butter banana sandwich   ││  DM Sans 22/28 600 white
││ Have it all. Packs well.           ││
││ Planned ● Packed ○ Eaten ○         ││  step indicator once planned
││ [         Mark packed          ]   ││  lime
│╰────────────────────────────────────╯│
│ More ideas               Low cost ○  │  section title + switch
│ Ideas are examples, not amounts.     │  caption
│ Allergies: check every label.        │  caption, warning ink
│ ✓  Banana + pretzels             +   │  left glyph: have it all
│    Have it all. No fridge needed.    │
│ 2  Fig bar + fresh fruit         +   │  left glyph: Barlow count of items needed
│    Need fig bars, apples.            │
│ ✓  Cereal cup + soy milk         +   │
│ Show more ideas                      │  text button
```

- **UX-IDEA-01 — Rows, not cards.** Every idea is a row (UX-CMP-02): left glyph (success
  check = have everything; Barlow count = number of items needed), name, one sentence of
  availability and portability, trailing "+" icon button = Plan this. No per-idea teal button
  (six on `p301`), no card, no chip per ingredient, no "BUY 2 ITEMS" or "READY – YOU HAVE
  EVERYTHING" badge (`p301`, `p322`).
- **UX-IDEA-02 — One hero, no duplicate.** With a plan for the selected moment, the hero shows
  the planned meal with the step indicator and the step primary (Mark packed, Log it); the
  planned idea is removed from the list below (`p308`, `p322`, `p323`). Without a plan, the
  hero is the top-ranked idea with "Plan this" as the lime primary and the list starts at
  idea 2. The moved-session prompt appears here as on Today (UX-TODAY-13).
- **UX-IDEA-03 — Idea details sheet.** Tapping a row opens a sheet: name, why it fits (one
  sentence), ingredients as a have/need checklist (check = at home, empty circle = needed),
  "Add missing to groceries" (secondary, was hidden in "…": `p305`), "Plan this" (primary),
  then "Save as favorite" and "Not for me" as text buttons, then the label caption line.
- **UX-IDEA-04 — Low cost is a switch.** "Low cost" is a switch in the list title row, not a
  fourth header row with an outlined "Show all" button (`p316`).
- **UX-IDEA-05 — Empty states.** No dashed box. No-access (`p317`): "Nothing fits right now."
  / "Pack a snack next time. Tomorrow's ideas are ready." / primary "See tomorrow's ideas" /
  text button "Log what you ate" (UX-FLOW-12). No-match (`p319`): "No ideas match your food
  needs." / primary "Change food needs".
- **UX-IDEA-06 — One context line.** Each moment has one context sentence ("Sunday. No
  practice today." `p320`; "Away game. Foods that travel well." `p321`), never two grey lines.
- **UX-IDEA-07 — Examples caption placement.** "Ideas are examples, not amounts you must eat."
  sits under the list title as a caption (moved from the end of the list: `p306`).
- **UX-IDEA-08 — Shared idea row.** `IdeaRow` and `Availability` (a sentence formatter, no
  chips) are shared components used by Ideas, the Today hero food row and the idea details
  sheet, replacing inline markup in `IdeasPage.jsx` and Today's own availability list
  (closes CMP-10 in its revised form: shared row and availability, not chips).
- **UX-IDEA-09 — Toasts.** "Food planned." with Undo (`p307`); "Bagel or toast + jam hidden."
  with Undo (`p318`, UX-CMP-13). Log-what-you-ate dialog (`p324`) uses the Log food sheet.
- Desktop: UX-RWD-06.

### 6.7 At home

Evidence: `p331`–`p344`, `p710`, `d331`–`d344`; `FD At home`, `FD Phone at 320`.

```
┌──────────────────────────────────────┐
│ [ (search) Search or scan food   ▣ ] │  one field = Add food
│ 4 low or out             Add to list │  warning count + text button
│ All   Low or out   In my bag         │  text toggles
│                                      │
│ Kitchen and pantry                   │  section title (place)
│ Bananas                        Out ⌄ │  trailing status word, colored
│ Apples                         Low ⌄ │
│ Whole-grain bread          6 left ⌄  │
│ Fridge                               │
│ Greek yogurt                  Have ⌄ │
└──────────────────────────────────────┘
```

- **UX-HOME-01 — One control per row.** Each stock row has one trailing control: a status
  word in its color (Have = ink, Low = warning, Out = error, "6 left" for counted items) that
  opens a small menu (Have, Low, Out, or a stepper for counted items, plus Move to…, Edit,
  Remove). The Have/Low/Out tray, the separate stepper and the "…" on every row go (`p332`;
  about 30 tap targets at 390 become about 10). Tapping the name opens details. At 320 px the
  status word stays a word, never icon-only (`p710`).
- **UX-HOME-02 — Search field is the add entry.** "Search or scan food" is a field-shaped
  button at the top that opens the search sheet with the scanner icon; the lone right-aligned
  "Add food" primary goes (`p332`). Quick add moves into the search sheet as tiles
  (UX-SRCH-08).
- **UX-HOME-03 — Low or out bridge.** One row: "4 low or out" (warning count) + "Add to list"
  text button; on desktop the same row heads the list (no separate aside card: `d332`).
- **UX-HOME-04 — Filters as text toggles.** All / Low or out / In my bag (UX-FOOD-02, `p333`,
  `p334`).
- **UX-HOME-05 — Menus.** "Move to fridge / freezer / my bag" become one "Move to…" item with
  a second step (UX-CMP-12, `p335`, `p336`).
- **UX-HOME-06 — Empty At home.** Large left title "What's in your kitchen?", the search field
  as the primary entry, and six starter tiles (Bananas, Apples, Bread, Oats, Yogurt, Pretzels:
  UX-CMP-22), one tap each, with Undo (`p331`).
- **UX-HOME-07 — Counts as? as tiles.** The category select becomes tiles with plain names and
  icons ("Fruit", "Bread and grains", …) plus "Skip"; the raw database name is shown once,
  normalised (UX-SRCH-02), with the label caption (`p344`).
- **UX-HOME-08 — Merge prompt.** "Update it" primary, "Keep both" secondary (`p342`).
- **UX-HOME-09 — Details sheet.** Same field and button rules (UX-CMP-04, UX-CMP-10); exact
  amount mode uses the stepper inline (`p337`, `p338`). `p339` (details-sheet-error) did not
  capture the error state; U10 forces and re-checks it.

### 6.8 Groceries

Evidence: `p351`–`p364`, `p125`, `p133`, `p711`, `d351`–`d364`; `FD Groceries`.

```
┌──────────────────────────────────────┐
│╭────────────────────────────────────╮│  hero only when the list is empty
││ This week: 4 practices, 1 away game││  or new suggestions exist
││ 8 foods to cover it                ││  hero instruction, Barlow 40/42
││ [        Add 8 to my list      ]   ││  lime
││ Choose                             ││  text button → suggestions sheet
│╰────────────────────────────────────╯│
│ For Sat away game                3   │  group title = reason
│ ( ) Crackers                  1 box  │
│ ( ) Pretzels                  1 bag  │
│ For Tue practice                     │
│ ( ) Canned beans             2 cans  │
│ + Add an item                        │  inline row → search sheet
│ In cart (2)                       ⌄  │  collapsed group
│ Past trips                        ›  │
│ ╭──────────────────────────────────╮ │
│ │ 2 of 6, about $8.00 [Finish shopping]│ floating bar above the tab bar
│ ╰──────────────────────────────────╯ │
│   ╭ Today  Schedule [Food]  You ╮    │
```

- **UX-GROC-01 — Week hero.** When the list is empty or new suggestions exist, the hero shows
  this week's reason and count with "Add 8 to my list" as the lime primary and "Choose" (opens
  the suggestions sheet). Replaces the small "Suggest for this week" link and the dashed empty
  box (`p351`, `p362`, UX-FLOW-08).
- **UX-GROC-02 — Group by reason.** Rows group under "For Sat away game" style titles; the
  per-row grey reason chip that truncates with prices on goes (`p354`, `p364`).
- **UX-GROC-03 — In cart group.** Checked rows move (200 ms) into a collapsed "In cart (n)"
  group at the end; unchecking moves them back (`p354`, `p360`).
- **UX-GROC-04 — Finish bar with the total.** The finish action is a floating bar above the
  tab bar (UX-NAV-06): "2 of 6, about $8.00" (total only when price estimates are on) and the
  "Finish shopping" primary. The total leaves the page bottom (`p364`). It does not stack a
  second docked bar on the tab bar.
- **UX-GROC-05 — Add item inline.** "+ Add an item" is the last row of the list and opens the
  search sheet; the header "Add food" primary goes. Share stays as an icon button in the
  section title row (`p354`, `p363`).
- **UX-GROC-06 — Put-away without selects.** Each item shows its place as text with a chevron
  ("Kitchen ⌄"), pre-filled; only exceptions need a tap; "New at home" appears once as a group
  title, not on every row (`p361`).
- **UX-GROC-07 — Row actions.** Phone: tap = check; "…" → action sheet with Swap, Edit,
  Remove (UX-CMP-12); swipe-left shows Remove as a shortcut (`p355`–`p357`).
- **UX-GROC-08 — Past trips and undo trip.** Past trips is a row that opens its sheet;
  "Undo trip" uses the alert (UX-CMP-11). `p359` captured the toast, not the confirm; U10
  re-checks the confirm.
- Suggestions sheet: UX-FLOW-06. Desktop: UX-RWD-06.

### 6.9 Log (Day and Week)

Evidence: `p381`–`p392`, `p712`, `p713`, `d381`–`d392`; `FD Log`.

```
┌──────────────────────────────────────┐
│ ‹  Today, Oct 13  ›      [Day | Week]│  one control row
│╭────────────────────────────────────╮│  hero only when a plan is due
││ Did you eat the sunflower-butter   ││
││ banana sandwich?                   ││
││ [ Yes, as planned ]    Changed it  ││  lime + text button
│╰────────────────────────────────────╯│
│ 1:30   Apples                  182 g │  Barlow time column
│ 4:00   ● Soccer practice  until 5:30 │  session dot, ink-muted
│ 6:00   Banana chips             28 g │
│ Water  8 oz              [+8|+16| + ]│
│ Allergies: check every label.        │  caption
│ ╭──────────────────────────────────╮ │
│ │            Log food              │ │  floating primary above the tab bar
│ ╰──────────────────────────────────╯ │
```

- **UX-LOG-01 — One control row.** The date switcher and a Day/Week segmented control share
  one row; the separate "Back to today" row goes ("Today" is a text button in the switcher
  when another day is shown: `p382`). The full-width "Log food" button leaves the top
  (`p381`).
- **UX-LOG-02 — Floating Log food.** "Log food" is the floating action bar above the tab bar
  (UX-NAV-06) on Day; Week hides it.
- **UX-LOG-03 — Did-you-eat hero.** The plan prompt becomes the route's hero only when a plan
  is due; "Yes, as planned" lime, "Changed it" text button (`p381`, `p387`).
- **UX-LOG-04 — Timeline rows.** Entries and sessions share one list with a Barlow time column;
  sessions show a dot and sentence-case title ("Soccer practice", not "SOCCER PRACTICE":
  `p389`, `p392`). Water is a row with the quick-amount bar, not a card (`p381`).
- **UX-LOG-05 — Week list.** Rows read "Tue 13, 2 foods, 8 oz water" with a chevron; days with
  nothing say "Nothing logged" once, with no water negative (UX-COPY-06, `p389`, `p391`,
  `p392`). "That's fine. Logging is optional." (`p391`).
- **UX-LOG-06 — No phone table.** "View as table" exists only at 768 px and up; the 4-column
  table never renders below 768 (`p390`, `p713`).
- **UX-LOG-07 — Entry menu and edit.** Entry "…" → action sheet (Edit, Remove). Edit sheet
  follows UX-CMP-10; the amount error has a message (UX-BUG-06, `p384`–`p386`).
- **UX-LOG-08 — From-home in one sheet.** After logging a planned meal that used food from
  home, one sheet lists every item used ("Took from home: bread, banana, sunflower-seed
  butter") with per-item checks and one "Update At home" primary, instead of one Yes/No prompt
  per item (`p388`, UX-FLOW-11).
- Desktop: UX-RWD-06.

### 6.10 Food search and portion

Evidence: `p401`–`p409`, `p341`, `p343`, `p363`, `p718`, `d401`–`d409`; `FD Food search dialog`.

```
╭──────────────────────────────────────╮  full-height sheet (keeps its X)
│ Log food                          ✕  │
│ [ (search) banana               ▣ ]  │  scan icon inside the field
│ Allergies: check every label.        │  caption, once per view
│ Recent                               │
│ Banana                           +   │
│ Basic food, 1 medium (182 g)         │
│ Banana chips                     +   │
│ Great Value, 1 oz (28 g)             │
│ Allergen info can be missing.        │  per-row line on brand-name rows (kept)
│ Can't find it? Add it yourself       │  text button, every state
╰──────────────────────────────────────╯
```

- **UX-SRCH-01 — Quiet result rows.** The whole row is the tap target (opens the portion
  step); the trailing "+" icon is a shortcut that adds the usual portion; the star moves to
  the portion step; no outlined "Add" box per row (`p402`, `p343`). The per-row allergen line
  stays on brand-name rows as a caption (UX-DS-16).
- **UX-SRCH-02 — Readable names.** Database names are shown in sentence case with the brand
  on line 2 ("Cheerios" / "General Mills, 1 cup (28 g)" instead of "Cereals ready-to-eat,
  GENERAL MILLS, CHEERIOS"). The raw name stays available in the details for honesty.
- **UX-SRCH-03 — Portion tiles.** The portion step shows tiles (UX-CMP-22) for the common
  portions ("Half", "1 cup (28 g)", "2 cups") with "Other amount" revealing the gram field and
  unit select; time stays a TimeField (`p403`).
- **UX-SRCH-04 — Specific error.** Provider error reads "Food search isn't responding. Try
  again, or add the food yourself." with "Try again" primary and "Add it yourself" text button
  (`p407`). Offline keeps its line (`p408`).
- **UX-SRCH-05 — Add it yourself prefill.** The name is pre-filled with the search query (or
  left empty), not "Food"; amount empty, not 100 g (`p409`, UX-BUG-18).
- **UX-SRCH-06 — No results.** "No foods match 'xyz'." / "Check the spelling or add it
  yourself." / primary "Add it yourself" (`p406`).

### 6.11 Barcode

Evidence: `p421`–`p424`, `d421`–`d424`; `FD Food search dialog`.

- **UX-SRCH-07 — Scanner has one primary.** With a camera: a rounded viewfinder (radius 24)
  with a lime scan line as the screen's focus, "Enter the number" text button below. Without a
  camera (`p421`): a single "Barcode number" field and "Look up" primary; "Take photo"
  disabled and "Use camera" outlined boxes go. Invalid code: field error under the field
  (`p422`). Product found (`p424`): the product view with the label line and allergen honesty
  copy, primary "Add".
- **UX-SRCH-08 — Quick add as tiles.** Quick basics in the search sheet initial state become a
  horizontal row of tiles (UX-CMP-22) that never clips a label (`p341`, `p718`, UX-BUG-12).
- Not found: UX-BUG-07. Desktop modal sizing: UX-RWD-09.

### 6.12 You and its sheets

Evidence: `p501`–`p531`, `p618`, `p619`, `p626`–`p630`, `p714`, `d501`–`d527`, `d645`;
`SY B1`–`SY B6`, `SY C`.

```
┌──────────────────────────────────────┐
│ You                             (M)  │  large title
│ Maya                                 │  22/28 700, no second avatar
│ Soccer, in season                    │  15/20 ink-muted
│ Switch or add athlete             ›  │  text row
│                                      │
│ Your plan                            │  group title
│ [i] Sport & season          Soccer  › │  20 px leading icon, value right
│ [i] Food needs                 None  › │
│ [i] Food access & budget  Cafeteria… › │
│ [i] Reminders                   Off  › │
│                                      │
│ App                                  │
│ [i] This device           Backed up  › │
│ [i] About Nourally's guidance       › │
└──────────────────────────────────────┘
[i] = 20 px Lucide line icon
```

- **UX-YOU-01 — No cards on You.** The athlete card and the grouped settings card go. The
  profile is type on paper (name, one meta sentence, a "Switch or add athlete" row); settings
  are two row groups with plain titles (`p501`, `p714`).
- **UX-YOU-02 — Value on the right.** Each row shows one short value right-aligned on one
  line (truncates with an ellipsis), instead of a wrapped second line of dot-meta (`p501`).
- **UX-YOU-03 — Honest row name.** While `ALLERGY_TAGS_REVIEWED` is false, the row reads "Food
  needs", not "Food needs & allergies"; the sheet keeps the allergy line. When allergy
  filtering is approved, the row name returns with the feature.
- **UX-YOU-04 — Sport & season sheet.** Sport required with "Enter your sport." (UX-BUG-01);
  "Optional" tags removed from Sport; the sport list opens as a pushed page inside the sheet on
  phone (UX-CMP-18, `p502`, `p503`); Season segmented.
- **UX-YOU-05 — Food needs sheet.** Renders the same `FoodNeedsFields` as setup step 5
  (UX-SET-06): checklist rows, "More foods" sheet, allergy line, no allergen controls
  (`p505`, `p506`).
- **UX-YOU-06 — Food access & budget sheet.** Sections "Where you get food" (checklist rows),
  "At school" (checklist rows), "Help at home" (switch row), "Budget" (field with "$" prefix
  inside, low-cost switch row), "Units" (oz/ml segmented). One error message under the group
  title with a 3 px error bar on the group, not every option turned red (`p507`–`p509`). The
  "Also in Schedule › School day." note is a link row.
- **UX-YOU-07 — Reminders sheet.** On a phone browser the first line is the limit, as a
  status line: "On phones, reminders work only while Nourally is open." The master switch and
  the evening reminder are both switch rows; "How long before" is a segmented control (30 / 60
  / 90 min). Dependent controls are disabled while the master is off, denied or unsupported
  (`p524`, `p527`, UX-BUG-15). When permission is lost, the sheet and the Today status line ask
  "Notifications are blocked. Turn reminders on again?" with "How to allow" before switching
  off (closes STATE-05; `p531`).
- **UX-YOU-08 — Discard is an alert.** Leaving an edited sheet asks with the alert
  (UX-CMP-11), not a second sheet (`p619`).
- **UX-YOU-09 — Athlete switcher.** The avatar opens a sheet listing athletes as rows
  (UX-WEL-03 pattern) with "Add athlete" last and "This device" as a text button; switching
  shows the toast "Switched to Sam." (`p626`–`p630`).
- Desktop: UX-RWD-07 (two-pane settings).

### 6.13 This device and data recovery

Evidence: `p536`–`p542`, `p636`, `p637`, `p715`, `d536`–`d542`; `SY B7`–`SY B9`.

```
‹ You
This device                          large title
Your data is saved in this browser only.   one line; details in About
Athletes on this device
(M) Maya                 Open now        current athlete, no button
(S) Sam                        …
(+) Add athlete
Backup
[i] Save a backup file      Oct 13        primary-colored title (the key action)
[i] Restore from a file           ›
   Include all athletes        ( on )
Storage
[i] Keep data on this device      ›
[i] Delete Maya's data                    error text, no box
```

- **UX-DEV-01 — Actions as rows.** Five bordered buttons of three widths become rows with
  leading icons; "Save a backup file" is the one primary-colored row title with the last
  backup date as its value; the destructive row is last in error color (`p536`, `p715`).
- **UX-DEV-02 — Athlete rows.** One tap target per athlete (opens that athlete) and a "…"
  menu for Rename and Remove, as on Welcome; no "Open" and "Rename" text buttons inside a
  bordered group (`p536`, `p537`, `p538`).
- **UX-DEV-03 — Delete confirm.** Alert with the type-DELETE field; title on one line;
  visible destructive-disabled state (UX-CMP-11, `p540`, `p541`).
- **UX-DEV-04 — Restore result.** The restore preview names the athletes from the file
  (`p539`); after restoring, the toast reads "Added 1 athlete: Maya (from backup)." with a
  "Switch now" action (closes STATE-08; `p542` is the backup-saved toast and stays).
- **UX-DEV-05 — Data error recovery.** The four outlined buttons become four action rows; the
  raw validator text ("Invalid schedule: expected a list.") moves behind a "Show details"
  disclosure; the honest lead copy stays (`p636`).
- **UX-DEV-06 — Recovery confirm error.** An error inside the recovery confirm appears under
  the button that failed, not as a red box inside the alert (`p637`).

### 6.14 About, Not found and the footer

Evidence: `p546`, `p547`, `p716`, `p717`, `d546`, `d547`; `SY B10`, `SY B11`.

- **UX-MISC-01 — Device line said once.** The grey footer "Saved on this device. Food search
  uses online food databases." leaves every page and lives in This device and About only
  (`p501`, `p204`, every Food tab).
- **UX-MISC-02 — About.** Keep the plain reading layout; use the large title (34/40) like other
  pages, not a 20 px bar title; cap text at 64ch on every width (`p546`, `d546`).
- **UX-MISC-03 — Not found.** Vertically centered: large title "This page isn't here.", one
  line, full-width primary "Go to Today"; no footer (`p547`, `p717`).

## 7. Flow fixes

Dead ends and extra taps found in the review. Each has one ID; page specs point here.

- **UX-FLOW-01 — Plan details sheet can act.** Today's plan details sheet (`p132`, `p142`)
  shows the facts once (food, time, step) and offers the next step as the primary (Mark packed
  or Log it), plus "Change food" (opens Other ideas), "Add missing to groceries" when items are
  needed, and "Remove plan" (error text, with Undo toast). Close is the grabber. The duplicate
  "Status: Planned · Eat about 2:30 PM" line goes.
- **UX-FLOW-02 — The hero follows the plan.** The hero primary is always the next step of the
  plan (Plan this → Mark packed → Log it). "Add to groceries" is a secondary text button in the
  food row, so the athlete is never sent to a side task as the main action (`p124`, `p125`).
- **UX-FLOW-03 — Evening checklist where the hero is.** Building tomorrow's list puts the list
  in the hero (UX-TODAY-09), not a screen below under Water (`p161`, `p162`).
- **UX-FLOW-04 — Schedule opens on the week.** UX-SCH-02.
- **UX-FLOW-05 — Re-import ends with Done.** When every event in a file or link is already in
  the schedule, the preview says "Everything in this calendar is already in your schedule."
  and the primary is "Done" (closes the sheet), not a disabled "Choose events" with Back
  (`p250`).
- **UX-FLOW-06 — Suggestions start selected.** The week suggestions sheet opens with every
  suggestion checked and the primary reading "Add 8 to list"; unchecking updates the count
  (`p352`, `p353`).
- **UX-FLOW-07 — Barcode not found leads somewhere.** UX-BUG-07.
- **UX-FLOW-08 — Empty Groceries leads with the suggestion.** UX-GROC-01.
- **UX-FLOW-09 — Setup has one way forward.** UX-SET-01.
- **UX-FLOW-10 — No duplicate Schedule entry on Today.** "Edit schedule" on Today goes; rows
  open their sheets (UX-TODAY-08).
- **UX-FLOW-11 — From-home in one step.** UX-LOG-08.
- **UX-FLOW-12 — No-access Ideas offers logging.** The empty no-access state adds "Log what you
  ate" (UX-IDEA-05, `p317`).
- **UX-FLOW-13 — Packed food and In my bag (owner question).** Should marking a plan packed
  move its At home items to "In my bag"? The review flags the gap (`FD FLOW REVIEW` step 5).
  Blocked — owner: this is a decision, not a build item. Record it in the checklist's
  decisions section; if the answer is yes, add a build item to U7-03 before building it.

## 8. Bug list

Defects found in the U0 review. Each is fixed in U1 unless its fix is a redesigned
component, in which case the phase is named.

| ID | Defect | Evidence | Fix | Phase |
|---|---|---|---|---|
| **UX-BUG-01** | You › Sport & season saves an empty sport; the sheet labels Sport "Optional" while setup requires it; header shows "No sport set". | `p504`, `p502`, `SportSheet.jsx:34`, `SportField.jsx:14` | Same rule as setup: Sport required, "Enter your sport." inline, focus the field, sheet stays open. Drop "Optional" from Sport. Domain test for the profile save path in `tests/domain.test.js`. | U1 |
| **UX-BUG-02** | Field errors stay after the value is fixed: setup step 1 Sport (`p007`), step 3 end time (`p012`), Schedule add/edit "End time must be later than start time" with 4:00–5:30 (`p228`, `p229`). `formError` is set only in `saveEvent()` and cleared only when the sheet opens (`useActivityEditor.jsx:57`). | `p007`, `p012`, `p228`, `p229` | Clear a field's error on the first change that makes it valid; re-validate on blur; clear the form error when any field changes. One shared hook used by setup, Schedule and You sheets. | U1 |
| **UX-BUG-03** | Setup step 2: lunch start and end turn red with no message. | `p009`, crop `sy-crop-009` | Message under the pair: "Lunch has to be during school (8:00 AM–3:00 PM).", linked with `aria-describedby`; same validator in the School day sheet. | U1 |
| **UX-BUG-04** | `index.html` viewport meta lacks `viewport-fit=cover`, so every `env(safe-area-inset-*)` in `frame.css` is 0 on iPhones. | `index.html:5` | `width=device-width, initial-scale=1, viewport-fit=cover`, plus top-bar safe-area padding (UX-NAV-07). | U1 |
| **UX-BUG-05** | Plan details sheet offers only Close. | `p132`, `p142` | UX-FLOW-01. | U5 |
| **UX-BUG-06** | Log edit entry and portion step: amount 0 disables Save with no message. | `p386`, `p404` | Keep Save enabled; on Save show "Enter an amount above 0." under the field. | U1 |
| **UX-BUG-07** | Barcode not found says "Add the food yourself." with no button for it. | `p423` | Primary "Add it yourself" opens the add form pre-filled with the barcode; "Back to search" text button. | U1 |
| **UX-BUG-08** | Travel time wraps between "5:15" and "PM". | `p115` | No-break space in `format.js` (UX-COPY-04). | U2 |
| **UX-BUG-09** | At 320 px, a meta line wraps so that "· Lunch 11:30 AM" starts the second line with an orphan dot. | `p707`, `p708` | Sentence meta (UX-COPY-01). | U2 |
| **UX-BUG-10** | Toasts cover content and actions: prompt buttons (`p126`, `p152`, `p531`), "Everything's checked" line (`p360`), the footer (`p318`). | listed | Toast placement rules (UX-CMP-13, UX-NAV-06). | U3 |
| **UX-BUG-11** | The footer line is clipped behind the tab bar at the end of You. | `p501` | Content clearance (UX-NAV-04). | U3 |
| **UX-BUG-12** | Controls clip with no scroll cue: Ideas moment tray "To…" (`p301`), Quick add "Frozen b" (`p332`), 320 px tabs (`p709`). | listed | Fade-mask scrolling rows (UX-FOOD-02), tiles (UX-SRCH-08). | U7 |
| **UX-BUG-13** | Duplicate re-import ends on a disabled button with only Back. | `p250` | UX-FLOW-05. | U1 |
| **UX-BUG-14** | Week suggestions open with nothing selected and the primary disabled. | `p352` | UX-FLOW-06. | U1 |
| **UX-BUG-15** | Reminders: with permission denied or unsupported, the master switch is disabled but "How long before" and the evening checkbox look active. | `p524`, `p527` | Disable dependent controls (UX-CMP-08). | U1 |
| **UX-BUG-16** | Opening a sheet puts a visible focus ring on its X. | `p524`, `p527` | Initial focus on the sheet title (UX-CMP-10). | U1 |
| **UX-BUG-17** | Delete-scope dialog makes "Delete all" the filled button and "only this day" outlined. | `p215` | Safe option is the primary (UX-SCH-12). | U1 |
| **UX-BUG-18** | "Add it yourself" pre-fills the name "Food" and 100 g. | `p409` | Pre-fill with the query; amount empty. | U1 |
| **UX-BUG-19** | After logging the 28 g usual portion of banana chips, the entry reads "1 g". | `p403`, `p405` | Reproduce with the fixture; if the stored amount or unit is wrong, fix and add a `tests/log.test.js` case; if it is a capture artifact, record that in the checklist note. | U1 |
| **UX-BUG-20** | At home "0 left" rows are not treated as Out: the summary counts them, the row looks in stock. | `p332` | A counted item at 0 shows "Out" in error color and counts once in "low or out"; domain test. | U1 |
| **UX-BUG-21** | Ideas shows the planned idea twice: in the planned card and again in the list with "Plan this". | `p308`, `p322`, `d643` | UX-IDEA-02. | U7 |

## 9. Responsive adaptation

The phone layout is the base. Larger widths add structure through `min-width` queries on the
existing scale only (480, 768, 1024, 1200, 1280: `tests/styles.test.js` RWD-01).

| Width | Navigation | Content | Sheets |
|---|---|---|---|
| < 480 (320–479) | Floating tab bar | One column, 16 px gutter | Bottom sheets |
| 480–767 | Floating tab bar (max 440 px, centered) | One column, max 560 px centered | Bottom sheets |
| 768–1023 | Floating top capsule (UX-NAV-09) | Lists max 640 px; Schedule and Food max 960 px; 24 px gutter | Centered dialogs 520 px |
| 1024–1199 | 88 px icon rail (UX-NAV-10) | Two-pane You; Schedule 7-column week; Today split hero | Centered dialogs; You settings inline |
| ≥ 1200 | 232 px rail with labels | Food list + detail panel (720 + 320) | Same |

- **UX-RWD-01 — Content caps.** Body text never exceeds 64ch at any width (About, This
  device, Why this?, setup ledes: `d546`, `d536`). List pages at 768 cap at 640 px so values
  sit near their labels (`d645`).
- **UX-RWD-02 — 480–767 px.** Content max 560 px centered; tab bar max 440 px centered; no
  layout change otherwise.
- **UX-RWD-03 — Today desktop.** The hero spans the main column and splits inside: left =
  context, instruction, run-up line, primary (hug width, left-aligned, not full width: `d106`);
  right = the food choices as rows (current pick checked, alternates below) instead of the
  "Other ideas" sheet. Below the hero, two columns without boxes: Your day (wide, left) and
  Pack & prep + Water (right). The right aside that disappears on rest days goes; on rest days
  the compact header and Your day fill the width (`d101`, `d112`, `d162`).

```
| rail |  Tue, Oct 13                                                |
|      | ╭ pitch ────────────────────────────────────────────────╮   |
|      | │ Practice 4:00, in 2 hr 30 min │ ✓ Banana + pretzels    │   |
|      | │ Snack by 2:30.                │   Fig bar + fruit      │   |
|      | │ ●━━━━━━━│━━━━━━━━━━│          │   Cereal cup + soy milk│   |
|      | │ [Plan this]   Why?            │                        │   |
|      | ╰───────────────────────────────────────────────────────╯   |
|      |  Your day                          Pack & prep       1/2     |
|      |  8:00  School     until 3:00 PM    (✓) In school bag         |
|      |  1:30  ───── now ───────           ( ) Water bottle          |
|      |  4:00  Soccer practice     Home    Water  16 oz [+8|+16| +]  |
```

- **UX-RWD-04 — Schedule desktop week.** Header row: "October 2026", ‹ › Today grouped,
  Week/Month segmented, "Add activity" primary (hug). Week = 7 columns Mon–Sun, sessions as
  blocks in their session color (3 px left bar, tinted 8 %), today's column header in lime-dot
  style, school as a slate band at the top of school days. "Your week" settings rows move to a
  320 px right column at ≥ 1200 (below the grid at 1024–1199). "This week at a glance" folds
  into one header sentence ("3 practices and 1 game this week"). Per-day "+" shows on column
  hover and on focus (`d204`, `d206`).

```
| rail | October 2026     ‹ › Today    [Week|Month]       [Add activity]  |
|      | Mon 12   Tue 13•  Wed 14   Thu 15   Fri 16   Sat 17   Sun 18      |
|      | ▔school▔ ▔school▔ ▔school▔ ▔school▔ ▔school▔                      |
|      | ▌4:00    ▌4:00    ▌4:00    ▌4:00             ▌6:00    Rest day     |
|      | ▌Soccer  ▌Soccer  ▌Soccer  ▌Soccer           ▌Game                 |
```

- **UX-RWD-05 — Schedule desktop month.** Month grid left, selected day's rows in a 320 px
  right panel (keeps the good structure of `d206`, `d207`), all on paper.
- **UX-RWD-06 — Food list and detail.** One frame for all Food sections: a 720 px main column
  and, at ≥ 1200, a 320 px contextual panel on paper with a hairline divider: Ideas → the
  selected idea's details (UX-IDEA-03 content); At home → the selected item's details (replaces
  its sheet); Groceries → trip summary, total and "Finish shopping" (replaces the floating
  button in the aside: `d354`); Log → week strip and water. Below 1200 the panel content
  returns to sheets and the hero. Content width does not change between Food sections
  (`d332`, `d354`, `d381`).
- **UX-RWD-07 — You two-pane.** At ≥ 1024: settings rows in a 360 px left pane; the selected
  section's form inline on the right with Save in its footer; leaving a dirty pane triggers the
  discard alert once. No settings modal on desktop; phones keep sheets (`d501`, `d507`).
- **UX-RWD-08 — Welcome and setup split.** At ≥ 1024: left half = full-height field panel
  (logo, display 64/68 headline, run-up motif; in setup, the six steps listed with the current
  one in lime: steps are a real sequence, so numbering is legitimate); right half = paper with
  the athlete chooser, "How Nourally works" or the setup question (40/44) and fields, primary
  max 400 px. The pitch budget (UX-DS-12) is ≤ 50 % at 1440 (`d001`, `d042`, `d003`–`d017`).
- **UX-RWD-09 — Desktop dialogs.** Centered, 520 px, radius 24; the scanner modal sizes to its
  content instead of a fixed tall box (`d421`); import preview rows stay one line each
  (`d247`).
- **UX-RWD-10 — Desktop buttons.** Primary buttons hug their label (min 160 px) and align left
  with their content on desktop; full width only inside phone sheets and flows (`d106`).
- **UX-RWD-11 — Desktop toasts.** Centered at the bottom of the content column, 24 px above the
  viewport edge (`d616`, `d618`).
- **UX-RWD-12 — 320 px.** Every route at 320 × 740: no horizontal scroll, no clipped control
  label, the hero primary visible without scrolling on Today (today it lands at the fold:
  `p706`), names break only at spaces or hyphens (`p710`: "Whole- / grain").

## 10. Phased build plan (U0–U10)

The order avoids building anything twice. Logic bugs come first because they do not depend on
looks and their tests protect later work. Tokens come before the frame; the frame and the tab
bar come before shared components; shared components come before any screen; screens go by
area (Today, then Schedule, whose sheets setup reuses, then Food, then Welcome, setup and You);
tablet and desktop adaptation comes after the phone screens it adapts; the final re-review
comes last. Within a phase, items are in build order.

Every item lists Change, Reason, Files, Depends on, Size, Risk, Done when, and the
recommendation IDs it closes. "ux-rules strict on X" means `tests/browser-ux-rules.js` (11.1)
runs rules R1–R5 on route X at 390 and 1440 px and fails on any violation.

### U0 — Full review (done 2026.10.15)

**U0-01 — Review every screen, modal and pop-up, desktop then phone**
- Change: Captured every route, state, sheet, dialog, menu and toast at 1440 (plus 1024 and
  768) and 390 (plus 320) with a fixed clock and mocked APIs; wrote three review notes with
  per-state findings, ranked issues and proposed layouts.
- Reason: The owner asked for a full review as the first item of the plan.
- Files (evidence): `output/ux-review/desktop/` (462 PNG), `output/ux-review/phone/` (450 PNG),
  `CAPTURES.txt`, `INDEX.txt`, `not-captured.txt`, `FAILURES.txt` (none),
  `review/today-schedule.md`, `review/food.md`, `review/setup-you-global.md`,
  `review/sheets/` (56 contact sheets).
- Depends on: none. Size: L. Risk: none (read-only).
- Done when: done 2026.10.15. 508 distinct states captured (257 desktop, 251 phone); every
  uncaptured state has a reason in `not-captured.txt`; the three notes cover Welcome, setup,
  Today, Schedule, Food (all four sections, search, barcode), You and its sheets, This device,
  About, Not found, global patterns, tablet and 320 px.

### U1 — Bugs, guards and tooling (no visual redesign)

**U1-01 — Validation that clears and explains**
- Change: Sport required in You › Sport & season; one shared field-validation hook that
  clears a field error on the first valid change, re-validates on blur and clears the form
  error when any field changes; lunch-window message on setup step 2 and the School day sheet;
  amount-above-zero message on Log edit and the portion step.
- Reason: An empty sport is saved (`p504`); errors stay after the fix (`p007`, `p012`, `p228`,
  `p229`); red fields with no message (`p009`); disabled Save with no reason (`p386`, `p404`).
- Files: `src/components/ui/FieldError.jsx`, `src/pages/You/SportSheet.jsx`,
  `src/pages/You/SportField.jsx`, `src/pages/Setup/StepForm.jsx`, `src/pages/Setup/SetupSteps.jsx`,
  `src/pages/Schedule/useActivityEditor.jsx`, `src/pages/Schedule/useSchoolEditor.jsx`,
  `src/pages/Schedule/ScheduleFields.jsx`, `src/pages/Food/LogSheets.jsx`,
  `src/pages/Food/PortionSheet.jsx`, `src/domain/` (profile validation), `tests/domain.test.js`,
  `tests/browser-setup.js`, `tests/browser-schedule.js`, `tests/browser-you.js`,
  `tests/browser-log.js`.
- Depends on: none. Size: M. Risk: Medium (shared form state in four sheets).
- Done when: (a) `#/you/sport`: clearing Sport and pressing Save keeps the sheet open, shows
  "Enter your sport.", and the stored profile sport is unchanged; (b) setup step 1: after the
  empty-Sport error, typing "Soccer" removes the error element before Next is pressed;
  (c) Schedule add sheet: start 4:00 PM, end 3:00 PM, Save → error; changing end to 5:30 PM
  removes the error without pressing Save; the same on setup step 3; (d) setup step 2 with
  lunch at 4:00 PM shows "Lunch has to be during school (8:00 AM–3:00 PM)." and both lunch
  fields reference it in `aria-describedby`; (e) Log edit with amount 0: Save is enabled and
  pressing it shows "Enter an amount above 0."; (f) a domain unit test rejects an empty sport
  on profile save.
- Closes: UX-BUG-01, UX-BUG-02, UX-BUG-03, UX-BUG-06.

**U1-02 — Safe areas on iPhone**
- Change: `viewport-fit=cover` in `index.html`; `padding-top: env(safe-area-inset-top)` on the
  top bar.
- Reason: Every safe-area inset is 0 on iOS today, which the floating bar depends on.
- Files: `index.html`, `src/styles/frame.css`, `tests/browser-shared-ui.js`.
- Depends on: none. Size: XS. Risk: Low (content may sit under the status bar if a top bar
  misses the padding; the check covers it).
- Done when: the viewport meta content contains `viewport-fit=cover`; every sticky or fixed
  top element's padding-top rule references `env(safe-area-inset-top)` (stylesheet check in
  `tests/styles.test.js`).
- Closes: UX-BUG-04, UX-NAV-07.

**U1-03 — Dead ends**
- Change: Barcode not found gets "Add it yourself" (pre-filled with the barcode); Add it
  yourself pre-fills the query and leaves the amount empty; a fully duplicate import ends with
  "Done"; week suggestions open fully selected with "Add n to list".
- Reason: `p423`, `p409`, `p250`, `p352`.
- Files: `src/components/BarcodeScanner.jsx`, `src/components/FoodSearch.jsx`,
  `src/pages/Schedule/ImportSheet.jsx`, `src/pages/Food/GrocerySheets.jsx`,
  `tests/browser-search.js`, `tests/browser-calendar-import.js`, `tests/browser-food-workflow.js`.
- Depends on: none. Size: S. Risk: Low.
- Done when: (a) a not-found barcode shows a primary "Add it yourself" whose form has the
  barcode filled; (b) searching "trail mix" with no results and choosing Add it yourself shows
  name "trail mix" and an empty amount; (c) importing the same `.ics` twice shows "Everything in
  this calendar is already in your schedule." and an enabled "Done" that closes the sheet;
  (d) the suggestions sheet opens with every checkbox checked and the primary reads "Add 8 to
  list" for the fixture week; unchecking one changes it to "Add 7 to list".
- Closes: UX-BUG-07, UX-BUG-13, UX-BUG-14, UX-BUG-18, UX-FLOW-05, UX-FLOW-06, UX-FLOW-07.

**U1-04 — Controls that tell the truth**
- Change: Disable reminder controls that depend on a disabled master switch; move initial
  sheet focus to the title; make "only this day" the primary in delete-scope confirms.
- Reason: `p524`, `p527`, `p215`.
- Files: `src/pages/You/RemindersSheet.jsx`, `src/components/Dialog.jsx`,
  `src/components/ui/ConfirmDialog.jsx`, `src/pages/Schedule/ScheduleRow.jsx`,
  `tests/browser-you.js`, `tests/browser-dialogs.js`, `tests/browser-schedule.js`.
- Depends on: none. Size: S. Risk: Low.
- Done when: (a) with notifications denied, "How long before" and the evening reminder are
  `disabled`; (b) after opening any sheet by mouse, `document.activeElement` is the sheet title
  and no focus ring is visible on the X (`:focus-visible` false); (c) in the delete-scope
  confirm, the "only" button has the filled destructive style and "all" the text style.
- Closes: UX-BUG-15, UX-BUG-16, UX-BUG-17.

**U1-05 — Data correctness and the undo ledger**
- Change: Reproduce and fix the "1 g" log entry if real; treat counted At home items at 0 as
  Out everywhere; prune `operations` ledger entries older than 30 days on load.
- Reason: `p405`; `p332`; KEEP-15 is open in REDESIGN-CHECKLIST.md.
- Files: `src/pages/Food/PortionSheet.jsx`, `src/domain/food.js`, `src/domain/` (storage and
  ledger), `tests/log.test.js`, `tests/domain.test.js`.
- Depends on: none. Size: S. Risk: Medium (stored data).
- Done when: (a) a unit test logs the 28 g usual portion of the fixture banana chips and reads
  back 28 g (or the checklist records that `p405` was a capture artifact, with the reason);
  (b) a unit test shows a counted item at 0 has status Out and is counted once in "low or out";
  (c) a unit test seeds ledger entries at 29 and 31 days old and only the 29-day entry remains
  after load.
- Closes: UX-BUG-19, UX-BUG-20; REDESIGN-CHECKLIST KEEP-15.

**U1-06 — Capture harness, seed names and the rules check**
- Change: Move the capture harness from `output/ux-review/*.mjs` to `scripts/ux-review/` (PNGs
  stay in git-ignored `output/`) with `npm run ux:capture -- <phone|desktop|both> [area]`;
  rename test athletes to realistic names; add `tests/browser-ux-rules.js` (11.1) in report
  mode (prints counts, never fails) to record the baseline.
- Reason: U10 needs a reproducible capture; COPY-38 is open; later phases need a measurable
  baseline.
- Files: `scripts/ux-review/` (from `output/ux-review/run.mjs`, `lib.mjs`, `seeds.mjs`,
  `clean.mjs`, `make-index.mjs`, `areas/*.mjs`), `package.json`, `tests/browser-*.js`,
  `tests/fixtures/import-profile.json`, `tests/browser-ux-rules.js`.
- Depends on: none. Size: M. Risk: Low.
- Done when: `npm run ux:capture -- phone today` writes Today PNGs and a `CAPTURES.txt` under
  `output/ux-review/`; `git grep -n -e "Schedule test" -e "Log test" -e "You test" -e
  "Imported fixture" -- tests src` returns nothing; `npm run test:browser -- ux-rules` prints a
  per-route count for rules R1–R13 and passes.
- Closes: UX-TEST-01, UX-TEST-02, UX-TEST-03 (report mode); REDESIGN-CHECKLIST COPY-38.

### U2 — Tokens and copy foundation

**U2-01 — Token plan**
- Change: Add the section 4.4 tokens (glass, radius ladder, elevation, sizes, type) and the
  desktop overrides; switch base elements (h1–h3, body, small, caption, label) to the 5.1 scale;
  raise `--control-height` to 52 px.
- Reason: Every later item uses these; colors stay exactly as they are.
- Files: `src/styles/tokens.css`, `src/styles/base.css`, `tests/styles.test.js`,
  `tests/browser-visual.js` (its 48 px input check becomes 52 px).
- Depends on: U1. Size: S. Risk: Low (controls grow 4 px; no-shift and responsive checks
  re-run).
- Done when: a unit test pins all 42 `--color-*` values in `tokens.css` to their 2026.10.15
  hex; every token named in 4.4 exists; `tests/styles.test.js` RWD-01 still passes; inputs
  measure 52 px in `browser-visual.js`.
- Closes: UX-DS-01, UX-DS-03, UX-DS-06, UX-DS-08, UX-DS-09.

**U2-02 — Formatters write sentences**
- Change: `format.js` stops joining parts with " · " and returns short sentences; time and
  AM/PM joined by U+00A0; ranges with an unspaced en dash; week summaries omit negatives;
  headlines and toasts with spaced dashes rewritten; `.badge` loses `text-transform: uppercase`
  and capitalised strings are rewritten in sentence case.
- Reason: Dot-meta and caps are template tells (SKILL tell 5) and cause the 320 px orphan dot
  (`p707`) and the mid-time wrap (`p115`).
- Files: `src/format.js`, every caller found by `git grep -n "·" src`, `src/styles/components.css`
  (`.badge`), `src/domain/timing.js` (headline copy), `tests/domain.test.js`,
  `tests/browser-shared-ui.js`.
- Depends on: U2-01. Size: M. Risk: Medium (many strings; tests that match old text change).
- Done when: the route text scan in `browser-shared-ui.js` at 320 and 1280 px on Welcome and
  every route finds no " · ", no " — " or " – " between words, no element with computed
  `text-transform: uppercase`, and no all-capital word longer than 3 letters outside the
  allowlist (USDA); a unit test shows `formatTime` output contains U+00A0 and `formatRange`
  returns "Oct 12–18".
- Closes: UX-COPY-01, UX-COPY-02, UX-COPY-03, UX-COPY-04, UX-COPY-06, UX-BUG-08, UX-BUG-09.

### U3 — App frame and the floating tab bar

**U3-01 — Phone floating tab bar**
- Change: Rebuild `.frame-nav` below 768 px as the 5.2 capsule: geometry, glass and
  fallbacks, ink inactive items, sliding pitch pill with lime icon, content clearance, hidden
  while the keyboard is up, stable on scroll.
- Reason: Owner brief; the docked slab and 6 px dot (`p608`–`p611`); the clipped footer
  (`p501`).
- Files: `src/components/AppFrame.jsx`, `src/styles/frame.css`, `src/styles/base.css`
  (forced colors), `src/styles/tokens.css`, `tests/browser-ux-nav.js` (new),
  `tests/browser-a11y.js`, `tests/browser-visual.js`, `tests/browser-no-shift.js`.
- Depends on: U1-02, U2-01. Size: M. Risk: Medium (every page's bottom spacing).
- Done when, at 390 × 844 and 320 × 740 on every route (`browser-ux-nav.js`):
  (a) the nav's rect has left ≥ 12, `innerWidth − right` ≥ 12, `innerHeight − bottom` ≥ 12,
  height 64, computed `border-radius` 24px, width ≤ 440;
  (b) computed `backdrop-filter` (or `-webkit-backdrop-filter`) contains `blur(20px)` and the
  background alpha is 0.82;
  (c) with `prefers-reduced-transparency: reduce` (CDP `Emulation.setEmulatedMedia`) and with
  `prefers-contrast: more`, the background alpha is 1 and `backdrop-filter` is `none`;
  (d) the active item has `aria-current="page"`, a pitch pill behind it and a lime icon; every
  inactive label's contrast against the bar background composited over `--color-pitch` and over
  `--color-paper` is ≥ 4.5:1 (computed in the test); axe has no serious or critical issues;
  (e) scrolled to the end, the last element in `main` ends ≥ 8 px above the nav's top;
  (f) focusing a text input with a simulated keyboard (viewport height set to 50 %) hides the
  nav; (g) scrolling down 600 px leaves the nav rect unchanged.
- Closes: UX-NAV-01, UX-NAV-02, UX-NAV-03, UX-NAV-04, UX-NAV-05, UX-NAV-08, UX-DS-02 (tab bar
  part), UX-BUG-11.

**U3-02 — Tablet capsule and desktop rail**
- Change: 768–1023 px: floating centered top capsule with the same material. 1024 px+: rail
  without border or shadow, pitch pill active, 88 px icon rail at 1024–1199, 232 px at 1200+,
  athlete switcher as a row.
- Reason: One nav language at every size (`d641`–`d646`, `d608`).
- Files: `src/components/AppFrame.jsx`, `src/styles/frame.css`, `tests/browser-ux-nav.js`,
  `tests/browser-visual.js` (centered tablet tab group, one rail edge).
- Depends on: U3-01. Size: S. Risk: Low.
- Done when: at 768 the nav is centered (|left gap − right gap| ≤ 1 px), 52 px tall, radius 18,
  glass as U3-01(b); at 1024 the rail is 88 px wide and at 1280 232 px; the rail and its items
  have `box-shadow: none` and no border; the active rail item has the pitch pill.
- Closes: UX-NAV-09, UX-NAV-10.

**U3-03 — Page headers and the footer**
- Change: Large titles in the content that collapse into a 52 px glass top bar after 40 px of
  scroll; Today's header is the date and Schedule's the month; back chevrons on sub-pages; one
  avatar per screen; `theme-color` follows the field panel; the device footer only on This
  device and About.
- Reason: Hidden h1 and 20 px bar titles (`p618`, `p536`); the double avatar on You (`p501`);
  the footer on every page.
- Files: `src/components/AppFrame.jsx`, `src/pages/*/…Page.jsx` (title props), `index.html`,
  `src/styles/frame.css`, `tests/browser-ux-nav.js`, `tests/browser-shared-ui.js`.
- Depends on: U3-01. Size: M. Risk: Medium (heading structure; route announcer).
- Done when: on every route at 390 the h1 is visible at scroll 0 with computed font-size 34px
  (Today's h1 text matches the formatted date); after scrolling 120 px a top bar with the title
  is visible and has `backdrop-filter`; exactly one element with the athlete avatar is visible
  per screen; the text "Saved on this device. Food search uses online food databases." appears
  only on `#/you/device` and `#/you/about`.
- Closes: UX-NAV-11, UX-NAV-12, UX-NAV-13, UX-MISC-01, UX-SCH-18.

**U3-04 — Toasts, the floating action slot and the offline line**
- Change: A frame-level floating action slot 8 px above the tab bar (used later by Log food
  and Finish shopping); toast restyle and placement (8 px above the tab bar or floating bar; centered in the
  content column on desktop; no X when Undo is shown); offline line in the frame.
- Reason: Toasts cover actions (`p126`, `p152`, `p360`, `p531`); desktop toasts hug the rail
  (`d616`); STATE-03 is open.
- Files: `src/components/ui/Toast.jsx`, `src/components/AppFrame.jsx`,
  `src/styles/components.css`, `tests/browser-shared-ui.js`, `tests/browser-reliability.js`.
- Depends on: U3-01. Size: S. Risk: Low.
- Done when: at 390 a toast's bottom is 8 ± 1 px above the nav's top (or above a floating
  action bar when one is shown, which itself sits 8 ± 1 px above the nav) and it does not intersect
  any visible button; a toast with Undo has no dismiss button; at 1440 the toast's center x is
  within 2 px of `main`'s center x; with `context.setOffline(true)` every route shows "You're
  offline. Saved foods and your plan still work." and it disappears after going back online.
- Closes: UX-CMP-13, UX-CMP-16, UX-NAV-06, UX-BUG-10, UX-RWD-11, UX-DS-02 (toast part);
  REDESIGN-CHECKLIST STATE-03.

### U4 — Shared components

**U4-01 — Buttons**
- Change: Primary, hero primary, secondary, text and destructive kinds (5.4) in `Button.jsx`;
  every outlined button becomes secondary or text; hug width on desktop.
- Reason: Five button looks and three widths (`p536`, `SY G5`).
- Files: `src/components/ui/Button.jsx`, `src/styles/components.css`, callers,
  `tests/browser-visual.js`.
- Depends on: U2-01. Size: M. Risk: Medium (every screen).
- Done when: no element inside `main` or a dialog has a 1 px border and a transparent or white
  background while also being a `<button>` (no outlined buttons, R13); `Button` renders
  `data-kind` = primary | hero | secondary | text | destructive; at 1440 primary buttons outside
  dialogs are not full column width.
- Closes: UX-CMP-01, UX-RWD-10.

**U4-02 — Row and Section**
- Change: Add `Row` and `Section` (5.3) to `src/components/ui/`.
- Reason: The flat replacement for cards; one row grammar for every list.
- Files: `src/components/ui/Row.jsx`, `src/components/ui/Section.jsx`,
  `src/styles/components.css`, `tests/browser-visual.js`.
- Depends on: U2-01. Size: S. Risk: Low (new components, not yet used).
- Done when: a fixture page (`?ui=rows`, dev only) renders each Row variant and the visual
  check confirms 56 px min height, inset hairline, no background, border or shadow, and a
  44 px trailing target.
- Closes: UX-CMP-02, UX-CMP-03.

**U4-03 — Fields, time and date**
- Change: 52 px fields with focus and invalid borders (5.5); prefix and suffix; `TimeField`
  on the existing `Combobox`; `DateField` with `MonthGrid`; hint length rule.
- Reason: Native "04:00 PM" and "10/13/2026" (`p144`, `p226`); teal ring on red fields (`p004`).
- Files: `src/components/ui/FieldError.jsx`, `src/components/ui/Combobox.jsx`,
  `src/components/ui/TimeField.jsx`, `src/components/ui/DateField.jsx`,
  `src/pages/Schedule/MonthGrid.jsx`, `src/styles/components.css`,
  `tests/browser-combobox.js`, `tests/browser-schedule.js`.
- Depends on: U4-01. Size: M. Risk: Medium (time entry is core; keyboard and screen reader
  paths must keep working).
- Done when: no `input[type=time]` or `input[type=date]` remains in `src/`; a TimeField shows
  "4:00 PM" and accepts typed "4:10p" as 4:10 PM; keyboard (ArrowDown, Enter, Escape) works as
  in `browser-combobox.js`; an invalid focused field has a 2 px error-colored border; every
  element marked `data-hint` has at most 14 words and computed font-size 14px.
- Closes: UX-CMP-04, UX-CMP-09, UX-COPY-05.

**U4-04 — Selection controls**
- Change: Checklist rows, pitch-fill segmented control, weekday bar, right-aligned switch rows
  with dependent disabling, quick-amount bar, tiles (5.6).
- Reason: The owner's "small circular cards" (`p008`, `p013`, `p015`, `p229`); low-contrast
  selected segments (`p007`).
- Files: `src/components/ui/SelectionControls.jsx`, `src/components/ui/Tiles.jsx`,
  `src/styles/components.css`, `tests/browser-visual.js` (its "round weekday circles" check is
  replaced by a joined-bar check), `tests/browser-a11y.js`.
- Depends on: U4-01. Size: M. Risk: Medium.
- Done when: the weekday bar's seven segments share one row with 0 px gaps and no child check
  badge; a selected segment has background `--color-pitch` and white text (contrast ≥ 4.5:1);
  switches sit at the right edge of their row (switch right edge within 1 px of the row's
  content edge); each control passes axe and keyboard checks.
- Closes: UX-CMP-05, UX-CMP-06, UX-CMP-07, UX-CMP-08, UX-CMP-21, UX-CMP-22.

**U4-05 — Sheets, alerts and menus**
- Change: Sheet chrome (5.7), alerts for every confirm, phone action sheets for row menus,
  pushed pickers inside sheets, desktop dialog sizing, the changed-elsewhere line.
- Reason: Three rules and three exits per sheet (`p502`); sheet on sheet (`p619`); menus over
  their row (`p210`); combobox over the sheet title (`p503`); STATE-15 is open.
- Files: `src/components/Dialog.jsx`, `src/components/ui/ConfirmDialog.jsx`,
  `src/components/ui/Menu.jsx`, `src/components/ui/Combobox.jsx`, `src/styles/components.css`,
  `tests/browser-dialogs.js`, `tests/browser-no-shift.js`, `tests/browser-visual.js` (its
  "64 px sheet headers" and "equal footer buttons" checks change to the new chrome),
  `tests/browser-persistence.js`.
- Depends on: U4-01, U4-03. Size: L. Risk: High (every sheet; focus management; the no-shift
  guarantees from `2654d5f`).
- Done when: at 390 a sheet has a grabber, no element with a top or bottom border in its
  header or footer, top corner radius 28px, and an X only when it is full height; every
  `ConfirmDialog` renders centered with max-width 320 px and never stacks over an open sheet's
  surface (the sheet is `inert` underneath); a row menu at 390 opens as a bottom action sheet;
  the Sport picker in You opens inside the sheet at 390 and as a popover at 1280; editing an
  item in a second tab while its sheet is open shows "This item changed on another screen.
  Showing the latest version."; `browser-no-shift.js` still passes.
- Closes: UX-CMP-10, UX-CMP-11, UX-CMP-12, UX-CMP-18, UX-CMP-20, UX-RWD-09;
  REDESIGN-CHECKLIST STATE-15.

**U4-06 — Empty, loading, status and disclosure**
- Change: Left-aligned empty state, 300 ms skeleton with `aria-busy`, inline status line,
  chevron disclosure.
- Reason: Dashed boxes with no primary (`p317`, `p331`, `p351`); tinted prompt cards
  (`p171`); outlined Show list (`p127`); STATE-07 is open.
- Files: `src/components/ui/EmptyState.jsx`, `src/components/ui/Skeleton.jsx`,
  `src/components/ui/StatusLine.jsx`, `src/styles/components.css`,
  `tests/browser-shared-ui.js`, `tests/browser-disclosures.js`.
- Depends on: U4-01. Size: S. Risk: Low.
- Done when: no element with a dashed border exists in the app CSS (stylesheet check); a
  skeleton forced by a delayed fetch stays ≥ 300 ms and its region has `aria-busy="true"`
  during it; `StatusLine` renders icon, one sentence, one text action and a dismiss button;
  `browser-disclosures.js` passes with the new toggles.
- Closes: UX-CMP-14, UX-CMP-15, UX-CMP-17, UX-CMP-19; REDESIGN-CHECKLIST STATE-07.

**U4-07 — Icons, avatars, tints and motion**
- Change: Leading row icons, solid avatars, left-bar status tints, the motion list.
- Reason: Pale avatars (`p042`); the blue info box (`p171`); scattered motion is a tell.
- Files: `src/components/ui/Avatar.jsx`, `src/styles/components.css`, `src/styles/base.css`,
  `tests/browser-a11y.js`, `tests/styles.test.js`.
- Depends on: U4-02. Size: S. Risk: Low.
- Done when: avatar letter contrast ≥ 4.5:1 for every session color; no CSS rule uses
  `--color-info-tint` as a background; a stylesheet check lists every `transition` and
  `animation` and each belongs to the 5.1 motion list; under reduced motion all durations
  compute to 0.01 ms or less.
- Closes: UX-DS-13, UX-DS-14, UX-DS-15.

### U5 — Today

**U5-01 — The hero and the run-up line**
- Change: Hero anatomy (UX-TODAY-02), the run-up line, every state in the UX-TODAY-05 table,
  plan steps in the hero, no date chips.
- Reason: Two headlines, chip soup, underlined links (`p106`, `TS T2`); the owner's "School 8-3"
  example (`p102`).
- Files: `src/pages/Today/NowCard.jsx`, `src/pages/Today/TodayPage.jsx`,
  `src/pages/Today/RunUpLine.jsx` (new), `src/domain/timing.js` (headline copy only),
  `src/styles/today.css`, `tests/browser-today.js`, `tests/browser-journey.js`.
- Depends on: U4. Size: L. Risk: High (the core screen; many states).
- Done when: for each Today state capture (101–116) at 390: exactly one `[data-surface=hero]`
  (none for late, rest, no sport and weekend); the hero has one heading element; no element
  under the date has a pill shape (R2); the run-up line exists exactly when a session starts
  within 6 hours and its tick order matches now < eat-by < start; the hero primary label is
  "Plan this", then "Mark packed", then "Log it" through the journey; the hero primary is fully
  visible without scrolling at 320 × 740; ux-rules strict on `#/today`.
- Closes: UX-TODAY-02, UX-TODAY-03, UX-TODAY-04, UX-TODAY-05, UX-TODAY-06, UX-FLOW-02,
  UX-DS-11 (Today), UX-DS-12 (Today).

**U5-02 — Sections on paper**
- Change: Pack & prep, Your day, Water and the prompt slot as sections and rows; Pack & prep
  merged tasks, empty state and collapse; thin now rule; Water row without a meter.
- Reason: Card #2–#5 (`p106`, `p126`, `p151`, `p171`); STATE-11 is open.
- Files: `src/pages/Today/PackPrep.jsx`, `src/pages/Today/Checklist.jsx`,
  `src/pages/Today/DayRail.jsx`, `src/pages/Today/WaterRow.jsx`,
  `src/pages/Today/ContextPrompt.jsx`, `src/pages/Today/LastWeekCard.jsx`, `src/domain/plans.js`
  (one bag task), `src/styles/today.css`, `tests/browser-today.js`, `tests/domain.test.js`,
  `tests/browser-disclosures.js`.
- Depends on: U5-01. Size: M. Risk: Medium.
- Done when: on `#/today` at 390 and 1440, ux-rules R1 finds 0 shadowed elements outside the
  hero; no "Edit schedule" button exists; a plan creates one "Pack … in your school bag" task,
  not two (unit test); no task row has a remove icon button (remove lives in the row menu);
  with no plan, Pack & prep shows "Nothing to pack yet. Plan a snack to get a list." and "See
  ideas"; the now marker's height is ≤ 24 px; the Water section has no `meter`, `progress` or
  element whose width scales with the total.
- Closes: UX-TODAY-01, UX-TODAY-07, UX-TODAY-08, UX-TODAY-10, UX-TODAY-11, UX-FLOW-10,
  UX-DS-17; REDESIGN-CHECKLIST STATE-11.

**U5-03 — Evening hero**
- Change: The evening hero holds tomorrow's checklist; the Tonight card goes.
- Reason: The hero and its list are a screen apart (`p161`, `p162`).
- Files: `src/pages/Today/TonightCard.jsx` (folded into `NowCard.jsx`), `src/pages/Today/TodayPage.jsx`,
  `src/styles/today.css`, `tests/browser-today.js`, `tests/browser-evening-share.js`.
- Depends on: U5-02. Size: M. Risk: Medium.
- Done when: in the evening state the checklist rows are descendants of the hero; "By 7:30 AM"
  appears once on the page; the hero primary is "Choose tomorrow's snack"; Copy list still
  shares the same text as before (`browser-evening-share.js`).
- Closes: UX-TODAY-09, UX-FLOW-03.

**U5-04 — Today sheets and prompts**
- Change: Plan details with actions; Why this? lead and sources disclosure; moved-session
  prompt naming the new time; school-day prompt; activity and school sheets reached from
  Today.
- Reason: Dead end (`p132`, `p142`); STATE-04 and STATE-16 are open.
- Files: `src/pages/Today/NowCard.jsx`, `src/pages/Today/TodayPage.jsx`, `src/domain/plans.js`,
  `tests/browser-today.js`, `tests/browser-why.js`, `tests/domain.test.js`.
- Depends on: U5-01, U4-05. Size: M. Risk: Medium.
- Done when: the plan details sheet has a primary matching the plan's next step and "Change
  food", "Remove plan" (with Undo) and, when items are missing, "Add missing to groceries";
  moving a planned practice from 4:00 to 4:30 shows "Move your snack to about 3:00?" with Move
  and Keep, and Move updates the plan time (unit test for the new time); with sessions and no
  school day, the status line "Add your school day to plan lunch and after-school snacks."
  shows; Why this? shows its sources only after opening the disclosure.
- Closes: UX-TODAY-12, UX-TODAY-13, UX-TODAY-14, UX-TODAY-15, UX-FLOW-01, UX-BUG-05;
  REDESIGN-CHECKLIST STATE-16 (STATE-04 closes with U7-02).

### U6 — Schedule

**U6-01 — Week, header and settings at the end**
- Change: Month large title, add icon, full-width segmented, one nav row, week strip, day
  headers and rows, school once, today marker, rest-day rows, empty week, "Your week" rows at
  the end.
- Reason: Settings first, seven day cards, school repeated (`p204`, `p707`).
- Files: `src/pages/Schedule/SchedulePage.jsx`, `ScheduleWeek.jsx`, `ScheduleRow.jsx`,
  `WeekSettings.jsx`, `src/styles/schedule.css`, `tests/browser-schedule.js`,
  `tests/browser-visual.js` (week switcher, day headers, top-bar add checks).
- Depends on: U4. Size: M. Risk: Medium.
- Done when: at 390 × 844 the first event row's top is ≤ 320 px; school appears as a row only
  in "Your week" (no school row inside any day); no element has the text "TODAY"; the nav row
  has the same DOM structure in Week and Month; the empty week shows one primary "Add practice";
  ux-rules strict on `#/schedule`.
- Closes: UX-SCH-01, UX-SCH-02, UX-SCH-03, UX-SCH-04, UX-SCH-05, UX-SCH-06, UX-SCH-07,
  UX-SCH-08, UX-FLOW-04.

**U6-02 — Month and skipped days**
- Change: Full-bleed month grid, pitch selected and lime-ring today, selected-day rows, skipped
  row with Restore.
- Reason: `p206`, `p207`, `p217`.
- Files: `src/pages/Schedule/MonthGrid.jsx`, `src/styles/schedule.css`, `tests/browser-schedule.js`.
- Depends on: U6-01. Size: S. Risk: Low.
- Done when: the selected day's numeral sits on a pitch circle and today's has a lime ring;
  the grid has no shadowed or bordered container; a skipped session shows "Skipped" and a
  "Restore" text button that restores it.
- Closes: UX-SCH-09, UX-SCH-10.

**U6-03 — Menus, scope and the activity, school and rest sheets**
- Change: Action-sheet row menus, scope alerts, the focused activity sheet, two-group school
  sheet, weekday bar in rest days.
- Reason: `p210`, `p215`, `p226`–`p230`, `p236`, `p238`.
- Files: `src/pages/Schedule/ActivitySheet.jsx`, `useActivityEditor.jsx`, `ScheduleFields.jsx`,
  `SchoolDayEditor.jsx`, `useSchoolEditor.jsx`, `src/styles/schedule.css`,
  `tests/browser-schedule.js`, `tests/browser-dialogs.js`.
- Depends on: U6-01, U4-03, U4-04, U4-05. Size: M. Risk: Medium.
- Done when: adding a weekly practice from Schedule takes ≤ 5 taps plus time entry (the audit
  criterion still holds); start and end TimeFields share one row at 320 px; the scope banner is
  the sheet subtitle (no info-tinted element); the school sheet shows Hours first and the
  school-year group collapsed when set.
- Closes: UX-SCH-11, UX-SCH-12, UX-SCH-13, UX-SCH-14, UX-SCH-15.

**U6-04 — Import and team calendar**
- Change: One row per imported event with an inferred-type sentence; one-sentence status;
  subscribed calendar as one row.
- Reason: 40 dropdowns for 20 events (`p247`); two actions on one row (`p254`).
- Files: `src/pages/Schedule/ImportSheet.jsx`, `calendarSync.js`, `WeekSettings.jsx`,
  `tests/browser-calendar-import.js`.
- Depends on: U6-03. Size: M. Risk: Medium.
- Done when: the TeamSnap fixture preview has 0 `select` elements and 20 rows each with a
  type-and-place sentence; tapping a row opens a sheet with Type and Where; the subscribed
  calendar shows one row with no button and no "…".
- Closes: UX-SCH-16, UX-SCH-17.

### U7 — Food

**U7-01 — Food frame**
- Change: Underline section tabs, text toggles for second-level choices, fade-mask scrolling
  rows, the chrome budget, the label caption.
- Reason: Four look-alike trays; clipped "To…" (`p301`, `p709`).
- Files: `src/components/FoodWorkspace.jsx`, `src/styles/food.css`, `tests/browser-responsive.js`,
  `tests/browser-food-workflow.js`.
- Depends on: U4. Size: M. Risk: Medium (the 120 px content-start checks from P0-02 change and
  are updated to the new budget).
- Done when: at 390 × 844 the first item in each Food section starts at y ≤ 260 and at the
  same y (± 2 px) in all four; no Food control row has a filled tray background; at 320 every
  tab and moment label is fully visible after scrolling its row, and the clipped edge has a
  mask; the label caption appears once per Food view.
- Closes: UX-FOOD-01, UX-FOOD-02, UX-FOOD-03, UX-FOOD-04, UX-BUG-12.

**U7-02 — Ideas**
- Change: Idea rows, one hero without duplicates, details sheet, low-cost switch, empty states,
  shared `IdeaRow` and `Availability`, moved-session prompt on the Ideas hero.
- Reason: Six primaries and the card grid (`p301`); the duplicate planned idea (`p322`);
  CMP-10 and STATE-04 are open.
- Files: `src/pages/Food/IdeasPage.jsx`, `src/components/ui/IdeaRow.jsx`,
  `src/components/ui/Availability.jsx`, `src/pages/Today/NowCard.jsx`, `src/styles/food.css`,
  `tests/browser-food-workflow.js`, `tests/browser-today.js`.
- Depends on: U7-01, U5-04. Size: L. Risk: Medium.
- Done when: `#/food/ideas` at 390 has ≤ 1 primary-kind button and 0 card containers; a planned
  idea's name appears once on the page; Today and Ideas import the same `IdeaRow` and
  `Availability`; the low-cost control is a switch; the no-access empty state offers "See
  tomorrow's ideas" and "Log what you ate"; the moved-session prompt shows on the Ideas hero;
  ux-rules strict on `#/food/ideas`.
- Closes: UX-IDEA-01 to UX-IDEA-09, UX-BUG-21, UX-FLOW-12, UX-DS-11 (Ideas);
  REDESIGN-CHECKLIST CMP-10, STATE-04.

**U7-03 — At home**
- Change: One trailing status control per row, search field as add entry, low or out row,
  text filters, Move to… step, starter tiles, Counts as? tiles, merge primary.
- Reason: About 30 tap targets per screen (`p332`); icon-only status at 320 (`p710`).
- Files: `src/pages/Food/HomePage.jsx`, `src/pages/Food/FoodDetailsSheet.jsx`,
  `src/components/ui/QuickAddList.jsx`, `src/styles/food.css`, `tests/browser-food-workflow.js`.
- Depends on: U7-01, U4-04. Size: M. Risk: Medium.
- Done when: each stock row has exactly one interactive element besides its name; the status
  is a word at 320 and 1440; the empty state shows six tiles and adding one creates the item
  with an Undo toast; Counts as? has no `select`; ux-rules strict on `#/food/home`.
- Closes: UX-HOME-01 to UX-HOME-09.

**U7-04 — Groceries**
- Change: Week hero, reason groups, In cart group, floating finish bar with the total, inline
  add row, put-away without selects, action-sheet row menu, undo-trip alert.
- Reason: `p351`, `p354`, `p361`, `p364`.
- Files: `src/pages/Food/GroceriesPage.jsx`, `src/pages/Food/GrocerySheets.jsx`,
  `src/styles/food.css`, `tests/browser-food-workflow.js`, `tests/browser-units-week.js`.
- Depends on: U7-01, U3-04. Size: M. Risk: Medium.
- Done when: an empty list shows the hero with "Add n to my list"; no row contains a reason
  chip; checking a row moves it into "In cart (n)"; the finish bar sits 8 px above the tab bar
  and shows the total when estimates are on; the put-away sheet has 0 `select` elements; ux-rules
  strict on `#/food/groceries`.
- Closes: UX-GROC-01 to UX-GROC-08, UX-FLOW-08.

**U7-05 — Log**
- Change: One control row, floating Log food, did-you-eat hero, timeline rows, week list
  sentences, no phone table, from-home in one sheet.
- Reason: Four control rows (`p381`); cramped phone table (`p390`); one prompt per item
  (`p388`).
- Files: `src/pages/Food/LogPage.jsx`, `LogDay.jsx`, `LogWeek.jsx`, `LogSheets.jsx`,
  `src/styles/food.css`, `tests/browser-log.js`.
- Depends on: U7-01, U3-04. Size: M. Risk: Medium.
- Done when: at 390 exactly one control row sits above the first entry; no `table` renders
  below 768 px; logging a planned meal that used three home items shows one sheet with three
  checks and one "Update At home"; no week row contains "No water logged"; ux-rules strict on
  `#/food/log` and `#/food/log/week`.
- Closes: UX-LOG-01 to UX-LOG-08, UX-FLOW-11, UX-DS-11 (Log).

**U7-06 — Search, portion and barcode**
- Change: Quiet result rows, readable names, portion tiles, specific errors, scanner with one
  primary, quick add tiles, label placement.
- Reason: `p402`, `p403`, `p407`, `p421`, `p341`.
- Files: `src/components/FoodSearch.jsx`, `src/components/BarcodeScanner.jsx`,
  `src/pages/Food/PortionSheet.jsx`, `src/components/ui/LabelCheck.jsx`, `src/styles/search.css`,
  `tests/browser-search.js`, `tests/browser-allergens.js`.
- Depends on: U7-01, U4-04. Size: M. Risk: Medium (safety lines must stay).
- Done when: result rows have no bordered "Add" button; every product view (search, results,
  portion, barcode found, details, Ideas, At home details, Counts as?) shows "Allergies: check
  every label." exactly once and every brand-name row keeps its allergen line
  (`browser-allergens.js`); names render in sentence case with the brand on line 2; the
  scanner without a camera has one primary ("Look up"); no Quick add label is clipped at 320.
- Closes: UX-SRCH-01 to UX-SRCH-08, UX-DS-16.

### U8 — Welcome, setup, You, This device, About

**U8-01 — Welcome and athletes**
- Change: Field panel first screen, chooser first for returning athletes, athlete rows,
  rename, add and remove sheets and alert.
- Reason: Dead zone, no brand moment, tile stack (`p001`, `p042`).
- Files: `src/pages/Welcome/WelcomePage.jsx`, `src/components/Profiles.jsx`,
  `src/styles/welcome.css`, `tests/browser-athletes.js`, `tests/browser-setup.js`.
- Depends on: U4. Size: M. Risk: Low.
- Done when: first visit at 390 has one `[data-surface=hero]` covering ≤ 60 % of the viewport
  and one primary on paper; with athletes, the h1 is "Who's using Nourally?" and athletes are
  rows with no border or shadow; Remove requires typing DELETE in an alert.
- Closes: UX-WEL-01, UX-WEL-02, UX-WEL-03, UX-WEL-04, UX-DS-12 (Welcome).

**U8-02 — Setup**
- Change: One way forward and out, dash progress, the step layouts in 6.2, done screen.
- Reason: Four exits (`p008`); chips and badges (`p008`, `p013`, `p015`); flat done screen
  (`p017`).
- Files: `src/pages/Setup/SetupFlow.jsx`, `SetupSteps.jsx`, `StepForm.jsx`,
  `src/pages/You/FoodNeedsFields.jsx`, `src/styles/welcome.css`, `tests/browser-setup.js`,
  `tests/setup.test.js`.
- Depends on: U8-01, U6-03 (shared time and weekday controls). Size: L. Risk: Medium.
- Done when: every step shows at most one primary and at most one text exit; step 1 shows
  "Set up later" and no back; steps 2–5 show "Skip for now"; no pill chips render on any step
  (R2); no allergy, Gluten-free, Nut-free or Dairy-free control renders while
  `ALLERGY_TAGS_REVIEWED` is false (`browser-allergens.js`); the done screen has no Back and its
  primary is "Open Today"; a new athlete still completes setup and sees a Today hero naming the
  practice and a time (audit criterion).
- Closes: UX-SET-01 to UX-SET-07, UX-FLOW-09, UX-DS-12 (setup).

**U8-03 — You and its sheets**
- Change: Profile as type, row groups with values right, honest row name, Sport sheet,
  shared Food needs fields, access sheet, reminders sheet with the phone limit first and the
  lost-permission question, discard alert, athlete switcher.
- Reason: Card above card group (`p501`); STATE-05 is open.
- Files: `src/pages/You/YouPage.jsx`, `SportSheet.jsx`, `FoodNeedsSheet.jsx`, `AccessSheet.jsx`,
  `RemindersSheet.jsx`, `SettingsSheet.jsx`, `src/components/AppFrame.jsx` (switcher),
  `src/styles/you.css`, `tests/browser-you.js`, `tests/browser-athletes.js`.
- Depends on: U8-02. Size: M. Risk: Medium.
- Done when: `#/you` has 0 card containers and one avatar; every row value is a single line;
  the row reads "Food needs" while `ALLERGY_TAGS_REVIEWED` is false; on a phone user agent the
  reminders sheet's first line states the open-app limit; revoking permission shows the
  "Turn reminders on again?" question before reminders switch off; ux-rules strict on `#/you`.
- Closes: UX-YOU-01 to UX-YOU-09; REDESIGN-CHECKLIST STATE-05.

**U8-04 — This device and recovery**
- Change: Action rows, athlete rows with menus, delete alert, restore result toast, recovery
  rows with "Show details".
- Reason: Button soup (`p536`); raw validator text (`p636`); STATE-08 is open.
- Files: `src/pages/You/DevicePage.jsx`, `src/components/Profiles.jsx`, `src/main.jsx`
  (recovery view), `src/styles/you.css`, `tests/browser-persistence.js`, `tests/browser-athletes.js`.
- Depends on: U8-03. Size: M. Risk: Medium (backup and restore).
- Done when: `#/you/device` has no outlined or full-width buttons other than inside dialogs;
  restoring the fixture shows "Added 1 athlete: Maya (from backup)." with "Switch now"; the
  recovery screen hides validator text until "Show details" is opened; backup, restore and
  delete still pass `browser-persistence.js`.
- Closes: UX-DEV-01 to UX-DEV-06; REDESIGN-CHECKLIST STATE-08.

**U8-05 — About and Not found**
- Change: Large title and 64ch on About; centered Not found with one primary.
- Reason: `p546`, `p547`.
- Files: `src/pages/You/AboutPage.jsx`, `src/main.jsx` (not found), `src/styles/you.css`,
  `tests/browser-shared-ui.js`.
- Depends on: U3-03. Size: XS. Risk: Low.
- Done when: About's paragraphs measure ≤ 64ch at 1440; Not found shows one h1, one sentence
  and one full-width primary "Go to Today" at 390, with no footer.
- Closes: UX-MISC-02, UX-MISC-03.

**U8-06 — Retire the old kit**
- Change: Delete `.card`, `.card-list`, `.badge`, `.reason-chip`, `.idea-chip`, `.tab-badge`,
  chip-group pills, `ChipGroup`, `--shadow-1`, `--shadow-2`, `--rhythm-card`, `--card-padding`,
  `--text-badge`; turn ux-rules strict on every route.
- Reason: Nothing should be able to bring cards back.
- Files: `src/styles/*.css`, `src/styles/tokens.css`, `src/components/ui/SelectionControls.jsx`,
  `tests/css-usage.test.js`, `tests/styles.test.js`, `tests/browser-ux-rules.js`.
- Depends on: U5–U8-05. Size: S. Risk: Low.
- Done when: `git grep -n -e "\.card\b" -e "shadow-1" -e "\.badge" -e "ChipGroup" src` returns
  nothing; `tests/styles.test.js` fails if any rule outside the allowlisted floating selectors
  sets `box-shadow`; ux-rules runs strict on every route at 390 and 1440 and passes.
- Closes: UX-DS-02, UX-DS-04, UX-DS-05, UX-DS-07, UX-DS-10, UX-DS-11, UX-DS-12, UX-TEST-03,
  UX-TEST-04, UX-TEST-06.

### U9 — Tablet and desktop adaptation

**U9-01 — Width rules**
- Change: 64ch text cap, 640 px list cap at 768, 560 px content at 480–767.
- Reason: `d546`, `d536`, `d645`.
- Files: `src/styles/frame.css`, `src/styles/base.css`, `tests/browser-responsive.js`.
- Depends on: U8. Size: S. Risk: Low.
- Done when: at 768 You's row values are ≤ 640 px from their labels' left edge; at 1440 no
  paragraph in `main` is wider than 64ch; at 600 px `main`'s content is ≤ 560 px wide and
  centered.
- Closes: UX-RWD-01, UX-RWD-02.

**U9-02 — Today desktop**
- Change: Split hero with food choices as rows; two columns below; no right aside.
- Reason: `d101`, `d112`, `d162`.
- Files: `src/pages/Today/*.jsx`, `src/styles/today.css`, `tests/browser-today.js`.
- Depends on: U9-01. Size: M. Risk: Medium.
- Done when: at 1440 the hero contains the alternates as rows; Your day and Pack & prep are
  side by side with no container border or shadow; on the rest-day state the content spans the
  main column; the hero primary is ≤ 320 px wide.
- Closes: UX-RWD-03.

**U9-03 — Schedule desktop**
- Change: Header row, 7-column week, settings column at 1200+, month with a day panel.
- Reason: `d204`, `d206`.
- Files: `src/pages/Schedule/*.jsx`, `src/styles/schedule.css`, `tests/browser-schedule.js`.
- Depends on: U9-01. Size: L. Risk: Medium.
- Done when: at 1440 the week renders 7 columns of equal width with sessions as blocks; at
  1280 "Your week" is a right column; at 1024 it sits below the grid; the per-day "+" appears on
  hover and on keyboard focus only.
- Closes: UX-RWD-04, UX-RWD-05.

**U9-04 — Food list and detail**
- Change: One 720 + 320 frame; contextual panel per section at 1200+.
- Reason: Width jumps and grids of cards (`d301`, `d332`, `d354`, `d381`).
- Files: `src/components/FoodWorkspace.jsx`, `src/pages/Food/*.jsx`, `src/styles/food.css`,
  `tests/browser-food-workflow.js`, `tests/browser-responsive.js`.
- Depends on: U9-01. Size: L. Risk: Medium.
- Done when: at 1440 `main`'s list column is the same width (± 2 px) on all four sections;
  selecting an idea or an At home item fills the panel instead of opening a sheet; Finish
  shopping is in the Groceries panel; below 1200 the sheets return.
- Closes: UX-RWD-06.

**U9-05 — You two-pane**
- Change: Settings list and inline form at 1024+.
- Reason: `d501`, `d507`.
- Files: `src/pages/You/*.jsx`, `src/styles/you.css`, `tests/browser-you.js`.
- Depends on: U9-01. Size: M. Risk: Medium (dirty-state handling moves from sheets to a pane).
- Done when: at 1280 choosing "Food access & budget" renders its form beside the list with no
  dialog element open; leaving the pane with edits shows the discard alert once.
- Closes: UX-RWD-07.

**U9-06 — Welcome and setup split**
- Change: Field panel left half, content right half at 1024+.
- Reason: `d001`, `d042`, `d003`–`d017`.
- Files: `src/pages/Welcome/WelcomePage.jsx`, `src/pages/Setup/*.jsx`, `src/styles/welcome.css`,
  `tests/browser-setup.js`.
- Depends on: U9-01. Size: M. Risk: Low.
- Done when: at 1440 the field panel is ≤ 50 % of the viewport width and full height; setup's
  panel lists six steps with the current one marked `aria-current="step"`.
- Closes: UX-RWD-08.

**U9-07 — 320 px sweep**
- Change: Fix whatever the 320 checks find after U5–U9.
- Reason: `p701`–`p718`.
- Files: as found; `tests/browser-responsive.js`.
- Depends on: U9-06. Size: S. Risk: Low.
- Done when: every route at 320 × 740 has `scrollWidth ≤ innerWidth`, no control label with
  `scrollWidth > clientWidth` unless inside a fade-masked scroller, and the Today hero primary
  visible at scroll 0.
- Closes: UX-RWD-12.

### U10 — Final re-review

**U10-01 — Re-capture and re-review against the brief**
- Change: Re-run `npm run ux:capture -- both` (390, 320, 768, 1440, 1024) and review every
  capture against this plan and the owner brief, phone first this time, then desktop; force
  and capture the states U0 could not (details-sheet error `p339`, undo-trip confirm `p359`,
  stale-plan follow-ups, skeletons with a delayed fetch); write
  `output/ux-review-final/review.md` with findings ranked H/M/L.
- Reason: The owner asked for the same full review at the end; the brief has to be shown met,
  not asserted.
- Files: `scripts/ux-review/`, `output/ux-review-final/` (git-ignored),
  `UX-REDESIGN-CHECKLIST.md` (one evidence line per brief row).
- Depends on: U9. Size: L. Risk: Low.
- Done when: every row of the section 2 brief table has at least one cited capture in the
  checklist note; the final review lists no H findings; `npm run check` and
  `npm run test:browser` pass; the capture of every route at 390 shows the floating bar and no
  card stack.
- Closes: UX-TEST-05.

### 10.12 Open items from REDESIGN-CHECKLIST.md

| Item | What is open | Built in | Tick in both trackers when |
|---|---|---|---|
| COPY-38 | Test athletes named "Schedule test" etc. | U1-06 | U1-06 passes |
| KEEP-15 | Undo ledger entries older than 30 days never pruned | U1-05 | U1-05 (c) passes |
| STATE-03 | No app-frame offline banner | U3-04 | U3-04 passes |
| STATE-04 | Moved session prompt does not name the new time and is missing on Ideas | U5-04, U7-02 | U7-02 passes |
| STATE-05 | Reminders switch off without asking when permission is lost | U8-03 | U8-03 passes |
| STATE-07 | Skeleton has no 300 ms minimum and no `aria-busy` | U4-06 | U4-06 passes |
| STATE-08 | Restore toast does not name the athlete or offer Switch now | U8-04 | U8-04 passes |
| STATE-11 | No Pack & prep empty state | U5-02 | U5-02 passes |
| STATE-15 | No message when an item changed in another tab | U4-05 | U4-05 passes |
| STATE-16 | No school-day prompt on Today | U5-04 | U5-04 passes |
| CMP-10 | No shared idea component | U7-02 (as `IdeaRow` + `Availability`, no chips) | U7-02 passes |

## 11. Test plan and shared assertions

### 11.1 `tests/browser-ux-rules.js`

One browser snippet (the runner's single-expression format, so it carries its own helpers)
that visits Welcome and every route at 390 × 844 and 1440 × 900 with the standard fixture
athlete and runs the rules below. It has two lists: `STRICT` (routes whose phase is done; any
violation fails) and everything else (counts are printed, never fail). U1-06 adds it with an
empty `STRICT`; each screen phase adds its routes; U8-06 makes every route strict.

| Rule | Assertion | Closes with |
|---|---|---|
| R1 Flat content | Inside `main`, excluding `[data-surface=hero]` and its descendants: 0 elements with computed `box-shadow` ≠ `none`, and 0 elements with both a visible border on 3+ sides and a shadow. | UX-DS-04 |
| R2 No pills | Inside `main`: 0 elements with visible text, height < 40 px and `border-radius` ≥ height ÷ 2, excluding `[role=switch]`, `.avatar` and nav items. | UX-DS-07 |
| R3 Text | `main.innerText` has no " · ", no word-dash-word with spaced em or en dash; 0 elements with computed `text-transform: uppercase`. | UX-COPY-01–03 |
| R4 Hero | ≤ 1 `[data-surface=hero]`, and only on the routes UX-DS-11 allows. | UX-DS-11 |
| R5 One primary | ≤ 1 visible `[data-kind=primary], [data-kind=hero]` in `main`, and ≤ 1 in each open dialog. | UX-CMP-01 |
| R6 Tab bar geometry (phone) | U3-01 (a)–(c). | UX-NAV-01, UX-NAV-02 |
| R7 Tab bar contrast | U3-01 (d), computed from the bar's background alpha composited over pitch and over paper. | UX-NAV-03 |
| R8 Pitch budget | At scroll 0, the visible area of pitch-filled elements ≤ 60 % of the viewport. | UX-DS-12 |
| R9 Clearance | Scrolled to the end, the last element in `main` ends ≥ 8 px above the nav (phone). | UX-NAV-04 |
| R10 No overflow | `document.scrollingElement.scrollWidth ≤ innerWidth` (also run at 320). | UX-RWD-12 |
| R11 Scoreboard voice | Elements with computed font-family starting "Barlow" match the allowlist of selectors in UX-DS-10. | UX-DS-10 |
| R12 Food chrome | On Food routes at 390, the first item's top ≤ 260 px. | UX-FOOD-03 |
| R13 No outlined buttons | 0 `button` elements in `main` or dialogs with a 1 px border and a transparent or white background. | UX-CMP-01 |

### 11.2 Other test changes

- **UX-TEST-01 — Versioned capture harness.** U1-06.
- **UX-TEST-02 — Realistic seed names.** U1-06 (COPY-38).
- **UX-TEST-03 — The rules check.** `tests/browser-ux-rules.js` as 11.1; report mode in U1-06,
  strict on every route in U8-06.
- **UX-TEST-04 — Retire assertions that encode the old look.** `tests/browser-visual.js`
  checks "48 px inputs" (U2-01), "64 px sheet headers" and "equal footer buttons" (U4-05),
  "round weekday circles" (U4-04), "centered tablet tab group" and "one rail edge" (U3-02),
  "a Now card above the tab bar" (U5-01), the Schedule week switcher, day headers and top-bar
  add (U6-01); `tests/browser-responsive.js` checks the 120 px Food content start (U7-01). Each
  is replaced by the new measurement in the same item, never deleted without a replacement.
  Closes when the last one is replaced (U8-06).
- **UX-TEST-05 — Final re-review.** U10-01.
- **UX-TEST-06 — Stylesheet guards.** `tests/styles.test.js` gains: color values pinned
  (U2-01); `box-shadow` only on allowlisted floating selectors; no `text-transform:
  uppercase`; no dashed borders; `--font-numeral` only on allowlisted selectors. Closes in U8-06.
- Every item keeps the existing suites green: `npm run check` (lint, typecheck, unit tests,
  build) and `npm run test:browser` (25 snippets today, plus `browser-ux-rules.js` and
  `browser-ux-nav.js`).

## 12. Platform note

This plan is for the phone-first web app. It also serves as the visual and interaction spec
for a possible native iPhone version later: the floating tab bar, sheets, alerts, large
titles, safe areas and glass rules map directly to SwiftUI's `TabView`, `.sheet`, `.alert`,
navigation large titles and materials, or can be wrapped as-is with Capacitor. Choosing
between SwiftUI, Capacitor or staying on the web, and any installable-app or push-notification
work (audit P3-01, owner decision 5), is not part of this plan.

## Appendix A. ID index

| Area | Prefix | IDs | Count |
|---|---|---|---|
| Tokens and surfaces | `UX-DS` | 01–17 | 17 |
| Navigation and page frame | `UX-NAV` | 01–13 | 13 |
| Shared components | `UX-CMP` | 01–22 | 22 |
| Copy rules | `UX-COPY` | 01–06 | 6 |
| Welcome | `UX-WEL` | 01–04 | 4 |
| Setup | `UX-SET` | 01–07 | 7 |
| Today | `UX-TODAY` | 01–15 | 15 |
| Schedule | `UX-SCH` | 01–18 | 18 |
| Food frame | `UX-FOOD` | 01–04 | 4 |
| Ideas | `UX-IDEA` | 01–09 | 9 |
| At home | `UX-HOME` | 01–09 | 9 |
| Groceries | `UX-GROC` | 01–08 | 8 |
| Log | `UX-LOG` | 01–08 | 8 |
| Search, portion, barcode | `UX-SRCH` | 01–08 | 8 |
| You | `UX-YOU` | 01–09 | 9 |
| This device and recovery | `UX-DEV` | 01–06 | 6 |
| About, Not found, footer | `UX-MISC` | 01–03 | 3 |
| Flow fixes | `UX-FLOW` | 01–13 | 13 |
| Bugs | `UX-BUG` | 01–21 | 21 |
| Tablet and desktop | `UX-RWD` | 01–12 | 12 |
| Tests and tooling | `UX-TEST` | 01–06 | 6 |
| **Total** | | | **218** |

Build items that close each ID (an ID listed under two items closes with the later one;
UX-FLOW-13 is an owner decision, not a build item):

| ID | Closed by |
|---|---|
| UX-DS-01 | U2-01 |
| UX-DS-02 | U3-01, U3-04, U8-06 |
| UX-DS-03 | U2-01 |
| UX-DS-04 | U8-06 |
| UX-DS-05 | U8-06 |
| UX-DS-06 | U2-01 |
| UX-DS-07 | U8-06 |
| UX-DS-08 | U2-01 |
| UX-DS-09 | U2-01 |
| UX-DS-10 | U8-06 |
| UX-DS-11 | U5-01, U7-02, U7-05, U8-06 |
| UX-DS-12 | U5-01, U8-01, U8-02, U8-06 |
| UX-DS-13 | U4-07 |
| UX-DS-14 | U4-07 |
| UX-DS-15 | U4-07 |
| UX-DS-16 | U7-06 |
| UX-DS-17 | U5-02 |
| UX-NAV-01 | U3-01 |
| UX-NAV-02 | U3-01 |
| UX-NAV-03 | U3-01 |
| UX-NAV-04 | U3-01 |
| UX-NAV-05 | U3-01 |
| UX-NAV-06 | U3-04 |
| UX-NAV-07 | U1-02 |
| UX-NAV-08 | U3-01 |
| UX-NAV-09 | U3-02 |
| UX-NAV-10 | U3-02 |
| UX-NAV-11 | U3-03 |
| UX-NAV-12 | U3-03 |
| UX-NAV-13 | U3-03 |
| UX-CMP-01 | U4-01 |
| UX-CMP-02 | U4-02 |
| UX-CMP-03 | U4-02 |
| UX-CMP-04 | U4-03 |
| UX-CMP-05 | U4-04 |
| UX-CMP-06 | U4-04 |
| UX-CMP-07 | U4-04 |
| UX-CMP-08 | U4-04 |
| UX-CMP-09 | U4-03 |
| UX-CMP-10 | U4-05 |
| UX-CMP-11 | U4-05 |
| UX-CMP-12 | U4-05 |
| UX-CMP-13 | U3-04 |
| UX-CMP-14 | U4-06 |
| UX-CMP-15 | U4-06 |
| UX-CMP-16 | U3-04 |
| UX-CMP-17 | U4-06 |
| UX-CMP-18 | U4-05 |
| UX-CMP-19 | U4-06 |
| UX-CMP-20 | U4-05 |
| UX-CMP-21 | U4-04 |
| UX-CMP-22 | U4-04 |
| UX-COPY-01 | U2-02 |
| UX-COPY-02 | U2-02 |
| UX-COPY-03 | U2-02 |
| UX-COPY-04 | U2-02 |
| UX-COPY-05 | U4-03 |
| UX-COPY-06 | U2-02 |
| UX-WEL-01 | U8-01 |
| UX-WEL-02 | U8-01 |
| UX-WEL-03 | U8-01 |
| UX-WEL-04 | U8-01 |
| UX-SET-01 | U8-02 |
| UX-SET-02 | U8-02 |
| UX-SET-03 | U8-02 |
| UX-SET-04 | U8-02 |
| UX-SET-05 | U8-02 |
| UX-SET-06 | U8-02 |
| UX-SET-07 | U8-02 |
| UX-TODAY-01 | U5-02 |
| UX-TODAY-02 | U5-01 |
| UX-TODAY-03 | U5-01 |
| UX-TODAY-04 | U5-01 |
| UX-TODAY-05 | U5-01 |
| UX-TODAY-06 | U5-01 |
| UX-TODAY-07 | U5-02 |
| UX-TODAY-08 | U5-02 |
| UX-TODAY-09 | U5-03 |
| UX-TODAY-10 | U5-02 |
| UX-TODAY-11 | U5-02 |
| UX-TODAY-12 | U5-04 |
| UX-TODAY-13 | U5-04 |
| UX-TODAY-14 | U5-04 |
| UX-TODAY-15 | U5-04 |
| UX-SCH-01 | U6-01 |
| UX-SCH-02 | U6-01 |
| UX-SCH-03 | U6-01 |
| UX-SCH-04 | U6-01 |
| UX-SCH-05 | U6-01 |
| UX-SCH-06 | U6-01 |
| UX-SCH-07 | U6-01 |
| UX-SCH-08 | U6-01 |
| UX-SCH-09 | U6-02 |
| UX-SCH-10 | U6-02 |
| UX-SCH-11 | U6-03 |
| UX-SCH-12 | U6-03 |
| UX-SCH-13 | U6-03 |
| UX-SCH-14 | U6-03 |
| UX-SCH-15 | U6-03 |
| UX-SCH-16 | U6-04 |
| UX-SCH-17 | U6-04 |
| UX-SCH-18 | U3-03 |
| UX-FOOD-01 | U7-01 |
| UX-FOOD-02 | U7-01 |
| UX-FOOD-03 | U7-01 |
| UX-FOOD-04 | U7-01 |
| UX-IDEA-01 | U7-02 |
| UX-IDEA-02 | U7-02 |
| UX-IDEA-03 | U7-02 |
| UX-IDEA-04 | U7-02 |
| UX-IDEA-05 | U7-02 |
| UX-IDEA-06 | U7-02 |
| UX-IDEA-07 | U7-02 |
| UX-IDEA-08 | U7-02 |
| UX-IDEA-09 | U7-02 |
| UX-HOME-01 | U7-03 |
| UX-HOME-02 | U7-03 |
| UX-HOME-03 | U7-03 |
| UX-HOME-04 | U7-03 |
| UX-HOME-05 | U7-03 |
| UX-HOME-06 | U7-03 |
| UX-HOME-07 | U7-03 |
| UX-HOME-08 | U7-03 |
| UX-HOME-09 | U7-03 |
| UX-GROC-01 | U7-04 |
| UX-GROC-02 | U7-04 |
| UX-GROC-03 | U7-04 |
| UX-GROC-04 | U7-04 |
| UX-GROC-05 | U7-04 |
| UX-GROC-06 | U7-04 |
| UX-GROC-07 | U7-04 |
| UX-GROC-08 | U7-04 |
| UX-LOG-01 | U7-05 |
| UX-LOG-02 | U7-05 |
| UX-LOG-03 | U7-05 |
| UX-LOG-04 | U7-05 |
| UX-LOG-05 | U7-05 |
| UX-LOG-06 | U7-05 |
| UX-LOG-07 | U7-05 |
| UX-LOG-08 | U7-05 |
| UX-SRCH-01 | U7-06 |
| UX-SRCH-02 | U7-06 |
| UX-SRCH-03 | U7-06 |
| UX-SRCH-04 | U7-06 |
| UX-SRCH-05 | U7-06 |
| UX-SRCH-06 | U7-06 |
| UX-SRCH-07 | U7-06 |
| UX-SRCH-08 | U7-06 |
| UX-YOU-01 | U8-03 |
| UX-YOU-02 | U8-03 |
| UX-YOU-03 | U8-03 |
| UX-YOU-04 | U8-03 |
| UX-YOU-05 | U8-03 |
| UX-YOU-06 | U8-03 |
| UX-YOU-07 | U8-03 |
| UX-YOU-08 | U8-03 |
| UX-YOU-09 | U8-03 |
| UX-DEV-01 | U8-04 |
| UX-DEV-02 | U8-04 |
| UX-DEV-03 | U8-04 |
| UX-DEV-04 | U8-04 |
| UX-DEV-05 | U8-04 |
| UX-DEV-06 | U8-04 |
| UX-MISC-01 | U3-03 |
| UX-MISC-02 | U8-05 |
| UX-MISC-03 | U8-05 |
| UX-FLOW-01 | U5-04 |
| UX-FLOW-02 | U5-01 |
| UX-FLOW-03 | U5-03 |
| UX-FLOW-04 | U6-01 |
| UX-FLOW-05 | U1-03 |
| UX-FLOW-06 | U1-03 |
| UX-FLOW-07 | U1-03 |
| UX-FLOW-08 | U7-04 |
| UX-FLOW-09 | U8-02 |
| UX-FLOW-10 | U5-02 |
| UX-FLOW-11 | U7-05 |
| UX-FLOW-12 | U7-02 |
| UX-FLOW-13 | Owner decision |
| UX-BUG-01 | U1-01 |
| UX-BUG-02 | U1-01 |
| UX-BUG-03 | U1-01 |
| UX-BUG-04 | U1-02 |
| UX-BUG-05 | U5-04 |
| UX-BUG-06 | U1-01 |
| UX-BUG-07 | U1-03 |
| UX-BUG-08 | U2-02 |
| UX-BUG-09 | U2-02 |
| UX-BUG-10 | U3-04 |
| UX-BUG-11 | U3-01 |
| UX-BUG-12 | U7-01 |
| UX-BUG-13 | U1-03 |
| UX-BUG-14 | U1-03 |
| UX-BUG-15 | U1-04 |
| UX-BUG-16 | U1-04 |
| UX-BUG-17 | U1-04 |
| UX-BUG-18 | U1-03 |
| UX-BUG-19 | U1-05 |
| UX-BUG-20 | U1-05 |
| UX-BUG-21 | U7-02 |
| UX-RWD-01 | U9-01 |
| UX-RWD-02 | U9-01 |
| UX-RWD-03 | U9-02 |
| UX-RWD-04 | U9-03 |
| UX-RWD-05 | U9-03 |
| UX-RWD-06 | U9-04 |
| UX-RWD-07 | U9-05 |
| UX-RWD-08 | U9-06 |
| UX-RWD-09 | U4-05 |
| UX-RWD-10 | U4-01 |
| UX-RWD-11 | U3-04 |
| UX-RWD-12 | U9-07 |
| UX-TEST-01 | U1-06 |
| UX-TEST-02 | U1-06 |
| UX-TEST-03 | U1-06, U8-06 |
| UX-TEST-04 | U8-06 |
| UX-TEST-05 | U10-01 |
| UX-TEST-06 | U8-06 |
