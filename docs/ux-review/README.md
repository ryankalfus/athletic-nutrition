# UX review evidence

- `today-schedule.md`, `food.md`, `setup-you-global.md`: the three review notes behind `UX-REDESIGN-PLAN.md`.
- `sheets/`: contact sheets (grids of screenshots) the reviewers used, compressed to JPG.
- `CAPTURES.txt`, `INDEX.txt`: one line per screenshot, and counts per area.

The full screenshots (about 970 PNGs, ~190 MB) are not in git. Regenerate them into
`output/ux-review/` with:

```
npm run ux:capture -- both
```

`npm run ux:capture -- phone today` captures one pass (`phone`, `desktop` or `both`) and one or
more areas (`onboarding`, `today`, `schedule`, `food`, `you`, `global`, `sizes`), then rewrites
`INDEX.txt`. It uses the server at `BASE_URL`, or starts Vite on port 5271 and stops it after.
Existing files are skipped; `node scripts/ux-capture/clean.mjs phone 100 199` removes a range so
it is retaken. Scripts and seed data are in `scripts/ux-capture/`.

`npm run test:browser -- ux-rules` runs the UX rules check (`tests/browser-ux-rules.js`, plan
section 11.1) on Welcome and every route at 390 and 1440 px and prints the count for each rule.
