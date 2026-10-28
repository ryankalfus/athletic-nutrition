# Nourally roadmap

The big steps, in order. Tick a step only when it is fully done and its checks pass, then
tell the owner. Details live in the linked plan for each step.

## Done

- [x] 1. Product redesign P0: foundations and broken experiences (`REDESIGN-CHECKLIST.md`). 2026.09.29
- [x] 2. Product redesign P1: core workflow and visual redesign, except P1-09, P1-10 (allergy filtering, awaiting approval) and P1-13 (manual accessibility test, skipped for now). 2026.10.09
- [x] 3. Independent re-check of every ticked P0/P1 item, and fixes for the 45 gaps it found. 2026.10.09
- [x] 4. Product redesign P2: calendar import and links, rest days, water units, Monday card, rule sources, CSS cleanup, journey tests in CI. 2026.10.13
- [x] 5. UX/UI review U0: screenshots of every screen on computer and phone, three reviews (`docs/ux-review/`). 2026.10.15
- [x] 6. UX/UI redesign plan written and approved, with decisions A (food art) and B (packed food goes to In my bag) (`UX-REDESIGN-PLAN.md`). 2026.10.20
- [x] 7. Old lists combined into the trackers (`TODO/REMAINING-APP-CHANGES.md`, `AUDIT/IMPLEMENTATION-CHECKLIST.md`, the §13.8 MVP criteria in `REDESIGN-CHECKLIST.md`): done items ticked with evidence, open ones tracked or moved into the UX plan (UX-SET-08, UX-BUG-22, UX-TEST-07 to UX-TEST-10, build item U10-02). 2026.10.20
- [x] 8. UX U1: bugs, guards and test tools (`UX-REDESIGN-CHECKLIST.md` U1-01 to U1-06). The 15 U1 bugs are fixed with tests (UX-BUG-01 to 04, 06, 07, 13 to 20, 22; UX-BUG-19 was a capture artifact, confirmed by a test); Undo on settings saves, At home taps silent by owner decision; KEEP-15 and COPY-38 closed; `npm run ux:capture` and the UX rules check (`tests/browser-ux-rules.js`, report mode) added. The other seven bugs belong to later phases (UX-BUG-05 U5, 08 and 09 U2, 10 and 11 U3, 12 and 21 U7). 2026.10.20
- [x] 9. UX U2: design tokens and copy formatting (`UX-REDESIGN-CHECKLIST.md` U2-01, U2-02). The 4.4 tokens are in `tokens.css` with every color value pinned by a test; controls are 52 px; base type follows the UX-DS-09 scale (34/40 large title, 14 px helpers, 40 px desktop section gaps); times keep their AM/PM on the same line, ranges read "Oct 12–18", and no screen shows " · " meta, spaced dashes or uppercase (UX rules R3 56 → 0). Closes UX-DS-01, 03, 06, 08, 09, UX-COPY-01 to 04 and 06, UX-BUG-08 and 09. 2026.10.20
- [x] 10. UX U3: app frame and the floating glass tab bar (`UX-REDESIGN-CHECKLIST.md` U3-01 to U3-04). The phone tab bar is a floating glass capsule with a sliding pill (U3-01); tablets get a top capsule and desktops a quiet 88/232 px rail (U3-02); every page has a visible large title, a glass bar after scrolling, one avatar and the device footer only on This device and About (U3-03); toasts are dark glass stacked 8 px above the tab bar or the new floating action slot and centered on main on desktop, Undo toasts have no X, and an offline line shows on every route (U3-04; page content scrolls under toasts, owner decision). Closes UX-NAV-01 to 06 and 08 to 13, UX-CMP-13, UX-CMP-16, UX-BUG-10, UX-BUG-11, UX-RWD-11, UX-SCH-18, UX-MISC-01 and STATE-03; UX-DS-02 closes in U8-06. 2026.10.28

## Next, in order

- [ ] 11. UX U4: shared components (rows with food art, sections, buttons, fields, controls that replace pills, sheets). **Owner checkpoint: check the new direction before the screens are redone.**
- [ ] 12. UX U5: Today.
- [ ] 13. UX U6: Schedule.
- [ ] 14. UX U7: Food (Ideas, At home, Groceries, Log, search, barcode).
- [ ] 15. UX U8: Welcome, setup, You, This device, About; remove the old card styles.
- [ ] 16. UX U9: tablet and desktop layouts.
- [ ] 17. UX U10: final screenshot re-review on computer and phone.
- [ ] 18. Platform decision: web app on the home screen, Capacitor, or SwiftUI for iPhone.
- [ ] 19. P3-01: the phone app with real notifications (on the chosen platform).
- [ ] 20. P3-03: real accounts and sync.
- [ ] 21. P3-02: parent summary page.
- [ ] 22. P3-05: AI explanations of existing options.
- [ ] 23. P3-04: dark theme (last, so the colors are designed once).

## Any time, alongside the steps above

- [ ] Allergy tags approved → switch on allergy filtering and close P1-09, P1-10, ADD-03, ONB-04, YOU-02, YOU-03.
- [ ] P1-13 manual accessibility test (screen reader and keyboard-only journey), before any school deal or App Store submission.
- [ ] Business validation from `COMPARATIVE_RESEARCH_REPORT.md` (interviews, small pilot), before a large SwiftUI build.
