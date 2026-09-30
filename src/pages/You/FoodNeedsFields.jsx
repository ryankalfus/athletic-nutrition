import { ALLERGY_TAGS_REVIEWED } from "../../domain/catalog.js";
import {
  ALLERGY_CHOICES,
  ALLERGY_WAITING,
  OTHER_ALLERGY_LINE,
  allergyStatusLine,
  legacyAllergyNotice,
} from "../../domain/allergens.js";
import { DIET_CHOICES, DISLIKE_CHOICES } from "../../domain/you.js";
import { LabelCheck } from "../../components/ui/LabelCheck.jsx";
import { ChipGroup } from "../../components/ui/SelectionControls.jsx";
import { toggle } from "./SettingsSheet.jsx";

// Allergies, "I don't eat" and "Not a fan of" (YOU-02, ONB step 5). Shared by
// You › Food needs & allergies and setup. The allergy chips appear only when
// the allergen tags are approved (ALLERGY_TAGS_REVIEWED, P1-09); until then
// the section shows the waiting line.
export function FoodNeedsFields({
  draft,
  onChange,
  reviewed = ALLERGY_TAGS_REVIEWED,
  allergyHint = "Pick every allergy. Ideas that list these foods are hidden.",
  headingLevel = 3,
}) {
  // h3 under a sheet's h2; setup passes 2 because the step title is the h1.
  const Heading = `h${headingLevel}`;
  const allergies = draft.allergies || [];
  const status = allergyStatusLine(draft, reviewed);
  const legacy = legacyAllergyNotice(draft, reviewed);
  return (
    <>
      <section
        className="you-allergies"
        aria-labelledby={reviewed ? undefined : "you-allergies-title"}
      >
        {reviewed ? (
          <>
            <ChipGroup
              legend="Allergies"
              hint={allergyHint}
              options={ALLERGY_CHOICES}
              selected={allergies}
              onToggle={(value) =>
                onChange({ ...draft, allergies: toggle(allergies, value) })
              }
            />
            {status && <p role="status">{status}</p>}
            {allergies.includes("other") && <p>{OTHER_ALLERGY_LINE}</p>}
            {legacy && (
              <p className="label-check" role="status">
                {legacy}
              </p>
            )}
            <LabelCheck />
          </>
        ) : (
          <>
            <Heading id="you-allergies-title">Allergies</Heading>
            {/* One warning notice: the waiting line and any legacy choice. */}
            <div className="label-check" role={legacy ? "status" : undefined}>
              <p>{ALLERGY_WAITING}</p>
              {legacy && <p>{legacy}</p>}
            </div>
          </>
        )}
      </section>
      <ChipGroup
        legend="I don't eat"
        options={DIET_CHOICES}
        selected={draft.dietaryNeeds}
        onToggle={(value) =>
          onChange({
            ...draft,
            dietaryNeeds: toggle(draft.dietaryNeeds, value),
          })
        }
      />
      <ChipGroup
        legend="Not a fan of"
        hint="Ideas that use these are hidden. This is not an allergy filter."
        options={DISLIKE_CHOICES}
        selected={draft.dislikes}
        onToggle={(value) =>
          onChange({ ...draft, dislikes: toggle(draft.dislikes, value) })
        }
      />
    </>
  );
}
