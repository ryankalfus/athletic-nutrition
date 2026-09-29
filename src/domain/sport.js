export const SPORT_SUGGESTIONS = [
  "Soccer",
  "Basketball",
  "Football",
  "Volleyball",
  "Baseball",
  "Softball",
  "Track",
  "Cross country",
  "Swimming",
  "Tennis",
  "Wrestling",
  "Lacrosse",
  "Hockey",
];

// A sport is free text the athlete types; keep it short and trimmed.
export function normalizeSport(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 40);
}

const TYPE_WORDS = {
  practice: "practice",
  game: "game",
  workout: "workout",
  other: "activity",
};

// SCH-09: "Soccer practice" when the athlete's sport is soccer.
export function activityTitle(sport, type = "practice") {
  const name = normalizeSport(sport);
  const word = TYPE_WORDS[type] || String(type || "activity").toLowerCase();
  const title = name ? `${name.toLowerCase()} ${word}` : word;
  return `${title[0].toUpperCase()}${title.slice(1)}`;
}
