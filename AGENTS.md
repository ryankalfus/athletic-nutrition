# Nourally — agent handoff rules

This repo is worked on by both OpenAI Codex and Claude Code. Both read this file
(Claude Code through `CLAUDE.md`). Keep it short and current.

## Before each action

1. Read the files in `CODEX/` (`CODEX/AGENTS.md`, `CODEX/log.md`, the one pager).
2. Read the tail of `CODEX/log.md` to see what the other agent did last.
3. For redesign work, read the item in `CLAUDE-REDESIGN-AUDIT.md` (source of truth)
   and its line in `REDESIGN-CHECKLIST.md` (status tracker).

## After each action

- Append one line per change to `CODEX/log.md`: plain sentence, then the date as
  `yyyy.mm.dd`.
- Tick a box in `REDESIGN-CHECKLIST.md` only when the item's "Done when"
  condition and linked acceptance criteria pass and you ran the checks below.
  Partial work stays unchecked.

## Commands

| Purpose | Command |
|---|---|
| Install | `npm ci` |
| Lint, typecheck, unit tests, build (CI runs this) | `npm run check` |
| Unit tests only | `npm test` |
| Dev server | `npm run dev` |
| Browser checks (starts Vite on 5184 if needed) | `npm run test:browser` |
| One browser check | `npm run test:browser -- schedule` |

First run: `npx playwright install chromium`. The provider check calls the
live USDA API; set `FDC_API_KEY` in `.env` (see `.env.example`) or it can hit
the `DEMO_KEY` rate limit. Stop your own dev server before `npm ci` on Windows,
or the install fails with EPERM on a locked binary.

Run `npm run check` before you call work done. For UI changes also run the
browser checks. Report what you ran and the result.

## Safety rules (do not break)

- Allergy filtering stays off (`ALLERGY_TAGS_REVIEWED` stays false) until the
  per-ingredient allergen tags are approved. No UI control may claim to filter
  an allergen without approved per-ingredient data; Gluten-free, Nut-free and
  Dairy-free filters stay hidden.
- Never call a food safe.
- Keep "Allergies: check every label." on every product view.
- Never show a calorie target or a prescription. Ideas are examples.

## Git

- Work on a branch, not `main`. Open a PR. Do not merge unless the owner asks.
- No AI co-author trailers in commits.

## Code map

- `src/pages/{Today,Schedule,Food,You}/` — pages. `src/components/` — shared UI.
- `src/domain/` — pure logic (timing, ranking, plans, food, storage migrations).
  Put logic here and cover it in `tests/domain.test.js`.
- `src/format.js` — every user-facing date, time, duration, count and amount.
- `server/` — food search and barcode API proxy.
