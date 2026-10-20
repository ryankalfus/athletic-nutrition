# Nourally UX/UI redesign checklist

Source of truth: [UX-REDESIGN-PLAN.md](UX-REDESIGN-PLAN.md). Read the item there (Change, Reason, Files, Depends on, Size, Risk, Done when) before each change. Product rules, safety rules and owner decisions stay in [CLAUDE-REDESIGN-AUDIT.md](CLAUDE-REDESIGN-AUDIT.md) and [REDESIGN-CHECKLIST.md](REDESIGN-CHECKLIST.md).

**Status key:** unchecked = remaining; checked = built and accepted. Tick a phase item only when its "Done when" passes and `npm run check` and `npm run test:browser` pass (AGENTS.md). Tick a recommendation ID when the build item that closes it is ticked (the last one, where two items share an ID). Partial work stays unchecked and gets a note on its line: `— Partial yyyy.mm.dd: what is done, what is left.` **Blocked — owner** = waits for a decision recorded below. Build in phase order (U1 → U10) and in item order within a phase.

**Safety rules every item keeps** (AGENTS.md): allergy filtering stays off (`ALLERGY_TAGS_REVIEWED = false`); no control claims to filter an allergen; Gluten-free, Nut-free and Dairy-free stay hidden; never call a food safe; "Allergies: check every label." on every product view; no calorie target, goal or prescription; ideas are examples.

## Phase tracker

**Status 2026.10.20:** U0 done (1/1). U1 in progress (4/6); U1–U10 4/48. Recommendation IDs done: 16 of 225. The 225 are the 218 of the plan, UX-CMP-23 (decision A) and six added on 2026.10.20 when the old lists were reconciled: UX-SET-08, UX-BUG-22 and UX-TEST-07 to UX-TEST-10, with build item U10-02.

### U0 — Full review (done 2026.10.15)

- [x] **U0-01** — Review every screen, modal and pop-up, desktop then phone. Done 2026.10.15: 462 desktop and 450 phone captures (508 states) in `output/ux-review/desktop/` and `output/ux-review/phone/`, indexed in `CAPTURES.txt` and `INDEX.txt`; uncaptured states with reasons in `not-captured.txt`; review notes `output/ux-review/review/today-schedule.md`, `food.md` and `setup-you-global.md`; 56 contact sheets in `output/ux-review/review/sheets/`.

### U1 — Bugs, guards and tooling (no visual redesign)

- [x] **U1-01** — Validation that clears and explains. Closes: UX-BUG-01, UX-BUG-02, UX-BUG-03, UX-BUG-06. Done 2026.10.20: one shared hook (`useFieldValidation` in `FieldError.jsx`, rules in `src/domain/validation.js`) used by setup steps 1–3, the activity sheet, the School day sheet, You sheets and the portion sheet; checks (a) `browser-you.js`, (b)–(d) `browser-setup.js` and `browser-schedule.js`, (e) `browser-log.js` (Edit food and the portion step), (f) `domain.test.js` "Profile save rejects an empty sport"; each browser check failed on the old code. `npm run check` (197 unit tests) and 25/25 browser scripts pass.
- [x] **U1-02** — Safe areas on iPhone. Closes: UX-NAV-07, UX-BUG-04. Done 2026.10.20: `index.html` viewport is `width=device-width, initial-scale=1, viewport-fit=cover`; the top bar, the desktop rail, the sticky setup header and the no-top-bar shell pad by `env(safe-area-inset-top)`, and sticky rows under the top bar (Food sections, Log day switcher, Schedule week switcher) move down by it. `tests/styles.test.js` "U1-02" (failed before the fix) checks the meta and every sticky or fixed top rule; `browser-shared-ui.js` checks the live meta and an unchanged 56 px bar. `npm run check` (198 unit tests) and 25/25 browser scripts pass.
- [x] **U1-03** — Dead ends. Closes: UX-FLOW-05, UX-FLOW-06, UX-FLOW-07, UX-BUG-07, UX-BUG-13, UX-BUG-14, UX-BUG-18. Done 2026.10.20: (a) a not-found barcode shows a primary Add it yourself whose form carries the barcode (`browser-search.js`); (b) "trail mix" with no results → Add it yourself shows name "trail mix" and an empty amount (`browser-search.js`, `domain.test.js` `manualFood`/`startingAmount`); (c) a third import of the same `.ics` says "Everything in this calendar is already in your schedule." with an enabled Done that closes the sheet (`browser-calendar-import.js`, `browser-journey.js`); (d) the suggestions sheet opens with all 8 checked and "Add 8 to list", unchecking one reads "Add 7 to list" (`browser-food-workflow.js`). Each check failed on the old code. `npm run check` (199 unit tests) and 25/25 browser scripts pass.
- [x] **U1-04** — Controls that tell the truth. Closes: UX-BUG-15, UX-BUG-16, UX-BUG-17. Done 2026.10.20: (a) with reminders on and notifications denied, "How long before" and the evening reminder are `disabled` and dimmed (`browser-you.js`); (b) Add practice, School day, Sport & season, Food access & budget and Reminders opened by mouse focus the sheet title (`tabindex=-1`) with `:focus-visible` false on the X (`browser-dialogs.js`); a keyboard open still starts on the first control (`browser-a11y.js`), and the two search sheets (Log food, Add to groceries) keep their search field focused as P1-08 requires; (c) "Delete only" is the filled destructive button and "Delete all" a text button (`browser-schedule.js`). Each check failed on the old code. `npm run check` (199 unit tests) and 25/25 browser scripts pass.
- [ ] **U1-05** — Data correctness and the undo ledger. Closes: UX-BUG-19, UX-BUG-20, UX-BUG-22. Also closes (REDESIGN-CHECKLIST): KEEP-15 and the §13.8 line "Every write gives feedback; every reversible write offers Undo".
- [ ] **U1-06** — Capture harness, seed names and the rules check. Closes: UX-TEST-01, UX-TEST-02, UX-TEST-03. Also closes (REDESIGN-CHECKLIST): COPY-38.

### U2 — Tokens and copy foundation

- [ ] **U2-01** — Token plan. Closes: UX-DS-01, UX-DS-03, UX-DS-06, UX-DS-08, UX-DS-09.
- [ ] **U2-02** — Formatters write sentences. Closes: UX-COPY-01, UX-COPY-02, UX-COPY-03, UX-COPY-04, UX-COPY-06, UX-BUG-08, UX-BUG-09.

### U3 — App frame and the floating tab bar

- [ ] **U3-01** — Phone floating tab bar. Closes: UX-DS-02, UX-NAV-01, UX-NAV-02, UX-NAV-03, UX-NAV-04, UX-NAV-05, UX-NAV-08, UX-BUG-11.
- [ ] **U3-02** — Tablet capsule and desktop rail. Closes: UX-NAV-09, UX-NAV-10.
- [ ] **U3-03** — Page headers and the footer. Closes: UX-NAV-11, UX-NAV-12, UX-NAV-13, UX-SCH-18, UX-MISC-01.
- [ ] **U3-04** — Toasts, the floating action slot and the offline line. Closes: UX-DS-02, UX-NAV-06, UX-CMP-13, UX-CMP-16, UX-BUG-10, UX-RWD-11. Also closes (REDESIGN-CHECKLIST): STATE-03.

### U4 — Shared components

- [ ] **U4-01** — Buttons. Closes: UX-CMP-01, UX-RWD-10.
- [ ] **U4-02** — Row and Section. Closes: UX-CMP-02, UX-CMP-03, UX-CMP-23.
- [ ] **U4-03** — Fields, time and date. Closes: UX-CMP-04, UX-CMP-09, UX-COPY-05.
- [ ] **U4-04** — Selection controls. Closes: UX-CMP-05, UX-CMP-06, UX-CMP-07, UX-CMP-08, UX-CMP-21, UX-CMP-22.
- [ ] **U4-05** — Sheets, alerts and menus. Closes: UX-CMP-10, UX-CMP-11, UX-CMP-12, UX-CMP-18, UX-CMP-20, UX-RWD-09. Also closes (REDESIGN-CHECKLIST): STATE-15.
- [ ] **U4-06** — Empty, loading, status and disclosure. Closes: UX-CMP-14, UX-CMP-15, UX-CMP-17, UX-CMP-19. Also closes (REDESIGN-CHECKLIST): STATE-07.
- [ ] **U4-07** — Icons, avatars, tints and motion. Closes: UX-DS-13, UX-DS-14, UX-DS-15.

### U5 — Today

- [ ] **U5-01** — The hero and the run-up line. Closes: UX-DS-11, UX-DS-12, UX-TODAY-02, UX-TODAY-03, UX-TODAY-04, UX-TODAY-05, UX-TODAY-06, UX-FLOW-02.
- [ ] **U5-02** — Sections on paper. Closes: UX-DS-17, UX-TODAY-01, UX-TODAY-07, UX-TODAY-08, UX-TODAY-10, UX-TODAY-11, UX-FLOW-10. Also closes (REDESIGN-CHECKLIST): STATE-11.
- [ ] **U5-03** — Evening hero. Closes: UX-TODAY-09, UX-FLOW-03.
- [ ] **U5-04** — Today sheets and prompts. Closes: UX-TODAY-12, UX-TODAY-13, UX-TODAY-14, UX-TODAY-15, UX-FLOW-01, UX-BUG-05. Also closes (REDESIGN-CHECKLIST): STATE-16.

### U6 — Schedule

- [ ] **U6-01** — Week, header and settings at the end. Closes: UX-SCH-01, UX-SCH-02, UX-SCH-03, UX-SCH-04, UX-SCH-05, UX-SCH-06, UX-SCH-07, UX-SCH-08, UX-FLOW-04.
- [ ] **U6-02** — Month and skipped days. Closes: UX-SCH-09, UX-SCH-10.
- [ ] **U6-03** — Menus, scope and the activity, school and rest sheets. Closes: UX-SCH-11, UX-SCH-12, UX-SCH-13, UX-SCH-14, UX-SCH-15.
- [ ] **U6-04** — Import and team calendar. Closes: UX-SCH-16, UX-SCH-17.

### U7 — Food

- [ ] **U7-01** — Food frame. Closes: UX-FOOD-01, UX-FOOD-02, UX-FOOD-03, UX-FOOD-04, UX-BUG-12.
- [ ] **U7-02** — Ideas. Closes: UX-DS-11, UX-IDEA-01, UX-IDEA-02, UX-IDEA-03, UX-IDEA-04, UX-IDEA-05, UX-IDEA-06, UX-IDEA-07, UX-IDEA-08, UX-IDEA-09, UX-FLOW-12, UX-BUG-21. Also closes (REDESIGN-CHECKLIST): CMP-10, STATE-04.
- [ ] **U7-03** — At home. Closes: UX-HOME-01, UX-HOME-02, UX-HOME-03, UX-HOME-04, UX-HOME-05, UX-HOME-06, UX-HOME-07, UX-HOME-08, UX-HOME-09., UX-FLOW-13
- [ ] **U7-04** — Groceries. Closes: UX-GROC-01, UX-GROC-02, UX-GROC-03, UX-GROC-04, UX-GROC-05, UX-GROC-06, UX-GROC-07, UX-GROC-08, UX-FLOW-08.
- [ ] **U7-05** — Log. Closes: UX-DS-11, UX-LOG-01, UX-LOG-02, UX-LOG-03, UX-LOG-04, UX-LOG-05, UX-LOG-06, UX-LOG-07, UX-LOG-08, UX-FLOW-11.
- [ ] **U7-06** — Search, portion and barcode. Closes: UX-DS-16, UX-SRCH-01, UX-SRCH-02, UX-SRCH-03, UX-SRCH-04, UX-SRCH-05, UX-SRCH-06, UX-SRCH-07, UX-SRCH-08.

### U8 — Welcome, setup, You, This device, About

- [ ] **U8-01** — Welcome and athletes. Closes: UX-DS-12, UX-WEL-01, UX-WEL-02, UX-WEL-03, UX-WEL-04.
- [ ] **U8-02** — Setup. Closes: UX-DS-12, UX-SET-01, UX-SET-02, UX-SET-03, UX-SET-04, UX-SET-05, UX-SET-06, UX-SET-07, UX-SET-08, UX-FLOW-09.
- [ ] **U8-03** — You and its sheets. Closes: UX-YOU-01, UX-YOU-02, UX-YOU-03, UX-YOU-04, UX-YOU-05, UX-YOU-06, UX-YOU-07, UX-YOU-08, UX-YOU-09. Also closes (REDESIGN-CHECKLIST): STATE-05.
- [ ] **U8-04** — This device and recovery. Closes: UX-DEV-01, UX-DEV-02, UX-DEV-03, UX-DEV-04, UX-DEV-05, UX-DEV-06. Also closes (REDESIGN-CHECKLIST): STATE-08.
- [ ] **U8-05** — About and Not found. Closes: UX-MISC-02, UX-MISC-03.
- [ ] **U8-06** — Retire the old kit. Closes: UX-DS-02, UX-DS-04, UX-DS-05, UX-DS-07, UX-DS-10, UX-DS-11, UX-DS-12, UX-TEST-03, UX-TEST-04, UX-TEST-06.

### U9 — Tablet and desktop adaptation

- [ ] **U9-01** — Width rules. Closes: UX-RWD-01, UX-RWD-02.
- [ ] **U9-02** — Today desktop. Closes: UX-RWD-03.
- [ ] **U9-03** — Schedule desktop. Closes: UX-RWD-04, UX-RWD-05.
- [ ] **U9-04** — Food list and detail. Closes: UX-RWD-06.
- [ ] **U9-05** — You two-pane. Closes: UX-RWD-07.
- [ ] **U9-06** — Welcome and setup split. Closes: UX-RWD-08.
- [ ] **U9-07** — 320 px sweep. Closes: UX-RWD-12.

### U10 — Final re-review

- [ ] **U10-01** — Re-capture and re-review against the brief. Closes: UX-TEST-05.
- [ ] **U10-02** — Checks that need devices, specialists or hosting. Closes: UX-TEST-07, UX-TEST-08, UX-TEST-09, UX-TEST-10. (Moved from AUDIT/IMPLEMENTATION-CHECKLIST X01, X02, X03, X05, 2026.10.20.)

## Recommendation tracker

One checkbox per ID. The note names the build item that closes it.

### Tokens and surfaces (`UX-DS`)

- [ ] **UX-DS-01** — Keep every color. (closes in U2-01)
- [ ] **UX-DS-02** — Glass is for floating chrome only. (built in U3-01, U3-04; closes in U8-06)
- [ ] **UX-DS-03** — Radius ladder. (closes in U2-01)
- [ ] **UX-DS-04** — Content is flat. (closes in U8-06)
- [ ] **UX-DS-05** — Retire the card. (closes in U8-06)
- [ ] **UX-DS-06** — Bigger, fewer controls. (closes in U2-01)
- [ ] **UX-DS-07** — No pills for short text. (closes in U8-06)
- [ ] **UX-DS-08** — Spacing. (closes in U2-01)
- [ ] **UX-DS-09** — Type scale. (closes in U2-01)
- [ ] **UX-DS-10** — Scoreboard voice. (closes in U8-06)
- [ ] **UX-DS-11** — Hero rule. (built in U5-01, U7-02, U7-05; closes in U8-06)
- [ ] **UX-DS-12** — Pitch budget. (built in U5-01, U8-01, U8-02; closes in U8-06)
- [ ] **UX-DS-13** — Status tints. (closes in U4-07)
- [ ] **UX-DS-14** — Icons and avatars. (closes in U4-07)
- [ ] **UX-DS-15** — Motion. (closes in U4-07)
- [ ] **UX-DS-16** — Label line placement. (closes in U7-06)
- [ ] **UX-DS-17** — No targets in visuals. (closes in U5-02)

### Navigation and page frame (`UX-NAV`)

- [ ] **UX-NAV-01** — Geometry. (closes in U3-01)
- [ ] **UX-NAV-02** — Material and fallbacks. (closes in U3-01)
- [ ] **UX-NAV-03** — Items and active state. (closes in U3-01)
- [ ] **UX-NAV-04** — Content clearance. (closes in U3-01)
- [ ] **UX-NAV-05** — Keyboard. (closes in U3-01)
- [ ] **UX-NAV-06** — Stacking above the bar. (closes in U3-04)
- [x] **UX-NAV-07** — Safe areas. (closes in U1-02) Done 2026.10.20 (U1-02): `tests/styles.test.js`, `browser-shared-ui.js`.
- [ ] **UX-NAV-08** — Stable bar. (closes in U3-01)
- [ ] **UX-NAV-09** — Floating top capsule. (closes in U3-02)
- [ ] **UX-NAV-10** — Quiet rail. (closes in U3-02)
- [ ] **UX-NAV-11** — Large titles that collapse. (closes in U3-03)
- [ ] **UX-NAV-12** — One avatar. (closes in U3-03)
- [ ] **UX-NAV-13** — Browser chrome color. (closes in U3-03)

### Shared components (`UX-CMP`)

- [ ] **UX-CMP-01** — Four button kinds, one primary per screen. (closes in U4-01)
- [ ] **UX-CMP-02** — One row component. (closes in U4-02)
- [ ] **UX-CMP-03** — Section. (closes in U4-02)
- [ ] **UX-CMP-04** — Fields. (closes in U4-03)
- [ ] **UX-CMP-05** — Checklist rows. (closes in U4-04)
- [ ] **UX-CMP-06** — Segmented control. (closes in U4-04)
- [ ] **UX-CMP-07** — Weekday bar. (closes in U4-04)
- [ ] **UX-CMP-08** — Switch row. (closes in U4-04)
- [ ] **UX-CMP-09** — Time and date fields show app formats. (closes in U4-03)
- [ ] **UX-CMP-10** — Bottom sheet. (closes in U4-05)
- [ ] **UX-CMP-11** — Alert for every confirm. (closes in U4-05)
- [ ] **UX-CMP-12** — Menus. (closes in U4-05)
- [ ] **UX-CMP-13** — Toast. (closes in U3-04)
- [ ] **UX-CMP-14** — Empty states. (closes in U4-06)
- [ ] **UX-CMP-15** — Loading. (closes in U4-06)
- [ ] **UX-CMP-16** — Offline line. (closes in U3-04)
- [ ] **UX-CMP-17** — Inline status line. (closes in U4-06)
- [ ] **UX-CMP-18** — Pickers inside sheets. (closes in U4-05)
- [ ] **UX-CMP-19** — Disclosure. (closes in U4-06)
- [ ] **UX-CMP-20** — Changed elsewhere. (closes in U4-05)
- [ ] **UX-CMP-21** — Quick-amount bar. (closes in U4-04)
- [ ] **UX-CMP-22** — Tiles. (closes in U4-04)
- [ ] **UX-CMP-23** — Food art in food rows (owner decision A). (closes in U4-02)

### Copy rules (`UX-COPY`)

- [ ] **UX-COPY-01** — No dot-meta. (closes in U2-02)
- [ ] **UX-COPY-02** — No spaced em dash. (closes in U2-02)
- [ ] **UX-COPY-03** — No uppercase. (closes in U2-02)
- [ ] **UX-COPY-04** — Times and ranges hold together. (closes in U2-02)
- [ ] **UX-COPY-05** — One-line helpers. (closes in U4-03)
- [ ] **UX-COPY-06** — Meta without negatives. (closes in U2-02)

### Welcome (`UX-WEL`)

- [ ] **UX-WEL-01** — Field panel first screen. (closes in U8-01)
- [ ] **UX-WEL-02** — Returning: chooser first. (closes in U8-01)
- [ ] **UX-WEL-03** — Athletes as rows. (closes in U8-01)
- [ ] **UX-WEL-04** — Rename, add and remove. (closes in U8-01)

### Setup (`UX-SET`)

- [ ] **UX-SET-01** — One way forward, one way out. (closes in U8-02)
- [ ] **UX-SET-02** — Step 1 order and controls. (closes in U8-02)
- [ ] **UX-SET-03** — Step 2 school day. (closes in U8-02)
- [ ] **UX-SET-04** — Step 3 practices and games. (closes in U8-02)
- [ ] **UX-SET-05** — Step 4 food at school. (closes in U8-02)
- [ ] **UX-SET-06** — Step 5 food needs. (closes in U8-02)
- [ ] **UX-SET-07** — Step 6 done. (closes in U8-02)
- [ ] **UX-SET-08** — Import a team calendar from setup. (closes in U8-02; moved from TODO/REMAINING-APP-CHANGES §1, 2026.10.20)

### Today (`UX-TODAY`)

- [ ] **UX-TODAY-01** — No cards on Today. (closes in U5-02)
- [ ] **UX-TODAY-02** — Hero anatomy. (closes in U5-01)
- [ ] **UX-TODAY-03** — No chips under the date. (closes in U5-01)
- [ ] **UX-TODAY-04** — The run-up line. (closes in U5-01)
- [ ] **UX-TODAY-05** — Hero by state. (closes in U5-01)
- [ ] **UX-TODAY-06** — Plan state is a step, not a headline. (closes in U5-01)
- [ ] **UX-TODAY-07** — Pack & prep. (closes in U5-02)
- [ ] **UX-TODAY-08** — Your day. (closes in U5-02)
- [ ] **UX-TODAY-09** — Evening hero is tomorrow's checklist. (closes in U5-03)
- [ ] **UX-TODAY-10** — Water row. (closes in U5-02)
- [ ] **UX-TODAY-11** — Prompt slot as a status line. (closes in U5-02)
- [ ] **UX-TODAY-12** — Why this? sheet. (closes in U5-04)
- [ ] **UX-TODAY-13** — Moved session prompt names the time. (closes in U5-04)
- [ ] **UX-TODAY-14** — School-day prompt. (closes in U5-04)
- [ ] **UX-TODAY-15** — Sheets opened from Today. (closes in U5-04)

### Schedule (`UX-SCH`)

- [ ] **UX-SCH-01** — No day cards. (closes in U6-01)
- [ ] **UX-SCH-02** — Schedule opens on the schedule. (closes in U6-01)
- [ ] **UX-SCH-03** — Header and navigation. (closes in U6-01)
- [ ] **UX-SCH-04** — Week strip. (closes in U6-01)
- [ ] **UX-SCH-05** — School once, not per day. (closes in U6-01)
- [ ] **UX-SCH-06** — Today marker. (closes in U6-01)
- [ ] **UX-SCH-07** — Rest days are labelled. (closes in U6-01)
- [ ] **UX-SCH-08** — Empty week. (closes in U6-01)
- [ ] **UX-SCH-09** — Month view. (closes in U6-02)
- [ ] **UX-SCH-10** — Skipped day. (closes in U6-02)
- [ ] **UX-SCH-11** — Row menu. (closes in U6-03)
- [ ] **UX-SCH-12** — Scope choices as alerts. (closes in U6-03)
- [ ] **UX-SCH-13** — Add or edit activity sheet. (closes in U6-03)
- [ ] **UX-SCH-14** — School day sheet in two groups. (closes in U6-03)
- [ ] **UX-SCH-15** — Rest days sheet. (closes in U6-03)
- [ ] **UX-SCH-16** — Import preview without 40 dropdowns. (closes in U6-04)
- [ ] **UX-SCH-17** — Team calendar row. (closes in U6-04)
- [ ] **UX-SCH-18** — No unrelated footer. (closes in U3-03)

### Food frame (`UX-FOOD`)

- [ ] **UX-FOOD-01** — Underline section tabs. (closes in U7-01)
- [ ] **UX-FOOD-02** — Second-level choices are text toggles. (closes in U7-01)
- [ ] **UX-FOOD-03** — Chrome budget. (closes in U7-01)
- [ ] **UX-FOOD-04** — Label line as a caption. (closes in U7-01)

### Ideas (`UX-IDEA`)

- [ ] **UX-IDEA-01** — Rows, not cards. (closes in U7-02)
- [ ] **UX-IDEA-02** — One hero, no duplicate. (closes in U7-02)
- [ ] **UX-IDEA-03** — Idea details sheet. (closes in U7-02)
- [ ] **UX-IDEA-04** — Low cost is a switch. (closes in U7-02)
- [ ] **UX-IDEA-05** — Empty states. (closes in U7-02)
- [ ] **UX-IDEA-06** — One context line. (closes in U7-02)
- [ ] **UX-IDEA-07** — Examples caption placement. (closes in U7-02)
- [ ] **UX-IDEA-08** — Shared idea row. (closes in U7-02)
- [ ] **UX-IDEA-09** — Toasts. (closes in U7-02)

### At home (`UX-HOME`)

- [ ] **UX-HOME-01** — One control per row. (closes in U7-03)
- [ ] **UX-HOME-02** — Search field is the add entry. (closes in U7-03)
- [ ] **UX-HOME-03** — Low or out bridge. (closes in U7-03)
- [ ] **UX-HOME-04** — Filters as text toggles. (closes in U7-03)
- [ ] **UX-HOME-05** — Menus. (closes in U7-03)
- [ ] **UX-HOME-06** — Empty At home. (closes in U7-03)
- [ ] **UX-HOME-07** — Counts as? as tiles. (closes in U7-03)
- [ ] **UX-HOME-08** — Merge prompt. (closes in U7-03)
- [ ] **UX-HOME-09** — Details sheet. (closes in U7-03)

### Groceries (`UX-GROC`)

- [ ] **UX-GROC-01** — Week hero. (closes in U7-04)
- [ ] **UX-GROC-02** — Group by reason. (closes in U7-04)
- [ ] **UX-GROC-03** — In cart group. (closes in U7-04)
- [ ] **UX-GROC-04** — Finish bar with the total. (closes in U7-04)
- [ ] **UX-GROC-05** — Add item inline. (closes in U7-04)
- [ ] **UX-GROC-06** — Put-away without selects. (closes in U7-04)
- [ ] **UX-GROC-07** — Row actions. (closes in U7-04)
- [ ] **UX-GROC-08** — Past trips and undo trip. (closes in U7-04)

### Log (`UX-LOG`)

- [ ] **UX-LOG-01** — One control row. (closes in U7-05)
- [ ] **UX-LOG-02** — Floating Log food. (closes in U7-05)
- [ ] **UX-LOG-03** — Did-you-eat hero. (closes in U7-05)
- [ ] **UX-LOG-04** — Timeline rows. (closes in U7-05)
- [ ] **UX-LOG-05** — Week list. (closes in U7-05)
- [ ] **UX-LOG-06** — No phone table. (closes in U7-05)
- [ ] **UX-LOG-07** — Entry menu and edit. (closes in U7-05)
- [ ] **UX-LOG-08** — From-home in one sheet. (closes in U7-05)

### Search, portion and barcode (`UX-SRCH`)

- [ ] **UX-SRCH-01** — Quiet result rows. (closes in U7-06)
- [ ] **UX-SRCH-02** — Readable names. (closes in U7-06)
- [ ] **UX-SRCH-03** — Portion tiles. (closes in U7-06)
- [ ] **UX-SRCH-04** — Specific error. (closes in U7-06)
- [ ] **UX-SRCH-05** — Add it yourself prefill. (closes in U7-06)
- [ ] **UX-SRCH-06** — No results. (closes in U7-06)
- [ ] **UX-SRCH-07** — Scanner has one primary. (closes in U7-06)
- [ ] **UX-SRCH-08** — Quick add as tiles. (closes in U7-06)

### You (`UX-YOU`)

- [ ] **UX-YOU-01** — No cards on You. (closes in U8-03)
- [ ] **UX-YOU-02** — Value on the right. (closes in U8-03)
- [ ] **UX-YOU-03** — Honest row name. (closes in U8-03)
- [ ] **UX-YOU-04** — Sport & season sheet. (closes in U8-03)
- [ ] **UX-YOU-05** — Food needs sheet. (closes in U8-03)
- [ ] **UX-YOU-06** — Food access & budget sheet. (closes in U8-03)
- [ ] **UX-YOU-07** — Reminders sheet. (closes in U8-03)
- [ ] **UX-YOU-08** — Discard is an alert. (closes in U8-03)
- [ ] **UX-YOU-09** — Athlete switcher. (closes in U8-03)

### This device and recovery (`UX-DEV`)

- [ ] **UX-DEV-01** — Actions as rows. (closes in U8-04)
- [ ] **UX-DEV-02** — Athlete rows. (closes in U8-04)
- [ ] **UX-DEV-03** — Delete confirm. (closes in U8-04)
- [ ] **UX-DEV-04** — Restore result. (closes in U8-04)
- [ ] **UX-DEV-05** — Data error recovery. (closes in U8-04)
- [ ] **UX-DEV-06** — Recovery confirm error. (closes in U8-04)

### About, Not found and footer (`UX-MISC`)

- [ ] **UX-MISC-01** — Device line said once. (closes in U3-03)
- [ ] **UX-MISC-02** — About. (closes in U8-05)
- [ ] **UX-MISC-03** — Not found. (closes in U8-05)

### Flow fixes (`UX-FLOW`)

- [ ] **UX-FLOW-01** — Plan details sheet can act. (closes in U5-04)
- [ ] **UX-FLOW-02** — The hero follows the plan. (closes in U5-01)
- [ ] **UX-FLOW-03** — Evening checklist where the hero is. (closes in U5-03)
- [ ] **UX-FLOW-04** — Schedule opens on the week. (closes in U6-01)
- [x] **UX-FLOW-05** — Re-import ends with Done. (closes in U1-03) Done 2026.10.20 (U1-03): `browser-calendar-import.js`, `browser-journey.js`.
- [x] **UX-FLOW-06** — Suggestions start selected. (closes in U1-03) Done 2026.10.20 (U1-03): `browser-food-workflow.js`.
- [x] **UX-FLOW-07** — Barcode not found leads somewhere. (closes in U1-03) Done 2026.10.20 (U1-03): `browser-search.js`.
- [ ] **UX-FLOW-08** — Empty Groceries leads with the suggestion. (closes in U7-04)
- [ ] **UX-FLOW-09** — Setup has one way forward. (closes in U8-02)
- [ ] **UX-FLOW-10** — No duplicate Schedule entry on Today. (closes in U5-02)
- [ ] **UX-FLOW-11** — From-home in one step. (closes in U7-05)
- [ ] **UX-FLOW-12** — No-access Ideas offers logging. (closes in U7-02)
- [ ] **UX-FLOW-13** — Packed food goes to In my bag (owner decision B: yes). (closes in U7-03)

### Bugs (`UX-BUG`)

- [x] **UX-BUG-01** — You › Sport & season saves an empty sport. (closes in U1-01) Done 2026.10.20 (U1-01): `browser-you.js`, `domain.test.js`.
- [x] **UX-BUG-02** — Field errors stay after the value is fixed: setup step 1 Sport (`p007`), step 3 end time (`p012`), Schedule add/edit "End time must be later than start time" with 4:00–5:30 (`p228`, `p229`). (closes in U1-01) Done 2026.10.20 (U1-01): `browser-setup.js` (Sport, Ends), `browser-schedule.js` (Add sheet), `domain.test.js`.
- [x] **UX-BUG-03** — Setup step 2: lunch start and end turn red with no message. (closes in U1-01) Done 2026.10.20 (U1-01): `browser-setup.js` (message above the Next bar, on both fields' aria-describedby), `browser-schedule.js` (School day sheet).
- [x] **UX-BUG-04** — `index.html` viewport meta lacks `viewport-fit=cover`, so every `env(safe-area-inset-*)` in `frame.css` is 0 on iPhones. (closes in U1-02) Done 2026.10.20 (U1-02): `tests/styles.test.js` "U1-02".
- [ ] **UX-BUG-05** — Plan details sheet offers only Close. (closes in U5-04)
- [x] **UX-BUG-06** — Log edit entry and portion step: amount 0 disables Save with no message. (closes in U1-01) Done 2026.10.20 (U1-01): `browser-log.js` (Edit food and the portion step), `domain.test.js`.
- [x] **UX-BUG-07** — Barcode not found says "Add the food yourself." with no button for it. (closes in U1-03) Done 2026.10.20 (U1-03): `browser-search.js`.
- [ ] **UX-BUG-08** — Travel time wraps between "5:15" and "PM". (closes in U2-02)
- [ ] **UX-BUG-09** — At 320 px, a meta line wraps so that "· Lunch 11:30 AM" starts the second line with an orphan dot. (closes in U2-02)
- [ ] **UX-BUG-10** — Toasts cover content and actions: prompt buttons (`p126`, `p152`, `p531`), "Everything's checked" line (`p360`), the footer (`p318`). (closes in U3-04)
- [ ] **UX-BUG-11** — The footer line is clipped behind the tab bar at the end of You. (closes in U3-01)
- [ ] **UX-BUG-12** — Controls clip with no scroll cue: Ideas moment tray "To…" (`p301`), Quick add "Frozen b" (`p332`), 320 px tabs (`p709`). (closes in U7-01)
- [x] **UX-BUG-13** — Duplicate re-import ends on a disabled button with only Back. (closes in U1-03) Done 2026.10.20 (U1-03): `browser-calendar-import.js`, `browser-journey.js`.
- [x] **UX-BUG-14** — Week suggestions open with nothing selected and the primary disabled. (closes in U1-03) Done 2026.10.20 (U1-03): `browser-food-workflow.js`.
- [x] **UX-BUG-15** — Reminders: with permission denied or unsupported, the master switch is disabled but "How long before" and the evening checkbox look active. (closes in U1-04) Done 2026.10.20 (U1-04): `browser-you.js`.
- [x] **UX-BUG-16** — Opening a sheet puts a visible focus ring on its X. (closes in U1-04) Done 2026.10.20 (U1-04): `browser-dialogs.js`.
- [x] **UX-BUG-17** — Delete-scope dialog makes "Delete all" the filled button and "only this day" outlined. (closes in U1-04) Done 2026.10.20 (U1-04): `browser-schedule.js`.
- [x] **UX-BUG-18** — "Add it yourself" pre-fills the name "Food" and 100 g. (closes in U1-03) Done 2026.10.20 (U1-03): `browser-search.js`, `domain.test.js`.
- [ ] **UX-BUG-19** — After logging the 28 g usual portion of banana chips, the entry reads "1 g". (closes in U1-05)
- [ ] **UX-BUG-20** — At home "0 left" rows are not treated as Out: the summary counts them, the row looks in stock. (closes in U1-05)
- [ ] **UX-BUG-21** — Ideas shows the planned idea twice: in the planned card and again in the list with "Plan this". (closes in U7-02)
- [ ] **UX-BUG-22** — Settings saves (four You sheets) toast "Saved." with no Undo: add Undo. At home Have/Low/Out and count changes stay silent (owner decision 2026.10.20; tapping again is the undo; accepted exception to §13.8). (closes in U1-05; found 2026.10.20)

### Tablet and desktop (`UX-RWD`)

- [ ] **UX-RWD-01** — Content caps. (closes in U9-01)
- [ ] **UX-RWD-02** — 480–767 px. (closes in U9-01)
- [ ] **UX-RWD-03** — Today desktop. (closes in U9-02)
- [ ] **UX-RWD-04** — Schedule desktop week. (closes in U9-03)
- [ ] **UX-RWD-05** — Schedule desktop month. (closes in U9-03)
- [ ] **UX-RWD-06** — Food list and detail. (closes in U9-04)
- [ ] **UX-RWD-07** — You two-pane. (closes in U9-05)
- [ ] **UX-RWD-08** — Welcome and setup split. (closes in U9-06)
- [ ] **UX-RWD-09** — Desktop dialogs. (closes in U4-05)
- [ ] **UX-RWD-10** — Desktop buttons. (closes in U4-01)
- [ ] **UX-RWD-11** — Desktop toasts. (closes in U3-04)
- [ ] **UX-RWD-12** — 320 px. (closes in U9-07)

### Tests and tooling (`UX-TEST`)

- [ ] **UX-TEST-01** — Versioned capture harness. (closes in U1-06)
- [ ] **UX-TEST-02** — Realistic seed names. (closes in U1-06)
- [ ] **UX-TEST-03** — The rules check. (built in U1-06; closes in U8-06)
- [ ] **UX-TEST-04** — Retire assertions that encode the old look. (closes in U8-06)
- [ ] **UX-TEST-05** — Final re-review. (closes in U10-01)
- [ ] **UX-TEST-06** — Stylesheet guards. (closes in U8-06)
- [ ] **UX-TEST-07** — Real-phone camera and barcode check. (closes in U10-02; moved from X01, 2026.10.20)
- [ ] **UX-TEST-08** — Reminders and browser matrix (Safari, Firefox, real devices). (closes in U10-02; moved from X02, 2026.10.20; delivery with the app closed is P3-01)
- [ ] **UX-TEST-09** — Nutrition specialist review of meal templates, timing cutoffs and portions. (closes in U10-02; moved from X03, 2026.10.20)
- [ ] **UX-TEST-10** — Hosted build with an owner-held USDA key. (closes in U10-02; moved from X05, 2026.10.20)

## Carried over from REDESIGN-CHECKLIST.md

The 11 open items there are built in this plan (UX-REDESIGN-PLAN.md §10.12). Tick them here and in REDESIGN-CHECKLIST.md when the named item passes.

- [ ] **COPY-38** — Test athletes get realistic names. (built in U1-06)
- [ ] **KEEP-15** — Prune undo-ledger entries older than 30 days. (built in U1-05)
- [ ] **STATE-03** — App-frame offline line. (built in U3-04)
- [ ] **STATE-04** — Moved-session prompt names the new time, on Today and Ideas. (built in U5-04, U7-02)
- [ ] **STATE-05** — Ask before switching reminders off when permission is lost. (built in U8-03)
- [ ] **STATE-07** — Skeleton 300 ms minimum and aria-busy. (built in U4-06)
- [ ] **STATE-08** — Restore toast names the athlete and offers Switch now. (built in U8-04)
- [ ] **STATE-11** — Pack & prep empty state. (built in U5-02)
- [ ] **STATE-15** — Changed-in-another-tab message. (built in U4-05)
- [ ] **STATE-16** — School-day prompt on Today. (built in U5-04)
- [ ] **CMP-10** — Shared IdeaRow and Availability. (built in U7-02)

## Owner decisions

- [x] **UX-FLOW-13 decision: packed food and In my bag.** Decided 2026.10.20: yes. Built in U7-03.
- [x] **Decision A: food art in food rows.** Decided 2026.10.20: yes (UX-CMP-23, Fluent Emoji, MIT).
- [x] **Plan approved by the owner** 2026.10.20.

## Owner brief accepted (U10-01)

Tick each line during U10-01 and note the capture numbers that show it at phone and desktop size.

- [ ] Way less cards; no stacked cards.
- [ ] No separated card above two connected cards.
- [ ] Sleeker, modern, more minimal, cooler.
- [ ] No small circular cards or pills for little text (including "School 8-3" under Today's date).
- [ ] Current color scheme kept (all `--color-*` values unchanged).
- [ ] Floating, slightly transparent tab selector on phone.
- [ ] Built mainly for phone and works at every size (320, 390, 768, 1024, 1440).
- [ ] Spotify, Cash App and Dunkin patterns applied (rows, single focus, brand moments and tiles).
- [ ] Final full review of every screen, modal and pop-up done, phone then desktop.
