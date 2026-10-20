# Food review (Ideas, At home, Groceries, Log, search, barcode, tabs)

Started 2026.10.15. Read-only review. Notes appended as I go.

Inputs read: frontend-design SKILL.md; src/styles/tokens.css, components.css, food.css; phone fold captures first, then desktop.

## Design-system read (tokens / components / food.css)

- Palette worth keeping: paper #f7f6f2, ink #14333c, pitch #0f3640, primary teal #08777c, lime #d7f45f, warm tints for warnings. Fonts DM Sans + Barlow Semi Condensed numerals. Good base; problem is structure, not color.
- `.card` = 1px line + radius-lg 16 + shadow-1, used for every idea, planned meal, summary, prompt. `.card-list` stacks them 16px apart. This is SKILL.md tell #4 (SaaS-card kit: identical rounded cards, one radius, same soft shadow).
- Two pill-ish controls: `.food-sections` (segmented tabs in a muted tray, 40px) and `.segmented` for moments look the same, so section nav and filter read as equal rank.
- `.idea-chip` (28px tinted chips, one per ingredient), `.reason-chip`, `.badge` (Barlow 12px UPPERCASE +0.04em) and `.chip-group` 36px full-radius pills: exactly the "small pill chips for short text" the owner wants gone. `.badge` is also SKILL.md tell #5 (all-caps label).
- Rows (`.stock-row`, `.grocery-row`) already use hairline-separated list rows: this is the right primitive; extend it, drop cards.

## PHONE pass (390 fold)

### Ideas (301-309)

What works (keep)
- Plain-language idea names ("Banana + pretzels"), short why-line, "Packs well / No fridge needed" facts. Good content.
- Moment selector concept (Now / Before practice / After practice / Tomorrow) is the right top-level organiser.
- Toast "Food planned. Undo" is correct pattern.

Problems
- H: Above-the-fold budget: title row + Food tabs tray + moment tray + context line + allergy banner = ~300 of 844px before the first idea. Only one full idea is visible. Two stacked grey trays of the same style read as two equal nav levels (hierarchy problem).
- H: Every idea is a bordered, shadowed card with its own full-width teal "Plan this". 4-6 identical primary buttons per screen = no single primary action (owner: far fewer cards; Cash App: one action).
- H: Ingredient list rendered as one tinted chip per line ("Buy: 1 banana", "Buy: 1 small bag of pretzels") + an extra all-caps "BUY 2 ITEMS" badge saying the same thing. Three encodings of one fact; badge is SKILL.md tell (all caps label). Chips are small pills for short text (owner veto).
- H: Planned state (308/309) shows "Planned today" card ABOVE the same "Banana + pretzels" idea card, which still offers "Plan this". Duplicate + separated card over stacked cards = exactly the layout owner called unappealing.
- M: Meta joined with middle dots ("Soccer practice at 4:00 PM · Tue, Oct 13", "Eat around 2:30 PM · Planned") = tell #5.
- M: Moment tray clips "To..." at the right edge; reads as broken rather than scrollable.
- M: Card menu (305) holds "Add missing to groceries" - the most useful next step is hidden behind "...". "Not for me" and "Save as favorite" are fine in the menu.
- M: Allergy line as a full-width tinted box each screen; required text, but it can be a quiet single line, not another box.
- L: Title on two lines ("Cereal cup + shelf-stable soy milk") pushes "..." menu out of alignment with the first line.
- L: Food tab icon in tab bar and tray "Ideas" both selected states: double "you are here".

### Ideas states (316-323)

- M 316 low-cost: "Showing low-cost ideas. [Show all]" adds a fourth header row with an outlined button. Make it a toggle option inside the moment/filter row ("Low cost" on/off) or a single text line with a text-button.
- M 317/319 empty: dashed-outline box (another box) with centered text and two outlined secondary buttons, no primary. 317 copy uses spaced em dash ("Pack a snack next time — see ideas for tomorrow") = tell #5. Better: no box, left-aligned big statement + one primary ("See tomorrow's ideas") + text link.
- M 318 "Hidden Bagel or toast + jam. Undo": toast copy reads like a system log. Use "Bagel or toast + jam hidden. Undo". Toast also covers the "Saved on this device" footer line.
- M 320 Sunday / 321 away: context line is weak ("Sunday") or doubled (two grey lines + em dash "Away activity — showing foods that travel well"). One context headline per moment.
- H 322/323 READY badge: "READY – YOU HAVE EVERYTHING" = all-caps + "WORD – fragment" construction, both SKILL.md tell #5. Have-items shown as green check chips, one per line: chip overload.
- H 322/323 again duplicates: "Planned today" card + the same sandwich as an idea card right below. Planned item should replace the idea in the list (or the list starts below a single hero).
- Keep: Planned card's single button changes with the step (Plan -> Mark packed -> Log it). This is the best flow pattern in Food; make it THE hero.
- L Tab-tray indicators: At home dot + Groceries "3" filled circle. Useful signals; the circle count is fine but use plain numeral next to label ("Groceries 3") to avoid another pill.

#### Ideas redesign (phone)

One hero for the next moment, then a card-less list (Spotify rows). Moments become a quiet text-tab row; section tabs move to a single underline tab row.

```
Food                                  (M)
Ideas   At home   Groceries•3   Log        <- one underline tab row, no tray
---------------------------------------------
Now  Before practice  After practice  Tmrw >  <- text tabs, active = ink + 2px lime/teal underline
Soccer practice in 2 hr 30 min               <- 20px context, ink-muted

[ PLANNED HERO - pitch #0f3640 full-bleed block, radius 24 ]
  Eat around 2:30 PM
  Sunflower-butter banana sandwich          <- 28px
  You have everything.                      <- or "Need 2: banana, pretzels"
  [      Mark packed      ]  lime button    <- the one primary on screen

More ideas                         Low cost o
[img] Banana + pretzels               +
      Need banana, pretzels · packs well
[img] Fig bar + fresh fruit           +
      Have it all · no fridge
[img] Applesauce pouch + rice cakes   +
Allergies: check every label.               <- quiet caption line, not a box
```
- Rows: 56x56 rounded food art tile on left (illustration or emoji-free colored glyph), name 17px, one muted line summarising "Have it all" / "Need 2: banana, pretzels". Trailing "+" icon button = Plan. Tap row = details sheet with full ingredients, Add missing to groceries, Save, Not for me.
- With no plan yet, the hero is the top-ranked idea with "Plan this" as the one primary; the rest are rows.
- Ingredient chips and BUY badge go away; ingredients move to the details sheet as a plain checklist (have = check, need = empty circle).

### At home (331-344)

What works (keep)
- Hairline-separated stock rows (no card per item) - closest thing to the target style already in the app.
- "2 low or out -> Add to groceries" summary: the right bridge from At home to Groceries.
- Edit sheet fields are plain and well labelled; "Counts as" helper text explains why it matters.
- Undo toasts on stock change; merge prompt prevents duplicates.

Problems
- H: Three stacked segmented trays of the same visual style: section tabs, All / Low or out / In my bag, then a Have/Low/Out tray on every row. Plus "..." on every row. Each row = 4 controls; screen = ~30 tap targets. Busy, not minimal.
- H: Row controls are inconsistent: Have/Low/Out tray vs "- 6 left +" stepper vs "- 0 left +" (0 left is not flagged as out, so the low/out summary and the row disagree visually). Column widths jump.
- H: "Add food" primary sits alone right-aligned on its own 64px row above the filter; the low/out box is the more urgent action and gets the secondary outline button.
- M: Quick add / Quick basics = outlined pill buttons "+ Bananas" that clip at the right ("Frozen b"). Pills for short text (owner veto) and the clip looks broken.
- M: Empty (331): dashed-outline box, centered copy, no button inside; the primary is up top. Empty should be the invitation (SKILL.md: "An empty screen is an invitation to act").
- M: Row menu (335/336) has 7 items incl. "Move to fridge / Move to freezer / Move to my bag" as three lines. Collapse to "Move to..." submenu/sheet.
- M: Add food dialog (341/343): every result row has a star + an outlined "Add" button = column of identical boxes. Raw USDA casing ("Cereals ready-to-eat, GENERAL MILLS, CHEERIOS") shown as-is; meta joined with middle dots ("Basic food · 1 medium, 182 g") = tell #5. "Allergens: check the package." repeated under every branded row on top of the banner.
- M: Merge prompt (342): "Update it" and "Keep both" are equal outline buttons; make "Update it" primary.
- M: Counts as? (344): a select of category names is abstract for a 15-year-old; sentence repeats raw USDA name. Use large tappable category tiles (Dunkin-style) with a short "Skip".
- L: 339 "details-sheet-error" fold shows the page + toast, not a sheet error: capture may have missed the state (check full/desktop).

#### At home redesign (phone)

```
Food                                  (M)
Ideas   At home•   Groceries 3   Log
---------------------------------------------
Search or scan food           [scan]       <- one field = Add food (opens search sheet)

4 running low or out        Add to list    <- plain row, warning-colored count, text button
---------------------------------------------
All   Low or out   In my bag                 <- text filters, same style as moment tabs

Kitchen & pantry
[ic] Bananas                     0 left  v   <- trailing status word, colored: Out=error, Low=warning
[ic] Apples                        Low   v
[ic] Whole-grain bread          6 left   v
[ic] Tortillas                     Out   v
Fridge
[ic] Greek yogurt                 Have   v
```
- One trailing control per row: tap status -> anchored menu "Have / Low / Out" (or stepper for exact items) + "Move to...", "Edit", "Remove". Cuts row from 4 controls to 1. Tradeoff: 2 taps instead of 1 to change stock; worth it for calm. Optional power path: tap row name = details sheet.
- Left 40px category glyph tile (fridge/freezer/pantry or food art) gives the Spotify "art left" rhythm.
- Quick add moves into the search sheet as a scrollable row of food tiles (square tiles with art + name), not pills.
- Empty: big left-aligned "What's in your kitchen?" + the search field as the primary + 6 starter tiles in a 3x2 grid (Bananas, Apples, Bread, Oats, Yogurt, Pretzels) - one tap each.

### Groceries (351-364, plus Today 125/133 hand-offs)

What works (keep)
- List rows with big circle check, strike-through when checked, no cards: good, Spotify-like.
- Sticky full-width "Finish shopping (1)" = one clear primary at the moment it matters (Cash App pattern).
- Put-away sheet (361) + toast "7 items added to At home. Undo" closes the loop Groceries -> At home. Good flow.
- Week suggestions as a checklist sheet (352) driven by the real schedule ("Based on 4 practices and 1 away game") - strong, specific content.
- Past trips with Undo trip.

Problems
- H: Empty (351/362): the best action, "Suggest for this week", is styled as a small teal link-like heading; then a dashed empty box says "Your list is empty". The suggestion should be the hero with a primary button and the item count.
- H: Every row carries a grey tag chip ("For Sat away game", "For Tue practice") that truncates with prices on ("For Sat away ga...", "For Tue practi..."). Chips for short text (owner veto). Group by reason instead: section headers "For Sat away game" / "For Tue practice" and drop the per-row chip.
- H: Week suggestions sheet starts with nothing selected and "Add selected" disabled: the whole list is the suggestion, so default to all checked; primary "Add 8 to list".
- M: Checked items stay in place mixed with unchecked; on a long list you scroll past done items. Move checked into a collapsed "In cart (3)" group at the bottom (shopping-app norm).
- M: Top row is share icon + "Add food" primary again, above the content. Add should be an inline "Add item" row/field at the end of the list (or the shared search field), not a header primary competing with Finish shopping.
- M: Price estimate total "About $17.00 for 4 of 4 items · Budget $40.00" sits at the very bottom after Past trips. Put the running total in the finish bar ("3 of 4 · about $13.50   [Finish shopping]") - Dunkin checkout pattern: total beside the one button.
- M: Two bottom bars stack (Finish shopping bar directly on the tab bar). With a floating translucent tab bar, the finish bar should sit just above it as one floating group.
- M: Put-away sheet: 7 identical bordered selects; "New at home" sub-label repeats 7 times. Show place as text ("Kitchen  v") and pre-fill; only exceptions need a tap.
- L: 359 "undo-trip-confirm" fold shows the post-undo toast, not a confirm; toast copy "Trip undone. Those items are back on your list." fine. Confirm state may be uncaptured.
- L: 360 "Everything's checked. Finish shopping?" line partly hidden under the toast.
- L: Middle-dot meta ("Bananas · 1 bunch", "1 box · about $3.50") = tell #5; use two lines or a comma.

#### Groceries redesign (phone)

```
Food                                  (M)
Ideas   At home•   Groceries 3   Log
---------------------------------------------
[ WEEK HERO - pitch block, shown when list empty or suggestions are new ]
  This week: 4 practices, 1 away game
  8 foods to cover it                         <- 28px
  [  Add 8 to my list  ]   lime              <- one primary; "Choose" text link opens sheet

For Sat away game                    3 left
( ) Crackers                         1 box
( ) Pretzels                         1 bag
For Tue practice
( ) Canned beans                    2 cans
( ) Eggs                          1 carton
+ Add an item                                 <- inline row opens search sheet

In cart (2)                             v     <- collapsed

               ...content...
 ╭────────────────────────────────────────╮
 │ 2 of 6 · about $8.00   [Finish shopping]│  <- floating, sits above floating tab bar
 ╰────────────────────────────────────────╯
 ╭──Today──Schedule──(Food)──You──╮            <- translucent floating tab bar
```
- Row tap = check; long-press/trailing "..." only on hover/desktop; on phone swipe-left reveals Swap/Remove (with a menu fallback in the row sheet for accessibility).
- Finish shopping opens the put-away sheet directly (already does); keep it, but make places pre-filled text.

### Log - Day and Week (381-392)

What works (keep)
- Single timeline mixing food entries and the practice ("4:00 PM  Soccer practice until 5:30 PM"): exactly the app's point (food timed to sport). Time in a left column = Spotify-like row rhythm.
- "Did you eat X? [Yes, as planned] [Changed it]" closes the plan -> log loop in one tap. Best interaction in Log.
- "Used whole-grain bread from home? Yes/No" (388) closes the log -> At home loop.
- Week list rows (389) are card-less, one line of facts + chevron. Good.
- Tone: "This is a record of what you logged. It is not a score." / "logging is optional" - right for 14-18.

Problems
- H: Stack of four controls before any entry: section tabs, Day/Week tray, date switcher row, full-width "Log food" button. Then the plan prompt is a card, allergy line is a box, Water is a card, week strip below. Four box styles on one screen.
- H: Week table (390) on phone: 4 cramped columns, header clipped ("(planned food)"), cells wrap ("Nothing / logged"), "None" everywhere. Tables do not belong at 390; the week list already says the same. Hide the table below 768.
- M: "SOCCER PRACTICE" all-caps badge with dot (389/392) = tell #5 (the only uppercase style in the system, used as decoration). Use the activity color dot + sentence-case "Soccer practice".
- M: Meta strings with middle dots everywhere ("Today · Tue, Oct 13", "2 foods logged · 8 oz", "Nothing logged · No water logged") = tell #5. Week rows: show just what exists ("2 foods, 8 oz water"); omit the "No water logged" negatives - they read as nagging.
- M: Yesterday (382) adds a "Back to today" link row on top of the < > switcher. Make "Today" a tappable chip-free text in the switcher instead of an extra row.
- M: Edit entry error (386) and portion error (404): Amount set to 0 -> Save greys out, but no error text is visible in the fold. Disabled-without-reason. Show "Enter an amount above 0." under the field and keep Save enabled to trigger it.
- M: Water card "+ Water" outlined pill-ish button: make Water a row in the timeline footer ("Water 8 oz  [+ 8 oz]") with a quick-add of one glass, not a card.
- L: 391 copy uses spaced em dash ("That's fine — logging is optional") = tell #5. "That's fine. Logging is optional."
- L: 405 entry shows "Banana chips — Great Value  1 g" after logging the 28 g usual portion in 403; verify the capture flow vs a units bug.

#### Log redesign (phone)

```
Food                                  (M)
Ideas   At home   Groceries 3   Log
---------------------------------------------
<  Today, Oct 13  >              Day | Week   <- one row: date switcher + text toggle
                                              
[ PROMPT BLOCK - pitch, only when a plan is due ]
  Did you eat the sunflower-butter
  banana sandwich?
  [ Yes, as planned ] lime     Changed it    <- text link secondary

1:30 PM   Apples                     182 g
4:00 PM   • Soccer practice   until 5:30 PM   <- activity color dot, muted
6:00 PM   Banana chips                 28 g
Water     8 oz                     + 8 oz
Allergies: check every label.               <- caption, no box

 W  T  F  S  S  M  T                          <- week strip stays, as plain dots
                     ╭────────────╮
                     │ + Log food │          <- FAB-style pill? NO: full-width floating button above tab bar
```
- "Log food" moves to a floating primary above the tab bar (same slot as Finish shopping on Groceries) so the timeline starts at the top.

### Food search dialog (401-409) and barcode (421-424)

What works (keep)
- Search + scan icon in one row; Recent foods first; offline (408) explains what still works; "Can't find it? Add it yourself" escape hatch on every state.
- Product found (424) lists allergens with the "may be incomplete, check the package" honesty.

Problems
- H: Result rows each have star + outlined "Add" button + "Allergens: check the package." line, under an "Allergies: check every label." banner. Visual noise and double warning. Keep the required banner once at the top of the sheet (product view rule) and drop the per-row line; make the whole row tappable ("Add" becomes a trailing "+" icon).
- H: Barcode not found (423): "We couldn't find that barcode. Add the food yourself." but no button to do it - dead end except "Back to search". Add a primary "Add it yourself" prefilled with the barcode.
- H: Scanner layout has no primary: "Use camera" outlined, "Take photo" disabled grey, "Look up product" grey outline, "Back to search" outline - four similar boxes. Make camera viewfinder the hero (big rounded viewport with a lime scan line), manual number entry a single field + primary "Look up".
- M: Error (407) "Food provider unavailable or product not found." is vague (SKILL.md: errors are never vague about what happened). Say "Food search isn't responding. Try again, or add the food yourself." with Retry primary.
- M: Raw database casing and long names ("Cereals ready-to-eat, GENERAL MILLS, CHEERIOS", "Bread, banana, prepared from recipe, made with margarine"). Normalise to sentence case and put brand on line 2.
- M: Portion step (403) asks for grams in a text field + unit select + time. For a teen logging a snack, offer portion tiles ("Half", "1 cup (28 g)", "2 cups") as big tappable choices (Dunkin quantity picker) with "Other amount" revealing the field.
- M: Add it yourself (409) pre-fills the name "Food" and 100 g; pre-fill with the search query instead.
- L: Quick basics row is pills ("+ Bananas") and clips at the right edge; at 320 (718) the heading shows with no row visible above the link.

### Food section tabs (all screens, 610, 709-713)

- H: Tabs are a segmented tray (muted fill, selected = white box with border + shadow). Same look as moment, filter, Day/Week and Have/Low/Out trays, so primary nav is visually equal to a filter. At 320 (709-713) the four labels touch the tray edges and the selected box hugs the text; "Groceries 3" circle badge crowds it.
- M: Sticky tray plus page title "Food" plus bottom tab "Food" active: three layers of "you are in Food".
- Proposal: plain underline tabs, left-aligned, 17px semibold, active = ink + 3px lime/teal bar, inactive = ink-muted; horizontal scroll at 320 with a fade mask instead of squeezing. Counts as plain numerals after the label ("Groceries 3"), dot stays for low stock. Second-level choices (moments, filters, Day/Week) become smaller text toggles, never another tray.

### Phone at 320 (709-713, 718)

- H: At home row controls collapse to icon-only Have/Low/Out (check, battery, crossed circle). Icons are cryptic and the row now has 6 boxes. The trailing status word proposal fixes 320 too.
- M: Names break mid-word ("Whole- / grain bread", "Sunflower- / seed butter"); tabs and moment row clip ("After prac").
- L: Day prompt buttons stack full width at 320 - fine, but card padding + inner buttons make it the tallest thing on screen.

### Phone full-page pass (301, 322, 332, 381, 364)

- H Ideas full (301): 6 identical cards = 6 teal "Plan this" buttons in one scroll, ~2,670px of page. Reads as a template grid, not a curated pick. With rows (proposal above) the same 6 ideas fit in ~1 screen below the hero.
- M Ideas full (322): ready ideas ("READY - YOU HAVE EVERYTHING") and buy ideas look nearly the same; the difference is only chip tint. In rows, lead line 2 with "Have it all" in success color vs "Need 2" in ink-muted - one word carries the state.
- M Ideas end: "Show more ideas" outline pill + "Ideas are examples, not amounts you must eat." + footer. Keep the examples line (safety rule) as the caption under the list heading instead of at the very bottom.
- M At home full (332): Quick add pills sit at the bottom under every section, far from "Add food" at the top: two add entry points at opposite ends.
- M Groceries full (364): list ends at ~half screen, then "Past trips" link and the price total float in space, total is 70px above the finish bar but not in it.
- L Every Food tab ends with "Saved on this device. Food search uses online food databases." Fine once, ideally in You/About; on Food it is repeated footer noise.
- Note: full-page captures show the tab bar mid-page (fixed element in a stitched shot); not a product bug.

## TABLET (643, 644) and DESKTOP (1440 fold) pass

- H Tablet Ideas (643): the "Planned today" card sits alone at half width, then a 2-column grid of idea cards below it. This is literally the owner's "separated card above two connected cards". Same on desktop 322 (one planned card, then a 3-column grid).
- H Desktop Ideas (301/322): 3-column grid of identical rounded cards, each with chips, an all-caps badge and its own teal button = SKILL.md tell #4 (SaaS-card kit). The moment tray stretches the full 960px with four tiny labels; the Food section tray above it is only ~210px wide. Two nav rows, two different widths, same style.
- H Desktop content widths jump per tab: Ideas ~960, At home list ~470 + "Low or out" aside card, Groceries list ~340 + aside, Log ~390 + Water card aside. Switching tabs makes the page jump; lots of unused paper on the right at 1440.
- H Desktop Groceries (354): "Finish shopping (1)" is a floating shadowed button in the right column next to "Suggest for this week". The primary drifts away from the list it finishes. Empty (351): dashed "Your list is empty" box on the left, the useful "Suggest for this week" as a small link in the aside.
- M Desktop At home (332): "Low or out / Apples, Tortillas / Add all to groceries" becomes a separate aside card; on phone it is a tinted bar. Same content, two treatments.
- M Desktop Log (381): Water becomes an aside card + week strip; "Log food" is a 390px full teal bar. Week view (390) has list + "View as table" disclosure: good on desktop, keep.
- M Dialogs: search and scanner are centered 640px modals. Scanner modal (421) is fixed-tall with half its height empty. Put-away modal (361) is good (dense rows, one primary).
- L Rail: "Maya / Add" footer is fine; Food active = small green bar + teal text. Keep.

#### Desktop/tablet direction
- One content frame for all Food tabs: 720px main column + 320px right panel at >=1200 (tokens already have --width-reading 720 and --width-aside 320). The panel is contextual, not a card: Ideas -> selected idea detail (have/need ingredients, Plan this, Add missing); At home -> selected item detail/edit (replaces the modal); Groceries -> trip summary with total + Finish shopping; Log -> week strip + water.
- Gives desktop the Spotify two-pane feel (list left, "now playing"-style detail right) and removes most modals on desktop.
- Below 1200 the panel content folds back into the hero block (phone layout).

```
| rail |  Food                                                     |
|      |  Ideas  At home  Groceries 3  Log                          |
|      |  Now  Before practice  After practice  Tomorrow            |
|      |  [ PLANNED HERO (pitch) ........ ] |  Banana + pretzels   |
|      |  More ideas                        |  Need: banana,        |
|      |  [art] Banana + pretzels      +    |        pretzels       |
|      |  [art] Fig bar + fresh fruit  +    |  [ Plan this ]        |
|      |  [art] Cereal cup + soy milk  +    |  Add missing to list  |
```

## FLOW REVIEW (plan -> add missing -> shop -> put away -> pack -> log)

1. Plan: Ideas "Plan this" (1 tap). OK, but the idea stays in the list as a duplicate (H).
2. Add missing: the planned card shows "Add 2 items to groceries" (good), but from an unplanned idea it is hidden in the "..." menu (M). Today's toast offers "View list" (good). Proposal: after Plan this, the hero shows "Need 2: banana, pretzels [Add to list]" as its primary until added; then the primary becomes "Mark packed".
3. Shop: Groceries list, check items, "Finish shopping". Good. Checked items should collapse; total belongs in the finish bar.
4. Put away: sheet with per-item place select -> "Add to At home". Good loop; default places silently, show as text.
5. Pack: "Mark packed" on the Ideas planned card and Today hero. Good. No link from packed to At home "In my bag". Packed items could move to "In my bag" automatically (M, behaviour question for owner).
6. Log: "Did you eat X? Yes, as planned" on Log, "Log it" on Ideas/Today. Then "Used whole-grain bread from home? Yes/No" asks one item at a time (388). Proposal: one sheet "Took from home: bread, banana, sunflower butter [Update At home]" (M, fewer taps).

Dead ends found
- H Barcode not found (423): message says add it yourself, but there is no button for it.
- M Search error (407): vague message; only Retry.
- M Week suggestions sheet opens with nothing selected and the primary disabled (extra taps for the common case).
- M Empty Groceries: the best next step (Suggest for this week) is a small link.
- L Ideas empty no-access (317) offers only "Ideas for tomorrow"; no "Log what you ate" path.

## REFERENCE PATTERNS USED (grounding)

- Spotify: third-party summaries of Encore say color comes mainly from artwork, with the one accent reserved for play, active nav and primary CTA (https://blakecrosley.com/guides/design/spotify, https://www.shadcn.io/design/spotify). Applied: rows with art on the left, lime reserved for the single primary per screen. No official list-row spec found.
- Cash App: DesignRush notes bold color and large text (https://www.designrush.com/best-design/cash-app); a third-party style reference says depth comes from type scale and whitespace, not shadows (https://styles.refero.design/style/bbfbe753-a417-43ec-9af7-ef6c08a5140d). Applied: drop card shadows, use 28-36px type for hero facts, one primary per screen. Secondary sources only.
- Dunkin: older coverage of Dunkin' Run describes ordering through interactive product images plus favorites / previous orders (https://hospitalitytech.com/dunkin-donuts-makes-group-orders-faster-easier-mobile-app). Applied: big food tiles for Quick add, Counts as?, empty At home and portion choice; "Recent" first in search. No current Dunkin app case study found.

## WHAT TO KEEP (Food-wide)
- Color tokens as-is (paper, ink, pitch, teal, lime, warm tints). Use pitch + lime for exactly one hero block per tab, like Today's hero (125/133), already the best-looking surface in the app.
- Hairline list rows, circle checks, undo toasts, the plan/pack/log state button, schedule-aware copy, timeline with activities.
- Safety: "Allergies: check every label." stays on every product view (search, add, details, ideas) as a quiet caption line in warning ink, once per view. No "safe" wording, no calorie targets. Proposals keep this.

## RANKED ISSUE LIST

High
1. SaaS-card kit everywhere: every idea/planned meal/prompt/water block is a bordered shadowed card; 6 teal "Plan this" per scroll (Ideas phone, tablet and desktop grids).
2. Separated planned card above a stack/grid of idea cards, duplicating an idea that still says "Plan this" (308, 322, 643).
3. Four look-alike segmented trays (sections, moments/filters, Day/Week, Have/Low/Out): nav and filter look equal; ~300px of chrome above content on phone.
4. Chip overload: one tinted chip per ingredient, "For Tue practice" tag per grocery row (truncating), pill Quick add, plus ALL-CAPS badges "BUY 2 ITEMS", "READY – YOU HAVE EVERYTHING", "SOCCER PRACTICE".
5. At home rows carry 4 controls each; stepper vs tray inconsistent; icon-only tray at 320 is cryptic.
6. Groceries: best action ("Suggest for this week") is a small link; suggestions sheet starts unselected; total far from Finish shopping; desktop Finish button floats in the aside.
7. Barcode not-found dead end; scanner screen has no primary.
8. Search results: Add button + star + per-row allergen line on every row; raw USDA casing.
9. Log: four control rows before entries; cramped phone week table; disabled Save with no error message (386, 404).
10. Desktop/tablet widths and layouts change per tab; grids of cards instead of list + detail.

Medium: middle-dot meta and spaced em dashes throughout (tell #5); dashed-outline empty boxes with no primary; merge prompt equal buttons; put-away selects; row menu with 3 "Move to" items; vague search error; "Add it yourself" prefilled "Food"; "Hidden X" toast copy; repeated "Saved on this device" footer; one-item-at-a-time from-home prompts.

Low: title wrap misaligns "..."; tab badge circle; mid-word breaks at 320; captures 339/359 may not show the named state; 405 "1 g" entry to verify.

## PROPOSED DIRECTION FOR FOOD (summary)
1. Lists, not cards: every collection is a hairline row list with a 48-56px art tile on the left, name + one muted line, one trailing action. Cards survive only as the single pitch hero per tab.
2. One hero, one primary per tab: Ideas = planned meal / top pick; Groceries = this week's list or Finish shopping; Log = "Did you eat X?"; At home = low/out to list. Lime button on pitch; everything else is a text button.
3. Flatten navigation: underline section tabs; moments, filters and Day/Week as quiet text toggles; status words instead of Have/Low/Out trays; no pill chips, no all-caps badges.
4. Tiles where choosing food: Quick add, empty At home, Counts as?, portion size use big tappable food tiles (Dunkin) instead of selects and pills.
5. Phone-first floating chrome: translucent floating tab bar with the screen's primary (Log food / Finish shopping / Add to list) floating just above it; desktop = 720 list + 320 contextual detail panel replacing most modals.

Sheets used: review/sheets/food-ph-*.png, food-dt-*.png, food-tablet.png. Review complete 2026.10.15.
