import { useState } from "react";
import { changeData } from "../../store.js";
import { FOOD_SOURCES, SCHOOL_ACCESS, parseBudget } from "../../domain/you.js";
import { lowCostOn } from "../../domain/ranking.js";
import { SettingsSheet, toggle } from "./SettingsSheet.jsx";
import {
  ChipGroup,
  SwitchRow,
} from "../../components/ui/SelectionControls.jsx";

// You › Food access & budget (YOU-04). Price estimates default off (GROC-05).
export function AccessSheet({ data, onClose, onNavigate }) {
  const { profile, groceryState, schoolSchedule } = data;
  const initial = {
    foodSources: profile.foodSources || [],
    school: schoolSchedule?.foodAccess || {},
    familyPrep: Boolean(profile.familyPrep),
    lowCostIdeas: lowCostOn(profile),
    showPrices: Boolean(groceryState?.showPrices),
    budget:
      groceryState?.budgetAmount == null
        ? ""
        : String(groceryState.budgetAmount),
  };
  const [draft, setDraft] = useState(initial);
  const set = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const budget = parseBudget(draft.budget);
  return (
    <SettingsSheet
      title="Food access & budget"
      dirty={dirty}
      onClose={onClose}
      onSave={async () => {
        if (!draft.foodSources.length)
          return "Choose at least one place you can get food.";
        if (budget.error) return budget.error;
        return changeData((next) => {
          next.profile.foodSources = draft.foodSources;
          next.profile.familyPrep = draft.familyPrep;
          next.profile.lowCostIdeas = draft.lowCostIdeas;
          next.profile.budget = draft.lowCostIdeas ? "save" : "standard";
          next.groceryState.showPrices = draft.showPrices;
          next.groceryState.budgetAmount = budget.amount;
          if (next.schoolSchedule)
            next.schoolSchedule.foodAccess = {
              ...next.schoolSchedule.foodAccess,
              ...draft.school,
            };
        }, null);
      }}
    >
      <ChipGroup
        legend="Where you can get food"
        options={FOOD_SOURCES}
        selected={draft.foodSources}
        onToggle={(value) =>
          set({ foodSources: toggle(draft.foodSources, value) })
        }
      />
      {schoolSchedule ? (
        <ChipGroup
          legend="At school"
          hint="Also in Schedule › School day."
          options={SCHOOL_ACCESS}
          selected={SCHOOL_ACCESS.map(([id]) => id).filter(
            (id) => draft.school[id],
          )}
          onToggle={(value) =>
            set({ school: { ...draft.school, [value]: !draft.school[value] } })
          }
        />
      ) : (
        <p className="muted">
          Add your school day to set food at school.{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => onNavigate("schedule")}
          >
            Open Schedule
          </button>
        </p>
      )}
      <SwitchRow
        checked={draft.familyPrep}
        onChange={(familyPrep) => set({ familyPrep })}
        label="Someone at home can help pack or prep"
      />
      <SwitchRow
        checked={draft.lowCostIdeas}
        onChange={(lowCostIdeas) => set({ lowCostIdeas })}
        label="Keep ideas low-cost"
        hint="Ideas skip foods that usually cost more."
      />
      <SwitchRow
        checked={draft.showPrices}
        onChange={(showPrices) => set({ showPrices })}
        label="Show price estimates"
        hint="Groceries shows an estimated total."
      />
      <label>
        Grocery budget <span className="optional-label">Optional</span>
        <span className="budget-input">
          <span aria-hidden="true">$</span>
          <input
            inputMode="decimal"
            value={draft.budget}
            aria-invalid={Boolean(budget.error)}
            onChange={(event) => set({ budget: event.target.value })}
            placeholder="None"
          />
        </span>
        <span className="muted field-hint">
          Shown on Groceries when price estimates are on.
        </span>
      </label>
    </SettingsSheet>
  );
}
