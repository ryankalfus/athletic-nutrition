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
Added editable lunch, optional morning and afternoon snack, and commute-time fields to School setup. 2026.08.04
Added cafeteria, refrigerator, microwave, and classroom-eating access controls to School setup. 2026.08.04
Persisted school food-window and access details with validation for times and commute duration. 2026.08.04
Updated the READ product concept to include school food windows and access constraints. 2026.08.04
Added responsive styling for school food windows, commute details, and selectable food-access controls. 2026.08.04
Verified the school food-access setup update with a successful production build and clean diff validation. 2026.08.04
Replaced account and calorie-goal onboarding with a local food-reality setup for budget, dietary needs, food sources, and optional family preparation. 2026.08.31
Added a transparent schedule-aware recommendation engine for regular, pre-activity, during-activity, and recovery windows. 2026.08.31
Added practical food examples filtered by timing, budget, dietary needs, school access, food source, and portability. 2026.08.31
Added a prominent What should I eat now dashboard with current context, timing, explanations, and one-tap planning check-ins. 2026.08.31
Added a daily school-and-training handoff timeline and pack-ahead prompts. 2026.08.31
Added realistic and not-realistic guidance feedback with affordability, availability, dietary-fit, and time-barrier reasons. 2026.08.31
Added home, away, and travel-day activity settings with travel duration. 2026.08.31
Adjusted away and longer-travel recommendations to favor portable options and preparation reminders. 2026.08.31
Changed manual meal logging to food check-ins with optional calorie entry while retaining barcode convenience. 2026.08.31
Removed user-facing calorie-goal, remaining-calorie, and hydration-target prescriptions. 2026.08.31
Reframed hydration as a schedule-aware check-in with general educational wording and no prescribed target. 2026.08.31
Rebuilt weekly progress around food check-ins, hydration check-ins, reflection streaks, and recommendation feedback instead of calorie-goal grading. 2026.08.31
Rebuilt daily history around food and water reflection instead of calorie-goal grading. 2026.08.31
Added responsive styling for the food-reality setup, schedule-aware guidance, food options, daily timeline, feedback, and travel prompts. 2026.08.31
Rewrote the product one-pager around school-to-sport fueling logistics, real-life constraints, safe guidance, and competitor positioning. 2026.08.31
Updated the READ copy of the product one-pager to match the revised strategy. 2026.08.31
Created a five-competitor feature matrix identifying school-day execution and real-time constraints as Nourally’s product wedge. 2026.08.31
Connected optional school snack windows and classroom-eating access to the current guidance timing. 2026.08.31
Filtered school-day examples by cafeteria availability, refrigeration, and microwave access. 2026.08.31
Hardened saved food-reality profile migration for missing or invalid list values. 2026.08.31
Added a product-specific description to the app page. 2026.08.31
Added safe display fallbacks for legacy schedule entries with missing or malformed times. 2026.08.31
Added an August 31 implementation update to the comparative report so its original audit snapshot is not mistaken for the revised MVP. 2026.08.31
Removed the separate interview and external safety-review documents to keep the project focused on app development. 2026.09.01
Removed pilot, interview, publishing, and external-review sections from the product one-pager and its READ copy. 2026.09.01
Removed social publishing metadata while preserving the app’s page description. 2026.09.01
Expanded the schedule-aware food library from 10 to 24 practical options across quick, pre-activity, during-activity, meal, and recovery moments. 2026.09.02
Added persistent loaders for day-preparation plans and optional reminder settings. 2026.09.02
Added reusable recurrence resolution so weekly activities appear in daily guidance, timelines, and calendars. 2026.09.02
Added task generators for selected food ideas and early-event preparation. 2026.09.02
Added persistent day-plan and reminder state to the application. 2026.09.02
Added in-browser activity and evening-prep notifications that run while Nourally is open. 2026.09.02
Exposed additional filtered food alternatives for one-tap substitutions. 2026.09.02
Changed food guidance choices into plan actions that generate deduplicated packing, refrigeration, heating, water, and bag-placement tasks. 2026.09.02
Added one-tap food substitutions using additional options that already match the athlete’s timing, budget, access, and dietary filters. 2026.09.02
Added an interactive daily pack-and-prep checklist with completion progress and removable tasks. 2026.09.02
Added prepare-tonight guidance and an automatically generated checklist for tomorrow’s activities starting by 10:00 AM. 2026.09.02
Added user controls for activity lead time, evening-prep reminders, browser permission, and disabling notifications. 2026.09.02
Added one-time and weekly activity scheduling with selectable weekdays and a repeat-through date. 2026.09.02
Added series editing, single-occurrence skipping, and full-series deletion for recurring practices, games, and workouts. 2026.09.02
Updated calendar and agenda rendering to use stable recurring-occurrence identifiers. 2026.09.02
Added responsive styling for food swaps, packing checklists, prepare-tonight guidance, reminder controls, and recurring-event settings. 2026.09.02
Verified the recurring schedules, planning checklists, tomorrow preparation, reminders, and expanded food library with a successful production build. 2026.09.02
Updated both product one-pagers to document recurring activities, expanded food substitutions, generated prep lists, tomorrow guidance, and optional in-browser reminders. 2026.09.02
Re-ran the production build and whitespace validation after the complete feature integration; both passed. 2026.09.02
Fixed weekly-event defaults so selecting a new calendar day preselects that day and a 12-week range. 2026.09.02
Adjusted reminders to fire when Nourally opens anytime inside the chosen lead window, not only at the exact minute. 2026.09.02
Limited school microwave checklist prompts to moments when the athlete is actually at school. 2026.09.02
Verified the reminder and recurrence follow-up fixes with a successful production build and whitespace validation. 2026.09.02
Confirmed the updated local Nourally app is running and responding successfully at http://127.0.0.1:5173/. 2026.09.02
Removed the “Does this feel realistic?” and “What got in the way?” follow-up questionnaire from the daily guidance card. 2026.09.03
Removed guidance-feedback state, persistence, and weekly-summary statistics that were no longer used. 2026.09.03
Rephrased secondary onboarding and food-log questions as direct labels while preserving the primary “What should I eat now?” product feature. 2026.09.03
Removed obsolete questionnaire styles and updated product documentation to match the simplified interface. 2026.09.03
Verified questionnaire code and copy are gone and completed a successful production build and whitespace check. 2026.09.03
Restarted the local Nourally preview at http://127.0.0.1:5173/ with the simplified interface. 2026.09.03
Confirmed the local Nourally site remains live and responsive at http://127.0.0.1:5173/. 2026.09.03
Added a device-local grocery workspace model for budget, shopping goal, last shopping date, pantry, active list, cart, and purchase history. 2026.09.03
Added a budget-estimated grocery catalog organized around school weeks, practice fuel, away games, recovery meals, and staple restocking. 2026.09.03
Added a persistent Groceries tab to the Nourally navigation and connected it to the shared dietary profile. 2026.09.03
Added quick pantry entry, quantity updates, and last-shopping-date shortcuts. 2026.09.03
Added editable grocery budget and shopping-goal controls that share Nourally’s existing budget and dietary settings. 2026.09.03
Added a generated grocery list that excludes tracked pantry foods and stays within the selected budget when possible. 2026.09.03
Added custom grocery items, quantity controls, an in-app cart, per-item purchase recording, full-cart checkout, pantry updates, and purchase history. 2026.09.03
Added responsive grocery styling for budget controls, last-shop shortcuts, pantry tracking, generated lists, cart actions, and purchase history. 2026.09.03
Fixed pantry quick-add matching and added stable keys to generated grocery and cart items. 2026.09.03
Preserved in-cart items when regenerating a grocery list and excluded cart contents from duplicate recommendations. 2026.09.03
Updated both product one-pagers with the new grocery continuity workflow and device-local data behavior. 2026.09.03
Verified the complete Groceries tab with a successful production build, whitespace validation, source sanity check, and live local response. 2026.09.03
Added a signed-out account entry with separate create-account and sign-in paths for the local prototype. 2026.09.04
Persisted only account name, email, and creation metadata while explicitly avoiding local password collection. 2026.09.04
Added signed-out URL handling so a fresh account tab can open without clearing or damaging existing Nourally data. 2026.09.04
Redesigned Today as a command center with one dominant recommended action and separate school, sport, and preparation signals. 2026.09.04
Added a six-step core workflow rail connecting schedule, upcoming activities, fueling, preparation, logging, and groceries. 2026.09.04
Clarified meal planning so each choice visibly creates both a meal plan and preparation tasks and shows its completed state. 2026.09.04
Reframed the timeline around school-to-sport handoffs and made pre-practice preparation a distinct visual action. 2026.09.04
Clarified reminder state, lead time, and schedule-driven behavior without adding new reminder features. 2026.09.04
Connected grocery recommendations to the next seven days of practices, games, workouts, travel, and intensity. 2026.09.04
Added activity-based grocery reasons for pre-practice fuel, away-day packing, recovery meals, and the selected shopping goal. 2026.09.04
Added a grocery activity context panel that shows which upcoming sports are shaping the generated list. 2026.09.04
Unified the app palette around deep navy, active teal, fueling lime, and sports orange with cleaner surfaces, borders, radii, shadows, and focus states. 2026.09.04
Added a high-contrast next-action hero, compact status cards, and responsive workflow navigation to establish stronger visual hierarchy. 2026.09.04
Added distinct visual treatments for meals, timeline, preparation, tomorrow, reminders, hydration, logging, accounts, and activity-aware groceries. 2026.09.04
Raised the readability of primary dashboard labels, meal details, preparation tasks, and key controls. 2026.09.04
Updated both product one-pagers to document the polished schedule-to-fueling workflow, activity-aware groceries, and device-local account prototype. 2026.09.04
Updated the comparative report’s implementation note to reflect the September 4 core-workflow redesign. 2026.09.04
Verified the polished core workflow, account entry, and activity-aware grocery changes with a successful production build and whitespace validation. 2026.09.04
Restarted the local Nourally preview at http://127.0.0.1:5173/ for the completed interface. 2026.09.04
Opened and preserved a fresh signed-out Nourally tab showing the device-local create-account and sign-in entry. 2026.09.04
Removed the numbered Schedule-to-Groceries workflow strip from the Today view. 2026.09.04
Added the full Today, Groceries, Schedule, Weekly, History, and Profile navigation switcher to every main app page. 2026.09.04
Removed the enclosing card-style background, border, padding, and shadow from the main tab switcher. 2026.09.04
Removed the Built around filter strip from meal suggestions. 2026.09.04
Removed the Familiar works fallback card from meal suggestions. 2026.09.04
Converted Profile editing into a navigable main tab while preserving the first-run setup flow. 2026.09.04
Removed the School, Next Sport, and Prep summary-card column from Today and expanded the next recommended action across the available width. 2026.09.04
Added a consistent 16-pixel gap between the next recommended action and meal suggestions without changing responsive widths or breakpoints. 2026.09.04
Added a normalized Nourally food-record adapter for USDA FoodData Central generic and branded search results. 2026.09.04
Added a configurable USDA API connection with a development demo-key fallback and clear private-key guidance. 2026.09.04
Added a resumable downloader and ignored storage location for the official April 2026 full FoodData Central CSV snapshot. 2026.09.04
Added ingredient mappings that let every meal suggestion compare its ingredients with the user’s tracked food at home. 2026.09.04
Replaced the standalone Groceries navigation destination with a unified Food workspace while preserving legacy grocery navigation. 2026.09.04
Moved the detailed meal-suggestion and food-log experiences out of Today so they can live together in Food. 2026.09.04
Kept Today focused on the next action, timeline, preparation, reminders, and hydration after the Food move. 2026.09.04
Added a live USDA FoodData Central search with All, Generic, and Branded filters and nutrient previews. 2026.09.04
Added direct USDA-result actions for food at home, groceries, and the current day’s food log. 2026.09.04
Added Food overview readiness totals based on pantry-to-meal ingredient coverage. 2026.09.04
Normalized USDA energy values to kilocalories and safely converted kilojoules when a kilocalorie value is unavailable. 2026.09.04
Removed obsolete food-log props from the streamlined Today dashboard render. 2026.09.04
Verified live USDA generic and branded searches, including correct kilocalorie normalization and branded serving labels. 2026.09.04
Verified the finished Food workspace with a production build, whitespace check, USDA archive checksum, live-site response, and responsive browser flows. 2026.09.04
Completed a final audit of the USDA connection files, archive documentation, and production-key guidance. 2026.09.06
Verified the Food workspace with a successful production build, whitespace check, USDA archive checksum, and live local response. 2026.09.04
Built the Food workspace with Overview, At home, Groceries, Meals, and Food log sub-tabs. 2026.09.04
Added a connected Food overview showing pantry, grocery, meal-availability, and logging status. 2026.09.04
Preserved USDA food identity and nutrient metadata when groceries are checked out into Food at Home. 2026.09.04
Distinguished unknown store prices for USDA items from zero-dollar grocery estimates. 2026.09.04
Added polished responsive styling for Food navigation, USDA search results, inventory, meal availability, and logging. 2026.09.04
Made the downloaded USDA checksum portable and kept the downloader resumable for future refreshes. 2026.09.04
Updated both product one-pagers and the comparative report for the connected Food workspace and live USDA integration. 2026.09.04
Connected meal cards to live pantry availability, missing-ingredient grocery actions, and Today preparation tasks. 2026.09.04
Moved manual food check-ins and Open Food Facts barcode fallback into a reusable Food log panel. 2026.09.04
Connected USDA food records to pantry quantities, grocery-list items, and nutrition-aware food-log entries. 2026.09.04
Added pantry-to-meal ingredient matching and one-click grocery additions for missing meal ingredients. 2026.09.04
Connected Food meal planning back to Today’s existing preparation checklist. 2026.09.04
Created an isolated browser audit fixture and captured functional, responsive, and provider-integration evidence without changing the user's existing app data. 2026.09.14
Added browser audit helpers for local account boundaries, cross-tab persistence, malformed storage, timing rules, ingredient matching, and responsive schedule flows. 2026.09.14
Wrote the detailed Nourally app audit in Markdown with 23 prioritized findings, reproduction steps, UI specifications, a connected-food data plan, and completed-test matrices. 2026.09.14
Generated a 34-page PDF report with linked contents, source references, and real app screenshots using a reproducible report renderer. 2026.09.14
Rendered and visually inspected all PDF pages and added a PDF verification helper and contact sheets for document quality assurance. 2026.09.14
Closed the isolated audit browser and retained the running local development server while preserving all existing application source changes. 2026.09.14
Moved the seven audit report and helper files into the project-root AUDIT folder. 2026.09.14
Moved supporting screenshots, browser artifacts, and synthetic test storage into AUDIT/evidence. 2026.09.14
Updated audit helper paths and report references to use the consolidated AUDIT folder. 2026.09.14
Created the complete audit implementation checklist and preserved the pre-change source and configuration in AUDIT/implementation-baseline. 2026.09.14
Extracted the existing food catalog and timing logic into domain modules without removing the original functionality. 2026.09.14
Added versioned profile schemas, legacy migration backups, atomic IndexedDB transactions, cross-tab refresh, additive imports, and local profile export/deletion primitives. 2026.09.14
Connected the app to isolated local profiles, explicit device-data controls, visible save errors, recovery UI, and hash-based navigation. 2026.09.14
Replaced conflicting food matching with canonical ingredient relationships and added precise/approximate stock, explicit portions, immutable source snapshots, and unknown-price handling. 2026.09.14
Implemented grocery previews that preserve existing list/cart items, strict estimated budgets, idempotent purchase recording, and purchase undo. 2026.09.14
Built the local USDA snapshot index containing 2,013,644 searchable generic and branded records and verified SQLite integrity. 2026.09.14
Added a validated, cached server-side food gateway with timeouts, request limits, local indexed search, details, and barcode fallback while removing browser API-key configuration. 2026.09.14
Rebuilt contextual Food search, pantry, groceries, meal plans, food logging, explicit pantry deductions, and reversible removal controls without adding new photography. 2026.09.14
Added lazy camera decoding and shared USDA/Open Food Facts food records, portions, source metadata, favorites, and recent foods. 2026.09.14
Added active lunch and multi-session recovery handling, travel-departure context, actual-time notification text, reversible hydration entries, and actionable rest-day state. 2026.09.14
Added skipped-sports restoration, series-delete confirmation, overlap warnings, mobile agenda mode, accessible weekday controls, and focused activity editing. 2026.09.14
Added compact navigation and headings, contextual Food tabs, stronger contrast and targets, restrained surfaces, accessible dialogs, a Weekly data table, editable History, and an app favicon. 2026.09.14
Kept reminder deduplication stable when the lead-time setting changes, while retaining a new reminder for a rescheduled start. 2026.09.14
Routed Today’s completed-preparation action to the food log and missing-ingredient action to meals. 2026.09.14
Made generated grocery reasons reference the relevant upcoming activity or the selected shopping goal. 2026.09.14
Added regression tests for remaining-time reminder delivery, lead-time deduplication, rescheduling, grouped purchase undo, and grouped stock-deduction limits. 2026.09.14
Documented local USDA index operation, refresh, server fallback, data boundaries, and local profile behavior. 2026.09.14
Updated both product concept copies to describe the implemented Food workspace, local profiles, IndexedDB storage, and indexed USDA snapshot accurately. 2026.09.14
Verified all ten main and Food routes at 320, 390, 768, 1024, and 1440 pixel widths with no horizontal page overflow or browser page errors. 2026.09.14
Verified the built production server serves the app and indexed local USDA search with the correct dated snapshot. 2026.09.14
Limited initial meal cards to six with an explicit Show more control for easier phone browsing. 2026.09.14
Made mobile Food subsection navigation horizontally scrollable and keep the selected subsection visible. 2026.09.14
Verified additive backup import, active-profile-only deletion, and a simulated IndexedDB quota failure without changing existing user data. 2026.09.14
Completed the audit checklist for all app-controlled items and documented the remaining device, credential, and specialist checks separately. 2026.09.14
