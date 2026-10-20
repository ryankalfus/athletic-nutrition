# Today + Schedule — UI/UX review (2026.10.15)

Scope: Today (Now card states, Day rail, Pack & prep, Water, Tonight, prompt slot, Why this?, sheets) and Schedule (week/month, empty, activity sheet, scope dialogs, school day, rest days, import).
Sources: output/ux-review/phone/*, output/ux-review/desktop/*, CAPTURES.txt, src/styles/{tokens,components,frame}.css, frontend-design SKILL.md.
Contact sheets: output/ux-review/review/sheets/
Severity: H = breaks the owner brief or blocks a task; M = visible amateur tell / hierarchy; L = polish.

## Design system baseline (tokens.css)
- Palette to KEEP: paper #f7f6f2, ink #14333c, pitch #0f3640 to #16484a (dark hero), lime #d7f45f (accent), primary teal #08777c. Event colors: school slate, practice teal, game orange, workout violet, travel amber.
- Type: DM Sans UI + Barlow Semi Condensed numerals. Good pairing; numerals face is underused as a display voice.
- Radii sm 6 / md 10 / lg 16 / xl 24 / full 999. --shadow-1 under cards, --card-padding 20-24, --rhythm-card 16 => the "SaaS card kit" (SKILL tell #4) is baked into tokens.
- --tab-bar 64px, shadow-2 is a top hairline + soft shadow: bottom bar is a docked strip, not floating.

## PHONE PASS — Today

### T1. Page frame (all Today states) — sheets p-today-a..d, p-today-full1
Keep:
- The pitch-green hero with lime headline is the one strong brand moment. It works; it's the Dunkin-style color moment.
- Barlow condensed headline ("School in 1 hr", "Soccer practice in 20 min") is the most characterful type in the app. The countdown is the right hero content.
- Single lime primary button per hero. Clear.
Problems:
- [H] Five stacked cards on a normal day: Now hero, Your day, Pack & prep, Water today, prompt (blue tint). Each is a white rounded box with border + shadow-1 on paper. Textbook SKILL tell #4 (card kit, one radius, same shadow). Owner's #1 complaint.
- [H] Pill chips under the date: "School 8–3", "Practice 4:00", "Game 6:00" (orange outline). Owner explicitly named this. They also duplicate the Your day rail directly below.
- [M] Double header: top bar "Today" + avatar, then "Tue, Oct 13" as a separate small grey line. Three tiers (title, date, chips) before content; the date is the more useful heading.
- [M] Top bar has a hairline under it and a flat paper fill: reads like a desktop admin header, not a phone app.
- [M] Bottom tab bar is a docked white strip with top hairline (--shadow-2), 64px, icons + 12px labels. Functional, dated. Brief wants floating, translucent.
- [L] Full-page captures show the sticky header and "Skip to content" link repainted mid-page (capture stitching + focus artifact, not an app bug; ignore).

### T2. Now card (hero), states 101–116
Anatomy today: lime H (countdown) / white H2 (instruction) / body paragraph / food name / dashed "X to buy" chips / outlined alternate chips (truncated) / lime CTA / "More ideas" + "Why this?" underlined links.
- [H] Two competing headlines. Lime "Soccer practice in 2 hr 30 min" (2 lines) then white "Eat a snack or small meal by 2:30 PM" (2 lines). Both ~24-28px bold. Eye doesn't know which is the message. Pick: countdown = big numeral, instruction = the headline, event name = small label.
- [H] Chip soup inside the hero: "Bananas to buy" / "Pretzels to buy" (dashed pills) + "Fig bar + fr…" / "Cereal cup + shelf-s…" (outlined pills, truncated with ellipsis). 4 pills, 2 styles, truncated text = amateur. Truncated food names are unreadable choices.
- [M] Body paragraph on every state (3-4 lines: "A balanced meal or substantial snack now can make the school-to-sport transition easier later."). Belongs behind Why this?; the hero should be glanceable in 2 seconds.
- [M] Two underlined text links at the bottom ("More ideas", "Why this?") look like web 2010; low tap affordance on a dark surface.
- [M] "GAME DAY" all-caps outlined badge (114, 115) — SKILL tell (all-caps label). Game day should change the hero itself (orange game color moment), not add a sticker.
- [M] Spaced em dash in headlines: "Lunch time — choose something familiar" (104), "Rest day — keep regular meals" (112). SKILL tell ("WORD — fragment").
- [M] 115 travel: "Leave by 5:15 / PM (45 min drive)" breaks mid-time. Use a non-breaking space between time and AM/PM in format.js, and move "45 min drive" to a sub-line.
- [M] 112 rest / 113 no-sport / 116 weekend / 111 late: a full dark hero (≈300px) for "nothing today". Repeats "Rest day" twice (lime "Rest day" + white "Rest day — keep regular meals"). Empty states should be quiet, not loud.
- [L] 110 evening: "Tomorrow: Soccer practice at 4:00 PM" colon-prefix headline wraps to 2 lines; fine content, heavy form.
- [L] 101 setup: hero has 2 big buttons (lime "Add practice" + outlined "Add school day") — OK as onboarding; but then Water card under it on an empty profile is noise.

Proposed Now hero (phone) — one surface, one message, one action:
```
┌──────────────────────────────────────┐  pitch gradient, full-bleed to
│ Soccer practice at 4:00        (M)   │  screen edges, rounded only at
│                                      │  the bottom (24px). Status bar
│ 2:30                                 │  sits on it (Cash App style).
│ hr  until practice                   │  Barlow 72-88px numeral, lime
│                                      │
│ Eat a snack or small meal by 2:30.   │  H2 white 22px, one line-ish
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ [o] Banana + pretzels      Plan  │ │  one lime pill-button row
│ └──────────────────────────────────┘ │  (food + action) — or full lime CTA
│ Other ideas  ›           Why?  (i)   │  quiet text buttons, no underline
└──────────────────────────────────────┘
```
- Alternates move into a horizontal swipe rail ("Other ideas" opens a sheet with full names, Spotify-style list rows with a small food glyph) — no truncated pills.
- "to buy" becomes a single dot + "2 to buy" inline under the food name, not 2 pills.
- Game day: hero gradient shifts to the game orange (#c2410c) as the brand moment; no GAME DAY badge.
- Rest / no sport: hero collapses to a 1-line header on paper ("Rest day. Eat regular meals.") + "Plan tomorrow" as a secondary button; the day list moves up.

### T3. Plan lifecycle in the hero (121–134, 146) — sheets p-today-e, p-today-f, p-today-g
Flow: none → Plan this → planned ("Add 2 items to groceries") → Pack & prep tasks → packed ("Log it") → eaten (hero flips to recovery plan).
Keep: the hero's single CTA tracks the plan state; Undo toasts on every step (good, forgiving).
- [H] Hero headline swaps to "Banana + pretzels is planned" / "is packed" while the countdown stays. The status is the least important thing; the food + time is. Status should be a small check/step indicator, not a 2-line H2.
- [H] Primary CTA in "planned" = "Add 2 items to groceries". It sends the athlete away from Today for a side task; the in-flow next step is packing. Suggest: CTA = "Pack it" (or tick the pack list inline); "2 to buy" is a quiet secondary link.
- [M] 132 packed (seen behind sheet): a dimmed, disabled-looking "Eat around 2:30 PM" button used as a status label. A non-button styled as a button reads broken.
- [M] Body paragraph never changes across planned/packed ("A balanced meal or substantial snack now…"): dead weight after the first view.
- [M] Rail badges "PLANNED" / "PACKED" are grey ALL-CAPS tags beside the row title (SKILL tell) + "about 2:30 PM · Banana + pretzels" dot-meta.
- [L] 122 chosen alternate shows as a filled pill "Banana + …": truncated to 1 word. Selected state unreadable.

### T4. Pack & prep (126–131) — sheets p-today-f, p-today-g
- [H] It's its own card, under the rail card, above the Water card: card #3 in the stack. It's 100% about the hero's plan; it should live directly under the hero, not as a sibling box.
- [M] Two near-identical tasks: "Pack Banana + pretzels" and "Put Banana + pretzels in your school bag". With a long food (531: "Pack Sunflower-butter banana sandwich" / "Put Sunflower-butter banana sandwich in your school bag") it's 4 lines of repetition. Merge to one: "Pack it in your school bag".
- [M] Every task row has an X (remove) at the right edge, same weight as the checkbox. Looks destructive, invites mis-taps next to a checklist. Move remove into swipe-left / long-press / row menu.
- [M] Header: "Pack & prep" + outlined "Copy list" button with share icon; "1 of 2 done" / "All packed · 2 of 2" (dot meta); then a standalone outlined "Show list"/"Hide list" button. Three controls for a 2-item list.
- [L] "Copy list" uses a share-node icon but copies. Name and icon should agree.
Proposed: inline under the hero, Spotify-list style, no box:
```
  Pack it                              1/2
  [x] Banana + pretzels in school bag
  [ ] Fill water bottle
```
Collapsed when done: one line "Packed. Eat around 2:30." with a check; tap to reopen.

### T5. Water (151–156) — sheet p-today-h
- [M] Its own card with heading "Water today · 0 oz" (dot meta), 4 equal outlined buttons (+8 +16 +24 Custom), and the same helper paragraph every day ("Bring a full bottle. Follow your coach's or doctor's plan if you have one."). No progress visual; 16 oz looks the same as 0 oz apart from the tiny number.
- [M] Custom opens a full bottom sheet for one number field (153/154). OK, but an inline stepper avoids a modal.
- [L] Sheet primary is teal filled; hero primary is lime. Two primary colors. Acceptable (lime only on dark) but document the rule.
Proposed (Cash App quick-amount feel), no card, one row:
```
  Water          16 oz        [+8] [+16] [+]
  ━━━━━━━━━━━──────────────  thin teal fill, no goal number
```
Fill grows with oz but shows no target (safety rule: no prescriptions). Helper text moves to first run / Why this?.

### T6. Tonight (161–164) — sheets p-today-h, p-today-i
- [H] Evening hero says "Set up tomorrow tonight" + "Build tomorrow's list", and the list then appears in a separate "Tonight" card BELOW Your day and Water (161, 162). The hero and its content are a screen apart. In the evening the checklist IS the hero content.
- [M] Tonight card repeats tomorrow's activity as a mini-rail ("Tomorrow · Wed, Oct 14" dot meta, "4:00 PM Soccer practice / Home"); the hero already says it.
- [M] Each of 4 tasks repeats "By 7:30 AM" as a sub-line. Say it once in the header.
- [M] Same X-per-row and "Copy list" header issues as Pack & prep. "Choose tomorrow's snack" teal text link at the end of the list is the most important action and the least visible.
Proposed: evening hero = tomorrow's checklist (title "Ready by 7:30 tomorrow", 4 checkable rows on the pitch surface, lime checks), "Choose tomorrow's snack" as the lime CTA.

### T7. Prompt slot (171–174, 531) — sheets p-today-i, p-today-k
- [M] Info-tint (#e7f0fa blue) card at the bottom with two outlined buttons. Blue is the only out-of-palette surface on Today; reads as a generic system alert. Card #5.
- [M] Button styles vary by prompt: "Turn on / Not now" (both outlined), "Save backup" (teal filled) / "Not now". Pick one pattern.
- [L] Toasts (dark pill, lime Undo) overlap the prompt's buttons in several captures (126, 152, 531). With a floating tab bar, toasts must stack above it with clearance.
Proposed: one dismissible line, icon + sentence + text action, no tinted box:
```
  (bell) Heads-up 60 min before practice?     Turn on   x
```

### T8. Sheets and dialogs from Today (141–145, 132, 142) — sheets p-today-j, p-today-k
Keep: bottom sheets with grabber, title + X, sticky footer actions; scope dialog (143) has explicit labels ("Change only Tue, Oct 13" / "Change all Tuesday practices"). Why this? (141) has good content, real sources, "Sources checked Oct 11, 2026".
- [H] Plan details sheet (132, 142) is a dead end: title, a dot-meta line ("Pre-practice snack · about 2:30 PM · Banana + pretzels · planned"), then "Status: Planned · Eat about 2:30 PM" (same facts again), the 2 "to buy" chips, and only Close. No Change food / Log / Remove. Tapping a plan should let you act on it.
- [M] Why this?: two H3s + paragraphs + source list with "·" separators and underlined links. Could lead with one sentence and fold sources into a disclosure.
- [M] Activity edit sheet (144): blue info banner "Changing Tue, Oct 13 only." as a box; make it the sheet subtitle. Time fields show "04:00 PM" with a leading zero.
- [M] School day sheet (145): weekday circles plus a separate check badge on each selected circle: double-encoded, cramped at 390. Filled circle = selected, no badge. "School hours" H3 directly above "School name" label: stacked labels.
- [L] Scope dialog stacks 3 full-width buttons; Cancel can be the X.

### T9. Your day rail (all states)
Keep: time column + dot + title/sub-line is a good scannable structure (Spotify list feel). The lime Now marker is a nice live cue.
- [H] Wrapped in a white card with "Your day" + outlined "Edit schedule" button (card #2), and the date chips above already summarize it. Remove the box and the chips; let the rail sit on paper under the hero.
- [M] "Now" is a full-width lime filled bar the size of an event row. It outweighs real events. Make it a thin lime rule with a small "Now 1:30" label.
- [M] Sub-lines are dot-meta strings: "8:00 AM–3:00 PM · Lunch 11:30 AM", "4:00 PM–5:30 PM · Home". The time column already shows start; sub-line can be "Until 3:00, lunch 11:30".
- [M] "GAME" orange outlined all-caps badge next to "Soccer game" (111): the dot color + the word already say it.
- [L] "Edit schedule" duplicates the Schedule tab; tapping a row already opens its sheet (144/145). Drop the button.

### T10. Proposed Today layout (phone, 390)
One hero, everything else flat on paper with sentence-case section titles. Order shifts by time of day.
```
┌──────────────────────────────────────┐
│ ░░░░░░░ pitch gradient ░░░░░░░░░░░░░ │ hero bleeds under the status bar
│ Tue, Oct 13                     (M)  │ the date IS the header (no "Today" bar)
│                                      │
│ 2 hr 30                              │ Barlow ~80px lime numerals
│ until soccer practice at 4:00        │ 17px white
│                                      │
│ Eat a snack or small meal by 2:30.   │ 22px white semibold
│                                      │
│ Banana + pretzels         2 to buy   │ food row on a lighter pitch tint
│ [         Plan this (lime)        ]  │
│ Other ideas                 Why?     │ text buttons, no underline
╰──────────────────────────────────────╯ bottom corners rounded only

  Pack it                         0/2    no box
  [ ] Banana + pretzels in school bag
  [ ] Fill water bottle

  Your day                               no box; tap a row to edit
  8:00  ● School        until 3:00
  1:30  ── Now ───────────────────       thin lime rule
  4:00  ● Soccer practice   Home
  5:30  ● Recovery

  Water   16 oz          [+8][+16][+]    one row + fill line
  ━━━━━━━──────────

  (bell) Heads-up before practice?  Turn on

   ╭──────────────────────────────╮      floating tab bar, 12px from edges,
   │ Today  Schedule  Food  You   │      radius 24, paper at ~80% + blur
   ╰──────────────────────────────╯
```
- Separation by space (32px) + sentence-case titles, not boxes. Hairlines only inside lists.
- Radius hierarchy instead of one radius: hero 28 (bottom only), sheets 24, buttons pill, list rows 0.
- Evening: hero becomes tomorrow's checklist (T6). Rest day: hero shrinks to a compact paper header (T2).
- Floating tab bar: needs `padding-bottom: calc(var(--tab-bar) + 24px + env(safe-area-inset-bottom))` on main, and toasts offset above it.

## PHONE PASS — Schedule

### S1. Page frame + settings block (201–206, 239, 254) — sheets p-sched-a, p-sched-b, p-sched-full
Keep: the event color system (school slate, practice teal, game orange) as small dots; Week/Month as the two views; "+ Add" always reachable.
- [H] The first fold is settings, not the schedule. "School day" card, then a joined card holding "Rest days" + "Team calendar". The week begins at y≈490 of 844; on 320px (707) even later. This is literally the owner's complaint: one separated card above two connected cards.
- [H] Week view = 7 stacked day cards (204 full ≈ 2,140px tall on phone). Each card: day H3 + teal "+" + hairline + rows. The school-day row repeats identically Mon–Fri ("8:00 AM–3:00 PM · School day · Lunch 11:30 AM"), so 5 of the 9 rows are noise.
- [M] Two different row grammars: school = "time · **School day** · Lunch" on one wrapped line; practice = bold time line, then bold title, then "Home" sub-line; imported = "Home · From team calendar". Dot meta everywhere (SKILL tell). Mixed bold mid-sentence.
- [M] Empty day (Sun, "Nothing scheduled") is a different, flat row style; rest day (239) shows only small grey "Rest day" text on that flat row. Inconsistent with the carded days and too quiet for a meaningful state.
- [M] "TODAY" all-caps tinted chip next to "Tue, Oct 13" (SKILL tell). Use a lime dot or make today's date header lime/ink bold.
- [M] Header: "Schedule" + teal filled "+ Add" pill + avatar. "+ Add" with literal "+" text. On phone this belongs as a floating action or in the date-nav row.
- [M] Week/Month segmented control is half-width, left-aligned, then a separate nav row (square outlined ‹ › buttons + "Oct 12 - 18" with a hyphen + "Today" link). Month view (202/206) moves the arrows under the month title, left-aligned, with Today on the right: two nav layouts for one concept.
- [M] Settings-row actions are inconsistent verbs: "Set up" / "Set" / "Edit" / "Import". Team calendar subscribed (254) shows "Import" AND a "…" menu on the same row.
- [L] "Oct 12 - 18": hyphen with spaces, should be an en dash via format.js ("Oct 12–18").
- [L] Footer "Saved on this device. Food search uses online food databases." on the Schedule page: unrelated to schedule.
- [L] 216: hover underline on "Soccer game" / "Away · Leave by 5:15 PM" (capture had the mouse there). Rows look like links on hover; fine on desktop, irrelevant on touch.

### S2. Month view (202, 206–208, 217) — sheet p-sched-b, p-sched-d
Keep: compact grid with colored dots per event is good and close to Apple/Google Calendar. Selected day shows its events below.
- [M] Month grid is inside a card, below the same settings cards, so on phone the grid itself is cut at the fold (206). Selected-day detail is another card below.
- [M] Selection vs today encoding: today = outlined circle, selected = outlined rounded square (207, "17"). Two outline shapes, weak contrast. Use filled pitch circle = selected, lime ring/dot = today.
- [M] Skipped-day state (217): grey box "Soccer practice · Skipped this day" + outlined "Restore this day" button nested in the day card: box in a card in a page.
- [L] Dots below numbers are 6px; with 2 events they read as a colon. Fine; consider a short colored bar per event for scan.

### S3. Row menu + scope dialogs (209–218) — sheets p-sched-b, p-sched-c
Keep: "…" row menu with Edit / Skip this day; scope dialogs with explicit labels; destructive red for delete (215). Undo toast after skip.
- [M] Row menu popover covers the row's own text (210 cuts "Soccer pract"). Use a bottom action sheet on phone.
- [M] Scope dialog = full sheet with 3 stacked full-width buttons (Change only / Change all / Cancel). On delete (215) the "only" option is outlined red and "all" is filled red: the more destructive one is the visually primary one. Flip it: the safe option ("only this day") filled, "all" outlined.
- [L] Edit sheet banner "Changing all Tuesday practices. Other days stay as they are." in a blue box (212). Make it the sheet subtitle.

### S4. Add / edit activity sheet (212, 213, 226–230) — sheets p-sched-c, p-sched-d, p-sched-e
Keep: Type segmented (Practice/Game/Workout/Other), One day / Every week segmented, Home/Away, inline errors with icon, overlap confirm (230) with clear "Save anyway". Sticky Cancel + primary footer.
- [H] Stale error (confirmed in code): 228 and 229 show "End time must be later than start time…" under Ends = 05:30 PM while Starts = 04:00 PM. src/pages/Schedule/useActivityEditor.jsx sets formError only in saveEvent() and clears it only when the sheet opens (lines ~117/124); fixing the field does not clear it. Capture script (areas/schedule.mjs:108) fixed Ends to 17:30 after the error. Clear or re-validate the field error on change.
- [M] Long single-column form: Type, Name, Date or days, Activity date, Starts, Ends, Where, (Travel time), More options. Starts/Ends should sit side by side even at 390 (2 × 170px fits "4:00 PM").
- [M] Weekday picker = circle chips with an extra check badge on selected (229, 213). Double-encoded; use filled circles.
- [M] Repeat block is a grey inset box inside the sheet (Repeat on + Until): box-in-sheet.
- [M] Native date/time inputs show "10/13/2026" and "04:00 PM" (leading zero, US numeric date). Off-brand next to format.js output ("Tue, Oct 13", "4:00 PM").
- [L] "Travel time (min)" unit in the label in parentheses; could be a suffix inside the field.
Proposed add flow (phone), Cash App-style focused sheet:
```
╭──────────────────────────────────────╮
│ ──                                   │
│ New practice                     ✕   │
│ [Practice][Game][Workout][Other]     │  segmented, full width
│                                      │
│ Soccer practice                      │  name as a big inline field
│                                      │
│ Tue, Oct 13            Every week ○  │  date row + repeat toggle
│ 4:00 PM   →   5:30 PM                │  one row, two tappable times
│ Home | Away                          │
│ More options                     ›   │
│                                      │
│ [          Add practice           ]  │  one primary, Cancel = ✕
╰──────────────────────────────────────╯
```

### S5. School day + Rest days sheets (236–240) — sheets p-sched-e, p-sched-f
- [M] School day is a long form (name, year start/end, start/end, days, lunch & snack times, food access) in one scroll. Group into 2 steps or 2 collapsible sections: "Hours" (start, end, days, lunch) first, "School year + food access" second.
- [M] Same check-badge weekday circles (cramped at 390; 7 × 46px + badges).
- [L] Rest days sheet (238): good, short. Helper text is clear. Keep.

### S6. Calendar import (246–255) — sheets p-sched-f, p-sched-g
Keep: File / Link choice, plain-language helper ("In your team app, look for Export or Download calendar"), preview before import, duplicate detection, clear counts ("Import 20 events").
- [H] Preview (247, 253): every event row has two full-width selects (Type, Where). 20 events = 40 dropdowns, ~170px per event. Infer type/where (already done), show it as a sub-line, and let a tap on the row edit it.
- [M] Duplicate re-import (250): all rows disabled, footer "Back" + disabled "Choose events". Dead end; primary should become "Done" with a line "Everything is already in your schedule."
- [M] Count line mixes bold + regular + extra lines ("**20 upcoming events** from Lightning U14 Girls." / "1 all-day event has no start time…" / "1 past event not shown."). Three status sentences before the list.
- [L] Subscribed state (254): "Tigers 14U Baseball / Updated 10:00 AM" with "Import" and "…" both on the row.

### S7. Proposed Schedule layout (phone, 390)
Schedule-first; settings move behind one row or into You.
```
┌──────────────────────────────────────┐
│ October                    (+)  (M)  │ big month title, + = add
│ [   Week   |   Month   ]             │ full-width segmented
│ ‹  Oct 12–18                Today  › │ one nav row, same in both views
│                                      │
│ S  M  T  W  T  F  S                  │ week strip (tap to jump)
│ 11 12 (13) 14 15 16 17               │ dots under days
│ ·  ·  ··   ·· ·· ·  •                │
├──────────────────────────────────────┤
│ Mon 12                               │ sticky day header, no box
│ ● 4:00  Soccer practice      Home  … │ list rows, 56px
│                                      │
│ Tue 13   today                       │ lime dot or lime header
│ ● 4:00  Soccer practice      Home  … │
│                                      │
│ Sat 17                               │
│ ● 6:00  Soccer game   Away, leave 5:15│ game dot orange
│                                      │
│ Sun 18   Rest day                    │ rest day gets a real label/icon
│                                      │
│ School Mon–Fri 8:00–3:00        Edit │ school shown ONCE as a band/row,
│ Rest days  Sun                  Edit │ not per day
│ Team calendar  Tigers 14U       ›    │ settings as a quiet list at the end
└──────────────────────────────────────┘
```
- School day becomes a faint background band (in a day-timeline) or one summary row, never repeated per day.
- Empty week: one sentence + "Add practice" button + "Import team calendar" text action (Cash App single-focus empty state), no dashed box.
- Month view: same header + nav; grid full-bleed (no card), selected-day list below as plain rows.

## SMALL PHONE (320) — sheet p-w320
- [M] 707/708: School day sub-line wraps to "Mon–Fri · 8:00 AM–3:00 PM / · Lunch 11:30 AM": an orphan middle dot starts the second line. Direct cost of the dot-meta pattern.
- [M] 706: planned state with 3 stacked "X at home" pills ("Whole-grain bread at home", "Sunflower-seed butter at home", "Bananas at home") + 3-line H2 "Sunflower-butter banana sandwich is planned". The CTA "Mark packed" lands at the fold. At 320 the hero is 100% of the viewport before the action.
- [M] 707: settings block fills the whole fold; calendar starts below it.
- [L] "+ Add" pill takes ~95px of a 320 header.

## DESKTOP PASS (1440 / 1024) — sheets d-today-a..d, d-sched-a..c, d-w1024

### D1. Today desktop
Keep: 232px left rail with the brand mark; hero + "Your day" right column at ≥1200; dialogs become centered modals; Starts/Ends side by side in the modal (144).
- [H] Same card stack, just wider: hero card, Water card, Pack & prep card, Tonight card, blue prompt card in the main column, "Your day" card in the right column. Six boxes on one screen.
- [M] Lime CTA spans the whole hero (~430px at 1440, ~560px at 1024): a phone pattern stretched. On desktop, size the button to its label and left-align it.
- [M] Right "Your day" column is ~190px of content; sub-lines wrap ("8:00 AM–3:00 PM · / Lunch 11:30 AM", "about 2:30 PM · Banana + / pretzels"). Column is too narrow for its content, while the main column has empty space beside the hero.
- [M] Rest day (112 desktop): right column disappears (no events), leaving the hero + Water floating in the left 60% with nothing on the right. Layout loses balance on the calmest day.
- [M] Evening (162 desktop): hero scrolls away and the Tonight checklist sits below Water; same hero/content split as phone.
- [L] Chips under the date are 11-12px pills at 1440: tiny and decorative.
- [L] Toasts dock bottom-left of the main column and cover the Pack & prep / Water area.
Proposed desktop Today (≥1024): hero full width of main column, split inside: left = countdown + instruction + action, right = food choice list (alternates as rows, not pills). Below: two columns without boxes: "Your day" timeline (wider, left) and "Pack it" + "Water" (right). Left rail stays; the right aside is dropped.
```
| rail |  Tue, Oct 13                                               |
|      | ┌ pitch ───────────────────────────────────────────────┐   |
|      | │ 2 hr 30  until practice     │ Banana + pretzels   ✓  │   |
|      | │ Eat a snack by 2:30.        │ Fig bar + fresh fruit  │   |
|      | │ [Plan this]   Why?          │ Cereal cup + soy milk  │   |
|      | └──────────────────────────────────────────────────────┘   |
|      |  Your day                         Pack it          1/2     |
|      |  8:00 ● School   until 3:00       [x] In school bag        |
|      |  1:30 ── Now ──────────           [ ] Water bottle         |
|      |  4:00 ● Soccer practice  Home     Water  16 oz [+8][+16]   |
```

### D2. Schedule desktop
Keep: month grid + selected-day panel on the right (206/207) is the right desktop structure; modal add/import with side-by-side times.
- [H] Settings cards span the full width at the top (School day; Rest days + Team calendar joined). On a 1440 screen ~300px of height before the calendar, the same "one card above two joined cards" pattern.
- [H] Week view on desktop is still a vertical list of 7 day cards + a "This week at a glance" card ("3 practices / 1 game / 1 away trip"). Desktop has room for a real 7-column week (columns per day, events as colored blocks, school as a faint band). The list wastes the width and hides the week shape.
- [M] Week nav: ‹ at the far left, "Oct 12 - 18" centered, › + Today at the far right of a ~640px column: controls 600px apart. Month nav (206) puts ‹ › together at the left. Unify: ‹ › Today grouped right of the title.
- [M] "+ Add" teal filled at top right while the per-day "+" icons also exist on every day: two add entry points with different looks; fine, but the per-day "+" should only appear on hover on desktop.
- [L] "This week at a glance" is a summary card that restates counts; drop it or fold into the header ("3 practices, 1 game this week").
- [L] Import modal (247) at 1440: 2-column selects per event still; same fix as S6.
Proposed desktop Schedule: header row "October 2026   ‹ › Today   [Week|Month]   + Add"; Week = 7-column grid (Mon–Sun) with event blocks, today column tinted; settings move into a slim right aside (School hours, Rest days, Team calendar as list rows) or into You.

## CROSS-CUTTING SYSTEM CHANGES (tokens/components) for these two pages
1. Retire the default card. Introduce `surface: none` as the default section; keep exactly two raised surfaces: the pitch hero and bottom sheets/modals. (components.css card classes, --shadow-1, --rhythm-card.)
2. Kill pill chips for status/meta: date chips, "to buy" chips, alternate-food chips, TODAY/GAME/GAME DAY/PLANNED/PACKED badges. Replace with plain text, colored dots, or a check glyph.
3. Kill dot-meta strings in format.js output for these pages: build sub-lines as short sentences ("Until 3:00, lunch 11:30", "Away, leave by 5:15"). Fixes the 320 orphan-dot wrap.
4. No spaced em dash in headlines ("Lunch time — choose…", "Rest day — keep…"). Rewrite as two sentences.
5. Use Barlow numerals as the hero voice (countdown 72–88px), DM Sans for everything else. One display moment per screen.
6. Floating tab bar on phone (<768): inset ~12–16px from sides and bottom, radius 24–28, paper at ~80% opacity + backdrop-filter blur(20px) saturate, 1px --color-line at 50%, no top hairline. Active tab = ink icon + lime dot/underline, not teal text. Add `env(safe-area-inset-bottom)`. Content scrolls under it; main gets bottom padding; toasts sit above it. Matches the iOS 26 Liquid Glass inset capsule pattern (sources below). Provide a solid fallback when `backdrop-filter` is unsupported or `prefers-reduced-transparency`.
7. Hero full-bleed on phone (no side gutter, only bottom radius) so the brand color reaches the screen edge, Cash App style; drop the separate "Today"/"Schedule" top bar on phone and let the date/month be the large title.
8. One primary per screen: lime on pitch, teal on paper. Secondary = text button (no underline, 600 weight, teal). Retire underlined links inside the hero.
9. Destructive per-row X → swipe / row menu.
10. Form fields: fix stale error clearing (S4); Starts/Ends in one row on phone; filled-circle weekday picker without check badges.

## UX FLOW ISSUES (summary)
- Plan details sheet is a dead end (Close only). [H]
- Planned-state CTA sends users to Groceries instead of the next in-flow step (pack). [H]
- Evening: hero CTA builds a list that appears a screen below, under Water. [H]
- Schedule opens on settings, not the week. [H]
- Duplicate re-import ends on a disabled button with only Back. [M]
- Delete-scope dialog makes "delete all" the filled primary. [M]
- "Edit schedule" on Today duplicates the tab and row taps. [L]

## RANKED ISSUE LIST (Today + Schedule)
High
1. Card stacking everywhere: Today 5–6 boxes, Schedule 1 + 2 joined settings cards + 7 day cards (T1, S1, D1, D2).
2. Pill chips: date chips under the date, "to buy" chips, truncated alternate-food chips, status badges (T1, T2, T3, T9, S1).
3. Hero has two competing headlines + paragraph + 4 pills + CTA + 2 links: no single focus (T2).
4. Schedule opens on settings; calendar below the fold on phone and 320 (S1, 707).
5. Week view: school day repeated every weekday; 7 card list; desktop doesn't use a week grid (S1, D2).
6. Evening Tonight list split from its hero (T6).
7. Plan details sheet dead end; planned CTA goes to groceries (T3, T8).
8. Stale "End time…" error persists after the fix (S4, code-confirmed).
9. Docked, dated tab bar vs brief's floating translucent bar (T1, system #6).
10. Import preview = 2 selects per event (S6).
Medium: dot-meta strings + 320 orphan dot; ALL-CAPS badges; spaced em dash headlines; Now bar too heavy; water lacks visual progress; per-row X; blue info-tint prompt; delete-scope emphasis inverted; weekday check badges; inconsistent nav for week vs month; native date/time formats; desktop narrow right column + rest-day imbalance; full-width CTA on desktop.
Low: "Oct 12 - 18" hyphen; footer privacy line on Schedule; Copy list icon mismatch; "This week at a glance"; "Edit schedule" duplicate; travel-time unit in label.

## Sources
- Apple WWDC25 session 284 (tab bar and sidebar lifted into Liquid Glass, floating above content): https://developer.apple.com/videos/play/wwdc2025/284
- iOS 26 inset capsule tab bar, glass on the nav layer only, no glass-on-glass (third-party summaries): https://learnui.design/blog/ios-design-guidelines-templates.html , https://theswiftk.it.com/blog/liquid-glass-ui-swiftui-ios-26-tutorial
- Cash App Dec 2025 design language (bold brand color, own type, single-focus): https://www.abduzeedo.com/cash-apps-new-design-language-and-ai-assistant-moneybot
- Floating bottom nav as a current mainstream pattern (WhatsApp following iOS): https://www.techloy.com/whatsapp-android-navigation-bar-iphone-like/
Note: I could not confirm Cash App itself uses a floating tab bar; the floating recommendation rests on the owner brief + iOS 26 platform direction.
