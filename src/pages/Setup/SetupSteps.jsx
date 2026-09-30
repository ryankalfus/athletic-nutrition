import { useState } from "react";
import { Plus } from "lucide-react";
import {
  ChipGroup,
  SegmentedControl,
  SwitchRow,
} from "../../components/ui/SelectionControls.jsx";
import { ALLERGY_TAGS_REVIEWED } from "../../domain/catalog.js";
import { SETUP_ALLERGY_LINE } from "../../domain/allergens.js";
import { normalizeSport } from "../../domain/sport.js";
import { FAMILY_PREP_LABEL, SEASONS } from "../../domain/you.js";
import {
  SCHOOL_FOOD_CHOICES,
  activitiesDraft,
  activitiesProblem,
  activitiesFromSetup,
  applyFoodAccess,
  firstPlanPreview,
  foodAccessDraft,
  schoolDayProblem,
  schoolDraft,
  schoolFromSetup,
  sportStepData,
  sportStepProblem,
} from "../../domain/setup.js";
import { SportField } from "../You/SportField.jsx";
import { FoodNeedsFields } from "../You/FoodNeedsFields.jsx";
import {
  TimeRange,
  WeekdayPicker,
  toggleDay,
} from "../Schedule/ScheduleFields.jsx";
import { StepForm } from "./StepForm.jsx";
import { FieldError, Input } from "../../components/ui/FieldError.jsx";

const WHERE = [
  ["home", "Home"],
  ["away", "Away"],
];

// Step 1 — "What do you play?"
export function SportStep({ data, title, next }) {
  const [draft, setDraft] = useState(() => sportStepData(data.profile));
  const save = (d) => {
    d.profile.name = draft.name.trim() || d.profile.name;
    d.profile.sport = normalizeSport(draft.sport);
    d.profile.season = draft.season;
  };
  return (
    <StepForm
      title={title}
      helper="Nourally uses this to name your sessions and time your snacks."
      onNext={() => sportStepProblem(draft) || next(save)}
    >
      <label>
        First name <span className="optional-label">Optional</span>
        <input
          value={draft.name}
          maxLength={80}
          autoComplete="given-name"
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </label>
      <SportField
        required
        value={draft.sport}
        onChange={(sport) => setDraft({ ...draft, sport })}
      />
      <fieldset className="choice-field">
        <legend>Season</legend>
        <SegmentedControl
          label="Season"
          options={SEASONS}
          value={draft.season}
          onChange={(season) => setDraft({ ...draft, season })}
        />
      </fieldset>
    </StepForm>
  );
}

// Step 2 — "Your school day" (reuses Schedule's school fields, ONB-02).
export function SchoolStep({ data, title, next, todayKey }) {
  const [draft, setDraft] = useState(() => schoolDraft(data.schoolSchedule));
  const set = (patch) => setDraft({ ...draft, ...patch });
  return (
    <StepForm
      title={title}
      helper="Nourally times food around your classes and lunch."
      onNext={() =>
        schoolDayProblem(draft) ||
        next((d) => {
          d.schoolSchedule = schoolFromSetup(draft, d.schoolSchedule, todayKey);
        })
      }
    >
      <button
        type="button"
        className="text-button setup-no-school"
        onClick={() => next()}
      >
        No school right now
      </button>
      <WeekdayPicker
        legend="School days"
        field="weekdays"
        value={draft.weekdays}
        onToggle={(day) => set({ weekdays: toggleDay(draft.weekdays, day) })}
      />
      <TimeRange
        startLabel="School starts"
        endLabel="School ends"
        endField="endTime"
        start={draft.startTime}
        end={draft.endTime}
        onStart={(startTime) => set({ startTime })}
        onEnd={(endTime) => set({ endTime })}
      />
      <TimeRange
        startLabel="Lunch starts"
        endLabel="Lunch ends"
        field="lunch"
        start={draft.lunchStartTime}
        end={draft.lunchEndTime}
        onStart={(lunchStartTime) => set({ lunchStartTime })}
        onEnd={(lunchEndTime) => set({ lunchEndTime })}
      />
    </StepForm>
  );
}

// Step 3 — "Practices and games" (the activity sheet's fields, ONB-02).
export function PracticesStep({ data, title, next, todayKey }) {
  const [draft, setDraft] = useState(() => activitiesDraft(data.schedule));
  const practice = draft.practice;
  const game = draft.game;
  const setPractice = (patch) =>
    setDraft({ ...draft, practice: { ...practice, ...patch } });
  const setGame = (patch) =>
    setDraft({ ...draft, game: { ...game, ...patch } });
  return (
    <StepForm
      title={title}
      helper="No set practices? Skip this. You can add sessions any time."
      onNext={() =>
        activitiesProblem(draft) ||
        next((d) => {
          d.schedule = activitiesFromSetup(draft, d.schedule, {
            sport: d.profile.sport,
            todayKey,
            schoolYearEnd: d.schoolSchedule?.endDate,
          });
        })
      }
    >
      <fieldset className="setup-group">
        <legend>Add your usual practice</legend>
        <WeekdayPicker
          legend="Practice days"
          value={practice.weekdays}
          onToggle={(day) =>
            setPractice({ weekdays: toggleDay(practice.weekdays, day) })
          }
        />
        <TimeRange
          className="time-fields"
          startLabel="Starts"
          endLabel="Ends"
          endField="practiceEnd"
          start={practice.startTime}
          end={practice.endTime}
          onStart={(startTime) => setPractice({ startTime })}
          onEnd={(endTime) => setPractice({ endTime })}
        />
        <fieldset className="choice-field">
          <legend>Where</legend>
          <SegmentedControl
            label="Practice location"
            options={WHERE}
            value={practice.location}
            onChange={(location) => setPractice({ location })}
          />
        </fieldset>
      </fieldset>
      {game ? (
        <fieldset className="setup-group">
          <legend>Game</legend>
          <label>
            Game date
            <Input
              field="gameDate"
              type="date"
              min={todayKey}
              value={game.date}
              onChange={(event) => setGame({ date: event.target.value })}
            />
          </label>
          <FieldError field="gameDate" />
          <TimeRange
            className="time-fields"
            startLabel="Game starts"
            endLabel="Game ends"
            endField="gameEnd"
            start={game.startTime}
            end={game.endTime}
            onStart={(startTime) => setGame({ startTime })}
            onEnd={(endTime) => setGame({ endTime })}
          />
          <fieldset className="choice-field">
            <legend>Where</legend>
            <SegmentedControl
              label="Game location"
              options={WHERE}
              value={game.location}
              onChange={(location) => setGame({ location })}
            />
          </fieldset>
          <button
            type="button"
            className="text-button"
            onClick={() => setDraft({ ...draft, game: null })}
          >
            Remove game
          </button>
        </fieldset>
      ) : (
        <button
          type="button"
          className="you-secondary setup-add"
          onClick={() =>
            setDraft({
              ...draft,
              game: {
                date: todayKey,
                startTime: "18:00",
                endTime: "19:30",
                location: "away",
              },
            })
          }
        >
          <Plus size={18} aria-hidden="true" /> Add a game
        </button>
      )}
    </StepForm>
  );
}

// Step 4 — "Food at school"
export function FoodAccessStep({ data, title, next }) {
  const [draft, setDraft] = useState(() => foodAccessDraft(data));
  return (
    <StepForm
      title={title}
      helper="Ideas use only what you can get to."
      onNext={() => next((d) => applyFoodAccess(d, draft))}
    >
      <ChipGroup
        legend="At school I have"
        options={SCHOOL_FOOD_CHOICES}
        selected={draft.selected}
        onToggle={(id) =>
          setDraft({ ...draft, selected: toggleDay(draft.selected, id) })
        }
      />
      <SwitchRow
        label={FAMILY_PREP_LABEL}
        checked={draft.familyPrep}
        onChange={(familyPrep) => setDraft({ ...draft, familyPrep })}
      />
    </StepForm>
  );
}

// Step 5 — "Food needs" (the You sheet's fields; allergies are gated).
export function FoodNeedsStep({ data, title, next }) {
  const [draft, setDraft] = useState(() => ({
    allergies: data.profile.allergies || [],
    dietaryNeeds: data.profile.dietaryNeeds || [],
    dislikes: data.profile.dislikes || [],
  }));
  return (
    <StepForm
      title={title}
      helper={ALLERGY_TAGS_REVIEWED ? SETUP_ALLERGY_LINE : undefined}
      onNext={() =>
        next((d) => {
          d.profile.allergies = draft.allergies;
          d.profile.dietaryNeeds = draft.dietaryNeeds;
          d.profile.dislikes = draft.dislikes;
        })
      }
    >
      <FoodNeedsFields draft={draft} onChange={setDraft} headingLevel={2} />
    </StepForm>
  );
}

// Step 6 — "You're set": the first plan Today will show.
export function ReadyStep({ data, title, finish, now }) {
  const preview = firstPlanPreview(data.schedule, now);
  return (
    <StepForm title={title} nextLabel="Open Today" onNext={() => finish()}>
      <section className="setup-preview" aria-label="Your first plan">
        <p className="setup-preview-label">Today</p>
        <p>{preview.text}</p>
      </section>
      <p className="muted">Change any of this later in You and Schedule.</p>
    </StepForm>
  );
}
