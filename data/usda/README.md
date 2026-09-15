# USDA FoodData Central in Nourally

Nourally can search the locally indexed USDA FoodData Central archive. The current archive is the official April 30, 2026 CSV release. The ignored ZIP and SQLite index are local files; they are not included in Git or a hosted deployment. The index contains 2,013,644 records: 1,999,950 Branded, 469 Foundation, 5,432 Survey (FNDDS), and 7,793 SR Legacy. A search label identifies results from this dated snapshot. Food composition is not a store price or a real-time inventory claim.

## Run and verify

Use Node 24 or newer. Run `npm install`, then `npm run dev` for the development server. The Food gateway uses `data/usda/catalog.sqlite` if it exists. `npm run build` followed by `npm start` runs the built app and the same gateway locally (default `http://127.0.0.1:4173`). `GET /api/foods/status` reports `local-snapshot`, `server-key`, or `limited-demo`. Run `npm run check` for lint, domain typechecking, tests, and a build.

If the index is missing, the gateway uses a server-side `FDC_API_KEY` from `.env`. Without a private key it uses USDA's limited `DEMO_KEY`. Do not prefix the key with `VITE_`: the browser must never receive it. The barcode route uses Open Food Facts as a community-data fallback. Saved food records remain available if either provider is temporarily unavailable.

## Rebuild or refresh the snapshot

The checked-in downloader targets the April 30, 2026 release: `bash scripts/download-usda-data.sh`. It resumes a partial download and writes a SHA-256 receipt. To build its index when no index exists, run `npm run index:usda`. The builder reads CSVs inside the ZIP without extracting them, checks SQLite integrity, records the archive name, hash, counts, and indexing time, then creates a separately named completed index. It refuses to overwrite an existing index or partial build.

For a future release, download the new official archive and run `python3 scripts/index-usda.py path/to/new-release.zip data/usda/new-release.sqlite`. Check `PRAGMA integrity_check` and `GET /api/foods/status` after setting `USDA_DB_PATH=data/usda/new-release.sqlite` in `.env` and restarting the server. Keep the older index until the new one is verified. The builder indexes food names, brands, exact barcodes, type, energy, protein, carbohydrate, and fat where supplied; absent nutrients remain unknown. It does not import every USDA field, food portion conversion, or ingredient composition.

## User data boundary

The downloaded USDA data and the athlete's data are different things. Pantry, groceries, schedules, food logs, and local profiles live in browser IndexedDB on this device. A local profile is not a password-protected account or cloud sync. Use Profile → Export before changing browsers or clearing site data. Import adds profiles and does not replace existing ones. Browser notifications work while Nourally is open and permission is granted; there is no background notification service.
