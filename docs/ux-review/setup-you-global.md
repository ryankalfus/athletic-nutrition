# UX review — Welcome, Setup, You + sheets, Device, About, Not found, and global patterns

Reviewer scope: phone first (390 fold, then full), then desktop/tablet. Read-only on tracked files.
Inputs: output/ux-review/{phone,desktop}/, CAPTURES.txt, src/styles/*.css, frontend-design SKILL.md.
Contact sheets: output/ux-review/review/sheets/sy-*.png
Ranks: H = high, M = medium, L = low.

## Progress log
- Started. Read SKILL.md and tokens.css. (2026.10.15)

---
## A. Welcome and Setup — phone (390) first pass
Sheets: sy-p1 (001–009), sy-p2 (010–017, 031), crop sy-crop-009.

### A1. Welcome, first visit (001, 002)
Keep: one headline, one primary action pinned at the bottom, honest privacy line. Already close to Cash App's single-focus pattern.
Problems:
- [M] Dead zone: ~45% of the fold is empty paper between "How Nourally works" and Get started. Empty is fine (Cash App does it), but nothing owns the space: no brand color, no type moment, so it reads unfinished.
- [M] No brand moment. The palette has pitch (#0f3640) and lime (#d7f45f) but Welcome is paper + teal only. Dunkin and Cash App open on their brand color. The 28px logo is the only pitch on screen.
- [M] Three grey text tiers under the headline (16px lede, 13px 3-line privacy paragraph, link). Nobody reads 13px small print. Cut privacy to one line.
- [L] Focus ring on Get started (002): 2px offset teal ring, visible. Keep.
Proposal (phone): full-bleed pitch screen, lime used once.
```
+------------------------------+  pitch #0f3640 full bleed, light status bar
| [N] nourally                 |
|                              |
| Fuel for the                 |  display 44/46, on-dark, 700, -0.02em
| day you                      |
| actually have.               |
|                              |
| Snacks and meals timed       |  body 17/24 on-dark-muted
| around school and practice.  |
|                              |
| [      Get started       ]   |  lime fill, ink text, 56px, radius 16
|     How Nourally works       |  text button, on-dark
|  Saved on this phone only.   |  caption, one line
+------------------------------+
```
Lime is the single bold accent (SKILL: "spend your boldness in one place"). Pitch already exists in tokens (Now card), so the scheme is unchanged.

### A2. Setup chrome (all steps)
- [H] Four exits compete: Back (top left), "Skip step" (top right), "Skip setup" (footer left), Next. Step 1 has "Skip setup" but no "Skip step"; steps 2–5 have both. A 15-year-old can't tell "Skip step" from "Skip setup". Proposal: top row = back chevron (icon only, 44px target) + progress. Footer = one full-width primary. On optional steps, a quiet "Skip for now" text button under the primary. "Set up later" only on step 1.
- [M] Header stack = logo row, centered "Step 1 of 6", 2px progress hairline, h1. Four layers before the question. A flow doesn't need the logo. Proposal: 6-dash segmented progress (stories style) + back chevron; "Step n of 6" kept as aria-valuetext only.
- [M] Step 1 row is lopsided (centered caption, no back); later steps are left/center/right. Same row on every step fixes it.
- [M] Footer has a hairline divider above it on every step (009 crop). Divider + text link + button = template chrome. Drop the divider; float the full-width button over a short paper-colored fade.
- [L] h1 28px; question screens should go bigger (Cash App: huge type, one question). 34/38. Ledes are often redundant ("Nourally uses this to name your sessions and time your snacks.") — cut to ≤1 line or remove.
```
+------------------------------+
| <   ====----------------     |  back 44px; 6 dashes, 4px tall, 4px gap
|                              |
| What do you                  |  h1 34/38
| play?                        |
|                              |
| Sport                        |  label 15/20 600
| [ Soccer                  v ]|  56px field, radius 14, white surface
| Season                       |
| [ Pre | In season | Off     ]|  segmented 48px, selected = pitch fill
| First name (optional)        |
| [                          ] |
|                              |
| [          Next          ]   |  primary 56px full width, floating
|         Set up later         |  quiet text button (step 1 only)
+------------------------------+
```
Reorder step 1: Sport first (required), name last (optional). Today the optional field leads.

### A3. Step 1 — Sport combobox, errors (003–007)
- [H] Stale error (007): Sport = "Soccer", Season chosen, yet the red border and "Enter your sport." stay. Same on step 3 (012: "End time must be after start time." with 4:00–5:30). Errors must clear the moment the value is valid (on change/blur). Reads as broken.
- [M] Combobox list (005): white panel, heavy shadow-3, covers Season, 6th row cut off with no scroll cue. On phone, open a bottom sheet of sports instead (search field + plain rows), like a native picker; avoids keyboard vs dropdown fight. Keep the dropdown at ≥768.
- [M] Helper "New activities are named after it, like 'Soccer practice'." is system talk at 13px. Cut.
- [L] Invalid + focused (004) = red border + teal ring + icon + red text. Make the focus ring red on invalid fields so the signals agree.
- [M] Season segmented: selected = white segment with grey outline on grey track (007). Low contrast; reads like a chip. Selected = pitch fill + on-dark text.

### A4. Step 2 school day (008, 009, 031)
- [H] Error with no message (009 + crop): Lunch starts/ends turn red, but no text says why. Needs "Lunch has to be during school (8:00 AM–3:00 PM)." under the pair, linked by aria-describedby.
- [H] Weekday picker = 7 small circles, each with an overlapping check badge (008). Exactly the "small circular chips" the owner dislikes, and the badges add noise. Proposal: one joined 7-segment bar, full width, 48px, letters, selected = pitch fill, no badges.
```
[ S | M | T | W | T | F | S ]   selected = pitch bg + white letter; outer ends radius 14
```
- [M] Four stacked full-width time fields. Pair them: "School" label, then two compact time fields side by side (2 × ~170px at 390). "Lunch" the same. Halves the height.
- [M] "No school right now" is a teal link floating above the form but is really a mode switch. Make it a switch row.
- [L] Times render "08:00 AM" (native input, leading zero). Everywhere else uses format.js "8:00 AM". A custom time button opening a wheel/list sheet fixes both.

### A5. Step 3 practices and games (010–012)
- [M] Same circle day chips, same stale-error bug (012).
- [M] Label soup: "Add your usual practice" (h3) > "Practice days" > "Starts" > "Ends" > "Where" > "Game" > "Game date". Group: "Practice" title, day bar, one "4:00 PM – 5:30 PM" row, Home/Away segmented; then "Next game (optional)".
- [M] "+ Add a game" is an outlined rounded button. Use a full-width plain row with a plus icon, no border.

### A6. Step 4 food at school (013, 014)
- [H] Pill chips with checks (Cafeteria, Fridge, Microwave, Can eat in class): the owner's explicit dislike. Four options → plain checklist rows, 56px, label left, check right, hairline separators (Spotify settings). Fold the "Someone at home can help pack or cook" switch into the same list.
```
At school I have
Cafeteria                       [x]
Fridge                          [ ]
Microwave                       [x]
Can eat in class                [ ]
------------------------------------
Someone at home can help cook  (on)
```

### A7. Step 5 food needs (015, 016)
- [H] "Not a fan of" = 17-pill wrap cloud. The most generated-looking surface in the flow, and hard to scan. Proposal: 2-column checklist of the 8 most common (rows, not pills) + "More foods" row opening a searchable full-height sheet. Selected items summarized in one line ("Grapes, Pasta") on the row.
- [M] "Allergies" heading leads only to an amber pill banner "Allergy filtering coming soon." — a heading with nothing under it. Keep the safety rule (no allergen filter; ALLERGY_TAGS_REVIEWED stays false) but say it as one plain line with an info icon: "Allergy filtering isn't ready yet. Check every label." No tinted pill.
- [M] "I don't eat" Vegetarian/Vegan pills → two checklist rows.
- [L] Footnote "Ideas that use these are hidden. This is not an allergy filter." is 13px at the bottom. Good safety copy — move it directly under the section title at 14px so it's read before choosing.

### A8. Step 6 You're set (017)
- [H] Weakest moment in the flow: small pitch card at top, ~60% empty paper, and a "Back" link on a done screen. Make it the Cash App/Dunkin "done" moment: full-bleed pitch, big type, first plan as hero, one lime button, no back.
```
+------------------------------+  pitch full bleed
|                              |
| You're set,                  |  display 40/44 on-dark
| Maya.                        |
|                              |
| Today                        |  label on-dark-muted
| Soccer practice   4:00 PM    |  h2 on-dark, numerals in Barlow
| Snack around      2:30 PM    |  lime numerals
|                              |
| Change any of this in You.   |  caption on-dark-muted
| [       Open Today       ]   |  lime
+------------------------------+
```

### A9. Welcome, returning athletes (041–047, 705)
Keep: "Who's using Nourally?" is the right first question; last-used sort; per-athlete overflow menu; Rename/Remove in a menu, destructive item in red.
- [H] Stacked cards: each athlete is its own bordered white card with a 12px gap, then an outlined "Add another athlete" button, i.e. 4 boxes in a column (042). Owner's exact complaint. Proposal: one borderless list on paper, rows separated by hairlines, avatar 44px, name 17/22 600, one meta line ("Soccer, used today" — no middle dots), overflow icon. "Add athlete" is the last row with a plus avatar, same row style.
```
Who's using Nourally?          h2 22/28
(M)  Maya                  ...
     Soccer, used today
------------------------------
(S)  Sam                   ...
     Tennis, used yesterday
------------------------------
(+)  Add athlete
```
- [M] Three meta lines per tile (name / sport / last used) at 13px; collapse to two.
- [M] When athletes exist, the hero headline + lede still take the top 230px, pushing athletes down. Returning visitors need the chooser, not the pitch. Shrink to logo + "Who's using Nourally?" as the h1 (34px); keep "How Nourally works" at the bottom.
- [L] Avatar circle uses a pale teal tint with teal letter, low contrast vs paper; use per-athlete solid fills from the existing session colors (practice/workout/game) with white letter.
- [M] Remove confirm (045) asks to type DELETE. Right for data loss, but the input is a full-size field with teal focus and "Delete data" disabled grey button; title wraps 2 lines next to the X. See global sheet/confirm pattern (G4).
- [L] Add athlete empty submit (047) shows a proper inline error. Keep.

---
## B. You, sheets, This device, About, Not found — phone (390)
Sheets: sy-p4 (501–509), sy-p5 (510–540), sy-p6 (541–637), crop sy-crop-nav.

### B1. You list (501, 618, 714)
Keep: settings as one list of rows with title + current value + chevron (that is the Spotify pattern already); "Saved." toast after a sheet save.
- [H] The owner's exact anti-pattern: a separated athlete card (avatar, name, sport, outlined "Add another athlete" button) sits above a connected grouped card of 6 rows. Card above card group, both bordered, both shadow-1, both radius-lg.
- [M] Avatar "M" appears twice: top-bar athlete button and the athlete card.
- [M] Meta strings joined with middle dots ("Soccer · In season", "1 athlete · Last backup: Oct 11", "Packed, cafeteria, home kitchen · Low-cost ideas off") — SKILL template tell; also 3-line values wrap (Food access).
- [M] Grey footer "Saved on this device. Food search uses online food databases." repeats under every page and gets half-hidden behind the tab bar at fold. Say it once, in This device.
- [L] "Food needs & allergies" — the row promises allergies but the sheet can't filter them (safety rule). Rename row "Food needs"; the sheet keeps the "check every label" line.
Proposal: no cards. Profile header is type on paper; rows are borderless with hairlines inset to the text; group titles are plain 15px semibold (sentence case, no caps).
```
+------------------------------+
| You                     (M)  |  large title 34/38 (collapses to 17px bar on scroll)
|                              |
| (M)  Maya                    |  avatar 56, name 22/28 700
|      Soccer, in season       |  body-small muted
|      Switch or add athlete > |  text button, primary
|                              |
| Your plan                    |  group title 15/20 600 muted
| Sport & season      Soccer > |  value right-aligned, single line, truncates
| Food needs            None > |
| Food access & budget   ... > |
| Reminders              Off > |
|                              |
| App                          |
| This device       Backed up >|
| About Nourally's guidance  > |
+------------------------------+
     [ floating tab bar ]
```
Rows: 56px min, 16px gutter, hairline from text start to right edge (iOS inset separator), no row background; pressed state = surface-muted fill full-bleed. Value on the right (one short phrase) instead of a second grey line halves the height.

### B2. Bug — Sport & season saves an empty sport (504)
- [H] Clear Sport, press Save: sheet closes, toast "Saved.", header reads "No sport set", and the row value reads only "In season". Setup step 1 requires Sport ("Enter your sport."), but the You sheet labels Sport "Optional" (502) and accepts empty. Two rules for one field. Fix: same validation as setup (required, inline error "Enter your sport.", focus the field, keep the sheet open), drop "Optional", and add a domain test in tests/domain.test.js for the profile save path. If "no sport" is a real need, make it an explicit option ("No sport right now") rather than an empty string.

### B3. Sport & season sheet (502, 503)
- [M] Combobox list opens upward and covers the sheet header and title (503), with shadow-3 inside an already-elevated sheet = two floating layers. In a sheet, open the sport list as a pushed page within the sheet (list of plain rows, search at top, check on the selected row).
- [M] Same "Optional" labels on both fields and the "New activities are named after it…" helper. Cut.
- Season segmented: see G6.

### B4. Food needs & allergies sheet (505, 506, 619)
- [H] Same 17-pill cloud as setup step 5. Use the checklist + "More foods" pattern from A7; the setup step and the sheet should render the same component.
- [M] "Allergies" heading with only the amber "Allergy filtering coming soon." pill. See A7 wording. Safety rules preserved: no allergen controls, Gluten-free/Nut-free/Dairy-free stay hidden.

### B5. Food access & budget sheet (507–509, 606, 607)
- [H] Longest sheet in the app: 3 pill groups (8 pills), 3 switches, a budget field and an oz/ml segmented, ~2 screens tall. Pills + switches + checkbox-like checks + segmented = four selection idioms in one sheet. Proposal: split into two rows on You ("Where you get food", "Budget & units") or keep one sheet but make every multi-select a checklist row and every on/off a switch row, in grouped sections with plain titles.
- [M] Error (509): all four place pills turn red plus a message. With checklist rows, show one message under the group title and a red left bar on the group; don't recolor every option.
- [M] Switch rows: label + 13px helper under it, switch on the left (507). Platform convention (iOS/Material) is switch on the right, label left. Move switches right so every row reads label-first like the rest of the list.
- [L] "Also in Schedule › School day." cross-link text is fine but should be a tappable link row if it's a real destination.
- [L] Grocery budget: "$" sits outside a half-width input. Put the $ as a prefix inside the field.

### B6. Reminders sheet (510, 521, 524, 527)
- [H] Honesty problem on a phone-first app: the sheet says reminders only work "while Nourally is open in a desktop browser. On phones, add Nourally to your home screen (coming soon)." So the main audience (phones) gets a switch that won't remind them. Lead with that fact as the first line when on a phone, not as 13px small print under the controls.
- [M] Denied/unsupported (524, 527): the main switch is disabled but "How long before" and the evening checkbox still look active. Disable or hide dependent controls when the master switch is off/blocked, and show the blocked state as one plain line with an "How to allow" text button.
- [M] Mixed controls: switch for the master, checkbox for "Evening reminder". Use switches for both (both are on/off settings).
- [L] Close button shows a heavy focus ring right after open (524, 527) because focus moves to X. Move initial focus to the sheet title (tabindex -1) so the ring shows only when the user tabs.

### B7. This device (536–542, 715)
Keep: plain explanation at top, last-backup line, type-DELETE confirm for data loss, backup downloads first.
- [H] Button soup: "Add another athlete" (outlined, hug), "Save a backup file" (filled, full width), "Restore from a backup file" (outlined, full width), "Keep data on this device" (outlined, hug), "Delete Maya's data" (red outlined, hug). Five bordered buttons, three widths, one page. Proposal: every action is a list row (icon, label, optional value), only "Save a backup file" stays a button-weight row (primary text color). Destructive row at the bottom in error color, no box.
```
Athletes on this device
(M) Maya                Open now
(S) Sam                    Open >
(+) Add athlete
Backup
Save a backup file     Oct 13  ↓
Restore from a file            >
[x] Include all athletes
Storage
Keep data on this device       >
Delete Maya's data                 (error text)
```
- [M] Athlete rows have two text actions each ("Open", "Rename") inside a bordered group card. Use one tap target (row opens athlete) and the "..." menu for Rename/Remove, same as Welcome.
- [M] Restore preview (539) copy: "This file has 1 athlete: Imported fixture." reads like dev text. Fine for fixture data; check real wording uses the athlete's name.

### B8. Confirms (045, 540, 541, 619, 637)
- [M] Discard changes (619) opens a second bottom sheet on top of the first sheet: sheet-on-sheet with two grabbers and two X buttons. Use a centered alert dialog (max 320px, radius 24, title + one line + two stacked full-width buttons) for every confirm. Bottom sheets are for content; alerts are for decisions.
```
      +----------------------+
      | Discard changes?     |  h3 20/26
      | Your edits to Food   |
      | needs aren't saved.  |
      | [      Discard      ]|  error fill
      | [   Keep editing    ]|  quiet
      +----------------------+
```
- [M] Delete confirm (540): title wraps 2 lines beside X; "Delete data" disabled = grey fill that looks like a plain grey button, not disabled. Keep type-DELETE (right for irreversible), but disabled state = error color at 40% opacity so the meaning is visible.
- [L] Recovery confirm (637) embeds a red error box with "Try again" inside the confirm. Show the error under the button that failed instead.

### B9. Data error recovery (636)
- [M] Four stacked outlined buttons of different widths + a red tinted box with raw validator text ("Invalid schedule: expected a list."). Rare state, but the tinted box + 4 boxes is the cluttered look. Make it a list of 4 action rows, put the technical detail behind "Show details". Keep the honest copy.

### B10. About (546, 716)
- [L] Best page in my area: plain reading text, clear h2s, no cards. Keep exactly this approach — it's the Spotify "plain rows/plain text" feel. Only issues: the h1 in the top bar is 20px but other pages' large titles are 28px; line length fine at phone. On desktop cap at 64ch (see C).

### B11. Not found (547, 717)
- [M] Tiny: 16px line, a small hug-width "Go to Today" button, then the repeated footer with a hairline right under it. Empty states are a moment for direction (SKILL). Proposal: centered vertically, large title "This page isn't here", one line, full-width primary "Go to Today". No footer.
- Phone pass for Welcome/Setup/You/sheets/Device/About/Not found written (sections A, B). Next: desktop + tablet pass, then globals. (2026.10.15)

---
## C. Desktop (1440) and tablet (768) pass
Sheets: sy-d1 (welcome/setup), sy-d2 (You/sheets/device/about/404), sy-d3 (tablet + nav/toast/focus).

- [H] Welcome desktop (001, 042): a ~400px column floated left of center on a 1440 canvas, 44px headline, 36px button. ~75% of the screen is blank paper. Proposal: split screen. Left 50%: full-height pitch panel with logo, display headline 64/68, lede, lime "Get started". Right 50%: paper with the athlete chooser (returning) or "How Nourally works" in plain text (first visit). One brand moment, desktop-sized.
```
+-----------------------------+------------------------------+
| [N] nourally                |                              |
|                             |  Who's using Nourally?       |
| Fuel for the day            |  (M) Maya     Soccer     ... |
| you actually have.          |  (S) Sam      Tennis     ... |
|                             |  (+) Add athlete             |
| [ Get started ]  (lime)     |                              |
|  pitch #0f3640              |  paper                       |
+-----------------------------+------------------------------+
```
- [M] Setup desktop (003–017): 470px centered column with small type, Next as a small hug button bottom-right. Fine width for a form, but the question is 28px on a 900px-tall screen and the screen is empty. Use the same split: left pitch panel lists the 6 steps (a real sequence, so numbers are legitimate per SKILL) with the current one in lime; right side = question at 40px + fields + full-width (max 400px) Next.
- [M] Desktop dialogs (502, 507, 510, 540): centered modals. Good choice on desktop. But Food access (507) is a tall modal with pill clouds; at ≥1024, open You settings in a right detail pane instead of a modal (see G1/You desktop below). Confirms stay modal.
- [H] You desktop (501, 618): a 300px-wide card stack pinned left inside a 1200px content area; rows have 12px text; huge empty right side. Proposal: two-pane settings (macOS Settings / Spotify desktop): list 360px left, the selected section's form inline on the right, Save in the pane footer. No modal for settings at ≥1024; phones keep sheets.
```
| rail | You                 | Food access & budget              |
|      | (M) Maya            | Where you can get food            |
|      | Sport & season    > | [x] Packed from home              |
|      | Food needs        > | [x] School cafeteria              |
|      |>Food access       < | ...                               |
|      | Reminders         > |                       [ Save ]    |
```
- [M] This device desktop (536): wide 300px-ish groups with buttons scattered; content lines ~110 characters in the lede. Cap body text at 64ch.
- [L] About desktop (546): good, but line length ~95 characters at 1440. Cap at 64ch (SKILL: under 80).
- [L] Not found desktop (547): same tiny treatment as phone.
- [M] Discard confirm on desktop (619): modal on top of a modal. With the two-pane You this disappears (leaving the pane triggers the confirm once).
- [M] Desktop toast (616, 618): sits bottom-left of the content, hugging the rail edge, small. Center it at the bottom of the content column, 48px tall.
- [M] Tablet 768 (641, 642, 645, 646): full-width top bar with logo + four icon/text tabs (green underline active) + avatar. Clean, but content stretches the full 768 so You rows put values ~600px from their labels (645), and the stacked cards look even heavier when wide. Cap content at 640px centered for list pages.
- [L] Tablet sheets (646) are centered dialogs ~520px: good; keep.
- Desktop rail: plain icon+label list, green left bar on active, athlete chip at bottom. Quiet and fine. Polish only (see G1).

---
## G. Global patterns

### G1. Navigation (H) — floating translucent tab bar on phone
Current (608–611, crop sy-crop-nav): full-width white bar flush to the bottom, top hairline + upward shadow-2, 4 items, 12px labels, active = teal icon/label + 6px lime dot with a teal outline above the icon. It works and the labels are right to keep. It looks dated because it's a slab glued to the edge and the active state is a 6px dot.

Also: index.html has `<meta name="viewport" content="width=device-width, initial-scale=1.0">` without `viewport-fit=cover`, so every `env(safe-area-inset-*)` in frame.css resolves to 0 on iOS. A floating bar needs viewport-fit=cover (and then real safe-area padding on the top bar too). [M]

Spec (phone, <768px):
```
          content scrolls under the bar
 |                                        |
 |  +----------------------------------+  |   12px side inset (plus safe-area left/right)
 |  | [Today]  Schedule   Food    You  |  |   64px tall, radius 24
 |  +----------------------------------+  |
 |        bottom = max(12px, safe-area-bottom - 8px)
 +----------------------------------------+
```
- Position: fixed; `left: max(12px, env(safe-area-inset-left) + 12px)`, same for right; `bottom: max(12px, calc(env(safe-area-inset-bottom) - 8px))` (≈26px above the screen edge on a home-indicator iPhone, 12px elsewhere). `max-width: 440px; margin-inline: auto` so it never stretches on large phones/foldables.
- Shape: height 64px, radius 24px (not a full pill: four labelled items need the room; a 32px pill radius crops the corner hit areas).
- Glass: `background: rgb(247 246 242 / 0.72)` (paper at 72%); `backdrop-filter: blur(20px) saturate(180%)` plus `-webkit-backdrop-filter` (Safari before 18 needs the prefix; unprefixed is Chrome 76, Firefox 103, Safari 18 per web.dev). Inner edge `box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.5)`, outer `0 0 0 1px rgb(20 51 60 / 0.06), 0 8px 32px rgb(15 44 56 / 0.16)`.
- Fallbacks: `@supports not (backdrop-filter: blur(1px))` → paper at 96%. `@media (prefers-reduced-transparency: reduce)` and `(prefers-contrast: more)` → solid paper + 1px line-strong border. forced-colors → Canvas + CanvasText border (base.css already has a forced-colors block to extend).
- Items: 4 equal columns, each 56px tall inside 4px padding. Icon 24px Lucide 1.75 stroke, label 12/16 600 sentence case.
- Active: a pitch (#0f3640) indicator pill behind icon+label (inset 4px, radius 20px), icon lime, label on-dark. Replaces the 6px dot. It reuses the Now card's pitch+lime pairing so the nav and the hero speak the same brand language. Contrast: white on pitch ≈12.9:1, lime on pitch ≈10.5:1 (computed). Animate the indicator sliding between items (200ms ease-out) — motion that answers the tap; none under reduced motion.
- Inactive: ink-muted icon/label.
- Content: `.shell` bottom padding = 64 + bottom offset + 24px so the last row and the footer clear the bar (501 currently clips the footer line behind the bar).
- Keyboard: hide the bar while a text field is focused (visualViewport height shrink) so it never floats over the keyboard.
- Toasts stack 8px above the bar, same width rules. Sheets and dialogs cover the bar.
- Don't auto-hide on scroll (iOS 26 offers minimize-on-scroll; for a 4-item app used one-handed between classes, a stable bar is better). [decision]
- Tap target ≥44px kept; focus ring inside the indicator (existing negative offset approach is right).

Tablet (768–1023): same glass bar but at the top, centered, hugging its content (iPadOS 26 places the tab bar at the top and sizes it to its items). Logo left and athlete avatar right sit on a transparent sticky header; the nav pill floats in the middle, 52px tall, radius 18, same pitch active pill. Content capped at 640px (lists) / 960 (Schedule, Food grids).
```
[N] nourally      ( [Today] Schedule  Food  You )        (M)
```
Desktop (≥1024): keep the left rail (Material/Android adaptive guidance: bar on compact, rail on expanded). Changes: no border/shadow; rail on paper; active item = the same pitch pill with lime icon; 1024–1279 collapse to an 88px icon+label rail, 232px with labels at ≥1280; athlete switcher at the bottom as a row, not a boxed chip.

### G2. Surfaces and the card problem (H)
Tokens define one card: white, 1px line border, radius-lg 16, shadow-1, used for headers, lists, forms, prompts. `.card-list` stacks them 16px apart. That is SKILL tell #4 (SaaS-card kit: identical rounded cards, one radius, same soft shadow). It produces the owner's "separated card above two connected cards" everywhere (You 501, Device 536, Welcome 042, Schedule 604).
Rule set:
1. Page = paper. Content sits directly on paper. Lists are borderless rows with inset hairlines.
2. One hero surface per screen, max: the pitch "Now" panel on Today, the pitch Welcome/Done screens. That's where radius 24 and color live.
3. White surface only for things you type into (fields) and things that float (sheets, menus, toasts, nav).
4. Grouping = space + a plain group title (15/20 600, ink-muted). Never a box.
5. Tinted boxes only for real status that needs attention (error, blocked notifications), and even then a 3px left bar + tint, not a full outlined box.

### G3. Page headers (M)
Phone pages hide the h1 and show a 20px title in a 56px bar with a hairline (618, 536). Weak hierarchy: the biggest text on You is "Maya" in a card, not the page name. Proposal: iOS-style large title (34/40, 700, -0.02em) in the scroll content, collapsing into a 17px centered title in a glass top bar after 40px of scroll. Back = chevron icon + previous page name ("< You"), not a boxed button. Athlete avatar stays top right (one place only, not repeated in content).

### G4. Sheets and dialogs (M)
Current bottom sheet (044, 502, 505): grabber, header (title + X) with hairline below, body, footer with hairline above and two equal buttons (outlined Cancel, filled Save). Three horizontal rules and three exits (grabber/X/Cancel) in a short sheet.
Proposal (phone):
```
        ----                       grabber
 Sport & season                    title 22/28 left, no X (grabber + scrim tap + Esc close)
                                   no rule
 [ fields ...                 ]
 [          Save          ]        full-width primary, 56px, sticky
            Cancel                 quiet text button (only when edits exist)
```
- Radius 28 on top corners (bigger than the 14px controls inside it, so hierarchy reads).
- Keep X only on full-height sheets (Log food search) where the grabber is far from the thumb.
- Confirms → centered alert (B8), never sheet-on-sheet.
- Desktop: settings inline in a pane (C), other dialogs centered at 520px with radius 24.

### G5. Buttons (M)
Five looks in the area: filled teal, lime (Now card), outlined (white fill + grey border) in hug and full widths, red outlined, teal text links, underlined links. Heights 36–48.
- Primary: teal fill (or lime on pitch), 52px (56 at the bottom of flows), radius 14, 16/20 600.
- Secondary: surface-muted fill, ink text, no border. Replaces every outlined button.
- Tertiary: text button in primary color, no underline (underline only for inline links in prose).
- Destructive: error text button; error fill only inside the confirm.
- One primary per screen. Full width on phone; hug (min 160px) on desktop.
- No "→" or icons appended to text (none today; keep it that way).

### G6. Selection controls (H)
Today one screen can mix pill chips with check icons, circular day chips with badges, segmented controls with a white selected segment, switches (left-aligned), and checkboxes. Owner: no small pills/circles for short text.
- Multi-select from a list → checklist rows (label left, 24px check right, 56px row).
- Single choice of 2–4 short options → segmented control: track surface-muted, selected segment pitch fill + white text, 48px, radius 14 (segments 10).
- Weekdays → joined 7-segment bar (A4).
- On/off → switch on the right of a row. Switch on = primary teal track (keep).
- Quick amounts (+8/+16/+24 on Today) → segmented-style joined bar too (other reviewers own Today).
- Keep chips only for removable filters if any are ever needed, at 36px with radius 10, not full pills.

### G7. Inputs (M)
48px, white, 1px line-strong border, radius 10, label above at 15/20 600 with a lighter "Optional" tag. OK base. Changes: 52px height, radius 12, no border at rest on paper → `surface` fill with a 1px line border is fine, but focus = 2px primary border (not an outer ring + border); invalid = 2px error border and a message below that clears on fix (A3). Prefix/suffix inside the field ($, oz). Times shown as "8:00 AM" via a time button opening a picker sheet (A4). Mark optional fields by "(optional)" in the label text, and only when the form mixes required/optional.

### G8. Toasts (L)
Dark ink pill (616–618), 13px text, lime "Undo", X dismiss. Lime Undo is a good small brand moment — keep. Changes: 48px height, radius 16, ink at 92% + blur (matches the nav glass), centered, 8px above the floating bar; drop the X when the toast auto-dismisses and has Undo (two buttons in a 200px toast is cramped). Desktop: centered in the content column, not against the rail.

### G9. Typography (M)
DM Sans (UI) + Barlow Semi Condensed (numerals) is a good pair; Barlow in lime on pitch (Now card) is the most distinctive thing in the app. Problems: the phone scale tops out at 28px for h1 and pages hide it; lots of 13px helper/caption text (setup helpers, switch descriptions, footer); the only uppercase style (`.badge`, components.css:589, Barlow 12 uppercase +0.04em) is SKILL tell #5 ("TODAY" badge in Schedule, "PLANNED" in Today).
Proposed scale (phone / ≥1024):
- display 44/46 / 64/68, DM Sans 700, -0.025em — Welcome, Done
- large title 34/40 / 40/44, 700, -0.02em — page titles, setup questions
- h2 22/28 / 24/30, 650
- h3 17/22 / 18/24, 600
- body 16/24; body-small 14/20; caption 13/18 (only metadata, never instructions)
- label 15/20 600; tab label 12/16 600
- numeral display (Barlow SemiCond 600) 40/44 / 56/60 — times and countdowns
Drop uppercase badges: use sentence case "Today" in primary color, Barlow 13/16 600.

### G10. Spacing rhythm (M)
4px base is fine. Card padding (20) + card gap (16) + section rhythm (32) make three nested paddings on every page. With cards gone: gutter 16 at <375, 20 at ≥375, 24 tablet, 32 desktop; section gap 32 (40 desktop); group title → first row 8; rows 56 min with 12 vertical padding; inset hairline from text start. Flow screens: 24 between fields.

### G11. Iconography (L)
Lucide 1.75 stroke, 24 in nav, used sparingly. Good; keep. Add icons as the leading element of list rows in This device and You (backup, restore, storage, reminders) to give rows a scannable left edge once cards are gone. Avatars: solid fills, not pale tints.

### G12. Empty states (M)
404 and "No sport set"/"None set" read as dead ends. Every empty state = one line of what's missing + one action ("Add your sport"). Show "Not set" in the row value in ink-subtle, and make the row itself the action.

### G13. Focus rings (L)
Consistent 2px primary ring with offset (002, 602–607); lime ring on pitch (603). Good, keep. Issues: rings show on the sheet X right after open (524/527) — move initial focus to the title; on invalid fields the teal ring clashes with red border — use the error color for the ring there. Floating nav: ring inside the active pill.

---
## T. Token direction (keeps every current color)
Colors unchanged: paper #f7f6f2, surface #fff, ink #14333c, pitch #0f3640, lime #d7f45f, primary #08777c, status and session colors. What changes is where they are used: pitch+lime become the brand-moment pair (Welcome, Done, Now panel, active nav), teal stays the action color, white stays for inputs/floating layers.
```css
/* Surfaces */
--surface-glass: rgb(247 246 242 / 0.72);      /* nav, top bar after scroll */
--surface-glass-dark: rgb(20 51 60 / 0.92);    /* toasts */
--blur-glass: blur(20px) saturate(180%);
/* Radii: hierarchy, not one value */
--radius-control: 12px;   /* fields, buttons 14px if 56 tall */
--radius-segment: 10px;
--radius-float: 24px;     /* nav bar, alerts, hero panels */
--radius-sheet: 28px;     /* sheet top corners */
--radius-full: 999px;     /* avatars, switches, nav indicator only */
/* Elevation: content is flat; only floating layers cast shadows */
--elev-0: none;
--elev-float: 0 0 0 1px rgb(20 51 60 / 0.06), 0 8px 32px rgb(15 44 56 / 0.16);
--elev-sheet: 0 -8px 40px rgb(15 44 56 / 0.20);
/* Sizes */
--control-height: 52px; --cta-height: 56px; --row-min: 56px;
--tab-bar: 64px; --tab-inset: 12px;
```
Why: (1) flat content + shadowed floating layers gives the "sleek" depth without boxes; (2) a radius ladder (10 → 12 → 24 → 28) encodes containment, fixing the one-radius-everywhere tell; (3) glass is limited to navigation layers (Apple's own Liquid Glass guidance keeps glass off the content layer); (4) bigger controls/type are the Cash App move — fewer things, larger.

---
## R. Ranked issue list (my area)
High
1. Stacked/nested cards everywhere (You 501, Device 536, Welcome chooser 042) — exact owner complaint. (B1, B7, A9, G2)
2. Pill/circle chips as the main selection control (setup 4/5, Food needs, Food access, weekdays). (A4, A6, A7, B4, B5, G6)
3. Bug: You › Sport & season saves an empty sport ("Optional" in sheet, required in setup). (B2)
4. Validation: step 2 lunch error shows red fields with no message; step 1/3 errors don't clear after the fix. (A3, A4)
5. Bottom nav is a flush slab with a 6px-dot active state; needs the floating glass bar; footer clips under it. (G1)
6. Setup exits: Back + Skip step + Skip setup + Next. (A2)
7. Done screen (step 6) and Welcome have no brand moment; desktop Welcome/You leave 75% blank. (A1, A8, C)
8. Reminders sheet buries "doesn't work on phones yet" in small print on a phone-first app. (B6)
Medium
9. Sheet chrome: 3 rules + 3 exits; sheet-on-sheet confirms. (G4, B8)
10. Button soup: outlined buttons in 3 widths, 5 styles. (G5, B7)
11. Hidden h1 + 20px bar title; no large titles. (G3)
12. Middle-dot meta strings, uppercase badges, 13px helper text. (B1, G9)
13. Season/Home-Away segmented selected state is low contrast. (A3, G6)
14. Tablet content stretches full width; desktop line lengths ~95–110ch. (C)
15. viewport-fit=cover missing, so safe-area insets are 0 on iOS. (G1)
16. Mixed controls in one sheet (switch + checkbox, switch on left). (B5, B6)
Low
17. Toast X + Undo cramped; desktop toast position. (G8)
18. Focus ring on X after sheet open; red/teal clash on invalid focus. (G13)
19. Repeated device footer on every page. (B1)
20. 404 is tiny. (B11)

Sources used for nav guidance:
- Apple WWDC25 "Elevate the design of your iPad app"/Liquid Glass session (tab bar floats above content, minimize-on-scroll): https://developer.apple.com/videos/play/wwdc2025/284/
- Ben Dodson, "Traditional tab bar on iPadOS 26" (tab bar moves to top, sized to content): https://bendodson.com/weblog/2026/01/22/traditional-tab-bar-on-ipados-26/
- web.dev, "Create OS-style backgrounds with backdrop-filter" (support + @supports fallback): https://web.dev/articles/backdrop-filter
- caniuse backdrop-filter: https://caniuse.com/css-backdrop-filter
- Android Developers, "Build adaptive navigation" (bar on compact, rail on expanded): https://developer.android.com/develop/ui/compose/layouts/adaptive/build-adaptive-navigation
- RVS Media summary of iOS 26 guidance (glass for controls/navigation, not the content layer): https://www.rvsmedia.co.uk/?p=11229
- Desktop/tablet pass (C), global patterns (G), tokens (T), ranked list (R) written. Review complete. (2026.10.15)
