import { useState } from "react";
import { changeDataUndoable } from "../../store.js";
import { normalizeSport } from "../../domain/sport.js";
import { saveSportSeason, sportStepProblem } from "../../domain/setup.js";
import { SEASONS } from "../../domain/you.js";
import { SportField } from "./SportField.jsx";
import { SettingsSheet } from "./SettingsSheet.jsx";
import { SegmentedControl } from "../../components/ui/SelectionControls.jsx";

// You › Sport & season (ADD-09). Names only; no sport-specific nutrition.
// Sport is required, as in setup step 1 (UX-BUG-01).
export function SportSheet({ profile, onClose }) {
  const initial = { sport: profile.sport || "", season: profile.season || "" };
  const [draft, setDraft] = useState(initial);
  const dirty =
    normalizeSport(draft.sport) !== normalizeSport(initial.sport) ||
    draft.season !== initial.season;
  return (
    <SettingsSheet
      title="Sport & season"
      savedToast="Sport & season saved."
      dirty={dirty}
      onClose={onClose}
      values={draft}
      validate={sportStepProblem}
      onSave={() =>
        sportStepProblem(draft) ||
        changeDataUndoable((data) => {
          saveSportSeason(data.profile, draft);
        })
      }
    >
      <SportField
        required
        value={draft.sport}
        onChange={(sport) => setDraft({ ...draft, sport })}
      />
      <fieldset className="choice-field">
        <legend>
          Season <span className="optional-label">Optional</span>
        </legend>
        <SegmentedControl
          label="Season"
          options={SEASONS}
          value={draft.season}
          onChange={(value) =>
            setDraft({
              ...draft,
              season: draft.season === value ? "" : value,
            })
          }
        />
      </fieldset>
    </SettingsSheet>
  );
}
