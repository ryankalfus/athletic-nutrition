import { useState } from "react";
import { changeData } from "../../store.js";
import { LabelCheck } from "../../components/ui/LabelCheck.jsx";
import { DIET_CHOICES, DISLIKE_CHOICES } from "../../domain/you.js";
import { SettingsSheet, toggle } from "./SettingsSheet.jsx";
import { ChipGroup } from "../../components/ui/SelectionControls.jsx";

const LEGACY_NOTICES = [
  ["nutFree", "Nut-free"],
  ["glutenFree", "Gluten-free"],
  ["dairyFree", "Dairy-free"],
];

// You › Food needs & allergies (YOU-02, YOU-03). No Gluten-free, Nut-free or
// Dairy-free chip and no allergy filter until reviewed per-ingredient allergen
// tags exist (P0-06, P1-09); the sheet says so plainly.
export function FoodNeedsSheet({ profile, onClose }) {
  const initial = {
    dietaryNeeds: profile.dietaryNeeds || [],
    dislikes: profile.dislikes || [],
  };
  const [draft, setDraft] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  return (
    <SettingsSheet
      title="Food needs & allergies"
      dirty={dirty}
      onClose={onClose}
      onSave={() =>
        changeData((data) => {
          data.profile.dietaryNeeds = draft.dietaryNeeds;
          data.profile.dislikes = draft.dislikes;
        }, null)
      }
    >
      <section className="you-allergies" aria-labelledby="you-allergies-title">
        <h3 id="you-allergies-title">Allergies</h3>
        <p className="muted">
          Allergy filters aren&apos;t ready yet. Ideas don&apos;t hide foods by
          allergy.
        </p>
        <LabelCheck />
      </section>
      <ChipGroup
        legend="I don't eat"
        options={DIET_CHOICES}
        selected={draft.dietaryNeeds}
        onToggle={(value) =>
          setDraft({
            ...draft,
            dietaryNeeds: toggle(draft.dietaryNeeds, value),
          })
        }
      />
      {LEGACY_NOTICES.filter(([id]) => draft.dietaryNeeds.includes(id)).map(
        ([id, label]) => (
          <p role="status" key={id}>
            Your earlier {label} choice no longer filters foods. Review each
            label and discuss allergy needs with a qualified professional.
          </p>
        ),
      )}
      <ChipGroup
        legend="Not a fan of"
        hint="Ideas that use these are hidden. This is not an allergy filter."
        options={DISLIKE_CHOICES}
        selected={draft.dislikes}
        onToggle={(value) =>
          setDraft({ ...draft, dislikes: toggle(draft.dislikes, value) })
        }
      />
    </SettingsSheet>
  );
}
