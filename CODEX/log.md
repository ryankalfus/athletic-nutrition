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
Created TODO/REMAINING-APP-CHANGES.md with a source-checked meeting-to-app checklist that excludes completed features, non-app assignments, and deadlines without changing app functionality. 2026.09.21
Created a curated Downloads/CLAUDE copy for a Claude product and UI review, including active source, relevant documentation, audit Markdown, and UI screenshots while excluding large generated and USDA data files. 2026.09.21
Created a standalone Claude prompt for a full Nourally source and screenshot review covering product strategy, information architecture, page redesigns, design-system specifications, feature decisions, responsive behavior, accessibility, state completeness, and an implementation-ready prioritized audit. 2026.09.21
Committed and pushed all current workspace changes to GitHub. 2026.09.28
Added the Claude redesign audit document to the project. 2026.09.29
Committed and pushed the redesign audit document to main. 2026.09.29
Created REDESIGN-CHECKLIST.md with individual phase and recommendation checkboxes, owner and review gates, MVP criteria, and the full audit specification. 2026.09.29
Added the audit color, spacing, radius, motion, typography, and compatibility tokens for the redesign. 2026.09.29
Added base element, focus, and reduced-motion styles that use redesign tokens. 2026.09.29
Self-hosted DM Sans and Barlow Semi Condensed fonts, removed Google Fonts and legacy font families, and installed Lucide icons. 2026.09.29
Added the light color-scheme metadata and verified the P0-01 production build and diff. 2026.09.29
Marked P0-01 and implemented design-system recommendations in REDESIGN-CHECKLIST.md and filled missing DS and ADD checkboxes. 2026.09.29
Prepared a shared four-destination app frame with Lucide navigation, desktop rail, tablet bar, and phone tab bar pending the owner D07 decision. 2026.09.29
Moved the device-profile panel inside the Profile main content before its footer and removed per-page navigation instances. 2026.09.29
Verified the frame with a production build, targeted lint, breakpoint navigation measurements, and Food and You placement checks. 2026.09.29
Marked P0-02 and dependent P0-03 blocked pending the owner navigation decision in REDESIGN-CHECKLIST.md. 2026.09.29
Recorded the owner decision to use four main destinations and four Food sections and accepted P0-02 in REDESIGN-CHECKLIST.md. 2026.09.29
Recorded that the owner will arrange qualified nutrition and allergen review; reviewer sign-off remains pending. 2026.09.29
Added canonical Schedule, You, Welcome, and four Food routes with history-replacing redirects from legacy URLs. 2026.09.29
Added Page not found for unknown routes and removed the unreachable groceries route branch and separate History page. 2026.09.29
Opened Today after athlete selection and changed the You page heading to match its route. 2026.09.29
Verified legacy redirects, Back behavior, the Welcome chooser, and the new route views with targeted browser checks and lint. 2026.09.29
Marked P0-03 and its completed route recommendation IDs in REDESIGN-CHECKLIST.md. 2026.09.29
Added ToastProvider with timed action feedback and revision-guarded Undo for data and reversible profile writes. 2026.09.29
Added inline dialog save errors and retry of the failed write, with a fallback to reopen the database. 2026.09.29
Added ConfirmDialog for overlapping activities, activity deletion, profile deletion, recovery, unsaved setup changes, and shopping-trip undo. 2026.09.29
Added an async action guard and pending states to prevent repeat food planning, logging, shopping, and pantry submissions. 2026.09.29
Removed the Food workspace shared status line and routed validation and instruction feedback to action toasts. 2026.09.29
Kept the Schedule edit form open until a save succeeds and normalized save-error punctuation. 2026.09.29
Verified P0-04 with a targeted build, lint, toast Undo and typed deletion browser checks, and a native-confirm search. 2026.09.29
Marked P0-04 and its completed feedback recommendation IDs in REDESIGN-CHECKLIST.md. 2026.09.29
Added shared human date, time, duration, countdown, plural, amount, and enum formatting helpers. 2026.09.29
Replaced raw dates, times, activity labels, and recurrence wording on Today and Schedule. 2026.09.29
Replaced raw quantities, dates, status labels, and source labels in Food and weekly Log. 2026.09.29
Updated reminder titles and the timing clock to use the shared human formatters. 2026.09.29
Verified P0-05 with formatter examples, a production build, targeted lint, and a rendered-text scan of nine routes. 2026.09.29
Marked P0-05 and COPY-14 through COPY-17 complete in REDESIGN-CHECKLIST.md. 2026.09.29
Removed inert Nut-free catalog flags and filtering while warning profiles that an older choice no longer filters foods. 2026.09.29
Changed conventional oats and the oatmeal idea so neither claims gluten-free status. 2026.09.29
Removed the Nut-free claim from a seed-mix idea and peanut-butter placeholder examples. 2026.09.29
Added label-check reminders to the profile, Ideas, Food, search, portion editor, and barcode product views. 2026.09.29
Verified the local P0-06 draft with targeted build, lint, inert-flag checks, and You/Ideas browser checks. 2026.09.29
Marked P0-06 and YOU-03 as pending qualified nutrition and allergen review in REDESIGN-CHECKLIST.md. 2026.09.29
Changed timing labels to human countdowns, removed arrival-buffer wording, and named the snack in packing copy. 2026.09.29
Replaced search provider and database labels with top matches, brand or basic-food labels, serving text, and optional nutrition details. 2026.09.29
Removed nutrition-record and ingredient-relationship jargon from the portion editor. 2026.09.29
Removed the dead Food Overview and rewrote At home, price, and activity copy in plain language. 2026.09.29
Merged Groceries into one checklist with Got it controls and a Finish shopping action. 2026.09.29
Reworded Today and Schedule actions, reminder text, school controls, and recurring-activity editing labels. 2026.09.29
Removed weekly logging streak and pressure copy and clarified the water and log summaries. 2026.09.29
Changed the profile budget choice to a low-cost switch and moved guidance text into You under About Nourally's guidance. 2026.09.29
Verified P0-07 copy with a targeted build, lint, nine-route text and button scans, and the grocery-to-At-home browser flow. 2026.09.29
Marked completed copy IDs and P0-07's review and P1 layout dependencies in REDESIGN-CHECKLIST.md. 2026.09.29
Normalized null and missing optional purchase fields before pantry matching. 2026.09.29
Scoped purchase undo deductions and zero-row removal to the trip's own pantry records. 2026.09.29
Made newly added At home food use exact stock with a zero low-stock threshold. 2026.09.29
Preserved quantity and prior availability when marking At home food Out and back. 2026.09.29
Preserved a food log entry's original time when editing its portion. 2026.09.29
Restored linked pantry deductions on food log removal and blocked removal when stock could not be restored. 2026.09.29
Connected Today's Log it action to planned-meal logging and plan status update. 2026.09.29
Added an explicit choice before merging a newly added duplicate food. 2026.09.29
Added focused P0-08 domain regression cases and passed targeted build, lint, and browser checks. 2026.09.29
Marked P0-08 complete in REDESIGN-CHECKLIST.md. 2026.09.29
Mapped unknown Open Food Facts barcodes to a distinct 404 message while keeping provider outages separate. 2026.09.29
Checked food API response status before JSON parsing and handled offline and non-JSON failures. 2026.09.29
Added a live offline message to food search while retaining recent and saved foods. 2026.09.29
Made the camera preview visible while active and added a visual barcode scan guide. 2026.09.29
Connected food search's input ref to dialog initial focus in both add and log flows. 2026.09.29
Verified P0-09 with targeted response checks, build, lint, diff check, and browser focus check. 2026.09.29
Marked P0-09 and SRCH-04 through SRCH-06 complete in REDESIGN-CHECKLIST.md. 2026.09.29
Added focused P0-10 timing cases for 30, 90, and 180-minute boundaries and lunch before practice. 2026.09.29
Kept the active or upcoming school food window visible alongside a later activity. 2026.09.29
Removed school-handoff wording on non-school days and zero-minute travel wording. 2026.09.29
Added SETUP and quiet LATE timing states without a Today action idea. 2026.09.29
Updated Today's SETUP and LATE actions to reflect the timing state. 2026.09.29
Verified the P0-10 local draft with targeted timing tests, build, lint, and diff check. 2026.09.29
Marked P0-10 pending qualified timing review and source documentation in REDESIGN-CHECKLIST.md. 2026.09.29
Moved away-session reminder timing to Leave by and kept singular minute wording through the shared countdown formatter. 2026.09.29
Guarded reminder delivery when an athlete is closed or browser notification permission is revoked. 2026.09.29
Changed Today's reminder availability text to desktop-browser scope without promising phone delivery. 2026.09.29
Added targeted Leave by, plural, and closed-athlete reminder tests and passed build and lint. 2026.09.29
Marked P0-11 and DATA-09 complete while retaining DATA-06's later You and service-worker work. 2026.09.29
Changed default backups to contain only the current athlete while preserving the version 2 document format. 2026.09.29
Added an explicit Include all athletes backup option and a scope field. 2026.09.29
Named backup files with the athlete and local calendar date. 2026.09.29
Made profile deletion stop when backup fails and open Welcome after a successful typed confirmation. 2026.09.29
Kept recovery exports scoped to the full database so recovery can preserve all profiles. 2026.09.29
Added a targeted backup privacy test and passed build, lint, and diff checks. 2026.09.29
Marked P0-12, DATA-03, and DATA-05 complete in REDESIGN-CHECKLIST.md. 2026.09.29
Marked P1-01 blocked by P0-10's qualified timing review before starting the independent Schedule phase. 2026.09.29
Made Week the default Schedule view with a saved Week/Month choice and direct week navigation. 2026.09.29
Rebuilt Schedule day sections with human activity labels, time, location, and action menus. 2026.09.29
Moved school settings into a sectioned School day sheet opened from Schedule rows. 2026.09.29
Added persistent school days-off ranges alongside existing single-day exceptions. 2026.09.29
Added a dated pause-school control and excluded paused dates from school timing. 2026.09.29
Restyled Month cells with activity dots, overflow count, and a single today ring. 2026.09.29
Used ConfirmDialog for activity overlap and deletion instead of native confirmation. 2026.09.29
Prepared sport-based default activity titles pending the profile sport control in P1-10. 2026.09.29
Reordered ActivitySheet controls and limited location to Home and Away with conditional travel time. 2026.09.29
Added per-date edit scope and recurrence overrides while preserving other weekly occurrences. 2026.09.29
Added per-date or all-occurrence delete scope for repeating activities. 2026.09.29
Kept ActivitySheet actions visible at the audited phone and desktop viewports. 2026.09.29
Added a dirty-form discard confirmation to ActivitySheet. 2026.09.29
Added the desktop week-at-a-glance column and explicit days-off summary. 2026.09.29
Passed targeted P1-02 timing tests, build, lint, diff checks, and browser checks of Week, Month, Away, footer, and discard. 2026.09.29
Marked SCH-02 through SCH-08, ACT-01 through ACT-03, ACT-05, and ADD-07 complete; left ACT-04 and SCH-09 pending dependencies. 2026.09.29
Replaced the Food search filter and submit control with a field, barcode action, idle lists, and local 300 ms search. 2026.09.29
Ranked basic foods first in local USDA search and API fallback, with brand and barcode exceptions. 2026.09.29
Changed search pagination to Show more results and kept the manual-add action at the end. 2026.09.29
Passed targeted build, lint, diff, four-query catalog checks, and live banana search; marked SRCH-01 complete. 2026.09.29
Displayed sentence-case search names with brand on a separate line. 2026.09.29
Collapsed same-name and same-brand food records within and across search result pages. 2026.09.29
Normalized gram aliases and suppressed unsupported portion units in search hints. 2026.09.29
Passed targeted duplicate, build, lint, diff, and live Cheerios checks; marked SRCH-02 complete. 2026.09.29
Removed provider, result-count, and calorie-density text from Food search results. 2026.09.29
Kept food provenance as a subdued Source line in the portion editor. 2026.09.29
Passed targeted build, lint, and diff checks; marked SRCH-03 complete. 2026.09.29
Marked P1-07 partial and SRCH-07 blocked pending qualified review of allergen-tag display. 2026.09.29
Marked COPY-29 complete after Schedule gained a named School day row and editor action. 2026.09.29
Marked COPY-30 complete after the dated Pause school control replaced Shown and Hidden. 2026.09.29
Updated P0-07's remaining dependencies to COPY-23 review and COPY-33 Today layout. 2026.09.29
Requested Open Food Facts allergen and trace tags and normalized valid tag arrays without displaying them. 2026.09.29
Passed targeted tag-normalization, build, lint, and diff checks; kept SRCH-07 pending qualified review. 2026.09.29
Recorded P1-03 as waiting for reviewed P1-01 ranking and the P1-02 ActivitySheet. 2026.09.29
Recorded P1-04 as waiting for P1-01 shared ranking and plan lifecycle. 2026.09.29
Recorded P1-05 as waiting for the P1-04 Food frame. 2026.09.29
Recorded P1-06 as waiting for P1-05 At home. 2026.09.29
Recorded P1-08 as waiting for P1-01 lifecycle and P1-07 review. 2026.09.29
Recorded P1-09 as waiting for qualified allergy review and P0-06/P1-04. 2026.09.29
Recorded P1-10 as waiting for P1-09's reviewed allergy model. 2026.09.29
Recorded P1-11 as waiting for P1-02, P1-09, and P1-10. 2026.09.29
Recorded P1-12 as waiting for P1-03 and P1-10. 2026.09.29
Recorded P1-13 as waiting for P1-03 through P1-11 page work. 2026.09.29
Marked RWD-10 complete because Week agenda is now the phone Schedule default. 2026.09.29
Marked RWD-14 complete after Month cells switched from truncated chips to dots and a full-title agenda. 2026.09.29
Marked RWD-15 complete after replacing viewport-derived mode with a saved Week/Month control. 2026.09.29
Renamed Month's duplicate Today action to Go to today and marked A11Y-10 complete after targeted checks. 2026.09.29
Created a qualified-review packet listing current timing thresholds, copy, source starting points, and evidence gaps without approving guidance. 2026.09.29
Recorded pending age, allergen, game-day, and sports-drink review questions and sign-off fields in NUTRITION-REVIEW.md. 2026.09.29
Updated P0-10 to link the prepared review packet while keeping the qualified-review gate open. 2026.09.29
Displayed the total activity count alongside up to three Month-view dots and passed targeted build, lint, and diff checks. 2026.09.29
Moved Recent and Saved ahead of Quick basics in the idle Food search dialog. 2026.09.29
Added sticky search controls, skeleton loading, and a full-screen phone search sheet. 2026.09.29
Announced no matches politely only for the current query and passed targeted build, lint, diff, idle-order, and 390x844 checks. 2026.09.29
Cleared stale Food search results when the query drops below two characters and passed targeted lint and diff checks. 2026.09.29
Recorded owner-reported qualified review approval from Emily Cornelius, RDN, dated September 29, 2026, with the approved audit scope. 2026.09.29
Recorded the owner confirmation of the previously presented recommended product decisions and preparation offsets. 2026.09.29
Accepted P0-06 after its existing targeted checks and the supplied qualified-review approval. 2026.09.29
Added named school Lunch and Snack time rows to Today after removing the food-window band. 2026.09.29
Replaced the remaining clinician and food-window wording in Ideas and timing with the approved plain copy. 2026.09.29
Passed the P0-07 rendered banned-text, ISO-date, and bare-time scan on all nine routes and accepted COPY-23 and COPY-33. 2026.09.29
Passed four targeted P0-10 timing tests, changed-file lint, build, and diff checks; accepted P0-07 and P0-10 with supplied RDN approval. 2026.09.29
Cleared the P1-01 prerequisite blocker after all P0 phase items were accepted. 2026.09.29
Started the local app on port 4173 for targeted redesign checks. 2026.09.29
Added meaningful P1-01 ranking, lifecycle, duplicate-log, and version 2 migration tests before implementing the domain changes. 2026.09.29
Created one pure pantry-aware ranking and ideasFor function and connected both Today and Ideas to it. 2026.09.29
Made Have stock sufficient for idea readiness while keeping exact-quantity checks. 2026.09.29
Added intended eat time, packed and eaten timestamps, log links, same-write preparation synchronization, and idempotent plan logging. 2026.09.29
Added additive schema 3 plan migration with the complete original document retained alongside legacyBackup. 2026.09.29
Saved and downloaded the original version 2 document before the first schema 3 write. 2026.09.29
Updated existing planned-meal logging and status display to use Eaten and preserve the log link. 2026.09.29
Published the migrated schema 3 snapshot while keeping version 2 backup preservation before the first database write. 2026.09.29
Passed three P1-01 acceptance tests and six related cases plus changed-file lint, build, and diff checks. 2026.09.29
Accepted P1-01, FOOD-02, and ADD-02 and advanced the checklist to P1-02 reusable Schedule sheets. 2026.09.29
Extracted Schedule from main.jsx into its page with reusable SchoolDayEditor and ActivitySheet field components. 2026.09.29
Collapsed empty Schedule days while retaining a named date and Add practice action. 2026.09.29
Focused ActivitySheet on the type control and guarded both editor submissions against repeat taps. 2026.09.29
Added SchoolDayEditor dirty-close confirmation and a sticky footer with visible Save and Cancel actions. 2026.09.29
Added the approved Game day chip for game context without introducing additional game-specific nutrition claims. 2026.09.29
Passed targeted Schedule, timing, and lifecycle tests plus changed-file lint and build after extracting reusable editors. 2026.09.29
Verified ActivitySheet footers at 390×844 and 1470×800 and SchoolDayEditor footer and dirty-close confirmation at 390×844. 2026.09.29
Accepted P1-02, ACT-04, and SCH-09 and advanced the checklist to P1-03. 2026.09.29
Added reviewed before-school, travel, rest, evening and lunch-preserving Today timing states. 2026.09.29
Assigned packing task due times from school departure and away activity travel context. 2026.09.29
Allowed individual store changes to provide a specific save toast while preserving guarded Undo and retry. 2026.09.29
Replaced the old Today Dashboard with a Now card, ordered day rail, packing list, compact water row and conditional Tonight list. 2026.09.29
Added Today plan status actions and stale schedule Update or Keep choices with pending guards. 2026.09.29
Removed Today’s footer and reminder settings form and added one dismissible reminder prompt. 2026.09.29
Aligned the Today clock refresh to minute boundaries and opened the activity sheet directly from Add practice. 2026.09.29
Passed eight targeted timing, ranking, migration and lifecycle tests and checked mobile setup layout and water-save Undo. 2026.09.29
Extracted NowCard into a reusable component and measured fifteen timing states with real rendered cards at 390×844. 2026.09.29
Fixed the activity-sheet initial dirty baseline for Today’s direct Add practice entry. 2026.09.29
Moved completed pre-activity plans to the recovery planning moment and included weekly rest patterns in empty-schedule detection. 2026.09.29
Extracted DayRail, PackPrep, WaterRow and TonightCard while retaining Today’s shared controller and pending guards. 2026.09.29
Accepted P1-03 after fifteen state-layout fixtures, isolated plan-title and task creation checks, eight domain tests, lint and build. 2026.09.29
Advanced the durable checklist to P1-04 Food frame and Ideas. 2026.09.29
Extracted IdeasPage and MealPlanCard with status-based next actions and no repeated Food workspace heading. 2026.09.29
Added sticky Food section links with low-stock and unchecked-grocery badges. 2026.09.29
Added URL-backed Now, Before practice, After practice and Tomorrow idea selection with shared ranking. 2026.09.29
Added visible saved hearts and Not for me with athlete-scoped hidden ideas and guarded Undo. 2026.09.29
Added readable display amounts while retaining existing numeric ingredient amounts for calculations. 2026.09.29
Prevented duplicate identical plans and repeat double-click actions on newly inserted planned cards. 2026.09.29
Corrected missing-grocery generation to skip sufficient stock while retaining low approximate stock as missing. 2026.09.29
Accepted P1-04 after targeted domain tests, lint, build and isolated Tomorrow planning, saved, hidden and navigation checks. 2026.09.29
Extracted At home into HomePage with place groups, filters and Have, Low and Out controls. 2026.09.29
Added exact stock steppers with 600 ms saves and preserved exact quantity through Out and Have. 2026.09.29
Added eight food-needs-filtered quick adds that create Have stock and offer Undo and Edit details. 2026.09.29
Added an explicit Update or Keep both choice when adding duplicate stock. 2026.09.29
Added compact stock details with Counts as, place, amount type, use-by date, notes and dirty-close confirmation. 2026.09.29
Added individual and all-low restock actions with duplicate prevention. 2026.09.29
Migrated stored some availability to have and renamed stock labels to Have and Low. 2026.09.29
Allowed silent stock-control saves and an optional action beside guarded Undo in save toasts. 2026.09.29
Accepted P1-05 after targeted tests, lint, build and isolated quick-add, details and exact-stock restoration checks. 2026.09.29
Simplified REDESIGN-CHECKLIST.md tracker entries to checkbox IDs, removing per-step summaries and implementation notes while preserving the embedded full audit specification. 2026.09.29
Reconciled all nine §13.7 owner decisions and qualified review gate statuses against the user’s confirmations, retaining the owner-reported attribution for Emily Cornelius, RDN approval. 2026.09.29
Committed and pushed the P1-05 Food home inventory, Ideas, and reusable redesign changes to main. 2026.09.29
Fixed TypeScript inference in the ranking and timing helper input options so CI typecheck passes. 2026.09.29
Restored subtraction of compatible queued grocery quantities from meal ingredient needs. 2026.09.29
Passed workflow checks locally: typecheck, lint, 39 tests, production build, and diff check. 2026.09.29
Hid the Gluten-free chip, stopped filtering ideas on unreviewed gluten and nut flags, and added a notice for a stored Gluten-free choice. 2026.09.29
Added the label-check line to Ideas cards, planned food cards, and the log-as-planned dialog. 2026.09.29
Made Ideas rank every moment with the same access, school, and travel inputs as Today, with a school-context test. 2026.09.29
Added readable household amounts for every idea ingredient. 2026.09.29
Showed the low-cost note only when it hides ideas, and kept saved meal ideas out of food search. 2026.09.29
Showed plan status in plain words on planned food cards and pluralized the search serving text. 2026.09.29
Added a typed offline error for food lookups and one offline line in search; verified barcode 404, outage, and camera preview. 2026.09.29
Updated the provider browser check to the current search UI and passed it against the dev server. 2026.09.29
Split the Schedule week agenda and month grid into ScheduleWeek and MonthGrid components without changing behavior. 2026.09.29
Added You › Reminders (on/off, 30/60/90 min lead, evening prep, permission state, DATA-06 honesty line) at #/you/reminders and pointed Today's prompt and toasts to it. 2026.09.29
Moved the signed-out flag into a store-level session module so a deleted or closed athlete cannot fire reminders on Welcome. 2026.09.29
Added profile.sport with validation, an empty migration default, and a setup/You field so new activities are titled like "Soccer practice". 2026.09.29
Made Day rail food rows read "Snack · about 2:30 PM · Banana + pretzels · packed" and open plan details, added availability chips, the "Planned for [time]. Undo" toast, and sentence-case countdown labels. 2026.09.29
Added unit tests for format.js helpers, sport titles, the reminders Welcome guard and settings, and Day rail rows; npm run check passes with 45 tests. 2026.09.29
Merged grocery suggestions and missing-ingredient adds into one generator with shopping units, reasons, and unchecked items. 2026.09.29
Migrated grocery cart status to checked items, defaulted budget to none, and added an off-by-default price estimate setting. 2026.09.29
Made finishing a trip update matching At home rows in place, create new rows as Have, and scope trip undo to its own rows. 2026.09.29
Moved Groceries into its own page with check-off rows, a finish bar, put-away sheet, swap, and latest-trip undo. 2026.09.29
Split the portion editor to log-only, fixed Out restoring to Have, and asked Counts as only for unmatched foods. 2026.09.29
Replaced leftover data-model copy in the food log and added pending states to its write buttons. 2026.09.29
Stopped grocery suggestions and At home quick adds from filtering on unreviewed gluten and nut flags, with a test. 2026.09.29
Moved the Show price estimates switch to You › Food access & budget. 2026.09.29
Made the Ideas add-missing toast state the real count, or say everything is already on the list. 2026.09.29
Verified the gaps in P0-05, P0-06, P0-07, P0-09, P0-11 and P1-01 to P1-06 are closed, completed P1-06 Groceries, and checked P1-06, IA-12, TODAY-09, FOOD-05, GROC-01 to GROC-08 and DATA-06 in the tracker after npm run check and browser checks at 375 px. 2026.09.29
Hid the Dairy-free chip and stopped filtering on unreviewed dairy flags, with a notice for a stored Dairy-free choice and test coverage. 2026.09.29
Added `npm run test:browser` (scripts/run-browser-checks.mjs) that starts or reuses Vite on 5184, runs every tests/browser-*.js snippet in headless Chromium, and exits non-zero on failure; added playwright as a devDependency (setup: `npx playwright install chromium`). 2026.09.29
Updated the provider browser check to the current Log food button. 2026.09.29
Rewrote the persistence browser check for Restore backup, typed-DELETE profile deletion, and the Water row save failure. 2026.09.29
Rewrote the reliability browser check for the Water row, +8/+16 cross-tab writes, and the current profile flow. 2026.09.29
Rewrote the schedule browser check for the week view, repeating-activity scope prompts, and school day skip/restore. 2026.09.29
Rewrote the food workflow browser check for Groceries add-for-week, Finish shopping, put-away to At home as Have, Ideas plan/pack/log, use from home, and price estimates. 2026.09.29
Added a You browser check for sport, hidden Gluten-free/Dairy-free/Nut-free chips, and the Reminders sheet at #/you/reminders with its honesty line. 2026.09.29
Rewrote the responsive browser check to fail on horizontal scroll at 375 px and up on every main route; 320 px is reported only (Today spills 8 px there). 2026.09.29
Added a root AGENTS.md with shared handoff rules, commands and safety rules, and a CLAUDE.md that imports it, so Codex and Claude Code load the same instructions. 2026.09.29
Added a pending qualified review section to NUTRITION-REVIEW.md covering every household amount, with 31 OK, 27 questions and 8 suggested changes, and a blank sign-off block. 2026.09.29
Added You settings data (season, Not a fan of, low-cost switch from the budget tier, last backup date) with additive migration, validation and tests. 2026.09.29
Made Ideas hide ideas that use a Not a fan of ingredient, with a test. 2026.09.29
Built You › This device: athletes list with Open and Rename, Add athlete, last backup line, styled restore button with a preview before adding, newer-version and not-a-backup errors, Keep data on this device, and a separated delete zone. 2026.09.29
Marked restored athletes "(from backup)" until renamed instead of adding "(imported)" to the name. 2026.09.29
Changed the footer to "Saved on this device. Food search uses online food databases." 2026.09.29
Replaced the tabbed You form with the settings list: athlete header with Switch athlete or Add another athlete, and rows with summaries for Sport & season, Food needs & allergies, Food access & budget, Reminders, This device and About Nourally's guidance. 2026.09.29
Added Sport & season, Food needs & allergies and Food access & budget sheets that save in place with a Saved toast and ask Discard changes? on cancel; moved Reminders onto the same sheet. 2026.09.29
Added the grocery budget and school food access to Food access & budget, and showed the budget next to the Groceries price estimate. 2026.09.29
Added About Nourally's guidance as the one full safety explanation. 2026.09.29
Moved the You page out of main.jsx into src/pages/You, keeping the first-run form in main.jsx for setup only. 2026.09.29
Fixed an 8 px sideways scroll on Today at 320 px by letting the Today grid column shrink. 2026.09.29
Counted an exact At home count in another unit (for example 3 bunches of bananas) as available for ideas, marked approximate, with a test. 2026.09.29
Updated the persistence browser check for You › This device: restore preview, Open athlete, and Delete [name]'s data. 2026.09.29
Updated the You browser check for the settings list: Sport sheet save, Food needs without allergen chips, and the Reminders link. 2026.09.29
Updated the food workflow browser check to set 3 bunches before Ideas and assert the banana counts At home, and to turn on price estimates in the Access sheet. 2026.09.29
Made the responsive browser check fail on page-level horizontal scroll at 320 px too and added the You sheet routes. 2026.09.29
Made the provider browser check name the USDA DEMO_KEY rate limit when real search is throttled. 2026.09.29
Checked YOU-01, YOU-04 to YOU-06, DATA-01, DATA-04 and DATA-07 after unit and browser checks, and noted YOU-02 and YOU-03 as partial pending reviewed allergen tags. 2026.09.29
Documented browser-check setup, the USDA key, and the Windows npm ci lock issue in AGENTS.md. 2026.09.29
Fixed household amount wording that contradicted idea names or used undefined units, added soy milk to the smoothie, showed the approved sports-drink water line on Ideas cards, and recorded every change as pending qualified review. 2026.09.29
Rebuilt tokens.css with the type scale, gutters 16/24/32, column widths 720/960/1072, rhythm, icon, layer and motion tokens, and removed the old alias tokens. 2026.09.29
Rewrote base.css with element defaults: headings on the type scale, 48 px inputs with focus and error states, chevron selects, 22 px checkboxes, a switch style, tables, focus rings and reduced motion. 2026.09.29
Added components.css with the shared primitives: buttons (primary, secondary, text, destructive, icon, busy spinner), chips, segmented controls, cards, rows, row menus, badges, empty states, skeletons, inline errors, dialogs and bottom sheets with sticky header and footer, and toasts. 2026.09.29
Made the frame center every page in a 720, 960 (Food) or 1072 px (Today, Schedule at 1200 px) column with 16/24/32 px gutters, dropped the 100vh minimum height, and kept phone chrome within 112 px. 2026.09.29
Moved Today, Schedule, Food, Search and You styles onto the tokens with mobile-first 480/768/1024/1200/1280 breakpoints, and added welcome.css for setup, the athlete chooser, recovery and not-found. 2026.09.29
Migrated the still-used legacy rules (month grid, day agenda, school day, weekly view, scanner, setup form) and deleted src/styles.css and src/refinement.css. 2026.09.29
Made the Now card a pitch card with the lime Go button, removed card stripes, and marked activities with a colored dot instead of a left border. 2026.09.29
Replaced glyph icons (close, chevrons, steppers, row menus, empty agenda, favorite star, brand arrow) with Lucide icons and removed unused eyebrow props, hidden kickers, uppercase section labels and the floated arrow on Save and see today. 2026.09.29
Hid the page H1 visually on phones where the top bar already shows the page name, keeping it for screen readers. 2026.09.29
Made the Food section control fit all four tabs at 320 px and stick under the top bar. 2026.09.29
Added EmptyState and Skeleton components and used them for every empty state and the search and startup loading states. 2026.09.29
Added SegmentedControl, ChipGroup and SwitchRow in components/ui and used them for the Schedule view, stock status, season, reminder timing, activity sheet, setup and school food access groups. 2026.09.29
Set aria-busy on buttons that show Saving… so they draw the spinner. 2026.09.29
Moved loose dialog buttons into the sticky action footer and wrapped row menu items so each menu opens as one panel. 2026.09.29
Extended the responsive browser check to fail on text under 12 px (13 px outside the tab bar and badges), negative margins, an uncentered or over-wide column, phone chrome over 112 px, clipped Food tabs and a clipped activity sheet, and to cover the welcome page. 2026.09.29
Checked DS-05 to DS-12, DS-14, DS-16 to DS-19, RWD-01 to RWD-09, RWD-11 to RWD-13, CMP-03, CMP-07 and CMP-08, and noted DS-13, DS-15, CMP-02, CMP-04 and CMP-17 as partial. 2026.09.29
Named untitled or generic activities after the athlete's sport on Today (for example "Soccer game in 1 hr 50 min") through sportEventTitle in timing.js, with no sport-specific nutrition. 2026.09.29
Added a Game day chip to the Now card, the Day rail and Tonight, and colored game chips in the Today header. 2026.09.29
Fixed Tonight never appearing: it looked up tomorrow with a Date instead of a date key; the evening planner now lives in domain/tonight.js. 2026.09.29
Made Tonight show every activity tomorrow with times, Away and Leave by, and build one list for all of them with tasks due 30 minutes before school or the earliest Leave by, plus Pack lunch for school when cafeteria access is off. 2026.09.29
Added one Checklist component for Pack & prep and tomorrow's list, with a Remove button that offers Undo and a "Was due" line for missed tasks today. 2026.09.29
Made the Now card's evening button read Open tomorrow's list once the list is built. 2026.09.29
Added Share list (Web Share) or Copy list (clipboard, then a legacy copy) to Pack & prep, Tonight and Groceries, sharing plain text with one item per line and no IDs; Groceries shares only unchecked items. 2026.09.29
Added the monthly backup nudge to Today's prompt slot ("Last backup 32 days ago. Save a backup file?") with Save backup and Not now, which hides it for 30 days. 2026.09.29
Added tests/evening-share.test.js for sport titles, the evening planner, share text and the backup nudge, and tests/browser-evening-share.js with a fixed 8 PM clock. 2026.09.29
Recorded the new Tonight and task wording as pending in NUTRITION-REVIEW.md. 2026.09.29
Checked P1-12, ADD-06, ADD-09, ADD-11, ADD-12, DATA-08, CMP-11 and CMP-12 after unit and browser checks. 2026.09.29
Added draft per-ingredient allergen tags (contains and may contain, the nine FDA majors) for every idea ingredient and grocery item in catalog.js, behind a closed ALLERGY_TAGS_REVIEWED gate. 2026.09.29
Added profile.allergies with validation and additive migration; a legacy Nut-free choice never becomes an allergy and the Food needs sheet shows a prompt instead. 2026.09.29
Made ideas, Today's idea check and grocery suggestions hide items that list a chosen allergy, active only once the gate opens, with unit tests per allergen for both gate states in tests/allergens.test.js. 2026.09.29
Showed Open Food Facts allergens and traces on product views (portion editor, barcode result, grocery item sheet) with "this list may be incomplete", above the label-check line. 2026.09.29
Moved the Food needs fields into a shared FoodNeedsFields component; with the gate closed the Allergies section shows "Allergy filtering is waiting for review. Check every label." and no chips. 2026.09.29
Added a pending ingredient allergen table, reviewer questions and a blank sign-off block to NUTRITION-REVIEW.md; P1-09 stays unticked until it is signed. 2026.09.29
Added setupStep and lastUsedAt to athlete data with validation, and made new athletes start with low-cost ideas off (ONB-03). 2026.09.29
Added pure setup step logic in src/domain/setup.js (school, usual practice and game, food at school, first-plan preview, last used) with tests in tests/setup.test.js. 2026.09.29
Shared the weekday picker and time-range fields between the school day editor, the activity sheet and setup, and moved school-day validation into the domain. 2026.09.29
Added Welcome at #/welcome: "Fuel for the day you actually have.", Get started on a first visit, athlete tiles with sport and last used (Rename and Remove menu), Add another athlete, the privacy line and How Nourally works. 2026.09.29
Replaced the one-form setup in main.jsx with a six-step SetupFlow in src/pages/Setup that saves each step on Next, resumes at setupStep after a reload, and offers Skip and Skip setup. 2026.09.29
Made a new athlete open setup step 1 and choosing an athlete always open Today; removed the old device profile chooser. 2026.09.29
Updated every browser check for the new setup, added browser-setup.js (Welcome, fit at 390 × 844, resume at step 4, steps 1 and 3 only) and browser-allergens.js (Open Food Facts allergens on a scanned product). 2026.09.29
Recorded the setup preview copy and the low-cost default as pending review in NUTRITION-REVIEW.md. 2026.09.29
Checked P1-11, ENTRY-01 to ENTRY-05, ONB-01 to ONB-03, ONB-05, ONB-06, ADD-01 and DATA-02; left P1-09, P1-10, YOU-02, YOU-03 and ONB-04 open pending the allergen tag sign-off, and DATA-08 for P1-12. 2026.09.29
Added src/domain/search.js with shared food ranking (basic foods first, plainest name first, brand-first only for brand or barcode queries), near-duplicate collapse by normalized name and brand, portion hints, the product allergen line, the source line, and the 300 ms search schedule. 2026.09.29
Ranked and collapsed results the same way in both server modes: the local SQLite catalog ranks a 360-row pool before paging, and the live USDA API asks for basic foods separately only when the mixed first page has none. 2026.09.29
Rebuilt the search results as a list with one sub-line ("Basic food · 1 medium, 118 g" or "Brand: Cheerios · 1 cup, 28 g"), the allergen line on products, an icon barcode button, "Show more results" from the server's hasMore, and "Press Enter to search." in USDA API mode. 2026.09.29
Showed the brand, allergen and label lines on a scanned product and moved its calories into the portion sheet's Nutrition details. 2026.09.29
Added a ranking test set for banana, peanut butter, cheerios and rice in fixture data, run against both the API ranking and an in-memory SQLite catalog, plus debounce and duplicate-collapse tests (tests/search.test.js). 2026.09.29
Added the search browser check with a mocked gateway (debounce, the four queries, allergen and label lines, Enter-only API mode) and let the provider check run its mocked checks before reporting a DEMO_KEY rate limit. 2026.09.29
Recorded the search portion hints, product allergen wording and Week sentences as pending qualified review in NUTRITION-REVIEW.md. 2026.09.29
Added src/domain/log.js for Log › Day and Week: entry times (24-hour, older 12-hour and approximate), the day timeline with activity context rows, unconfirmed plans for two days back, explicit-only water, the week summary with activities that have a linked plan, the week sentence, and At home matches for a log. 2026.09.29
Moved the log UI out of FoodWorkspace.jsx into src/pages/Food (LogPage, LogDay, LogWeek, LogSheets, PortionSheet) with a Day · Week control and routes #/food/log/YYYY-MM-DD and #/food/log/week/YYYY-MM-DD. 2026.09.29
Built Log › Day: a day switcher with named arrows and a date picker, Back to today, "Did you eat …? Yes, as planned / Changed it", activities and food in time order, rows with time, name and portion only, a row menu (Edit, Used from At home…, Put back at home, Remove), water, and a seven-day strip. 2026.09.29
Kept an entry's time on edit and asked for Morning, Midday, Afternoon, Evening or an exact time for entries on past days. 2026.09.29
Replaced the Use from home step with "Used bananas from home? Yes / No" after a log that matches exact At home rows, deducting only those rows. 2026.09.29
Replaced the Source & details disclosure with one source line in the portion sheet and moved calories into "Nutrition details (optional)"; saves and removals show a verb-first toast with Undo. 2026.09.29
Built Log › Week: range switcher, one summary sentence, seven newest-first day rows with activity chips, foods logged and water ("No water logged" when missing), a View as table disclosure, and no tiles, charts, streak or percentages. 2026.09.29
Removed the WeeklyProgress page from main.jsx and the old weekly chart styles; PortionEditor.jsx became pages/Food/PortionSheet.jsx. 2026.09.29
Added Log unit tests (tests/log.test.js, including 4 activities with 3 plans) and the Log browser check (tests/browser-log.js); updated the food workflow check for the row menu and added dated Log routes to the responsive check. 2026.09.29
Added the Changed it and Today Now-card checks to the Log browser check. 2026.09.29
Checked P1-07, P1-08, SRCH-07, LOG-01 to LOG-08, WEEK-01 to WEEK-04, HIST-02, HIST-03, CMP-13 and CMP-16 after unit and browser checks; WEEK-05 stays open for P2-05, and live USDA ranking was verified with fixtures because DEMO_KEY was rate-limited. 2026.09.29
Updated the evening-share, Log and search browser checks to the merged first run (Get started, step 1, Skip setup) instead of the removed one-page setup form. 2026.09.29
Made allergenLine in search.js the one source of product allergen text: it now maps Open Food Facts tags to everyday names ("tree nuts", "soy"); removed productAllergenText and offAllergenNames from allergens.js. 2026.09.29
Search rows now show the allergen line through LabelCheck like the barcode result, portion sheet and grocery item sheet; renamed .label-allergens to .allergen-line. 2026.09.29
A scanned product without a brand now reads "Packaged food" instead of "Basic food" and gets no basic-food portion hint. 2026.09.29
Moved the P1-09 label-text unit test to allergenLine and extended the allergens browser check to the portion sheet and grocery item sheet, with a once-per-view check; search rows are checked for duplicate lines. 2026.09.29
Updated NUTRITION-REVIEW.md to the single allergen wording (still pending review). 2026.09.29
Added a Skip to content link, moved the frame footer after main, and made route changes focus the page H1, read the page name from a persistent live region and set document.title ("Groceries · Nourally") through RouteAnnouncer. 2026.09.29
Added Button and IconButton (components/ui/Button.jsx) and used them in Dialog, ConfirmDialog, SettingsSheet, Toast, InlineError, FoodSearch and Checklist. 2026.09.29
Moved the "Discard changes?" guard into Dialog (dirty, discardMessage, DialogCancel, useReportDirty) with a Tab trap and focus return; the activity, school-day, You, At home edit, Counts as, grocery item, portion, water, Use from home and Changed it sheets use it. 2026.09.29
Added the Menu component (button[aria-haspopup=menu], arrow keys, Home/End, Escape, Tab) and replaced the details row menus on Schedule, At home, Groceries, Log and Welcome. 2026.09.29
Added field-level errors (components/ui/FieldError.jsx): setup steps 1 to 3, the activity and school-day sheets, You sheets, grocery item, portion and Changed it mark the field aria-invalid, describe it with the message under it and focus it; setup.js gained sportStepProblem, schoolDayProblem and activitiesProblem. 2026.09.29
Gave the month grid one tab stop with arrow, Home/End and Page Up/Down keys, aria-pressed on the selected day and aria-current=date on today. 2026.09.29
Made toasts and search offline status persistent live regions, styled the scanner, search and recovery alerts, added forced-colors outlines for selected and current states, a hidden Ideas h2, and 44 px targets for segments, Food section links, text buttons, event actions, the Log week strip and How Nourally works. 2026.09.29
Added @axe-core/playwright and tests/browser-a11y.js: axe on every route, setup step and key dialog, sheet and menu state at 390 and 1280 px (0 serious or critical before and after), 44 px targets, 3:1 boundaries and focus ring, and keyboard, forced-colors and reduced-motion checks; the responsive check now also runs at 390 and 1280 px. 2026.09.29
Checked A11Y-01 to A11Y-09, A11Y-11 to A11Y-14, DS-13, DS-15, CMP-02, CMP-04, CMP-17, DLG-01 and DLG-02; P1-13 stays open for the manual screen-reader smoke test and a keyboard-only core journey run. 2026.09.29
Fixed shared UI review causes: strong is 700 (not 900), the Discard confirm is portaled to body so it opens as its own sheet or centered dialog, segmented controls stay on one row with equal segments, sheet footer buttons are equal, inputs and date/time boxes are 48 px, sheet headers 64 px, invalid chip and weekday groups show the error border, disabled segments, checkboxes and switches look disabled, badges use the Barlow 12/16 uppercase badge style, text buttons sit flush with content, and a fresh load no longer focuses the H1 (RouteAnnouncer guard) or draws a ring on it. 2026.09.29
Aligned the frame: from 1024 px every page column starts at the rail's 32 px gutter and every page title sits in one 48 px row; the tablet tabs are centered on the bar; rail brand, icons and avatar share a 32 px edge with a visible "Switch"; the tab-bar focus ring sits inside the item; the lime active dot/bar has a primary edge for 3:1; toasts drop the phone tab-bar offset on tablets; one Avatar component (components/ui/Avatar.jsx) replaces three avatar styles. 2026.09.29
