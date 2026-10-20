# UX review evidence

- `today-schedule.md`, `food.md`, `setup-you-global.md`: the three review notes behind `UX-REDESIGN-PLAN.md`.
- `sheets/`: contact sheets (grids of screenshots) the reviewers used, compressed to JPG.
- `CAPTURES.txt`, `INDEX.txt`: one line per screenshot, and counts per area.

The full screenshots (about 970 PNGs, ~190 MB) are not in git. Regenerate them into
`output/ux-review/` with:

```
npx vite --port 5271 --strictPort
npm run capture:ux
```

`node scripts/ux-capture/run.mjs phone today` captures one pass and one area. Existing files are skipped.
Scripts and seed data are in `scripts/ux-capture/`.
