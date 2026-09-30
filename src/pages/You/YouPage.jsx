import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Shell } from "../../components/AppFrame.jsx";
import { setSignedOut, useStore } from "../../store.js";
import {
  notificationPermission,
  reminderSummary,
} from "../../domain/reminders.js";
import {
  accessSummary,
  athleteName,
  hasAthleteName,
  lastBackupText,
  needsSummary,
  sportSummary,
} from "../../domain/you.js";
import { SportSheet } from "./SportSheet.jsx";
import { FoodNeedsSheet } from "./FoodNeedsSheet.jsx";
import { AccessSheet } from "./AccessSheet.jsx";
import { RemindersSheet } from "./RemindersSheet.jsx";
import { AthleteNameSheet } from "./AthleteNameSheet.jsx";
import { DevicePage } from "./DevicePage.jsx";
import { AboutPage } from "./AboutPage.jsx";
import { Avatar } from "../../components/ui/Avatar.jsx";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// You (6.13, YOU-01): athlete header, then one settings list. Each row opens
// a sheet (#/you/sport, needs, access, reminders) or a sub-page (#/you/device,
// #/you/about).
export default function YouPage({ subroute, onNavigate }) {
  const state = useStore();
  const [adding, setAdding] = useState(false);
  const [naming, setNaming] = useState(false);
  if (subroute === "device") return <DevicePage onNavigate={onNavigate} />;
  if (subroute === "about") return <AboutPage onNavigate={onNavigate} />;
  const data = state.current.data;
  const { profile } = data;
  const name = athleteName(state.current);
  const athletes = Object.keys(state.doc.profiles).length;
  const close = () => onNavigate("you");
  const rows = [
    ["sport", "Sport & season", sportSummary(profile)],
    ["needs", "Food needs & allergies", needsSummary(profile)],
    [
      "access",
      "Food access & budget",
      accessSummary(profile, data.schoolSchedule),
    ],
    [
      "reminders",
      "Reminders",
      reminderSummary(data.reminderSettings, notificationPermission()),
    ],
    [
      "device",
      "This device",
      `${plural(athletes, "athlete")} · ${lastBackupText(profile.lastBackupAt).replace(/ \(.*\)$|\.$/g, "")}`,
    ],
    ["about", "About Nourally's guidance", "What Nourally does and doesn't do"],
  ];
  return (
    <Shell onNavigate={onNavigate}>
      <div className="you-page">
        <h1 className="page-title">You</h1>
        <section className="you-athlete" aria-label="Athlete">
          <Avatar name={name} className="you-avatar" />
          <div>
            <p className="you-athlete-name">{name}</p>
            {hasAthleteName(state.current) ? (
              <p className="muted">{profile.sport || "No sport set"}</p>
            ) : (
              <button
                type="button"
                className="text-button"
                onClick={() => setNaming(true)}
              >
                Add your name
              </button>
            )}
          </div>
          {athletes > 1 ? (
            <button
              type="button"
              className="you-secondary"
              onClick={() => setSignedOut(true)}
            >
              Switch athlete
            </button>
          ) : (
            <button
              type="button"
              className="you-secondary"
              onClick={() => setAdding(true)}
            >
              Add another athlete
            </button>
          )}
        </section>
        <ul className="you-list" aria-label="Settings">
          {rows.map(([id, title, summary]) => (
            <li key={id}>
              <a href={`#/you/${id}`} aria-label={`${title} — ${summary}`}>
                <span>
                  <strong>{title}</strong>
                  <span className="you-summary">{summary}</span>
                </span>
                <ChevronRight size={20} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
      {subroute === "sport" && <SportSheet profile={profile} onClose={close} />}
      {subroute === "needs" && (
        <FoodNeedsSheet profile={profile} onClose={close} />
      )}
      {subroute === "access" && (
        <AccessSheet data={data} onClose={close} onNavigate={onNavigate} />
      )}
      {subroute === "reminders" && (
        <RemindersSheet settings={data.reminderSettings} onClose={close} />
      )}
      {adding && <AthleteNameSheet onClose={() => setAdding(false)} />}
      {naming && (
        <AthleteNameSheet
          athlete={{ id: state.current.id, name: "" }}
          onClose={() => setNaming(false)}
        />
      )}
    </Shell>
  );
}
