import { useState } from "react";
import { changeData } from "../../store.js";
import { normalizeSport } from "../../domain/sport.js";
import { SEASONS } from "../../domain/you.js";
import { SportField } from "./SportField.jsx";
import { SettingsSheet } from "./SettingsSheet.jsx";

// You › Sport & season (ADD-09). Names only; no sport-specific nutrition.
export function SportSheet({ profile, onClose }) {
  const initial = { sport: profile.sport || "", season: profile.season || "" };
  const [draft, setDraft] = useState(initial);
  const dirty =
    normalizeSport(draft.sport) !== normalizeSport(initial.sport) ||
    draft.season !== initial.season;
  return (
    <SettingsSheet
      title="Sport & season"
      dirty={dirty}
      onClose={onClose}
      onSave={() =>
        changeData((data) => {
          data.profile.sport = normalizeSport(draft.sport);
          data.profile.season = draft.season;
        }, null)
      }
    >
      <SportField
        value={draft.sport}
        onChange={(sport) => setDraft({ ...draft, sport })}
      />
      <fieldset className="choice-field">
        <legend>
          Season <span className="optional-label">Optional</span>
        </legend>
        <div className="choice-grid" role="radiogroup" aria-label="Season">
          {SEASONS.map(([value, label]) => (
            <button
              type="button"
              role="radio"
              key={value}
              aria-checked={draft.season === value}
              className={draft.season === value ? "selected" : ""}
              onClick={() =>
                setDraft({
                  ...draft,
                  season: draft.season === value ? "" : value,
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
    </SettingsSheet>
  );
}
