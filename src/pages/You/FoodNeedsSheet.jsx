import { useState } from "react";
import { changeData } from "../../store.js";
import { SettingsSheet } from "./SettingsSheet.jsx";
import { FoodNeedsFields } from "./FoodNeedsFields.jsx";

// You › Food needs & allergies (YOU-02, YOU-03). No Gluten-free, Nut-free or
// Dairy-free chip. Allergy chips show only once the allergen tags are
// reviewed (ALLERGY_TAGS_REVIEWED, P1-09); FoodNeedsFields handles the gate.
export function FoodNeedsSheet({ profile, onClose }) {
  const initial = {
    allergies: profile.allergies || [],
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
          data.profile.allergies = draft.allergies;
          data.profile.dietaryNeeds = draft.dietaryNeeds;
          data.profile.dislikes = draft.dislikes;
        }, null)
      }
    >
      <FoodNeedsFields draft={draft} onChange={setDraft} />
    </SettingsSheet>
  );
}
