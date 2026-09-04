import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarcodeDetector as WasmBarcodeDetector } from 'barcode-detector/ponyfill';
import './styles.css';

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function readStoredValue(key, legacyKey) {
  return localStorage.getItem(key) ?? localStorage.getItem(legacyKey);
}

function loadSchedule() {
  return JSON.parse(readStoredValue('nourally-schedule', 'fuel-schedule') || '[]');
}

function loadSchoolSchedule() {
  return JSON.parse(localStorage.getItem('nourally-school-schedule') || 'null');
}

function loadDayPlans() {
  return JSON.parse(localStorage.getItem('nourally-day-plans') || '{}');
}

function loadReminderSettings() {
  return JSON.parse(localStorage.getItem('nourally-reminders') || 'null') || {
    enabled: false,
    leadMinutes: 60,
    eveningPrep: true,
  };
}

function loadGroceryState() {
  return JSON.parse(localStorage.getItem('nourally-groceries') || 'null') || {
    budgetAmount: 50,
    goal: 'school-week',
    lastShopDate: '',
    pantry: [],
    items: [],
    purchases: [],
  };
}

function loadAccount() {
  return JSON.parse(localStorage.getItem('nourally-account') || 'null');
}

const DEFAULT_PROFILE = {
  name: '',
  budget: 'save',
  dietaryNeeds: [],
  foodSources: ['packed', 'cafeteria', 'home'],
  familyPrep: true,
};

const FOOD_IDEAS = [
  { id: 'banana-pretzels', name: 'Banana + pretzels', moments: ['quick', 'pre', 'regular'], sources: ['packed', 'cafeteria', 'store', 'home'], cost: 'save', portable: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true, note: 'Simple, portable carbs with no prep.' },
  { id: 'applesauce-rice-cakes', name: 'Applesauce pouch + rice cakes', moments: ['quick', 'pre'], sources: ['packed', 'store', 'home'], cost: 'save', portable: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true, note: 'Easy to pack and usually gentle before activity.' },
  { id: 'fig-bar-fruit', name: 'Fig bar + fresh fruit', moments: ['quick', 'pre', 'regular'], sources: ['packed', 'cafeteria', 'store', 'home'], cost: 'save', portable: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true, note: 'A shelf-stable option for a bag or locker.' },
  { id: 'cereal-milk', name: 'Cereal cup + shelf-stable soy milk', moments: ['quick', 'pre', 'regular', 'recovery'], sources: ['packed', 'store', 'home'], cost: 'save', portable: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true, note: 'Easy carbs plus protein without needing a refrigerator.' },
  { id: 'bagel-jam', name: 'Bagel or toast + jam', moments: ['pre', 'regular', 'recovery'], sources: ['packed', 'cafeteria', 'home'], cost: 'save', portable: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true, note: 'A familiar option when you have a little time.' },
  { id: 'sunbutter-sandwich', name: 'Sunflower-butter banana sandwich', moments: ['pre', 'regular', 'recovery'], sources: ['packed', 'home'], cost: 'save', portable: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true, note: 'Packable fuel with carbs plus staying power.' },
  { id: 'oatmeal-fruit', name: 'Oatmeal + fruit', moments: ['regular', 'pre', 'recovery'], sources: ['cafeteria', 'home'], cost: 'save', portable: false, needsHeat: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true, note: 'A lower-cost warm option that can work before or after activity.' },
  { id: 'hummus-pita', name: 'Hummus + pita + grapes', moments: ['regular', 'recovery'], sources: ['packed', 'store', 'home'], cost: 'save', portable: true, needsCold: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true, note: 'A packable mix of carbs and protein when kept cold.' },
  { id: 'turkey-sandwich', name: 'Turkey sandwich + fruit', moments: ['regular', 'recovery'], sources: ['packed', 'cafeteria', 'store', 'home'], cost: 'standard', portable: true, needsCold: true, vegan: false, vegetarian: false, dairyFree: true, glutenFree: false, nutFree: true, note: 'A familiar full snack or meal for a busy handoff.' },
  { id: 'tuna-crackers', name: 'Tuna pouch + crackers + fruit cup', moments: ['regular', 'recovery'], sources: ['packed', 'store', 'home'], cost: 'standard', portable: true, vegan: false, vegetarian: false, dairyFree: true, glutenFree: false, nutFree: true, note: 'Shelf-stable protein and carbs for an away day.' },
  { id: 'yogurt-cereal', name: 'Yogurt + fruit + cereal', moments: ['regular', 'recovery'], sources: ['cafeteria', 'home', 'store'], cost: 'standard', portable: false, needsCold: true, vegan: false, vegetarian: true, dairyFree: false, glutenFree: false, nutFree: true, note: 'A quick carb-and-protein recovery option when kept cold.' },
  { id: 'soy-yogurt', name: 'Soy yogurt + berries + granola', moments: ['regular', 'recovery'], sources: ['packed', 'store', 'home'], cost: 'standard', portable: true, needsCold: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true, note: 'A dairy-free recovery option that packs well with an ice pack.' },
  { id: 'bean-rice-bowl', name: 'Bean-and-rice bowl + fruit', moments: ['regular', 'recovery'], sources: ['cafeteria', 'home'], cost: 'save', portable: false, needsHeat: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true, note: 'Budget-friendly and balanced for a full meal window.' },
  { id: 'chicken-tofu-bowl', name: 'Chicken or tofu rice bowl', moments: ['regular', 'recovery'], sources: ['cafeteria', 'home'], cost: 'standard', portable: false, needsHeat: true, vegan: false, vegetarian: false, dairyFree: true, glutenFree: true, nutFree: true, note: 'A practical meal with carbs and protein after training.' },
  { id: 'bean-burrito', name: 'Bean burrito + salsa', moments: ['regular', 'recovery'], sources: ['cafeteria', 'packed', 'home'], cost: 'save', portable: true, needsHeat: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true, note: 'A low-cost meal that can be packed and reheated.' },
  { id: 'pasta-salad', name: 'Pasta salad + chickpeas', moments: ['regular', 'recovery'], sources: ['packed', 'home'], cost: 'save', portable: true, needsCold: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true, note: 'Make-ahead carbs and protein for school-to-sport days.' },
  { id: 'eggs-toast', name: 'Eggs + toast + fruit', moments: ['regular', 'recovery'], sources: ['cafeteria', 'home'], cost: 'save', portable: false, needsHeat: true, vegan: false, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true, note: 'A familiar recovery meal using basic ingredients.' },
  { id: 'edamame-rice', name: 'Edamame + rice + fruit', moments: ['regular', 'recovery'], sources: ['cafeteria', 'home'], cost: 'save', portable: false, needsHeat: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true, note: 'A plant-based meal with carbs and protein.' },
  { id: 'milk-banana', name: 'Chocolate milk or soy milk + banana', moments: ['recovery'], sources: ['cafeteria', 'store', 'home'], cost: 'standard', portable: false, needsCold: true, vegan: false, vegetarian: true, dairyFree: false, glutenFree: true, nutFree: true, note: 'Fast recovery fuel when a full meal is still a while away.' },
  { id: 'fruit-crackers-cheese', name: 'Fruit cup + crackers + cheese', moments: ['regular', 'recovery'], sources: ['cafeteria', 'packed', 'store'], cost: 'standard', portable: true, needsCold: true, vegan: false, vegetarian: true, dairyFree: false, glutenFree: false, nutFree: true, note: 'Easy to find at school or pack from home.' },
  { id: 'seed-trail-mix', name: 'Nut-free seed mix + dried fruit', moments: ['quick', 'regular', 'during'], sources: ['packed', 'store', 'home'], cost: 'standard', portable: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true, note: 'Compact, shelf-stable fuel for longer days.' },
  { id: 'smoothie-toast', name: 'Fruit smoothie + toast', moments: ['pre', 'regular', 'recovery'], sources: ['cafeteria', 'store', 'home'], cost: 'standard', portable: false, needsCold: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true, note: 'A drinkable option when solid food is less appealing.' },
  { id: 'sports-drink-crackers', name: 'Familiar sports drink + crackers', moments: ['during', 'quick'], sources: ['packed', 'store', 'cafeteria'], cost: 'standard', portable: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true, note: 'Most useful during longer or harder sessions; water is fine for many shorter ones.' },
  { id: 'juice-applesauce', name: 'Juice box + applesauce pouch', moments: ['quick', 'during'], sources: ['packed', 'cafeteria', 'store', 'home'], cost: 'save', portable: true, vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true, note: 'A simple, easy-to-carry carb option when time is tight.' },
];

const GROCERY_GOALS = [
  { id: 'school-week', label: 'School + practice week', description: 'Packable snacks, quick breakfasts, and easy dinners.' },
  { id: 'practice-fuel', label: 'Practice fuel', description: 'Simple food before activity plus recovery basics.' },
  { id: 'away-game', label: 'Away game', description: 'Portable, shelf-stable food for travel and long days.' },
  { id: 'recovery-meals', label: 'Recovery meals', description: 'Carbs, protein, produce, and easy meal building.' },
  { id: 'restock-basics', label: 'Restock basics', description: 'Affordable staples that work across the week.' },
];

const GROCERY_CATALOG = [
  { id: 'bananas', name: 'Bananas', category: 'Produce', price: 2.25, goals: ['school-week', 'practice-fuel', 'away-game', 'recovery-meals', 'restock-basics'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'apples', name: 'Apples', category: 'Produce', price: 4.5, goals: ['school-week', 'away-game', 'restock-basics'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'frozen-berries', name: 'Frozen berries', category: 'Produce', price: 4.25, goals: ['school-week', 'recovery-meals'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'baby-carrots', name: 'Baby carrots', category: 'Produce', price: 2.5, goals: ['school-week', 'away-game', 'recovery-meals'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'bread', name: 'Whole-grain bread', category: 'Grains', price: 3.5, goals: ['school-week', 'practice-fuel', 'recovery-meals', 'restock-basics'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true },
  { id: 'tortillas', name: 'Tortillas', category: 'Grains', price: 3.25, goals: ['school-week', 'away-game', 'recovery-meals', 'restock-basics'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true },
  { id: 'oats', name: 'Oats', category: 'Grains', price: 4, goals: ['school-week', 'practice-fuel', 'recovery-meals', 'restock-basics'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'rice', name: 'Rice', category: 'Grains', price: 4.5, goals: ['school-week', 'recovery-meals', 'restock-basics'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'pretzels', name: 'Pretzels', category: 'Packable', price: 3.25, goals: ['school-week', 'practice-fuel', 'away-game', 'restock-basics'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true },
  { id: 'applesauce', name: 'Applesauce pouches', category: 'Packable', price: 4.75, goals: ['school-week', 'practice-fuel', 'away-game'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'fig-bars', name: 'Fig bars', category: 'Packable', price: 5, goals: ['school-week', 'practice-fuel', 'away-game'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true },
  { id: 'crackers', name: 'Crackers', category: 'Packable', price: 3.5, goals: ['school-week', 'practice-fuel', 'away-game', 'restock-basics'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: false, nutFree: true },
  { id: 'beans', name: 'Canned beans', category: 'Protein', price: 2.5, goals: ['school-week', 'recovery-meals', 'restock-basics'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'eggs', name: 'Eggs', category: 'Protein', price: 4, goals: ['school-week', 'recovery-meals', 'restock-basics'], vegan: false, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'chicken', name: 'Chicken', category: 'Protein', price: 9, goals: ['school-week', 'recovery-meals'], vegan: false, vegetarian: false, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'tofu', name: 'Tofu', category: 'Protein', price: 3.5, goals: ['school-week', 'recovery-meals'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'tuna-pouches', name: 'Tuna pouches', category: 'Protein', price: 5.5, goals: ['away-game', 'recovery-meals'], vegan: false, vegetarian: false, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'sunbutter', name: 'Sunflower-seed butter', category: 'Protein', price: 6.5, goals: ['school-week', 'practice-fuel', 'away-game'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'yogurt', name: 'Yogurt', category: 'Cold', price: 5, goals: ['school-week', 'practice-fuel', 'recovery-meals'], vegan: false, vegetarian: true, dairyFree: false, glutenFree: true, nutFree: true },
  { id: 'soy-milk', name: 'Shelf-stable soy milk', category: 'Drinks', price: 4.5, goals: ['school-week', 'practice-fuel', 'away-game', 'recovery-meals'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'sports-drink', name: 'Sports drink', category: 'Drinks', price: 6, goals: ['practice-fuel', 'away-game'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true },
  { id: 'cheese-sticks', name: 'Cheese sticks', category: 'Cold', price: 5, goals: ['school-week', 'away-game', 'recovery-meals'], vegan: false, vegetarian: true, dairyFree: false, glutenFree: true, nutFree: true },
  { id: 'hummus', name: 'Hummus', category: 'Cold', price: 4, goals: ['school-week', 'away-game', 'recovery-meals'], vegan: true, vegetarian: true, dairyFree: true, glutenFree: true, nutFree: true },
];

function loadProfile() {
  const saved = JSON.parse(localStorage.getItem('nourally-profile') || 'null');
  return saved ? {
    ...DEFAULT_PROFILE,
    ...saved,
    dietaryNeeds: Array.isArray(saved.dietaryNeeds) ? saved.dietaryNeeds : DEFAULT_PROFILE.dietaryNeeds,
    foodSources: Array.isArray(saved.foodSources) ? saved.foodSources : DEFAULT_PROFILE.foodSources,
  } : DEFAULT_PROFILE;
}

function timeToMinutes(value) {
  if (!value) return 0;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatClock(value) {
  if (!/^\d{2}:\d{2}$/.test(value || '')) return 'Time TBD';
  const [hours, minutes] = value.split(':').map(Number);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hours, minutes));
}

function isSchoolDay(dateKey, schoolSchedule) {
  if (!schoolSchedule?.enabled || dateKey < schoolSchedule.startDate || dateKey > schoolSchedule.endDate || schoolSchedule.excludedDates?.includes(dateKey)) return false;
  return schoolSchedule.weekdays.includes(new Date(`${dateKey}T12:00:00`).getDay());
}

function eventOccursOn(event, dateKey) {
  if (event.date) return event.date === dateKey;
  if (!event.recurrence) return false;
  const { startDate, endDate, weekdays = [], excludedDates = [] } = event.recurrence;
  if (dateKey < startDate || dateKey > endDate || excludedDates.includes(dateKey)) return false;
  return weekdays.includes(new Date(`${dateKey}T12:00:00`).getDay());
}

function eventsForDate(events, dateKey) {
  return events
    .filter((event) => eventOccursOn(event, dateKey))
    .map((event) => event.recurrence ? {
      ...event,
      date: dateKey,
      occurrenceId: `${event.id}-${dateKey}`,
      recurringSeries: true,
    } : event)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
}

function planTasksForIdea(idea, { travelMode = false, inSchool = false } = {}) {
  const verb = idea.portable ? 'Pack' : 'Plan';
  const tasks = [{ label: `${verb} ${idea.name}`, kind: 'food', foodId: idea.id }];
  if (idea.needsCold) tasks.push({ label: 'Add an ice pack or refrigerate it', kind: 'prep' });
  if (idea.needsHeat && inSchool) tasks.push({ label: 'Confirm microwave access', kind: 'prep' });
  if (travelMode) tasks.push({ label: 'Fill and pack a water bottle', kind: 'gear' });
  if (idea.portable) tasks.push({ label: 'Set it beside your school or team bag', kind: 'gear' });
  return tasks;
}

function tomorrowPrepTasks(event) {
  const tasks = [
    { label: 'Choose and set out breakfast', kind: 'food' },
    { label: 'Pack a familiar pre-activity snack', kind: 'food' },
    { label: 'Fill a water bottle', kind: 'gear' },
    { label: 'Put uniform, shoes, and gear by the door', kind: 'gear' },
  ];
  if (event.location === 'away' || Number(event.travelMinutes || 0) >= 30) {
    tasks.push({ label: `Check the route and allow ${event.travelMinutes || 0} minutes for travel`, kind: 'prep' });
    tasks.push({ label: 'Pack one extra shelf-stable snack', kind: 'food' });
  }
  return tasks;
}

function ideaFitsProfile(idea, profile) {
  const needs = profile.dietaryNeeds || [];
  if (needs.includes('vegan') && !idea.vegan) return false;
  if (needs.includes('vegetarian') && !idea.vegetarian) return false;
  if (needs.includes('dairyFree') && !idea.dairyFree) return false;
  if (needs.includes('glutenFree') && !idea.glutenFree) return false;
  if (needs.includes('nutFree') && !idea.nutFree) return false;
  if (profile.budget === 'save' && idea.cost !== 'save') return false;
  return true;
}

function getFuelingGuidance({ now, todayKey, events, schoolSchedule, profile }) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const training = eventsForDate(events, todayKey)
    .map((event) => ({ ...event, start: timeToMinutes(event.startTime), end: timeToMinutes(event.endTime) }))
    .sort((a, b) => a.start - b.start);
  const active = training.find((event) => currentMinutes >= event.start && currentMinutes <= event.end);
  const next = training.find((event) => event.start > currentMinutes);
  const recent = [...training].reverse().find((event) => currentMinutes > event.end && currentMinutes - event.end <= 90);
  const schoolToday = isSchoolDay(todayKey, schoolSchedule);
  const inSchool = schoolToday && currentMinutes >= timeToMinutes(schoolSchedule.startTime) && currentMinutes <= timeToMinutes(schoolSchedule.endTime);
  const schoolWindows = inSchool ? [
    schoolSchedule.morningSnackTime && { label: 'Morning snack window', start: schoolSchedule.morningSnackTime },
    schoolSchedule.lunchStartTime && { label: 'Lunch', start: schoolSchedule.lunchStartTime },
    schoolSchedule.afternoonSnackTime && { label: 'Afternoon snack window', start: schoolSchedule.afternoonSnackTime },
  ].filter(Boolean).sort((a, b) => a.start.localeCompare(b.start)) : [];
  const nextSchoolWindow = schoolWindows.find((window) => timeToMinutes(window.start) >= currentMinutes);

  let moment = 'regular';
  let label = 'STEADY-DAY FUELING';
  let title = 'Keep a regular eating rhythm today.';
  let explanation = 'No training is coming up soon. Choose a familiar meal or snack and use the next food window instead of waiting until you are drained.';
  let timing = nextSchoolWindow ? `${nextSchoolWindow.label} at ${formatClock(nextSchoolWindow.start)}.` : inSchool ? schoolSchedule.foodAccess?.eatInClass ? 'Use an allowed class or passing-period window.' : 'Use your next allowed food window.' : 'Eat when you are comfortably hungry.';
  let focusEvent = null;

  if (active) {
    focusEvent = active;
    moment = active.end - active.start >= 75 || active.intensity === 'high' ? 'during' : 'quick';
    label = `${active.title.toUpperCase()} / IN PROGRESS`;
    title = 'Hydrate now; keep mid-session fuel familiar.';
    explanation = 'For a longer or harder session, a familiar easy-to-carry carb may help. Avoid trying a brand-new food during competition or practice.';
    timing = `${formatClock(active.startTime)}–${formatClock(active.endTime)}`;
  } else if (next) {
    focusEvent = next;
    const minutesUntil = next.start - currentMinutes;
    if (minutesUntil <= 30) {
      moment = 'quick';
      label = `${next.title.toUpperCase()} / ${minutesUntil} MIN`;
      title = 'Choose something small and easy right now.';
      explanation = 'There is not much digestion time. A familiar carb-forward snack and a few sips of water are the practical move.';
    } else if (minutesUntil <= 90) {
      moment = 'pre';
      label = `${next.title.toUpperCase()} / ${minutesUntil} MIN`;
      title = 'Have a practical pre-activity snack now.';
      explanation = 'Choose familiar carbs that fit where you are. Keep heavy, greasy, or brand-new foods for another time.';
    } else if (minutesUntil <= 180) {
      moment = 'regular';
      label = `${next.title.toUpperCase()} / ${Math.round(minutesUntil / 15) * 15} MIN`;
      title = 'Use this meal window before the rush.';
      explanation = 'A balanced meal or substantial snack now can make the school-to-sport transition easier later.';
    } else {
      label = `${next.title.toUpperCase()} / ${formatClock(next.startTime)}`;
      title = 'Plan the handoff from school to sport.';
      explanation = 'Your activity is later today. Decide what you will eat, where it will come from, and whether it needs to be packed before the day gets busy.';
    }
    timing = `${formatClock(next.startTime)} start${next.location === 'away' ? ` · away · ${next.travelMinutes || 0} min travel` : ''}`;
  } else if (recent) {
    focusEvent = recent;
    moment = 'recovery';
    label = `${recent.title.toUpperCase()} / RECOVERY`;
    title = 'Refuel with carbs, protein, and fluids.';
    explanation = 'Choose a familiar option you can actually get now. A regular meal works; a snack can bridge the gap if dinner is later.';
    timing = `Ended ${currentMinutes - recent.end} min ago`;
  }

  const availableSources = inSchool
    ? [
        ...(schoolSchedule.foodAccess?.cafeteria ? ['cafeteria'] : []),
        ...(profile.foodSources.includes('packed') ? ['packed'] : []),
      ]
    : profile.foodSources;
  const travelMode = ['away', 'travel'].includes(focusEvent?.location) || Number(focusEvent?.travelMinutes || 0) >= 30;
  let ideas = FOOD_IDEAS.filter((idea) => idea.moments.includes(moment) && ideaFitsProfile(idea, profile));
  ideas = ideas.filter((idea) => {
    const availableMatches = idea.sources.filter((source) => availableSources.includes(source));
    if (!availableMatches.length || (travelMode && !idea.portable)) return false;
    const cafeteriaProvidesIt = inSchool && availableMatches.includes('cafeteria');
    if (inSchool && !cafeteriaProvidesIt && idea.needsCold && !schoolSchedule.foodAccess?.refrigerator) return false;
    if (inSchool && !cafeteriaProvidesIt && idea.needsHeat && !schoolSchedule.foodAccess?.microwave) return false;
    return true;
  });

  return {
    label,
    title,
    explanation,
    timing,
    ideas: ideas.slice(0, 3),
    alternates: ideas.slice(3, 9),
    travelMode,
    event: focusEvent,
    schoolToday,
    inSchool,
  };
}

function loadDailyLogs() {
  const saved = JSON.parse(readStoredValue('nourally-daily-logs', 'fuel-daily-logs') || 'null');
  if (saved) return saved;

  const legacy = JSON.parse(readStoredValue('nourally-entries', 'fuel-entries') || '[]');
  const userEntries = legacy.filter((entry) => !(
    (entry.id === 1 && entry.name === 'Breakfast') ||
    (entry.id === 2 && entry.name === 'Chicken rice bowl')
  ));

  return userEntries.length ? {
    [getDateKey()]: {
      goal: Number(readStoredValue('nourally-goal', 'fuel-goal')) || 2400,
      entries: userEntries,
    },
  } : {};
}

function App() {
  const [step, setStep] = useState(() => readStoredValue('nourally-step', 'fuel-step') === 'dashboard' ? 'dashboard' : 'setup');
  const [view, setView] = useState('today');
  const [todayKey, setTodayKey] = useState(getDateKey);
  const [now, setNow] = useState(new Date());
  const [dailyLogs, setDailyLogs] = useState(loadDailyLogs);
  const [schedule, setSchedule] = useState(loadSchedule);
  const [schoolSchedule, setSchoolSchedule] = useState(loadSchoolSchedule);
  const [profile, setProfile] = useState(loadProfile);
  const [dayPlans, setDayPlans] = useState(loadDayPlans);
  const [reminderSettings, setReminderSettings] = useState(loadReminderSettings);
  const [groceryState, setGroceryState] = useState(loadGroceryState);
  const [account, setAccount] = useState(loadAccount);
  const [signedOut, setSignedOut] = useState(() => new URLSearchParams(window.location.search).get('signedOut') === '1');

  useEffect(() => localStorage.setItem('nourally-step', step), [step]);
  useEffect(() => localStorage.setItem('nourally-daily-logs', JSON.stringify(dailyLogs)), [dailyLogs]);
  useEffect(() => localStorage.setItem('nourally-schedule', JSON.stringify(schedule)), [schedule]);
  useEffect(() => localStorage.setItem('nourally-school-schedule', JSON.stringify(schoolSchedule)), [schoolSchedule]);
  useEffect(() => localStorage.setItem('nourally-profile', JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem('nourally-day-plans', JSON.stringify(dayPlans)), [dayPlans]);
  useEffect(() => localStorage.setItem('nourally-reminders', JSON.stringify(reminderSettings)), [reminderSettings]);
  useEffect(() => localStorage.setItem('nourally-groceries', JSON.stringify(groceryState)), [groceryState]);
  useEffect(() => {
    if (account) localStorage.setItem('nourally-account', JSON.stringify(account));
  }, [account]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
      setTodayKey(getDateKey());
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!reminderSettings.enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const notified = JSON.parse(localStorage.getItem('nourally-notified-events') || '[]');
    const notifiedSet = new Set(notified);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const lead = Number(reminderSettings.leadMinutes || 60);
    eventsForDate(schedule, todayKey).forEach((event) => {
      const minutesUntil = timeToMinutes(event.startTime) - currentMinutes;
      const notificationKey = `${event.id}-${todayKey}-${lead}`;
      if (minutesUntil <= lead && minutesUntil >= 0 && !notifiedSet.has(notificationKey)) {
        new Notification(`${event.title} in about ${lead} minutes`, {
          body: event.location === 'away' || event.location === 'travel'
            ? 'Grab your packed food, water, and travel gear.'
            : 'Check your food plan, water, and gear before you go.',
        });
        notifiedSet.add(notificationKey);
      }
    });
    const tomorrowKey = getDateKey(addDays(new Date(`${todayKey}T12:00:00`), 1));
    const earlyTomorrow = eventsForDate(schedule, tomorrowKey).find((event) => timeToMinutes(event.startTime) <= 600);
    const prepKey = `prep-${tomorrowKey}`;
    if (reminderSettings.eveningPrep && now.getHours() >= 19 && earlyTomorrow && !notifiedSet.has(prepKey)) {
      new Notification(`Prepare tonight for ${earlyTomorrow.title}`, { body: 'Set out breakfast, pack a snack and water, and put your gear by the door.' });
      notifiedSet.add(prepKey);
    }
    localStorage.setItem('nourally-notified-events', JSON.stringify([...notifiedSet].slice(-200)));
  }, [now, reminderSettings, schedule, todayKey]);

  const todayLog = dailyLogs[todayKey] || { entries: [], water: 0 };

  function saveProfile(nextProfile) {
    setProfile(nextProfile);
    setStep('dashboard');
    setView('today');
  }

  function setTodayEntries(update) {
    setDailyLogs((logs) => {
      const current = logs[todayKey] || { entries: [] };
      const entries = typeof update === 'function' ? update(current.entries) : update;
      return { ...logs, [todayKey]: { ...current, entries } };
    });
  }

  function setTodayHydration(update) {
    setDailyLogs((logs) => {
      const current = logs[todayKey] || { entries: [], water: 0 };
      const hydration = { water: current.water || 0 };
      const next = typeof update === 'function' ? update(hydration) : update;
      return { ...logs, [todayKey]: { ...current, ...next } };
    });
  }

  function finishAccountEntry(nextAccount, isNew) {
    setAccount(nextAccount);
    setProfile((current) => ({ ...current, name: nextAccount.name || current.name }));
    setSignedOut(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('signedOut');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    if (isNew) setStep('setup');
  }

  if (signedOut) return <AccountEntry savedAccount={account} onComplete={finishAccountEntry} />;
  if (step === 'setup') return <ProfileSetup profile={profile} onSave={saveProfile} />;
  if (view === 'profile') return <ProfileSetup profile={profile} onSave={saveProfile} onNavigate={setView} tabbed />;
  if (view === 'history') return <History dailyLogs={dailyLogs} todayKey={todayKey} onNavigate={setView} />;
  if (view === 'weekly') return <WeeklyProgress dailyLogs={dailyLogs} todayKey={todayKey} onNavigate={setView} />;
  if (view === 'calendar') return <ScheduleCalendar events={schedule} setEvents={setSchedule} schoolSchedule={schoolSchedule} setSchoolSchedule={setSchoolSchedule} todayKey={todayKey} onNavigate={setView} />;
  if (view === 'groceries') return <GroceryHub groceryState={groceryState} setGroceryState={setGroceryState} profile={profile} setProfile={setProfile} events={schedule} todayKey={todayKey} onNavigate={setView} />;
  return <Dashboard now={now} todayKey={todayKey} events={schedule} schoolSchedule={schoolSchedule} profile={profile} entries={todayLog.entries} setEntries={setTodayEntries} water={todayLog.water || 0} setHydration={setTodayHydration} dayPlans={dayPlans} setDayPlans={setDayPlans} reminderSettings={reminderSettings} setReminderSettings={setReminderSettings} onNavigate={setView} />;
}

function Shell({ children, eyebrow = 'NOURALLY / DAILY NUTRITION' }) {
  return <main className="shell"><div className="brand"><span className="brand-mark">↗</span><span>nourally</span></div><div className="eyebrow">{eyebrow}</div>{children}<footer>Your ally from school to sport <span>·</span> Your data stays on this device</footer></main>;
}

function AppNavigation({ active, onNavigate }) {
  const tabs = [['today', 'Today'], ['groceries', 'Groceries'], ['calendar', 'Schedule'], ['weekly', 'Weekly'], ['history', 'History'], ['profile', 'Profile']];
  return <nav className="app-tabs" aria-label="Nourally sections">{tabs.map(([id, label]) => <button className={`text-button${active === id ? ' active-nav' : ''}`} aria-current={active === id ? 'page' : undefined} onClick={() => onNavigate(id)} key={id}>{label}</button>)}</nav>;
}

function AccountEntry({ savedAccount, onComplete }) {
  const [mode, setMode] = useState(savedAccount ? 'signin' : 'create');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(savedAccount?.email || '');
  const [error, setError] = useState('');

  function submit(event) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'signin') {
      if (!savedAccount || savedAccount.email !== cleanEmail) {
        setError('No saved account matches this email on this device.');
        return;
      }
      onComplete(savedAccount, false);
      return;
    }
    if (!name.trim()) {
      setError('Add a first name.');
      return;
    }
    onComplete({ id: `local-${Date.now()}`, name: name.trim(), email: cleanEmail, createdAt: new Date().toISOString() }, true);
  }

  return <Shell eyebrow="NOURALLY / ACCOUNT">
    <section className="auth-layout"><div className="auth-intro"><p className="kicker">SCHOOL-TO-SPORT FUELING</p><h1>One clear plan<br /><em>for the whole day.</em></h1><div className="auth-flow"><span><b>1</b> Add school and sports</span><span><b>2</b> Get the next fueling action</span><span><b>3</b> Plan meals and groceries</span></div></div><article className="card auth-card"><div className="auth-tabs"><button className={mode === 'create' ? 'active' : ''} onClick={() => { setMode('create'); setError(''); }}>Create account</button><button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); }}>Sign in</button></div><div className="section-label">{mode === 'create' ? 'NEW ACCOUNT' : 'WELCOME BACK'}</div><h2>{mode === 'create' ? 'Set up your Nourally profile.' : 'Continue your saved plan.'}</h2><form onSubmit={submit}>{mode === 'create' && <label>First name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="First name" /></label>}<label>Email<input autoFocus={mode === 'signin'} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>{error && <p className="auth-error">{error}</p>}<button className="primary" type="submit">{mode === 'create' ? 'Create account' : 'Sign in'} <span>→</span></button></form><p className="auth-note"><strong>Prototype account.</strong> This creates a private profile on this device only. No password is collected or stored.</p></article></section>
  </Shell>;
}

function ProfileSetup({ profile, onSave, onNavigate, tabbed = false }) {
  const [draft, setDraft] = useState(profile);
  const needs = [['vegetarian', 'Vegetarian'], ['vegan', 'Vegan'], ['dairyFree', 'Dairy-free'], ['glutenFree', 'Gluten-free'], ['nutFree', 'Nut-free']];
  const sources = [['packed', 'Packed from home'], ['cafeteria', 'School cafeteria'], ['home', 'Home kitchen'], ['store', 'Nearby store']];

  function toggleList(key, value) {
    setDraft((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }));
  }

  return <Shell eyebrow="NOURALLY / YOUR REAL DAY">
    <section className="intro split-intro"><div><p className="kicker">FUELING THAT FITS REAL LIFE</p><h1>School to sport,<br /><em>without the guesswork.</em></h1></div><div className="profile-intro-side">{tabbed && <AppNavigation active="profile" onNavigate={onNavigate} />}<p className="intro-copy">Nourally turns your schedule, food access, budget, and dietary needs into a practical next step—not a rigid prescription.</p></div></section>
    <section className="card profile-card"><div className="section-label">SET YOUR FOOD REALITY</div><h2>Set what works in real life.</h2><p className="muted">These details stay on this device and only filter the examples you see.</p><form onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
      <label>First name <span className="optional-label">Optional</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="First name" /></label>
      <fieldset className="choice-field"><legend>Usual food budget</legend><div className="choice-grid three">{[['save', 'Save where possible'], ['standard', 'Everyday'], ['flexible', 'Flexible']].map(([value, label]) => <button type="button" className={draft.budget === value ? 'selected' : ''} onClick={() => setDraft({ ...draft, budget: value })} key={value}>{label}</button>)}</div></fieldset>
      <fieldset className="choice-field"><legend>Dietary needs</legend><div className="choice-grid">{needs.map(([value, label]) => <button type="button" className={draft.dietaryNeeds.includes(value) ? 'selected' : ''} aria-pressed={draft.dietaryNeeds.includes(value)} onClick={() => toggleList('dietaryNeeds', value)} key={value}>{label}</button>)}</div></fieldset>
      <fieldset className="choice-field"><legend>Food you can usually access</legend><div className="choice-grid">{sources.map(([value, label]) => <button type="button" className={draft.foodSources.includes(value) ? 'selected' : ''} aria-pressed={draft.foodSources.includes(value)} onClick={() => toggleList('foodSources', value)} key={value}>{label}</button>)}</div></fieldset>
      <label className="check-row"><input type="checkbox" checked={draft.familyPrep} onChange={(event) => setDraft({ ...draft, familyPrep: event.target.checked })} /><span>A parent or guardian can sometimes help pack or prep food.</span></label>
      <button className="primary" type="submit" disabled={!draft.foodSources.length}>Save and see today <span>→</span></button>
    </form><p className="safety-note"><strong>Educational guidance only.</strong> Nourally offers practical examples, not calorie prescriptions or medical advice. Allergies, medical conditions, eating concerns, and individualized needs should be discussed with a qualified professional and a parent or guardian.</p></section>
  </Shell>;
}

function Dashboard({ now, todayKey, events, schoolSchedule, profile, entries, setEntries, water, setHydration, dayPlans, setDayPlans, reminderSettings, setReminderSettings, onNavigate }) {
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [swapFor, setSwapFor] = useState('');
  const [reminderStatus, setReminderStatus] = useState('');
  const guidance = useMemo(() => getFuelingGuidance({ now, todayKey, events, schoolSchedule, profile }), [now, todayKey, events, schoolSchedule, profile]);
  const date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(now);
  const todayEvents = eventsForDate(events, todayKey);
  const tomorrowKey = getDateKey(addDays(new Date(`${todayKey}T12:00:00`), 1));
  const tomorrowEvents = eventsForDate(events, tomorrowKey);
  const earlyTomorrow = tomorrowEvents.find((event) => timeToMinutes(event.startTime) <= 600);
  const todayPlan = dayPlans[todayKey] || [];
  const tomorrowPlan = dayPlans[tomorrowKey] || [];
  const primaryIdea = guidance.ideas[0] || null;
  const plannedFoodIds = new Set(todayPlan.map((item) => item.foodId).filter(Boolean));
  const timeline = [
    ...(guidance.schoolToday ? [{ id: 'school', type: 'school', title: schoolSchedule.name, startTime: schoolSchedule.startTime, endTime: schoolSchedule.endTime }] : []),
    ...todayEvents,
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));

  function resetForm() {
    setName('');
    setCalories('');
    setEditingId(null);
    setShowForm(false);
  }

  function submitEntry(event) {
    event.preventDefault();
    if (!name.trim()) return;
    if (editingId) {
      setEntries((current) => current.map((entry) => entry.id === editingId ? { ...entry, name: name.trim(), calories: Number(calories || 0) } : entry));
    } else {
      setEntries((current) => [...current, {
        id: Date.now(),
        name: name.trim(),
        calories: Number(calories || 0),
        time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date()),
      }]);
    }
    resetForm();
  }

  function editEntry(entry) {
    setName(entry.name);
    setCalories(String(entry.calories));
    setEditingId(entry.id);
    setShowForm(true);
  }

  function deleteEntry(id) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    if (editingId === id) resetForm();
  }

  function addScannedProduct(product) {
    setEntries((current) => [...current, {
      id: Date.now(),
      name: product.name,
      calories: product.calories,
      barcode: product.barcode,
      servingGrams: product.servingGrams,
      source: 'barcode',
      time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date()),
    }]);
    setShowScanner(false);
  }

  function addPlanTasks(dateKey, tasks) {
    setDayPlans((plans) => {
      const current = plans[dateKey] || [];
      const newTasks = tasks
        .filter((task) => !current.some((item) => item.label === task.label))
        .map((task, index) => ({ ...task, id: `${Date.now()}-${index}`, done: false }));
      return { ...plans, [dateKey]: [...current, ...newTasks] };
    });
  }

  function pickIdea(idea) {
    addPlanTasks(todayKey, planTasksForIdea(idea, { travelMode: guidance.travelMode, inSchool: guidance.inSchool }));
  }

  function togglePlanTask(dateKey, id) {
    setDayPlans((plans) => ({
      ...plans,
      [dateKey]: (plans[dateKey] || []).map((item) => item.id === id ? { ...item, done: !item.done } : item),
    }));
  }

  function removePlanTask(dateKey, id) {
    setDayPlans((plans) => ({ ...plans, [dateKey]: (plans[dateKey] || []).filter((item) => item.id !== id) }));
  }

  async function enableReminders() {
    if (typeof Notification === 'undefined') {
      setReminderStatus('Browser notifications are not available here.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setReminderSettings((settings) => ({ ...settings, enabled: true }));
      setReminderStatus('Reminders are on while Nourally is open.');
    } else {
      setReminderSettings((settings) => ({ ...settings, enabled: false }));
      setReminderStatus('Notifications were not allowed in this browser.');
    }
  }

  return <Shell eyebrow="NOURALLY / TODAY">
    <section className="dashboard-head today-head"><div><p className="kicker">TODAY · {date.toUpperCase()}</p><h1>{profile.name ? `${profile.name}’s` : 'Your'} daily<br /><em>fueling plan.</em></h1></div><AppNavigation active="today" onNavigate={onNavigate} /></section>
    <section className="today-command">
      <article className="action-hero"><div className="action-hero-top"><span className="step-badge">NEXT RECOMMENDED ACTION</span><strong>{guidance.timing}</strong></div><div><span className="context-pill">{guidance.label}</span><h2>{guidance.title}</h2><p>{guidance.explanation}</p></div><div className="action-hero-actions">{primaryIdea ? <button className="action-primary" disabled={plannedFoodIds.has(primaryIdea.id)} onClick={() => pickIdea(primaryIdea)}>{plannedFoodIds.has(primaryIdea.id) ? 'Added to today’s prep list ✓' : `Plan ${primaryIdea.name}`}<span>→</span></button> : <button className="action-primary" onClick={() => onNavigate('calendar')}>Add today’s schedule <span>→</span></button>}<button className="action-secondary" onClick={() => onNavigate('calendar')}>View full schedule</button></div></article>
    </section>
    <section className="guidance-layout">
      <article className="card now-card"><div className="now-card-top"><div><div className="section-label">MEAL SUGGESTIONS</div><h2 className="section-title">Options for the next fueling window</h2></div><span className="now-time">{guidance.timing}</span></div><p className="guidance-explanation">Each choice already matches the current schedule, food access, budget style, and dietary settings.</p>
        <div className="idea-grid">{guidance.ideas.map((idea) => { const isPlanned = plannedFoodIds.has(idea.id); return <article className={`idea-card${isPlanned ? ' planned' : ''}`} key={idea.id}><span>{idea.portable ? 'PACKABLE' : 'MEAL WINDOW'}</span><h3>{idea.name}</h3><p>{idea.note}</p><div className="idea-actions"><button disabled={isPlanned} onClick={() => pickIdea(idea)}>{isPlanned ? 'Added to prep list ✓' : 'Add meal + prep →'}</button>{guidance.alternates.length > 0 && <button className="swap-button" onClick={() => setSwapFor(swapFor === idea.id ? '' : idea.id)}>{swapFor === idea.id ? 'Close swaps' : 'See swaps'}</button>}</div></article>; })}</div>
        {swapFor && <div className="swap-tray"><div><span>SWAP IT</span><strong>Same moment, different food</strong></div>{guidance.alternates.slice(0, 4).map((idea) => <button key={idea.id} onClick={() => { pickIdea(idea); setSwapFor(''); }}><span>{idea.name}</span><small>{idea.portable ? 'Packable' : 'Meal option'} →</small></button>)}</div>}
        <p className="guidance-disclaimer">General fueling education, not a calorie target or medical plan. Check labels and follow guidance from your qualified care team.</p>
      </article>
      <aside className="card day-plan-card"><div className="section-label">TODAY’S TIMELINE</div><h2 className="section-title">School to sport</h2>{timeline.length ? <div className="mini-timeline">{timeline.map((event) => <div className={event.type} key={event.id}><span>{formatClock(event.startTime)}</span><i /><div><strong>{event.title}</strong><small>{event.type === 'school' ? `Lunch ${formatClock(schoolSchedule.lunchStartTime)}` : `${event.type}${event.location === 'away' ? ' · away' : ''}`}</small></div></div>)}</div> : <div className="timeline-empty"><span>＋</span><h3>Add today’s schedule.</h3><p>Nourally gets more useful when it knows when school and training happen.</p><button className="primary small" onClick={() => onNavigate('calendar')}>Open calendar <span>→</span></button></div>}<div className="prep-callout"><span>{guidance.travelMode ? 'PRE-PRACTICE · PACK BEFORE YOU GO' : 'PRE-PRACTICE · MAKE IT EASY'}</span><p>{guidance.travelMode ? 'Choose shelf-stable options, pack water, and avoid relying on an unfamiliar away venue.' : profile.familyPrep ? 'Share the packing list with whoever can help before the busy part of the day.' : 'Set aside the next snack or meal before the busy part of the day.'}</p></div></aside>
    </section>
    <section className="planning-layout">
      <PrepChecklist title="PACK + PREP" dateLabel="Today’s preparation" items={todayPlan} empty="Choose a meal above. Nourally will turn it into clear packing and preparation steps." onToggle={(id) => togglePlanTask(todayKey, id)} onRemove={(id) => removePlanTask(todayKey, id)} />
      <article className="card tomorrow-card"><div className="section-label">PREPARE TONIGHT</div>{earlyTomorrow ? <><div className="tomorrow-event"><span>{formatClock(earlyTomorrow.startTime)} tomorrow</span><h2>{earlyTomorrow.title}</h2><p>{earlyTomorrow.location === 'away' || earlyTomorrow.location === 'travel' ? `Early travel day · ${earlyTomorrow.travelMinutes || 0} min travel` : 'Early activity · make the morning easier tonight'}</p></div>{tomorrowPlan.length === 0 && <button className="primary small" onClick={() => addPlanTasks(tomorrowKey, tomorrowPrepTasks(earlyTomorrow))}>Build tomorrow’s list <span>→</span></button>}<PrepChecklist compact title="TOMORROW’S CHECKLIST" dateLabel="Tomorrow" items={tomorrowPlan} empty="Build the list to set out food, water, and gear." onToggle={(id) => togglePlanTask(tomorrowKey, id)} onRemove={(id) => removePlanTask(tomorrowKey, id)} /></> : <div className="tomorrow-empty"><span>✓</span><h2>No early event tomorrow.</h2><p>If you add one before 10:00 AM, Nourally will offer a prepare-tonight checklist here.</p></div>}</article>
    </section>
    <section className="card reminder-card"><div><div className="section-label">TIMELY REMINDERS</div><h2>{reminderSettings.enabled ? 'Fueling reminders are active.' : 'Turn on pre-activity reminders.'}</h2><p>Nourally uses the schedule above to send the next useful prompt while the app is open.</p>{reminderStatus && <span className="reminder-status">{reminderStatus}</span>}</div><div className="reminder-controls">{reminderSettings.enabled ? <button className="reminder-toggle on" onClick={() => setReminderSettings((settings) => ({ ...settings, enabled: false }))}><span /> Reminders on</button> : <button className="reminder-toggle" onClick={enableReminders}><span /> Turn on</button>}<label>Lead time<select value={reminderSettings.leadMinutes} onChange={(event) => setReminderSettings((settings) => ({ ...settings, leadMinutes: Number(event.target.value) }))}><option value="30">30 min before</option><option value="60">60 min before</option><option value="90">90 min before</option></select></label><label className="check-row reminder-check"><input type="checkbox" checked={reminderSettings.eveningPrep} onChange={(event) => setReminderSettings((settings) => ({ ...settings, eveningPrep: event.target.checked }))} /><span>Evening preparation reminder for early events</span></label></div></section>
    <HydrationTracker water={water} setHydration={setHydration} guidance={guidance} />
    <section className="entries-section"><div className="section-heading"><div><p className="kicker">TODAY’S CHECK-INS</p><h2>Food logged today.</h2></div><div className="entry-buttons"><button className="scan-button small" onClick={() => { resetForm(); setShowScanner(!showScanner); }}>{showScanner ? 'Close scanner' : '▣ Barcode helper'}</button><button className="primary small" onClick={() => { setShowScanner(false); if (showForm) resetForm(); else setShowForm(true); }}>{showForm ? 'Cancel' : '+ Food check-in'}</button></div></div><p className="log-intro">Logging is for reflection, not judgment. Calories are optional and only shown when you enter them or scan a label.</p>{showScanner && <BarcodeScanner onAdd={addScannedProduct} onClose={() => setShowScanner(false)} />}{showForm && <form className="add-form card" onSubmit={submitEntry}><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Meal or snack" /><input min="1" type="number" value={calories} onChange={(event) => setCalories(event.target.value)} placeholder="Calories (optional)" /><button className="primary small" type="submit">{editingId ? 'Save' : 'Check in'}</button></form>}{entries.length === 0 ? <div className="empty-state"><span>＋</span><h3>No food check-ins yet.</h3><p>Your first meal or snack will appear here.</p></div> : <div className="entries">{entries.map((entry) => <div className="entry" key={entry.id}><div className="entry-icon">{entry.source === 'barcode' ? '▣' : entry.source === 'guidance' ? '↗' : '✦'}</div><div className="entry-copy"><strong>{entry.name}</strong><span>{entry.time}{entry.source === 'barcode' ? ` · ${entry.servingGrams}g label serving` : entry.source === 'guidance' ? ' · planned from guidance' : ''}</span></div>{entry.calories > 0 && <b>{entry.calories.toLocaleString()} <small>kcal</small></b>}<div className="entry-actions"><button onClick={() => editEntry(entry)} aria-label={`Edit ${entry.name}`}>Edit</button><button className="danger" onClick={() => deleteEntry(entry.id)} aria-label={`Delete ${entry.name}`}>Delete</button></div></div>)}</div>}</section>
  </Shell>;
}

function PrepChecklist({ title, dateLabel, items, empty, onToggle, onRemove, compact = false }) {
  const completed = items.filter((item) => item.done).length;
  return <article className={`card prep-checklist${compact ? ' compact' : ''}`}><div className="checklist-head"><div><div className="section-label">{title}</div><h2>{dateLabel} <small>{items.length ? `${completed}/${items.length} ready` : 'nothing added yet'}</small></h2></div>{items.length > 0 && <span className="checklist-count">{Math.round((completed / items.length) * 100)}%</span>}</div>{items.length ? <div className="checklist-items">{items.map((item) => <div className={item.done ? 'done' : ''} key={item.id}><button className="task-check" onClick={() => onToggle(item.id)} aria-label={`${item.done ? 'Mark incomplete' : 'Mark complete'}: ${item.label}`}>{item.done ? '✓' : ''}</button><span><i>{item.kind}</i>{item.label}</span><button className="task-remove" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.label}`}>×</button></div>)}</div> : <p className="checklist-empty">{empty}</p>}</article>;
}

function groceryFitsProfile(item, profile) {
  const needs = profile.dietaryNeeds || [];
  return !(
    (needs.includes('vegan') && !item.vegan) ||
    (needs.includes('vegetarian') && !item.vegetarian) ||
    (needs.includes('dairyFree') && !item.dairyFree) ||
    (needs.includes('glutenFree') && !item.glutenFree) ||
    (needs.includes('nutFree') && !item.nutFree)
  );
}

function GroceryHub({ groceryState, setGroceryState, profile, setProfile, events, todayKey, onNavigate }) {
  const [pantryName, setPantryName] = useState('');
  const [listName, setListName] = useState('');
  const [listPrice, setListPrice] = useState('');
  const listItems = groceryState.items.filter((item) => item.status === 'list');
  const cartItems = groceryState.items.filter((item) => item.status === 'cart');
  const listEstimate = listItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const cartEstimate = cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const plannedEstimate = listEstimate + cartEstimate;
  const budgetAmount = Math.max(Number(groceryState.budgetAmount || 0), 0);
  const budgetRemaining = budgetAmount - plannedEstimate;
  const budgetPercent = budgetAmount ? Math.min((plannedEstimate / budgetAmount) * 100, 100) : 0;
  const selectedGoal = GROCERY_GOALS.find((goal) => goal.id === groceryState.goal) || GROCERY_GOALS[0];
  const upcomingActivities = Array.from({ length: 7 }, (_, index) => {
    const dateKey = getDateKey(addDays(new Date(`${todayKey}T12:00:00`), index));
    return eventsForDate(events, dateKey).map((event) => ({ ...event, dateKey, dayOffset: index }));
  }).flat();
  const hasAwayActivity = upcomingActivities.some((event) => event.location === 'away' || event.location === 'travel' || Number(event.travelMinutes || 0) >= 30);
  const hasHardActivity = upcomingActivities.some((event) => event.intensity === 'high' || event.type === 'game');
  const activityFocus = hasAwayActivity ? 'away-game' : upcomingActivities.length >= 3 ? 'school-week' : upcomingActivities.length ? 'practice-fuel' : groceryState.goal;
  const activityFocusLabel = GROCERY_GOALS.find((goal) => goal.id === activityFocus)?.label || selectedGoal.label;
  const pantryKeys = new Set(groceryState.pantry.flatMap((item) => [item.catalogId, item.name.trim().toLowerCase()].filter(Boolean)));
  const quickPantry = GROCERY_CATALOG.filter((item) => !pantryKeys.has(item.id) && !pantryKeys.has(item.name.toLowerCase())).slice(0, 8);

  function updateState(patch) {
    setGroceryState((current) => ({ ...current, ...patch }));
  }

  function setLastShopDaysAgo(days) {
    updateState({ lastShopDate: getDateKey(addDays(new Date(`${todayKey}T12:00:00`), -days)) });
  }

  function lastShopLabel() {
    if (!groceryState.lastShopDate) return 'Not set';
    const today = new Date(`${todayKey}T12:00:00`);
    const last = new Date(`${groceryState.lastShopDate}T12:00:00`);
    const days = Math.max(Math.round((today - last) / 86400000), 0);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }

  function addPantryItem(name, catalogId = '') {
    const cleanName = name.trim();
    if (!cleanName) return;
    setGroceryState((current) => {
      const existing = current.pantry.find((item) => item.name.toLowerCase() === cleanName.toLowerCase());
      const pantry = existing
        ? current.pantry.map((item) => item.id === existing.id ? { ...item, quantity: item.quantity + 1, updatedDate: todayKey } : item)
        : [...current.pantry, { id: `pantry-${Date.now()}`, catalogId, name: cleanName, quantity: 1, updatedDate: todayKey }];
      return { ...current, pantry };
    });
    setPantryName('');
  }

  function changePantryQuantity(id, amount) {
    setGroceryState((current) => ({
      ...current,
      pantry: current.pantry
        .map((item) => item.id === id ? { ...item, quantity: item.quantity + amount, updatedDate: todayKey } : item)
        .filter((item) => item.quantity > 0),
    }));
  }

  function generateList() {
    setGroceryState((current) => {
      const inPantry = new Set(current.pantry.flatMap((item) => [item.catalogId, item.name.toLowerCase()].filter(Boolean)));
      const cart = current.items.filter((item) => item.status === 'cart');
      const inCart = new Set(cart.flatMap((item) => [item.catalogId, item.name.toLowerCase()].filter(Boolean)));
      const cartTotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
      const activeGoals = new Set([current.goal, activityFocus, ...(hasHardActivity ? ['recovery-meals'] : [])]);
      const candidates = GROCERY_CATALOG
        .filter((item) => item.goals.some((goal) => activeGoals.has(goal)) && groceryFitsProfile(item, profile))
        .filter((item) => !inPantry.has(item.id) && !inPantry.has(item.name.toLowerCase()))
        .filter((item) => !inCart.has(item.id) && !inCart.has(item.name.toLowerCase()))
        .sort((a, b) => {
          const aPriority = a.goals.includes(current.goal) ? 0 : 1;
          const bPriority = b.goals.includes(current.goal) ? 0 : 1;
          return aPriority - bPriority || a.price - b.price;
        });
      const chosen = [];
      let estimate = cartTotal;
      for (const item of candidates) {
        if (chosen.length >= 12) break;
        if (budgetAmount > 0 && estimate + item.price > budgetAmount && chosen.length >= 3) continue;
        const reason = hasAwayActivity && item.goals.includes('away-game')
          ? 'For upcoming travel or away activity'
          : hasHardActivity && item.goals.includes('recovery-meals')
            ? 'For recovery after a hard session'
            : upcomingActivities.length && item.goals.includes('practice-fuel')
              ? 'For pre-practice fueling'
              : `For ${selectedGoal.label.toLowerCase()}`;
        chosen.push({ ...item, id: `grocery-${item.id}-${Date.now()}`, catalogId: item.id, quantity: 1, status: 'list', reason });
        estimate += item.price;
      }
      return { ...current, items: [...cart, ...chosen] };
    });
  }

  function addCustomListItem(event) {
    event.preventDefault();
    const cleanName = listName.trim();
    if (!cleanName) return;
    setGroceryState((current) => ({
      ...current,
      items: [...current.items, { id: `custom-${Date.now()}`, name: cleanName, category: 'Custom', price: Math.max(Number(listPrice || 0), 0), quantity: 1, status: 'list' }],
    }));
    setListName('');
    setListPrice('');
  }

  function setItemStatus(id, status) {
    setGroceryState((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, status } : item) }));
  }

  function changeItemQuantity(id, amount) {
    setGroceryState((current) => ({
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, quantity: Math.max(Number(item.quantity || 1) + amount, 1) } : item),
    }));
  }

  function removeItem(id) {
    setGroceryState((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));
  }

  function recordBought(ids) {
    setGroceryState((current) => {
      const bought = current.items.filter((item) => ids.includes(item.id));
      let pantry = [...current.pantry];
      bought.forEach((item) => {
        const existing = pantry.find((pantryItem) => pantryItem.catalogId === item.catalogId || pantryItem.name.toLowerCase() === item.name.toLowerCase());
        pantry = existing
          ? pantry.map((pantryItem) => pantryItem.id === existing.id ? { ...pantryItem, quantity: pantryItem.quantity + Number(item.quantity || 1), updatedDate: todayKey } : pantryItem)
          : [...pantry, { id: `pantry-${item.id}`, catalogId: item.catalogId || '', name: item.name, quantity: Number(item.quantity || 1), updatedDate: todayKey }];
      });
      const purchases = bought.map((item) => ({ ...item, purchasedDate: todayKey, purchaseId: `purchase-${item.id}-${Date.now()}` }));
      return {
        ...current,
        pantry,
        items: current.items.filter((item) => !ids.includes(item.id)),
        lastShopDate: todayKey,
        purchases: [...purchases, ...current.purchases].slice(0, 30),
      };
    });
  }

  return <Shell eyebrow="NOURALLY / GROCERIES">
    <section className="grocery-head"><div><p className="kicker">FOOD AT HOME + NEXT SHOP</p><h1>Plan the shop.<br /><em>Fuel the week.</em></h1></div><AppNavigation active="groceries" onNavigate={onNavigate} /></section>
    <section className="grocery-summary">
      <article className="card grocery-summary-card"><span>Weekly budget</span><strong>${budgetAmount.toFixed(0)}</strong><small>{profile.budget === 'save' ? 'saving-focused choices' : `${profile.budget} food budget`}</small></article>
      <article className="card grocery-summary-card"><span>Last grocery trip</span><strong>{lastShopLabel()}</strong><small>{groceryState.pantry.length} pantry items tracked</small></article>
      <article className="card grocery-summary-card"><span>Planned estimate</span><strong>${plannedEstimate.toFixed(2)}</strong><small className={budgetRemaining < 0 ? 'over-budget' : ''}>{budgetRemaining >= 0 ? `$${budgetRemaining.toFixed(2)} left` : `$${Math.abs(budgetRemaining).toFixed(2)} over`}</small></article>
    </section>
    <section className="grocery-activity-context"><div><span className="section-label">NEXT 7 DAYS</span><strong>{upcomingActivities.length ? `${upcomingActivities.length} sports ${upcomingActivities.length === 1 ? 'activity' : 'activities'} shaping this list` : 'Add sports to make this list activity-aware'}</strong><small>{upcomingActivities.length ? `Suggested focus: ${activityFocusLabel}${hasHardActivity ? ' + recovery meals' : ''}` : 'The selected shopping goal and dietary settings will still be used.'}</small></div><div className="activity-chips">{upcomingActivities.slice(0, 4).map((event) => <span key={`${event.id}-${event.dateKey}`}><b>{event.dayOffset === 0 ? 'Today' : event.dayOffset === 1 ? 'Tomorrow' : new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(`${event.dateKey}T12:00:00`))}</b>{event.title} · {formatClock(event.startTime)}</span>)}{upcomingActivities.length > 4 && <span><b>+{upcomingActivities.length - 4}</b>more activities</span>}</div></section>
    <section className="card grocery-controls">
      <div className="grocery-control"><div className="section-label">BUDGET</div><label>Amount for this shop<div className="money-input"><span>$</span><input type="number" min="0" step="5" value={groceryState.budgetAmount} onChange={(event) => updateState({ budgetAmount: event.target.value })} /></div></label><div className="budget-style">{[['save', 'Save'], ['standard', 'Everyday'], ['flexible', 'Flexible']].map(([value, label]) => <button className={profile.budget === value ? 'selected' : ''} onClick={() => setProfile({ ...profile, budget: value })} key={value}>{label}</button>)}</div></div>
      <div className="grocery-control"><div className="section-label">LAST SHOP</div><strong className="control-value">{lastShopLabel()}</strong><div className="shop-recency"><button onClick={() => setLastShopDaysAgo(0)}>Today</button><button onClick={() => setLastShopDaysAgo(3)}>This week</button><button onClick={() => setLastShopDaysAgo(10)}>10+ days</button></div><label>Exact date<input type="date" max={todayKey} value={groceryState.lastShopDate} onChange={(event) => updateState({ lastShopDate: event.target.value })} /></label></div>
      <div className="grocery-control"><div className="section-label">SHOPPING GOAL</div><label>Plan focus<select value={groceryState.goal} onChange={(event) => updateState({ goal: event.target.value })}>{GROCERY_GOALS.map((goal) => <option key={goal.id} value={goal.id}>{goal.label}</option>)}</select></label><p>{selectedGoal.description}</p><button className="primary small" onClick={generateList}>Generate grocery list <span>→</span></button></div>
    </section>
    <section className="grocery-workspace">
      <article className="card pantry-card"><div className="workspace-head"><div><div className="section-label">AT HOME NOW</div><h2>Pantry check</h2></div><span>{groceryState.pantry.length} tracked</span></div><form className="quick-add-form" onSubmit={(event) => { event.preventDefault(); addPantryItem(pantryName); }}><input value={pantryName} onChange={(event) => setPantryName(event.target.value)} placeholder="Add food at home" /><button className="primary small" type="submit">Add</button></form><div className="quick-pantry"><span>Quick add</span>{quickPantry.map((item) => <button onClick={() => addPantryItem(item.name, item.id)} key={item.id}>+ {item.name}</button>)}</div>{groceryState.pantry.length ? <div className="pantry-list">{groceryState.pantry.map((item) => <div key={item.id}><div><strong>{item.name}</strong><small>Updated {item.updatedDate === todayKey ? 'today' : item.updatedDate}</small></div><div className="quantity-stepper"><button onClick={() => changePantryQuantity(item.id, -1)} aria-label={`Use one ${item.name}`}>−</button><span>{item.quantity}</span><button onClick={() => changePantryQuantity(item.id, 1)} aria-label={`Add one ${item.name}`}>+</button></div></div>)}</div> : <div className="grocery-empty"><span>＋</span><strong>Add a few foods already at home.</strong><p>Generated lists leave tracked pantry items out.</p></div>}</article>
      <div className="grocery-list-column">
        <article className="card generated-list-card"><div className="workspace-head"><div><div className="section-label">SMART GROCERY LIST</div><h2>{selectedGoal.label}</h2></div><span>{listItems.length} items · ${listEstimate.toFixed(2)}</span></div><div className="budget-meter"><span style={{ width: `${budgetPercent}%` }} /><i>${plannedEstimate.toFixed(2)} of ${budgetAmount.toFixed(2)}</i></div><form className="manual-list-form" onSubmit={addCustomListItem}><input value={listName} onChange={(event) => setListName(event.target.value)} placeholder="Add custom item" /><div className="money-input compact"><span>$</span><input type="number" min="0" step="0.25" value={listPrice} onChange={(event) => setListPrice(event.target.value)} placeholder="Est." /></div><button type="submit">Add</button></form>{listItems.length ? <div className="grocery-list">{listItems.map((item) => <GroceryItemRow key={item.id} item={item} onQuantity={changeItemQuantity} onPrimary={() => setItemStatus(item.id, 'cart')} primaryLabel="Add to cart" onBought={() => recordBought([item.id])} onRemove={() => removeItem(item.id)} />)}</div> : <div className="grocery-empty"><span>↗</span><strong>Your generated list lands here.</strong><p>It will use your goal, budget, dietary needs, and current pantry.</p><button onClick={generateList}>Generate now</button></div>}<p className="price-note">Prices are rough planning estimates and vary by store and location.</p></article>
        <article className="card grocery-cart"><div className="workspace-head"><div><div className="section-label">IN-APP CART</div><h2>Ready to buy</h2></div><span>{cartItems.length} items · ${cartEstimate.toFixed(2)}</span></div>{cartItems.length ? <><div className="grocery-list cart-list">{cartItems.map((item) => <GroceryItemRow key={item.id} item={item} onQuantity={changeItemQuantity} onPrimary={() => setItemStatus(item.id, 'list')} primaryLabel="Move back" onBought={() => recordBought([item.id])} onRemove={() => removeItem(item.id)} />)}</div><button className="primary cart-checkout" onClick={() => recordBought(cartItems.map((item) => item.id))}>Mark cart as bought <span>✓</span></button></> : <p className="cart-empty">Move list items here as you shop. Marking them bought updates your pantry and shopping date.</p>}</article>
      </div>
    </section>
    {groceryState.purchases.length > 0 && <section className="card recent-purchases"><div><div className="section-label">RECENTLY BOUGHT</div><h2>Purchase history</h2></div><div>{groceryState.purchases.slice(0, 8).map((item) => <span key={item.purchaseId}><strong>{item.name}</strong><small>{item.quantity} · {item.purchasedDate}</small></span>)}</div></section>}
  </Shell>;
}

function GroceryItemRow({ item, onQuantity, onPrimary, primaryLabel, onBought, onRemove }) {
  return <div className="grocery-item" key={item.id}><div className="grocery-item-copy"><span>{item.category}</span><strong>{item.name}</strong>{item.reason && <em>{item.reason}</em>}<small>${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)} estimated</small></div><div className="quantity-stepper"><button onClick={() => onQuantity(item.id, -1)} aria-label={`Decrease ${item.name}`}>−</button><span>{item.quantity || 1}</span><button onClick={() => onQuantity(item.id, 1)} aria-label={`Increase ${item.name}`}>+</button></div><div className="grocery-item-actions"><button onClick={onPrimary}>{primaryLabel}</button><button onClick={onBought}>Bought</button><button className="danger" onClick={onRemove}>×</button></div></div>;
}

function ScheduleCalendar({ events, setEvents, schoolSchedule, setSchoolSchedule, todayKey, onNavigate }) {
  const today = new Date(`${todayKey}T12:00:00`);
  const schoolYearStart = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [showForm, setShowForm] = useState(false);
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState('practice');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:30');
  const [intensity, setIntensity] = useState('medium');
  const [location, setLocation] = useState('home');
  const [travelMinutes, setTravelMinutes] = useState('0');
  const [repeatMode, setRepeatMode] = useState('once');
  const [repeatWeekdays, setRepeatWeekdays] = useState([today.getDay()]);
  const [repeatEndDate, setRepeatEndDate] = useState(getDateKey(addDays(today, 84)));
  const [formError, setFormError] = useState('');
  const [schoolName, setSchoolName] = useState(schoolSchedule?.name || 'School');
  const [schoolStartDate, setSchoolStartDate] = useState(schoolSchedule?.startDate || `${schoolYearStart}-08-15`);
  const [schoolEndDate, setSchoolEndDate] = useState(schoolSchedule?.endDate || `${schoolYearStart + 1}-06-15`);
  const [schoolStartTime, setSchoolStartTime] = useState(schoolSchedule?.startTime || '08:00');
  const [schoolEndTime, setSchoolEndTime] = useState(schoolSchedule?.endTime || '15:00');
  const [schoolWeekdays, setSchoolWeekdays] = useState(schoolSchedule?.weekdays || [1, 2, 3, 4, 5]);
  const [lunchStartTime, setLunchStartTime] = useState(schoolSchedule?.lunchStartTime || '11:30');
  const [lunchEndTime, setLunchEndTime] = useState(schoolSchedule?.lunchEndTime || '12:00');
  const [morningSnackTime, setMorningSnackTime] = useState(schoolSchedule?.morningSnackTime || '');
  const [afternoonSnackTime, setAfternoonSnackTime] = useState(schoolSchedule?.afternoonSnackTime || '');
  const [commuteMinutes, setCommuteMinutes] = useState(String(schoolSchedule?.commuteMinutes ?? 20));
  const [foodAccess, setFoodAccess] = useState(schoolSchedule?.foodAccess || { cafeteria: true, refrigerator: false, microwave: false, eatInClass: false });
  const [schoolError, setSchoolError] = useState('');
  const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const selectedDate = new Date(`${selectedKey}T12:00:00`);
  const selectedEvents = getEventsForDay(selectedDate);
  const selectedSchoolCanceled = schoolSchedule?.enabled && isConfiguredSchoolDay(selectedDate) && schoolSchedule.excludedDates?.includes(selectedKey);

  function isConfiguredSchoolDay(date) {
    if (!schoolSchedule || getDateKey(date) < schoolSchedule.startDate || getDateKey(date) > schoolSchedule.endDate) return false;
    return schoolSchedule.weekdays.includes(date.getDay());
  }

  function getSchoolEvent(date) {
    const key = getDateKey(date);
    if (!schoolSchedule?.enabled || !isConfiguredSchoolDay(date) || schoolSchedule.excludedDates?.includes(key)) return null;
    return {
      id: `school-${key}`,
      date: key,
      type: 'school',
      title: schoolSchedule.name,
      startTime: schoolSchedule.startTime,
      endTime: schoolSchedule.endTime,
      intensity: 'school day',
      recurring: true,
    };
  }

  function getEventsForDay(date) {
    const key = getDateKey(date);
    const dayEvents = eventsForDate(events, key);
    const schoolEvent = getSchoolEvent(date);
    return (schoolEvent ? [...dayEvents, schoolEvent] : dayEvents).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function formatTime(value) {
    if (!/^\d{2}:\d{2}$/.test(value || '')) return 'Time TBD';
    const [hours, minutes] = value.split(':').map(Number);
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hours, minutes));
  }

  function formatDuration(start, end) {
    if (!/^\d{2}:\d{2}$/.test(start || '') || !/^\d{2}:\d{2}$/.test(end || '')) return 'Duration not set';
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    const minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) return `${remainder} min`;
    return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
  }

  function resetForm(resetKey = selectedKey) {
    setEditingId(null);
    setType('practice');
    setTitle('');
    setStartTime('16:00');
    setEndTime('17:30');
    setIntensity('medium');
    setLocation('home');
    setTravelMinutes('0');
    setRepeatMode('once');
    setRepeatWeekdays([new Date(`${resetKey}T12:00:00`).getDay()]);
    setRepeatEndDate(getDateKey(addDays(new Date(`${resetKey}T12:00:00`), 84)));
    setFormError('');
    setShowForm(false);
  }

  function selectDay(date) {
    const key = getDateKey(date);
    setSelectedKey(key);
    if (date.getMonth() !== monthCursor.getMonth() || date.getFullYear() !== monthCursor.getFullYear()) {
      setMonthCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    resetForm(key);
  }

  function goToToday() {
    setSelectedKey(todayKey);
    setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    resetForm(todayKey);
  }

  function saveEvent(event) {
    event.preventDefault();
    if (endTime <= startTime) {
      setFormError('End time must be later than start time.');
      return;
    }
    if (!Number.isFinite(Number(travelMinutes)) || Number(travelMinutes) < 0 || Number(travelMinutes) > 360) {
      setFormError('Travel time must be between 0 and 360 minutes.');
      return;
    }
    if (repeatMode === 'weekly' && !repeatWeekdays.length) {
      setFormError('Choose at least one repeat day.');
      return;
    }
    if (repeatMode === 'weekly' && repeatEndDate < selectedKey) {
      setFormError('The repeat end date must be on or after the first activity.');
      return;
    }
    const existingEvent = events.find((item) => item.id === editingId);
    const scheduledEvent = {
      id: editingId || Date.now(),
      type,
      title: title.trim() || type[0].toUpperCase() + type.slice(1),
      startTime,
      endTime,
      intensity,
      location,
      travelMinutes: Number(travelMinutes || 0),
      ...(repeatMode === 'weekly' ? {
        recurrence: {
          startDate: editingId && existingEvent?.recurrence ? existingEvent.recurrence.startDate : selectedKey,
          endDate: repeatEndDate,
          weekdays: [...repeatWeekdays].sort(),
          excludedDates: existingEvent?.recurrence?.excludedDates || [],
        },
      } : { date: selectedKey }),
    };
    setEvents((current) => editingId
      ? current.map((item) => item.id === editingId ? scheduledEvent : item)
      : [...current, scheduledEvent]);
    resetForm();
  }

  function editEvent(event) {
    setEditingId(event.id);
    setType(event.type);
    setTitle(event.title);
    setStartTime(event.startTime);
    setEndTime(event.endTime);
    setIntensity(event.intensity);
    setLocation(event.location || 'home');
    setTravelMinutes(String(event.travelMinutes || 0));
    setRepeatMode(event.recurrence ? 'weekly' : 'once');
    setRepeatWeekdays(event.recurrence?.weekdays || [new Date(`${event.date}T12:00:00`).getDay()]);
    setRepeatEndDate(event.recurrence?.endDate || getDateKey(addDays(new Date(`${event.date}T12:00:00`), 84)));
    setFormError('');
    setShowForm(true);
  }

  function deleteEvent(id) {
    setEvents((current) => current.filter((event) => event.id !== id));
    if (editingId === id) resetForm();
  }

  function skipRecurringOccurrence(event) {
    setEvents((current) => current.map((item) => item.id === event.id ? {
      ...item,
      recurrence: {
        ...item.recurrence,
        excludedDates: [...new Set([...(item.recurrence?.excludedDates || []), selectedKey])],
      },
    } : item));
  }

  function toggleRepeatDay(day) {
    setRepeatWeekdays((days) => days.includes(day) ? days.filter((item) => item !== day) : [...days, day]);
  }

  function saveSchoolSchedule(event) {
    event.preventDefault();
    if (schoolEndDate < schoolStartDate) {
      setSchoolError('The school year must end after it starts.');
      return;
    }
    if (schoolEndTime <= schoolStartTime) {
      setSchoolError('The school day must end after it starts.');
      return;
    }
    if (!schoolWeekdays.length) {
      setSchoolError('Choose at least one school day.');
      return;
    }
    if (lunchEndTime <= lunchStartTime || lunchStartTime < schoolStartTime || lunchEndTime > schoolEndTime) {
      setSchoolError('Lunch must fit inside the school day and end after it starts.');
      return;
    }
    if ([morningSnackTime, afternoonSnackTime].some((time) => time && (time < schoolStartTime || time > schoolEndTime))) {
      setSchoolError('Optional snack times must fall inside the school day.');
      return;
    }
    const parsedCommuteMinutes = Number(commuteMinutes);
    if (!Number.isFinite(parsedCommuteMinutes) || parsedCommuteMinutes < 0 || parsedCommuteMinutes > 180) {
      setSchoolError('Commute time must be between 0 and 180 minutes.');
      return;
    }
    setSchoolSchedule({
      enabled: true,
      name: schoolName.trim() || 'School',
      startDate: schoolStartDate,
      endDate: schoolEndDate,
      startTime: schoolStartTime,
      endTime: schoolEndTime,
      weekdays: [...schoolWeekdays].sort(),
      lunchStartTime,
      lunchEndTime,
      morningSnackTime,
      afternoonSnackTime,
      commuteMinutes: parsedCommuteMinutes,
      foodAccess,
      excludedDates: schoolSchedule?.excludedDates || [],
    });
    setSchoolError('');
    setShowSchoolForm(false);
  }

  function openSchoolForm() {
    if (schoolSchedule) {
      setSchoolName(schoolSchedule.name);
      setSchoolStartDate(schoolSchedule.startDate);
      setSchoolEndDate(schoolSchedule.endDate);
      setSchoolStartTime(schoolSchedule.startTime);
      setSchoolEndTime(schoolSchedule.endTime);
      setSchoolWeekdays(schoolSchedule.weekdays);
      setLunchStartTime(schoolSchedule.lunchStartTime || '11:30');
      setLunchEndTime(schoolSchedule.lunchEndTime || '12:00');
      setMorningSnackTime(schoolSchedule.morningSnackTime || '');
      setAfternoonSnackTime(schoolSchedule.afternoonSnackTime || '');
      setCommuteMinutes(String(schoolSchedule.commuteMinutes ?? 20));
      setFoodAccess(schoolSchedule.foodAccess || { cafeteria: true, refrigerator: false, microwave: false, eatInClass: false });
    }
    setSchoolError('');
    setShowSchoolForm(true);
    resetForm();
  }

  function toggleSchoolDay(day) {
    setSchoolWeekdays((days) => days.includes(day) ? days.filter((item) => item !== day) : [...days, day]);
  }

  function toggleFoodAccess(option) {
    setFoodAccess((access) => ({ ...access, [option]: !access[option] }));
  }

  function toggleSchoolSchedule() {
    if (!schoolSchedule) {
      openSchoolForm();
      return;
    }
    setSchoolSchedule((current) => ({ ...current, enabled: !current.enabled }));
  }

  function cancelSchoolDay(dateKey) {
    setSchoolSchedule((current) => ({ ...current, excludedDates: [...new Set([...(current.excludedDates || []), dateKey])] }));
  }

  function restoreSchoolDay(dateKey) {
    setSchoolSchedule((current) => ({ ...current, excludedDates: (current.excludedDates || []).filter((date) => date !== dateKey) }));
  }

  return <Shell eyebrow="NOURALLY / CALENDAR">
    <section className="calendar-head"><div><p className="kicker">SCHOOL + TRAINING SCHEDULE</p><h1>Plan your<br /><em>whole day.</em></h1></div><div className="page-head-tools"><AppNavigation active="calendar" onNavigate={onNavigate} /><button className="school-button" onClick={openSchoolForm}>▤ School</button></div></section>
    {(schoolSchedule || showSchoolForm) && <section className="card school-schedule-card">
      <div className="school-schedule-summary"><div><div className="section-label">SCHOOL CALENDAR</div><h2>{schoolSchedule?.name || 'Import your school schedule'}</h2>{schoolSchedule && <><p>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${schoolSchedule.startDate}T12:00:00`))} – {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${schoolSchedule.endDate}T12:00:00`))} · {formatTime(schoolSchedule.startTime)}–{formatTime(schoolSchedule.endTime)}</p>{schoolSchedule.lunchStartTime && <p className="school-food-summary">Lunch {formatTime(schoolSchedule.lunchStartTime)}–{formatTime(schoolSchedule.lunchEndTime)} · {schoolSchedule.commuteMinutes ?? 20} min commute</p>}</>}</div><div className="school-summary-actions">{schoolSchedule && <button className={`school-toggle ${schoolSchedule.enabled ? 'on' : ''}`} onClick={toggleSchoolSchedule} aria-pressed={schoolSchedule.enabled}><span />{schoolSchedule.enabled ? 'Shown' : 'Hidden'}</button>}<button className="text-button" onClick={() => showSchoolForm ? setShowSchoolForm(false) : openSchoolForm()}>{showSchoolForm ? 'Close' : schoolSchedule ? 'Edit' : 'Set up'}</button></div></div>
      {showSchoolForm && <form className="school-form" onSubmit={saveSchoolSchedule}>
        <label>School name<input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} placeholder="School" /></label>
        <div className="school-date-fields"><label>School year starts<input required type="date" value={schoolStartDate} onChange={(event) => setSchoolStartDate(event.target.value)} /></label><label>School year ends<input required type="date" value={schoolEndDate} onChange={(event) => setSchoolEndDate(event.target.value)} /></label></div>
        <div className="school-date-fields"><label>School starts<input required type="time" value={schoolStartTime} onChange={(event) => setSchoolStartTime(event.target.value)} /></label><label>School ends<input required type="time" value={schoolEndTime} onChange={(event) => setSchoolEndTime(event.target.value)} /></label></div>
        <fieldset><legend>School days</legend><div className="school-weekdays">{[['S', 0], ['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6]].map(([label, day]) => <button type="button" className={schoolWeekdays.includes(day) ? 'selected' : ''} onClick={() => toggleSchoolDay(day)} key={day}>{label}</button>)}</div></fieldset>
        <div className="school-food-section">
          <div><div className="section-label">FOOD WINDOWS & ACCESS</div><p>Tell Nourally what is realistically available during your school day.</p></div>
          <div className="school-date-fields"><label>Lunch starts<input required type="time" value={lunchStartTime} onChange={(event) => setLunchStartTime(event.target.value)} /></label><label>Lunch ends<input required type="time" value={lunchEndTime} onChange={(event) => setLunchEndTime(event.target.value)} /></label></div>
          <div className="school-date-fields"><label>Morning snack <span>Optional</span><input type="time" value={morningSnackTime} onChange={(event) => setMorningSnackTime(event.target.value)} /></label><label>Afternoon snack <span>Optional</span><input type="time" value={afternoonSnackTime} onChange={(event) => setAfternoonSnackTime(event.target.value)} /></label></div>
          <label>Commute from school<input type="number" min="0" max="180" step="5" value={commuteMinutes} onChange={(event) => setCommuteMinutes(event.target.value)} /><small>Minutes from school to home, practice, or your usual next stop.</small></label>
          <fieldset><legend>Food access at school</legend><div className="food-access-options">{[['cafeteria', 'Cafeteria'], ['refrigerator', 'Refrigerator'], ['microwave', 'Microwave'], ['eatInClass', 'Can eat in class']].map(([option, label]) => <button type="button" className={foodAccess[option] ? 'selected' : ''} aria-pressed={Boolean(foodAccess[option])} onClick={() => toggleFoodAccess(option)} key={option}><span>{foodAccess[option] ? '✓' : '+'}</span>{label}</button>)}</div></fieldset>
        </div>
        {schoolError && <p className="schedule-error">{schoolError}</p>}
        <button className="primary" type="submit">Import school year <span>→</span></button>
      </form>}
    </section>}
    <section className="calendar-layout">
      <div className="card month-calendar">
        <div className="calendar-toolbar">
          <div className="calendar-month-controls"><button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} aria-label="Previous month">‹</button><button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} aria-label="Next month">›</button></div>
          <h2>{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(monthCursor)}</h2>
          <button className="today-button" onClick={goToToday}>Today</button>
        </div>
        <div className="weekday-row">{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">{calendarDays.map((date) => {
          const key = getDateKey(date);
          const dayEvents = getEventsForDay(date);
          const outsideMonth = date.getMonth() !== monthCursor.getMonth();
          return <button type="button" className={`calendar-day${outsideMonth ? ' outside' : ''}${key === todayKey ? ' today' : ''}${key === selectedKey ? ' selected' : ''}`} key={key} onClick={() => selectDay(date)} aria-label={new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)}>
            <span className="day-number">{date.getDate()}</span>
            <span className="day-events">{dayEvents.slice(0, 3).map((event) => <span className={`calendar-event-chip ${event.type}`} key={event.occurrenceId || event.id}><i />{event.title}</span>)}{dayEvents.length > 3 && <span className="more-events">+{dayEvents.length - 3} more</span>}</span>
          </button>;
        })}</div>
      </div>
      <aside className="card day-agenda">
        <div className="agenda-head"><div><span>{new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(selectedDate)}</span><strong>{new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(selectedDate)}</strong></div><button className="primary small" onClick={() => { setShowSchoolForm(false); showForm ? resetForm() : setShowForm(true); }}>{showForm ? 'Cancel' : '+ Add'}</button></div>
        {showForm && <form className="schedule-form" onSubmit={saveEvent}>
          <label>Activity type<select value={type} onChange={(event) => setType(event.target.value)}><option value="workout">Workout</option><option value="practice">Practice</option><option value="game">Game</option></select></label>
          <label>Activity name<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={type[0].toUpperCase() + type.slice(1)} /></label>
          <div className="time-fields"><label>Starts<input required type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label><label>Ends<input required type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label></div>
          <fieldset><legend>Activity level</legend><div className="intensity-options">{['low', 'medium', 'high'].map((level) => <button type="button" className={intensity === level ? 'selected' : ''} onClick={() => setIntensity(level)} key={level}>{level}</button>)}</div></fieldset>
          <fieldset><legend>Location</legend><div className="intensity-options"><button type="button" className={location === 'home' ? 'selected' : ''} onClick={() => setLocation('home')}>Home / local</button><button type="button" className={location === 'away' ? 'selected' : ''} onClick={() => setLocation('away')}>Away</button><button type="button" className={location === 'travel' ? 'selected' : ''} onClick={() => setLocation('travel')}>Travel day</button></div></fieldset>
          <label>Travel time<input type="number" min="0" max="360" step="5" value={travelMinutes} onChange={(event) => setTravelMinutes(event.target.value)} /><small>Minutes each way. This helps Nourally favor packable choices.</small></label>
          <fieldset><legend>Repeat</legend><div className="intensity-options"><button type="button" className={repeatMode === 'once' ? 'selected' : ''} onClick={() => setRepeatMode('once')}>One time</button><button type="button" className={repeatMode === 'weekly' ? 'selected' : ''} onClick={() => setRepeatMode('weekly')}>Every week</button></div></fieldset>
          {repeatMode === 'weekly' && <div className="repeat-settings"><fieldset><legend>Repeat on</legend><div className="school-weekdays">{[['S', 0], ['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6]].map(([label, day]) => <button type="button" className={repeatWeekdays.includes(day) ? 'selected' : ''} onClick={() => toggleRepeatDay(day)} key={day}>{label}</button>)}</div></fieldset><label>Repeat through<input required type="date" min={selectedKey} value={repeatEndDate} onChange={(event) => setRepeatEndDate(event.target.value)} /><small>You can skip an individual day later without deleting the series.</small></label></div>}
          {formError && <p className="schedule-error">{formError}</p>}
          <button className="primary" type="submit">{editingId ? 'Save changes' : 'Add to calendar'} <span>→</span></button>
        </form>}
        {!showForm && <>{selectedSchoolCanceled && <div className="school-canceled"><span>School canceled for this day.</span><button onClick={() => restoreSchoolDay(selectedKey)}>Restore</button></div>}{selectedEvents.length ? <div className="agenda-events">{selectedEvents.map((event) => <article className={`agenda-event ${event.type}`} key={event.occurrenceId || event.id}><div className="event-time"><strong>{formatTime(event.startTime)}</strong><span>{formatTime(event.endTime)}</span></div><div className="event-details"><span>{event.type}{event.recurring ? ' · recurring school day' : event.recurringSeries ? ' · weekly series' : ` · ${event.intensity} activity`}</span><h3>{event.title}</h3><p>{formatDuration(event.startTime, event.endTime)}{!event.recurring && event.location ? ` · ${event.location === 'home' ? 'local' : event.location}${event.travelMinutes ? ` · ${event.travelMinutes} min travel` : ''}` : ''}</p></div><div className="event-actions">{event.recurring ? <><button onClick={openSchoolForm}>Edit schedule</button><button className="danger" onClick={() => cancelSchoolDay(selectedKey)} aria-label={`Cancel school on ${selectedKey}`}>Cancel this day</button></> : event.recurringSeries ? <><button onClick={() => editEvent(event)} aria-label={`Edit ${event.title} series`}>Edit series</button><button onClick={() => skipRecurringOccurrence(event)} aria-label={`Skip ${event.title} on ${selectedKey}`}>Skip this day</button><button className="danger" onClick={() => deleteEvent(event.id)} aria-label={`Delete ${event.title} series`}>Delete series</button></> : <><button onClick={() => editEvent(event)} aria-label={`Edit ${event.title}`}>Edit</button><button className="danger" onClick={() => deleteEvent(event.id)} aria-label={`Delete ${event.title}`}>Delete</button></>}</div></article>)}</div> : !selectedSchoolCanceled && <div className="agenda-empty"><span>＋</span><h3>Nothing scheduled.</h3><p>Add a workout, practice, or game—or import your school year.</p></div>}</>}
      </aside>
    </section>
  </Shell>;
}

function BarcodeScanner({ onAdd, onClose }) {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState(null);
  const [servingGrams, setServingGrams] = useState(100);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState('');
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const scanTimerRef = useRef(null);
  const cameraRunningRef = useRef(false);
  const decodingRef = useRef(false);

  function stopCamera() {
    cameraRunningRef.current = false;
    window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = null;
    const stream = streamRef.current || videoRef.current?.srcObject;
    if (stream?.getTracks) stream.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }

  useEffect(() => () => {
    cameraRunningRef.current = false;
    window.clearTimeout(scanTimerRef.current);
    const stream = streamRef.current || videoRef.current?.srcObject;
    if (stream?.getTracks) stream.getTracks().forEach((track) => track.stop());
  }, []);

  function getDetector() {
    if (!detectorRef.current) {
      detectorRef.current = new WasmBarcodeDetector({
        formats: ['ean_8', 'ean_13', 'upc_a', 'upc_e', 'code_128'],
      });
    }
    return detectorRef.current;
  }

  async function scanCameraFrame() {
    if (!cameraRunningRef.current || decodingRef.current || !videoRef.current?.videoWidth) return;
    decodingRef.current = true;
    try {
      const results = await getDetector().detect(videoRef.current);
      const detectedBarcode = results.find((result) => /^\d{8,14}$/.test(result.rawValue))?.rawValue;
      if (detectedBarcode) {
        stopCamera();
        await lookupBarcode(detectedBarcode);
        return;
      }
    } catch {
      // A frame without a readable barcode is expected while the camera is moving.
    } finally {
      decodingRef.current = false;
    }
    if (cameraRunningRef.current) {
      scanTimerRef.current = window.setTimeout(scanCameraFrame, 220);
    }
  }

  async function lookupBarcode(value) {
    const cleanBarcode = String(value).replace(/\D/g, '');
    if (cleanBarcode.length < 8 || cleanBarcode.length > 14) {
      setError('Enter a valid 8–14 digit product barcode.');
      return;
    }

    setBarcode(cleanBarcode);
    setProduct(null);
    setError('');
    setLoading(true);
    try {
      const fields = 'code,product_name,brands,serving_size,serving_quantity,nutriments,image_front_small_url';
      const response = await fetch(`https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(cleanBarcode)}?fields=${fields}`);
      if (!response.ok) throw new Error('Product not found.');
      const data = await response.json();
      const item = data.product;
      const caloriesPer100g = Number(item?.nutriments?.['energy-kcal_100g']);
      if (!item || !Number.isFinite(caloriesPer100g)) throw new Error('This product does not have usable calorie information.');
      const suggestedServing = Number(item.serving_quantity);
      setServingGrams(Number.isFinite(suggestedServing) && suggestedServing > 0 ? suggestedServing : 100);
      setProduct({
        barcode: cleanBarcode,
        name: item.product_name || 'Scanned product',
        brand: item.brands || '',
        image: item.image_front_small_url || '',
        servingSize: item.serving_size || '',
        caloriesPer100g,
      });
    } catch (lookupError) {
      setError(lookupError.message || 'We could not look up that barcode.');
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is unavailable here. Enter the barcode manually instead.');
      return;
    }

    try {
      setCapturedImage('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      cameraRunningRef.current = true;
      setCameraActive(true);
      scanTimerRef.current = window.setTimeout(scanCameraFrame, 100);
    } catch {
      stopCamera();
      setError('Camera access was not available. Allow camera permission or enter the barcode manually.');
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!cameraActive || !video?.videoWidth || !video?.videoHeight) {
      setError('Start the camera and wait for the preview before taking a photo.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));
    stopCamera();
    setProduct(null);
    setError('');
    setLoading(true);
    try {
      const results = await getDetector().detect(canvas);
      const detectedBarcode = results.find((result) => /^\d{8,14}$/.test(result.rawValue))?.rawValue;
      if (!detectedBarcode) throw new Error('No retail barcode found.');
      await lookupBarcode(detectedBarcode);
    } catch {
      setError('No product barcode was found in the captured frame. Keep the full barcode sharp, level, and inside the guide.');
    } finally {
      setLoading(false);
    }
  }

  const calculatedCalories = product ? Math.max(Math.round(product.caloriesPer100g * Number(servingGrams || 0) / 100), 0) : 0;

  return <section className="card scanner-card"><div className="scanner-head"><div><div className="section-label">BARCODE MEAL ENTRY</div><h3>Scan a packaged food</h3></div><button className="scanner-close" onClick={() => { stopCamera(); onClose(); }} aria-label="Close barcode scanner">×</button></div><div className="scanner-grid"><div><div className={`camera-frame${cameraActive || capturedImage ? ' active' : ''}`}><video ref={videoRef} muted playsInline />{capturedImage && <img className="captured-frame" src={capturedImage} alt="Captured barcode frame" />}<div className="scan-guide"><span /><p>{cameraActive ? 'Keep the bars level and fill the frame' : capturedImage ? 'Photo captured' : 'Camera preview'}</p></div></div><div className="scanner-camera-actions"><button className="camera-button" onClick={cameraActive ? stopCamera : startCamera}>{cameraActive ? 'Stop camera' : 'Use camera'}</button><button className="capture-button" onClick={capturePhoto} disabled={!cameraActive || loading}>{loading ? 'Scanning…' : 'Take photo'}</button></div><p className="scanner-note">Start the camera, center the entire barcode inside the guide, then take a photo. You can also enter the printed number.</p></div><div className="scanner-lookup"><form onSubmit={(event) => { event.preventDefault(); lookupBarcode(barcode); }}><label>Barcode number<input inputMode="numeric" pattern="[0-9]*" value={barcode} onChange={(event) => setBarcode(event.target.value.replace(/\D/g, ''))} placeholder="Enter 8–14 digits" /></label><button className="primary small" type="submit" disabled={loading}>{loading ? 'Scanning…' : 'Look up product'}</button></form>{error && <div className="scanner-error">{error}</div>}{product && <div className="product-result">{product.image ? <img src={product.image} alt="" /> : <div className="product-placeholder">▣</div>}<div className="product-details"><span>{product.brand || 'Packaged food'}</span><h3>{product.name}</h3><p>{product.caloriesPer100g.toLocaleString()} kcal per 100g{product.servingSize ? ` · Label serving: ${product.servingSize}` : ''}</p><label>Serving amount<div className="serving-input"><input type="number" min="1" max="2000" value={servingGrams} onChange={(event) => setServingGrams(event.target.value)} /><span>grams</span></div></label><div className="product-calories"><span>Calories to add</span><strong>{calculatedCalories.toLocaleString()} kcal</strong></div><button className="primary" disabled={!calculatedCalories} onClick={() => onAdd({ name: product.brand ? `${product.name} — ${product.brand}` : product.name, calories: calculatedCalories, barcode: product.barcode, servingGrams: Number(servingGrams) })}>Add to today <span>→</span></button></div></div>}</div></div><p className="data-disclaimer">Product and nutrition data are provided by the Open Food Facts community and may be incomplete. Check the package label before logging.</p></section>;
}

function HydrationTracker({ water, setHydration, guidance }) {
  function addWater(amount) {
    setHydration((hydration) => ({ ...hydration, water: Math.max((hydration.water || 0) + amount, 0) }));
  }

  return <section className="card hydration-card"><div className="hydration-copy"><div className="section-label">HYDRATION CHECK-IN</div><div className="water-title"><div className="water-icon">◒</div><div><h2>{water.toLocaleString()} <small>oz logged today</small></h2><p>{guidance.event ? `Bring fluids for ${guidance.event.title}. Sip regularly and follow your team or clinician’s plan.` : 'Keep water available and drink regularly through the day.'}</p></div></div></div><div className="hydration-actions"><div className="water-quick-add">{[8, 12, 16, 24].map((amount) => <button key={amount} onClick={() => addWater(amount)}>+{amount} oz</button>)}</div><div className="water-secondary"><button onClick={() => addWater(-8)} disabled={water === 0}>Undo 8 oz</button><span>No prescribed target</span></div></div></section>;
}

function WeeklyProgress({ dailyLogs, todayKey, onNavigate }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date(`${todayKey}T12:00:00`);
  const weekStart = addDays(today, -6 + weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const key = getDateKey(date);
    const log = dailyLogs[key] || { entries: [], water: 0 };
    return { date, key, checkIns: log.entries.length, hasEntries: log.entries.length > 0, water: log.water || 0 };
  });
  const weeklyCheckIns = days.reduce((sum, day) => sum + day.checkIns, 0);
  const weeklyWater = days.reduce((sum, day) => sum + day.water, 0);
  const loggedDays = days.filter((day) => day.hasEntries).length;
  const hydrationDays = days.filter((day) => day.water > 0).length;
  const range = `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(days[0].date)} – ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(days[6].date)}`;
  const maxCheckIns = Math.max(...days.map((item) => item.checkIns), 4);
  const maxWater = Math.max(...days.map((item) => item.water), 64);

  let streak = 0;
  let streakDate = new Date(today);
  if (!(dailyLogs[todayKey]?.entries?.length > 0)) streakDate = addDays(streakDate, -1);
  while (dailyLogs[getDateKey(streakDate)]?.entries?.length > 0) {
    streak += 1;
    streakDate = addDays(streakDate, -1);
  }

  return <Shell eyebrow="NOURALLY / WEEKLY PROGRESS">
    <section className="dashboard-head weekly-head"><div><p className="kicker">YOUR SEVEN-DAY VIEW</p><h1>Patterns, not<br /><em>perfect numbers.</em></h1></div><AppNavigation active="weekly" onNavigate={onNavigate} /></section>
    <section className="week-toolbar"><button className="week-arrow" onClick={() => setWeekOffset((offset) => offset - 1)} aria-label="Previous seven days">←</button><div><strong>{weekOffset === 0 ? 'Last 7 days' : range}</strong><span>{range}</span></div><button className="week-arrow" disabled={weekOffset === 0} onClick={() => setWeekOffset((offset) => Math.min(offset + 1, 0))} aria-label="Next seven days">→</button></section>
    <section className="weekly-stats"><article className="card weekly-stat"><span>Food check-ins</span><strong>{weeklyCheckIns}</strong><small>this period</small></article><article className="card weekly-stat"><span>Days reflected</span><strong>{loggedDays}<i>/7</i></strong><small>days</small></article><article className="card weekly-stat"><span>Hydration check-ins</span><strong>{hydrationDays}<i>/7</i></strong><small>days</small></article><article className="card weekly-stat"><span>Logging streak</span><strong>{streak}</strong><small>{streak === 1 ? 'day' : 'days'}</small></article><article className="card weekly-stat"><span>Water logged</span><strong>{weeklyWater}</strong><small>oz total</small></article></section>
    <section className="card weekly-chart-card"><div className="chart-heading"><div><div className="section-label">FOOD CHECK-INS BY DAY</div><h2>{weeklyCheckIns} <small>moments captured over 7 days</small></h2></div><div className="chart-key"><span><i className="key-fill" /> Check-ins</span></div></div><div className="weekly-chart">{days.map((day) => <div className={`chart-day${day.key === todayKey ? ' today' : ''}`} key={day.key}><div className="bar-value">{day.checkIns || '—'}</div><div className="bar-track"><span style={{ height: `${Math.min((day.checkIns / maxCheckIns) * 100, 100)}%` }} /></div><strong>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day.date)}</strong><small>{day.date.getDate()}</small></div>)}</div>{weeklyCheckIns === 0 && <p className="chart-empty">Use food check-ins to notice where busy days make fueling harder.</p>}</section>
    <section className="card weekly-water-card"><div className="chart-heading"><div><div className="section-label">HYDRATION BY DAY</div><h2>{weeklyWater.toLocaleString()} <small>oz logged over 7 days</small></h2></div></div><div className="water-week">{days.map((day) => <div className={`water-day${day.key === todayKey ? ' today' : ''}`} key={day.key}><div className="water-day-label"><strong>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day.date)}</strong><span>{day.water} oz</span></div><div><span style={{ width: `${Math.min((day.water / maxWater) * 100, 100)}%` }} /></div></div>)}</div></section>
    <p className="weekly-safety">These summaries show what you logged; they do not grade intake or set a medical target.</p>
  </Shell>;
}

function History({ dailyLogs, todayKey, onNavigate }) {
  const dates = Object.keys(dailyLogs).filter((date) => date !== todayKey).sort().reverse();
  return <Shell eyebrow="NOURALLY / HISTORY">
    <section className="dashboard-head history-head"><div><p className="kicker">YOUR DAILY RECORD</p><h1>Look back.<br /><em>Keep learning.</em></h1></div><AppNavigation active="history" onNavigate={onNavigate} /></section>
    {dates.length === 0 ? <section className="card history-empty"><div className="section-label">PREVIOUS DAYS</div><h2>Your history starts tomorrow.</h2><p className="muted">Today’s check-ins stay on this device and appear here on the next calendar day.</p></section> : <section className="history-list">{dates.map((date) => {
      const log = dailyLogs[date];
      const water = log.water || 0;
      const formattedDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
      return <article className="card history-day" key={date}><div className="history-day-head"><div><p className="kicker">{formattedDate.toUpperCase()}</p><h2>{log.entries.length} <small>{log.entries.length === 1 ? 'food check-in' : 'food check-ins'}</small></h2></div><span className="goal-badge reached">Day reflected</span></div><div className="history-water"><div><span>Water logged</span><strong>{water.toLocaleString()} oz</strong></div></div><div className="history-entries">{log.entries.length ? log.entries.map((entry) => <div key={entry.id}><span>{entry.name}</span><strong>{entry.calories > 0 ? `${entry.calories.toLocaleString()} kcal` : entry.time || 'Checked in'}</strong></div>) : <p className="muted">No food check-ins were logged.</p>}</div></article>;
    })}</section>}
  </Shell>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
