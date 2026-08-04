Created READ/CODEX.md with the required READ-folder instructions. 2026.07.19
Created READ/log.md to record project actions and changes. 2026.07.19
Added a copy of Product Concept One Pager.md to the READ folder. 2026.07.19
Created the React/Vite project configuration for the calorie-tracking MVP. 2026.07.24
Created the account creation screen that leads directly to calorie-goal setup. 2026.07.24
Created the daily calorie-goal screen with editable goal and quick-select options. 2026.07.24
Created the daily dashboard with calorie progress, remaining calories, and meal log. 2026.07.24
Added local browser storage so prototype account flow, goal, and calorie entries persist. 2026.07.24
Added responsive visual styling for desktop and mobile layouts. 2026.07.24
Added ignore rules for dependencies and generated build output. 2026.07.24
Verified the app with a successful production build. 2026.07.24
Removed the two starter meal entries so new daily logs begin empty. 2026.07.28
Changed calorie storage to separate entries by local calendar date. 2026.07.28
Added automatic rollover to a fresh calorie log when the calendar day changes. 2026.07.28
Added controls to edit the name and calories of logged entries. 2026.07.28
Added controls to delete logged entries. 2026.07.28
Added a local history screen for reviewing previous daily calorie logs. 2026.07.28
Added migration that preserves non-demo entries from the earlier undated storage format. 2026.07.28
Added responsive styling for empty logs, entry controls, and daily history. 2026.07.28
Verified the updated daily logging and history app with a successful production build. 2026.07.28
Added a Weekly navigation option to the daily calorie dashboard. 2026.07.28
Added a seven-day calorie chart comparing each day with its saved goal. 2026.07.28
Added weekly calorie total and daily average calculations. 2026.07.28
Added weekly counts for goals reached and days logged. 2026.07.28
Added a consecutive daily logging streak calculation. 2026.07.28
Added previous and next week navigation with future-week protection. 2026.07.28
Added responsive weekly progress cards and chart styling. 2026.07.28
Verified the weekly progress dashboard with a successful production build. 2026.07.28
Changed the weekly dashboard from a Monday-based week to a rolling seven-day period ending on the current day. 2026.07.28
Updated weekly labels, averages, totals, and navigation to describe seven-day periods. 2026.07.28
Verified the rolling seven-day dashboard with a successful production build. 2026.07.28
Added an editable daily hydration goal stored locally on the device. 2026.08.01
Added quick controls to add or subtract water in ounces. 2026.08.01
Added a daily hydration progress indicator and remaining-water summary. 2026.08.01
Stored hydration amounts and goals inside each dated daily log for automatic daily reset. 2026.08.01
Added hydration totals and progress indicators to previous-day history. 2026.08.01
Added seven-day water averages and hydration-goal counts to Weekly progress. 2026.08.01
Added a seven-day hydration progress view ending on the current day. 2026.08.01
Added responsive styling for daily, historical, and weekly hydration views. 2026.08.01
Verified the hydration feature with a successful production build. 2026.08.01
Added a barcode-scanning entry option beside manual calorie entry. 2026.08.01
Added camera-based barcode detection for supported secure-context browsers. 2026.08.01
Added manual 8–14 digit barcode entry as a compatibility fallback. 2026.08.01
Added packaged-food lookup through the Open Food Facts product API. 2026.08.01
Added product name, brand, image, serving size, and calorie result display. 2026.08.01
Added editable serving grams with automatic calorie calculation. 2026.08.01
Added one-tap logging of scanned products into the current daily calorie log. 2026.08.01
Added camera cleanup, lookup errors, missing-data handling, and a community-data accuracy notice. 2026.08.01
Added responsive styling for barcode camera, manual fallback, and product result states. 2026.08.01
Verified the barcode scanner feature with a successful production build and live product API response. 2026.08.01
Diagnosed that the in-app browser does not provide the native BarcodeDetector API used by camera scanning. 2026.08.01
Added the ZXing browser package for cross-browser camera barcode decoding. 2026.08.01
Replaced native BarcodeDetector scanning with ZXing multi-format camera scanning. 2026.08.01
Added ZXing scanner-control and camera-stream cleanup when scanning stops or closes. 2026.08.01
Verified the cross-browser barcode scanner fix with a successful production build. 2026.08.01
Confirmed the live camera opens at 1280 by 720 while the previous decoder repeatedly fails to recognize grocery barcodes. 2026.08.01
Limited live camera decoding to one-dimensional retail barcode formats for faster and more reliable recognition. 2026.08.01
Added a scan-from-photo option for devices and browsers where live webcam recognition is unreliable. 2026.08.01
Added photo-scan error handling and clearer barcode positioning guidance. 2026.08.01
Added responsive styling for the camera and photo scanning controls. 2026.08.01
Verified the updated barcode scanner with a successful production build and live interface check. 2026.08.01
Replaced the scan-from-photo upload control with a Take photo camera control. 2026.08.01
Added capture of the current live camera frame into an in-memory image. 2026.08.01
Added automatic barcode decoding and product lookup from the captured camera frame. 2026.08.01
Added a captured-frame preview and updated camera instructions and button states. 2026.08.01
Verified the camera photo-capture update with a successful production build. 2026.08.01
Replaced the JavaScript barcode decoder with the ZXing-C++ WebAssembly barcode detector. 2026.08.01
Limited WebAssembly scanning to EAN-8, EAN-13, UPC-A, UPC-E, and numeric Code 128 product barcodes. 2026.08.01
Rebuilt live scanning around a controlled high-resolution camera stream and repeated frame detection. 2026.08.01
Updated Take photo to decode captured frames with the WebAssembly detector. 2026.08.01
Removed the superseded ZXing browser dependency. 2026.08.01
Verified the WebAssembly scanner with a successful production build and an error-free live camera run. 2026.08.01
Initialized the project as a Git repository with main as the default branch. 2026.08.01
Created the private GitHub repository ryankalfus/athletic-nutrition. 2026.08.01
Pushed the complete project to the GitHub main branch. 2026.08.01
Reviewed the completed prototype and identified the practice and game scheduler as the next MVP priority. 2026.08.04
Created a comprehensive comparative research report covering the current implementation, competitors, originality, market need, safety, privacy, technical architecture, positioning, validation, and roadmap. 2026.08.04
Documented a recommendation to reposition the product around school-day fueling logistics and parent coordination instead of a generic AI calorie tracker. 2026.08.04
Verified the existing React prototype with a successful production build before completing the research report. 2026.08.04
Added an iPhone-style monthly calendar with previous-month, next-month, and Today navigation. 2026.08.04
Added selectable calendar days with scheduled activity indicators and a detailed daily agenda. 2026.08.04
Added locally saved workout, practice, and game entries with editable names, start times, end times, and low, medium, or high activity levels. 2026.08.04
Added calendar event editing, deletion, time validation, and automatic duration display. 2026.08.04
Added responsive calendar and daily agenda styling for desktop and mobile screens. 2026.08.04
Verified the calendar and schedule feature with a successful production build. 2026.08.04
Launched the updated app in the local in-app browser. 2026.08.04
Updated the comparative research report to include the newly added manual workout, practice, and game calendar while distinguishing it from schedule-aware nutrition guidance. 2026.08.04
Refreshed the report’s production bundle measurements after successfully rebuilding the calendar-enabled prototype. 2026.08.04
Selected Nourally as the new product name after web, app-store, trademark, and domain screening. 2026.08.04
Replaced Fuel product branding with Nourally across the app title, interface labels, and package metadata. 2026.08.04
Added backward-compatible reads from former fuel-prefixed browser storage keys so existing prototype data migrates safely. 2026.08.04
Created NAMING_ORIGINALITY.md with the Nourally rationale, web and app-store screening, official USPTO results, domain checks, and limitations. 2026.08.04
Updated the comparative report’s title, scorecard, comparison matrix, naming assessment, and conclusion for the Nourally rename. 2026.08.04
Replaced remaining project-specific references to the former Fuel name while preserving competitor names and historical collision evidence. 2026.08.04
Verified the Nourally rename and backward-compatible storage migration with a successful production build. 2026.08.04
Added persistent browser storage for an optional school-year calendar schedule. 2026.08.04
Added a School calendar control with editable school-year dates, daily hours, and active weekdays. 2026.08.04
Imported recurring school days into the monthly calendar and daily agenda alongside workouts, practices, and games. 2026.08.04
Added a global school-calendar visibility toggle without deleting saved school settings. 2026.08.04
Added per-date school cancellation and restoration controls for holidays, closures, and absences. 2026.08.04
Added responsive visual styling for school setup, visibility controls, school calendar events, and canceled-school notices. 2026.08.04
Reframed the READ product vision around Nourally as a school-and-sport nutrition-logistics assistant. 2026.08.04
Updated the READ problem, users, needs, solution, MVP features, technology, learning needs, and safety challenges to match schedule-aware planning and family support. 2026.08.04
Prevented canceled-school notices from appearing while the entire school calendar is hidden. 2026.08.04
Verified school-year import, recurring weekday events, single-day cancellation, global visibility, and error-free browser behavior. 2026.08.04
Verified the complete school-calendar update with a successful production build. 2026.08.04
Reformatted the READ MVP feature list to remove trailing whitespace while preserving its structure. 2026.08.04
