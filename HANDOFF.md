# Handoff

Read this first on a new machine or in a new session, then `AGENTS.md`.
Last updated 2026.10.09.

## Where the work is

- Branch `main` has all redesign work (merged from `redesign/complete-p0-p1`).
- Status of every item: top of `REDESIGN-CHECKLIST.md`. Plan and requirements:
  `CLAUDE-REDESIGN-AUDIT.md`. History of changes: `CODEX/log.md`.
- P0 is complete. P1 is complete except P1-09, P1-10, P1-11 and P1-13 (below).
- On 2026.10.09 an independent review re-checked every ticked P0 and P1 item
  against the code and the running app. 45 gaps were found and 43 fixed, each
  with a test. `npm run check` (157 unit tests) and all 18 browser scripts pass.

## Owner decisions to keep

- **Allergy filtering is off** (`ALLERGY_TAGS_REVIEWED = false` in
  `src/domain/catalog.js`). It is built and tested. It stays off until the
  per-ingredient allergen tags are approved. Items P1-09, P1-10, ADD-03,
  ONB-04, YOU-02, YOU-03 are "Awaiting approval"; P1-11 waits on ONB-04.
  The app says "Allergy filtering coming soon."
- **P1-09, P1-10 and P1-13 are skipped for now** and will be revisited.
  P1-13: automated accessibility checks pass (axe, keyboard, focus); the manual
  screen-reader test and the keyboard-only journey run are not done.
- **Approved copy:** "Packaged food" for unbranded scanned products;
  "Discard" / "Keep editing" on the unsaved-changes confirm; "Skip step" in the
  setup header and "Skip setup" at the bottom.
- **Open copy question:** the Today reminder prompt reads
  "Get a heads-up 60 min before practice? Works while Nourally is open in your
  browser." (audit COPY-34 has a shorter variant). Ask the owner before changing.

## Next work, in order

1. Open items in the tracker: DLG-03, COPY-38, KEEP-15, STATE-03, STATE-04,
   STATE-05, STATE-07, STATE-08, STATE-11, STATE-15, STATE-16, CMP-10.
2. P2 items (P2-01 to P2-08), then P3, when the owner asks.
3. When the allergen tags are approved: set `ALLERGY_TAGS_REVIEWED = true`,
   run all checks, tick the awaiting-approval items.

## Setting up a new machine (Mac)

1. Install Node.js and the GitHub CLI: `brew install node gh`.
2. `gh auth login` with the JeremyKalfus GitHub account.
3. `gh repo clone RyanKalfus/athletic-nutrition` and `cd athletic-nutrition`.
4. `git config user.email "75633161+JeremyKalfus@users.noreply.github.com"`
   (GitHub blocks pushes that use a private email).
5. `npm ci` and `npx playwright install chromium`.
6. Create `.env` from `.env.example` and set `FDC_API_KEY` to the USDA key
   (the key is not in git; get it from the owner or the api.data.gov email).
7. `npm run check` and `npm run test:browser` to confirm everything passes.
