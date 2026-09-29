# Nourally nutrition and allergen review record

Prepared 2026.09.29. **Approval reported by the owner:** Emily Cornelius, RDN, approved the audit's timing rules, recovery window, idea notes and example portions, allergen handling, game-day copy, and sports-drink guidance on September 29, 2026. The owner supplied the reviewer name, credential, date, and “Everything confirmed and approved” in this task. This record preserves that supplied approval; it is not an independent credential verification. Implementation must follow the approved audit and still pass its acceptance criteria.

## Timing rules currently in the local draft

| Rule or state | Current implementation / proposed copy | Reviewer decision needed |
|---|---|---|
| More than 180 minutes before activity | Plan-ahead state; invites choosing food before the activity. | Confirm whether 180 minutes is appropriate for the target age range and varied sports, or replace it. Review the action and explanation copy. |
| 91–180 minutes before | Meal-window state; suggests a meal or substantial snack. | Confirm threshold and whether the terms imply a requirement. |
| 31–90 minutes before | Pre-activity state; suggests a familiar snack. | Confirm threshold and content. |
| 0–30 minutes before | Quick state; suggests something small and fluids. | Confirm threshold and content, including cases where eating immediately before activity is unsuitable. |
| Session in progress | `during` for a session at least 75 minutes or marked high intensity; otherwise `quick`. The text mentions water and, for longer or harder sessions, a familiar carbohydrate option. | Review the 75-minute trigger, the intensity flag, and every mid-session food/fluid claim. Review separately for games. |
| Up to 90 minutes after activity | Recovery state suggests carbs, protein, and fluids; after 90 minutes it returns to regular guidance. | Confirm or replace the window and wording. Avoid implying food is ineffective after a deadline. |
| School food window | Lunch uses entered school times. Optional snack time is treated as a 15-minute active window if no end time is stored. | Confirm whether the app may call this an active food window, and whether the 15-minute assumption should be displayed or removed. |
| After 9:30 PM with nothing tomorrow | LATE state says nothing needs planning tonight. | Review wording for late sessions, skipped meals, and users with no entered schedule; this is a product heuristic rather than a nutrition threshold. |
| Evening planning after 7:00 PM | Audit proposal for P1-03/P1-12; not implemented yet. | Review whether time-based prompting should be used or whether it should follow a next-day schedule instead. |
| Pack and prep due offsets | Audit §3.5 proposes 30 minutes before school starts and 30 minutes before an away-session Leave by time; not implemented. | **Owner input** is required by the audit before selecting either offset. Reviewer should also check any nutrition implications. |

The rule code is in `src/domain/timing.js` (`getFuelingGuidance` and `isSchoolDay`). The 30/90/180 boundary tests are in `tests/domain.test.js` under P0-10. Review the exact user-visible `label`, `title`, `explanation`, `timing`, and idea notes together, not thresholds in isolation.

## Other required safety review

- **Ideas and amounts (IDEA-07):** Review all built-in idea notes and display portions as examples rather than targets. The audit lists this as required before release.
- **Allergens (P0-06, ADD-03, P1-09, SRCH-07):** Review ingredient-level tags, product `allergens_tags` and `traces_tags` interpretation, missing-data wording, exclusion behavior, and the label-check line. The app currently captures Open Food Facts tags but does not display or filter on them. No item should be called safe solely from incomplete tags.
- **Game-day guidance (ACT-04):** Review the GAME chip context and every game-specific food/fluid sentence before it is shown. No game-specific nutrition copy is accepted yet.
- **Sports drinks:** Review any proposed wording against the American Academy of Pediatrics report below. No new sports-drink recommendation is accepted here.

## Source starting points and limits

These are candidate sources to evaluate, not a source-to-rule validation. The available abstracts and report do **not** by themselves establish Nourally's exact 30/90/180-minute cutoffs, 75-minute during trigger, 90-minute recovery cutoff, or suitability for all student-athletes.

1. [Academy of Nutrition and Dietetics, Dietitians of Canada, and ACSM position statement (2016)](https://pubmed.ncbi.nlm.nih.gov/26920240/) addresses food and fluid timing for performance and recovery and recommends individualized planning by a registered dietitian nutritionist. The review must decide how it applies to Nourally's age range and exact rules.
2. [American Academy of Pediatrics clinical report on sports and energy drinks for children and adolescents (2011)](https://publications.aap.org/pediatrics/article/127/6/1182/30098/) distinguishes sports drinks from energy drinks and describes a limited role for sports drinks during prolonged vigorous activity. It does not validate Nourally's meal timing cutoffs.
3. [Review on carbohydrate and protein replacement after endurance exercise (2015)](https://pubmed.ncbi.nlm.nih.gov/26166054/) discusses recovery nutrition, especially when another session follows soon. It does not validate a universal 90-minute deadline for this product.

## Sign-off record

- Reviewer: **Emily Cornelius, RDN** (provided by the owner).
- Approval date: **2026.09.29**.
- Scope: audit timing thresholds and state copy, recovery window, idea notes and example portions, ingredient allergen tags and exclusion behavior, product label reminders, game-day copy, and sports-drink guidance.
- Approval: **“Everything confirmed and approved.”** Reported by Ryan Kalfus in this task on 2026.09.29.
- Implementation acceptance: remains item-specific in `REDESIGN-CHECKLIST.md`; approval does not mark unimplemented features complete.
- Next review date: not provided. Further changes outside the approved audit require review.

## Owner decisions

The owner confirmed all previously presented recommended options on 2026.09.29: high-school ages 14–18; hide ideas with matching tagged allergens; local athletes with backups; shareable lists for the MVP; desktop-browser reminders for the MVP; local USDA index with the existing server fallback; four primary destinations and four Food sections; preparation due 30 minutes before school starts or an away activity's Leave by time. Optional future enhancements retain their audit phase and scope.
