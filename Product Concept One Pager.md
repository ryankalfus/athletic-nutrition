# Software & Technology

# Product Concept: Nourally

## Product Vision

Nourally is the daily fueling-logistics ally for student-athletes. It turns school, practice, game, and travel schedules into a practical answer to one question: **“What should I eat or prepare now, given what I can actually access?”**

Unlike a generic calorie tracker, Nourally is designed around the handoffs in a student’s real day—class to lunch, school to practice, and home to an away game.

## Problem Statement

Student-athletes often know that nutrition matters but struggle to act on that knowledge while balancing class periods, short lunch windows, transportation, practices, games, homework, and family schedules. A theoretically ideal meal is not useful when the athlete has 25 minutes before practice, no refrigerator, limited money, or only cafeteria and packed-food options.

Most tracking apps primarily document food after it is eaten. Many athlete-focused products personalize macros or meal plans, but public product descriptions rarely make school-day logistics, food access, budget, and last-mile execution the center of the experience.

## Target Users

The primary users are middle- and high-school student-athletes, generally ages 14–18, who need practical fueling support around school and training. Parents and guardians are important secondary users because they often handle groceries, meal preparation, transportation, and packing.

Coaches may provide schedule information, but the MVP should not expose unnecessary private nutrition or health information to them.

## User Needs

- A single view of school, lunch, practices, workouts, games, and travel.
- A realistic next action based on time, food access, budget, dietary needs, and location.
- Simple packing and preparation cues before a busy school-to-sport transition.
- A lightweight way to track groceries at home, plan the next shop, and stay within a family-set budget.
- Reflection tools that support consistency without punitive food judgments or rigid calorie targets.

## Solution Overview

Nourally starts with the athlete’s calendar and real-life constraints. A transparent, deterministic recommendation layer identifies the current fueling moment—regular meal window, pre-activity, during activity, recovery, or travel—and filters practical food examples accordingly.

For the MVP, the system does not independently prescribe a teen’s calorie needs. It provides general fueling education, common examples, and reminders, with clear boundaries for allergies, medical conditions, eating concerns, and individualized guidance. Future AI may explain the app’s existing options in more natural language, but it should not invent medical-style targets.

## Key MVP Features

### 1. Whole-Day Schedule

- Recurring school year with school hours, lunch, optional snack windows, and commute time.
- Cafeteria, refrigerator, microwave, and classroom-eating access.
- One-time or weekly practice, workout, and game scheduling with intensity, home/away status, travel time, series editing, and single-day exceptions.
- School-day exceptions for holidays, closures, and absences.

### 2. “What Should I Eat Now?”

- Guidance changes according to time before, during, or after the next activity.
- Food examples filter by budget, dietary needs, location, available sources, and portability.
- Away-game and longer-travel events favor packable options and preparation cues.
- An expanded 24-option food library and quick substitutions provide more choices without bypassing the athlete’s budget, dietary, access, and timing filters.
- Each suggestion explains why it fits and can generate a practical pack-and-prep checklist without being mistaken for food already eaten.

### 3. Pack, Prep, and Remind

- Selected foods generate actionable packing, refrigeration, reheating, water, and bag-placement tasks.
- Early activities tomorrow trigger a prepare-tonight card and one-tap checklist for breakfast, snacks, fluids, gear, and travel.
- Optional browser notifications can remind the athlete 30, 60, or 90 minutes before an activity and in the evening before an early event while Nourally is open.

### 4. Grocery Continuity

- A dedicated Groceries tab remembers the shopping budget, goal, last grocery date, pantry, active list, cart, and recent purchases on the device.
- Quick pantry entry and quantity controls make it easy to record what is already at home.
- Generated lists filter out pantry items, follow dietary needs, adapt to school/practice/travel goals, and use rough prices to stay within budget when possible.
- List items can move into an in-app cart or be marked bought, which updates the pantry and shopping history automatically.

### 5. Practical Reflection

- Food and hydration check-ins without prescribed calorie or water targets.
- Barcode lookup remains an optional convenience, not the product’s main value.
- Weekly views show food, hydration, and consistency patterns without grading intake.

## Positioning Versus Competitors

Nourally should not compete with MyFitnessPal on database size or generic logging. Fueling Champions, ZoneIn, MaxCoach, and AthlEAT already demonstrate demand for schedule-aware or youth-athlete nutrition. Nourally’s narrower wedge is **real-time execution under school-day constraints**:

> Nourally helps a student-athlete decide what is realistic now—and what must be packed or prepared next—based on the actual school-to-sport day.

The defensible product learning is not merely which foods to recommend. It is understanding where student-athletes’ plans break: time, access, cost, storage, transportation, and family coordination.

## Safety and Privacy Boundaries

- General education and practical examples, not diagnosis, treatment, weight-loss coaching, or independently generated calorie prescriptions.
- No unnecessary collection of weight, body measurements, or medical history in the MVP.
- Local-device storage in the current prototype, with clear disclosure.

## Technology Stack

| Area | MVP approach |
|---|---|
| Frontend | React, HTML, CSS, JavaScript, Vite |
| Persistence | Local browser storage for the prototype; Firebase considered after privacy and consent requirements are defined |
| Recommendation logic | Transparent deterministic timing and constraint rules |
| Food data | Open Food Facts for optional barcode convenience; USDA FoodData Central may support future food search |
| Future AI | Explanations and adaptation of approved options, not unrestricted medical or calorie prescriptions |
