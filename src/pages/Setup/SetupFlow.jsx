import { useEffect, useRef } from "react";
import { SkipSetup } from "./StepForm.jsx";
import { ChevronLeft } from "lucide-react";
import { Shell } from "../../components/AppFrame.jsx";
import { changeData, useStore } from "../../store.js";
import {
  SETUP_STEPS,
  SETUP_STEP_COUNT,
  resumeStep,
} from "../../domain/setup.js";
import {
  FoodAccessStep,
  FoodNeedsStep,
  PracticesStep,
  ReadyStep,
  SchoolStep,
  SportStep,
} from "./SetupSteps.jsx";

const STEPS = [
  SportStep,
  SchoolStep,
  PracticesStep,
  FoodAccessStep,
  FoodNeedsStep,
  ReadyStep,
];

// Schedule-first setup (6.2, ONB-01): six steps with one shared header.
// "Next" validates, saves the step and stores setupStep, so a reload resumes
// (ONB-06). "Skip" moves on without saving the step.
export default function SetupFlow({ onNavigate, now, todayKey }) {
  const state = useStore();
  const data = state.current.data;
  const step = resumeStep(data);
  const Step = STEPS[step - 1];
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  const moveTo = (next, apply) =>
    changeData((d) => {
      apply?.(d);
      d.setupStep = next;
    }, null);
  const finish = (apply) => {
    const at = new Date().toISOString();
    return changeData((d) => {
      apply?.(d);
      d.step = "dashboard";
      d.setupStep = SETUP_STEP_COUNT;
      d.lastUsedAt = at;
    }, null).then((ok) => {
      if (ok) onNavigate("today");
      return ok;
    });
  };

  return (
    <Shell navigation={false} footer={false} onNavigate={onNavigate}>
      <div className="setup">
        <header className="setup-header">
          {step > 1 ? (
            <button
              type="button"
              className="text-button setup-back"
              onClick={() => moveTo(step - 1)}
            >
              <ChevronLeft size={18} aria-hidden="true" /> Back
            </button>
          ) : (
            <span />
          )}
          <p className="setup-count">
            Step {step} of {SETUP_STEP_COUNT}
          </p>
          {/* "Skip step" moves on one step; the footer's "Skip setup" leaves
              setup. Different names, so the two never compete (6.2). */}
          {step >= 2 && step <= 5 ? (
            <button
              type="button"
              className="text-button setup-skip"
              onClick={() => moveTo(step + 1)}
            >
              Skip step
            </button>
          ) : (
            <span />
          )}
          <div
            className="setup-progress"
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={1}
            aria-valuemax={SETUP_STEP_COUNT}
            aria-valuenow={step}
            aria-valuetext={`Step ${step} of ${SETUP_STEP_COUNT}`}
          >
            {/* Steps done so far: empty on step 1, full on "You're set". */}
            <span
              style={{
                width: `${((step - 1) / (SETUP_STEP_COUNT - 1)) * 100}%`,
              }}
            />
          </div>
        </header>
        <SkipSetup.Provider value={step <= 5 ? () => finish() : null}>
          <Step
            key={step}
            data={data}
            now={now}
            todayKey={todayKey}
            title={
              <h1 ref={heading} tabIndex={-1}>
                {SETUP_STEPS[step - 1]}
              </h1>
            }
            next={(apply) => moveTo(step + 1, apply)}
            finish={finish}
          />
        </SkipSetup.Provider>
      </div>
    </Shell>
  );
}
