// P2-06 / KEEP-01: the rule behind each Now card state, with its sources and
// the date each source was last opened and read. Rules stay general ("a
// snack", "a meal"): no amounts, no targets. Where no source names the app's
// exact cutoff (30, 90 and 180 minutes before, the 75-minute "during" trigger,
// 90 minutes of recovery, 7:00 PM, 9:30 PM), the rule says it is Nourally's
// own cutoff and cites the ranges the sources do give.

const CHECKED = "2026-10-11";

/** @typedef {{title: string, publisher: string, url: string}} Source */

/** @type {Record<string, Source>} */
export const SOURCES = {
  // Pre-exercise carbs 1–4 h before; under 45 min little or no carbs, 45–75
  // min small amounts, over 60 min carbs during; protein 0–2 h after; fluids
  // before exercise, pale urine. Same paper as PubMed 26920240.
  position: {
    title: "Nutrition and Athletic Performance",
    publisher:
      "Dietitians of Canada, Academy of Nutrition and Dietetics, American College of Sports Medicine",
    url: "https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf?ext=.pdf",
  },
  // Energy drinks have no place for children or teens; water first for most
  // exercise; sports drinks only for prolonged, vigorous activity (no minute
  // threshold). Pediatrics 2011;127:1182, PubMed 21624882.
  drinks: {
    title:
      "Sports Drinks and Energy Drinks for Children and Adolescents: Are They Appropriate?",
    publisher: "American Academy of Pediatrics",
    url: "https://www.alabamapublichealth.gov/awa/assets/pediatricsjournal_sportsdrinks.pdf",
  },
  // Start exercise well hydrated; sessions over about an hour may benefit from
  // added carbs and electrolytes; eat and drink within 2 h after.
  fluids: {
    title: "Fluid Replacement for the Physically Active",
    publisher: "National Athletic Trainers' Association",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5634236/",
  },
  // Meal 3–4 h before; with 3 h or less, a lighter snack with easy carbs;
  // water usually enough, sports drinks past about 60–90 min or in heat; no
  // energy drinks; eat within 30 min after hard exercise and again ~2 h later.
  teens: {
    title: "A Guide to Eating for Sports (for Teens)",
    publisher: "Nemours KidsHealth",
    url: "https://kidshealth.org/en/teens/eatnrun.html",
  },
  // Eat about every 3 h; keep portable food on hand for long days; water under
  // 1 h, sports drinks past 1–2 h or heat; no energy drinks; carbs + protein
  // within 30–60 min after practice; plan extra food for tournaments.
  families: {
    title: "Sports Nutrition for Busy Families and Busy Lifestyles",
    publisher: "HealthyChildren.org, American Academy of Pediatrics",
    url: "https://www.healthychildren.org/English/healthy-living/nutrition/Pages/Sports-Nutrition-for-Busy-Families-and-Busy-Lifestyles.aspx",
  },
  // Meal 3–4 h before; small snack 30–60 min before, lighter as game time
  // nears; water under 60 min; don't skip lunch on game days; balanced dinner
  // after games; keep packed perishables cold.
  gameday: {
    title: "Gameday Nutrition Tips for Young Athletes",
    publisher: "Academy of Nutrition and Dietetics (eatright.org)",
    url: "https://www.eatright.org/fitness/sports-and-athletic-performance/beginner-and-intermediate/8-gameday-nutrition-tips-for-young-athletes",
  },
  // Regular breakfast, a full lunch at school, an easy snack before
  // after-school practice; 3 meals and 1–3 snacks; skipping meals adds up.
  regular: {
    title: "Preventing Relative Energy Deficiency in Young Athletes",
    publisher: "Academy of Nutrition and Dietetics (eatright.org)",
    url: "https://www.eatright.org/fitness/sports-and-athletic-performance/beginner-and-intermediate/preventing-relative-energy-deficiency-in-young-female-athletes",
  },
  // Meal 3–4 h before, snack 1–2 h before; recovery carbs in the first 1–2 h.
  performance: {
    title: "Sporting performance and food",
    publisher: "Better Health Channel, Victorian Government",
    url: "https://www.betterhealth.vic.gov.au/health/healthyliving/sporting-performance-and-food",
  },
  // Pack carb + protein snacks, keep the usual eating schedule, eat familiar
  // foods, drink water while travelling.
  travel: {
    title: "The Traveling Athlete",
    publisher: "Stanford Medicine Children's Health",
    url: "https://www.stanfordchildrens.org/content-public/pdf/sports-travel-nutrition-stanford-childrens.pdf",
  },
  // Rest days: keep a regular eating pattern, protein at each meal, don't cut
  // carbs out, check hydration with urine colour.
  rest: {
    title: "5 tips to nail your nutrition on rest days",
    publisher: "NSW Institute of Sport",
    url: "https://www.nswis.com.au/nswis-news/5-tips-to-nail-your-nutrition-on-rest-days/",
  },
};

/**
 * @param {string} rule
 * @param {Source[]} sources
 */
const entry = (rule, sources) => ({ rule, sources, checked: CHECKED });

const S = SOURCES;

/** @type {Record<string, {rule: string, sources: Source[], checked: string}>} */
export const RULES = {
  setup: entry(
    "What to eat and when depends on how soon you train, so there is no timing tip yet. Add school and sports to get one.",
    [S.position, S.teens],
  ),
  no_sport: entry(
    "On days without sport, regular meals and snacks keep your energy steady. Eating about every 3 hours is a common rhythm for young athletes.",
    [S.families, S.regular],
  ),
  rest: entry(
    "Rest days are for recovery, so keep your regular meals and snacks. Keep drinking water too.",
    [S.rest, S.regular],
  ),
  before_school: entry(
    "Packing food in the morning means you have an easy snack before after-school practice. Breakfast and a full lunch help on practice days too.",
    [S.regular, S.families],
  ),
  plan_ahead: entry(
    "A meal needs about 3 to 4 hours before sport, and a smaller snack fits closer to the start. Choosing more than 3 hours out is Nourally's own cutoff, based on those times.",
    [S.teens, S.gameday, S.position],
  ),
  meal_window: entry(
    "With 3 hours or less to go, a lighter meal or a snack with easy carbs digests better than a big meal. The 90-minute to 3-hour window is Nourally's own cutoff, based on these guides.",
    [S.teens, S.performance, S.position],
  ),
  pre: entry(
    "A small, familiar snack 30 minutes to 2 hours before gives energy without feeling full. Nourally's 30 to 90 minute window is its own cutoff inside those ranges.",
    [S.gameday, S.performance],
  ),
  quick: entry(
    "Close to the start there is little time to digest, so keep food light and have a few sips of water. The 30-minute mark is Nourally's own cutoff.",
    [S.gameday, S.teens, S.fluids],
  ),
  during: entry(
    "Water is enough for most practices under about an hour; longer or harder sessions can use a familiar carb or sports drink. Nourally's 75-minute trigger is its own cutoff, not a youth guideline.",
    [S.drinks, S.teens, S.position],
  ),
  recovery: entry(
    "After sport, carbs, protein and fluids help you recover, and guides say to eat within 30 minutes to 2 hours. Showing this for 90 minutes after you finish is Nourally's own cutoff.",
    [S.teens, S.families, S.fluids],
  ),
  travel: entry(
    "For away events, pack familiar snacks and water so you can keep your usual eating times. Showing this 90 minutes before you leave is Nourally's own cutoff.",
    [S.travel, S.families],
  ),
  school_window: entry(
    "Using your school's lunch and snack times keeps your eating regular through the day. A full lunch helps on practice days.",
    [S.regular, S.families],
  ),
  game: entry(
    "Game days use the same timing as practice: a meal 3 to 4 hours before and a light snack closer to the start. Keep lunch on game days and plan extra snacks for tournaments.",
    [S.gameday, S.families],
  ),
  evening: entry(
    "Getting food, water and gear ready tonight makes tomorrow's eating times easier, and cold foods stay fresher in the fridge or a cooler. Showing this from 7:00 PM is Nourally's own choice.",
    [S.gameday, S.families],
  ),
  late: entry(
    "Nothing is on tomorrow's schedule, so there is no timing tip after 9:30 PM, Nourally's own cutoff. Regular meals still matter on quiet days.",
    [S.regular],
  ),
};

/**
 * The rules behind the current Now card: the state's rule first, then the
 * school eating-time and game-day rules when they shape the card.
 * @param {{state: string, activeSchoolWindow?: any, gameDay?: boolean}} guidance
 */
export function rulesFor(guidance) {
  const keys = [guidance.state];
  if (
    guidance.activeSchoolWindow &&
    !["during", "recovery"].includes(guidance.state)
  )
    keys.push("school_window");
  if (guidance.gameDay) keys.push("game");
  return keys
    .filter((key) => RULES[key])
    .map((key) => ({ key, ...RULES[key] }));
}
