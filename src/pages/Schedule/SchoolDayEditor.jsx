import { useRef, useState } from "react";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.jsx";
import { Dialog } from "../../components/Dialog.jsx";
import { formatDate } from "../../format.js";
import { ChipGroup } from "../../components/ui/SelectionControls.jsx";
import { TimeRange, WeekdayPicker } from "./ScheduleFields.jsx";
export function SchoolDayEditor({ model }) {
  const { pending, run } = useAsyncAction();
  const [discard, setDiscard] = useState(false);
  const draft = JSON.stringify(
    Object.fromEntries(
      Object.entries(model).filter(
        ([key, value]) => typeof value !== "function" && key !== "schoolError",
      ),
    ),
  );
  const initial = useRef(draft);
  const close = () =>
    draft !== initial.current
      ? setDiscard(true)
      : model.setShowSchoolForm(false);
  const {
    setShowSchoolForm,
    saveSchoolSchedule,
    schoolName,
    setSchoolName,
    schoolStartDate,
    setSchoolStartDate,
    schoolEndDate,
    setSchoolEndDate,
    schoolStartTime,
    setSchoolStartTime,
    schoolEndTime,
    setSchoolEndTime,
    schoolWeekdays,
    toggleSchoolDay,
    lunchStartTime,
    setLunchStartTime,
    lunchEndTime,
    setLunchEndTime,
    morningSnackTime,
    setMorningSnackTime,
    afternoonSnackTime,
    setAfternoonSnackTime,
    commuteMinutes,
    setCommuteMinutes,
    foodAccess,
    toggleFoodAccess,
    daysOffStart,
    setDaysOffStart,
    daysOffEnd,
    setDaysOffEnd,
    addDaysOff,
    excludedRanges,
    setExcludedRanges,
    pauseSchool,
    setPauseSchool,
    pausedFrom,
    setPausedFrom,
    pausedUntil,
    setPausedUntil,
    schoolError,
  } = model;
  return (
    <>
      <Dialog title="School day" className="school-day-sheet" onClose={close}>
        <form
          className="school-form"
          onSubmit={(event) => {
            event.preventDefault();
            run("school", () => saveSchoolSchedule(event));
          }}
        >
          <div className="school-form-scroll">
            <h3>School hours</h3>
            <label>
              School name
              <input
                value={schoolName}
                onChange={(event) => setSchoolName(event.target.value)}
                placeholder="School"
              />
            </label>
            <div className="school-date-fields">
              <label>
                School year starts
                <input
                  required
                  type="date"
                  value={schoolStartDate}
                  onChange={(event) => setSchoolStartDate(event.target.value)}
                />
              </label>
              <label>
                School year ends
                <input
                  required
                  type="date"
                  value={schoolEndDate}
                  onChange={(event) => setSchoolEndDate(event.target.value)}
                />
              </label>
            </div>
            <TimeRange
              startLabel="School starts"
              endLabel="School ends"
              start={schoolStartTime}
              end={schoolEndTime}
              onStart={setSchoolStartTime}
              onEnd={setSchoolEndTime}
            />
            <WeekdayPicker
              legend="School days"
              value={schoolWeekdays}
              onToggle={toggleSchoolDay}
            />
            <div className="school-food-section">
              <div>
                <h3>Lunch & snack times</h3>
                <p>
                  Tell Nourally what is realistically available during your
                  school day.
                </p>
              </div>
              <TimeRange
                startLabel="Lunch starts"
                endLabel="Lunch ends"
                start={lunchStartTime}
                end={lunchEndTime}
                onStart={setLunchStartTime}
                onEnd={setLunchEndTime}
              />
              <div className="school-date-fields">
                <label>
                  Morning snack <span>Optional</span>
                  <input
                    type="time"
                    value={morningSnackTime}
                    onChange={(event) =>
                      setMorningSnackTime(event.target.value)
                    }
                  />
                </label>
                <label>
                  Afternoon snack <span>Optional</span>
                  <input
                    type="time"
                    value={afternoonSnackTime}
                    onChange={(event) =>
                      setAfternoonSnackTime(event.target.value)
                    }
                  />
                </label>
              </div>
              <label>
                Commute from school
                <input
                  type="number"
                  min="0"
                  max="180"
                  step="5"
                  value={commuteMinutes}
                  onChange={(event) => setCommuteMinutes(event.target.value)}
                />
                <small>
                  Minutes from school to home, practice, or your usual next
                  stop.
                </small>
              </label>
              <h3>Food at school</h3>
              <ChipGroup
                legend="Food access at school"
                options={[
                  ["cafeteria", "Cafeteria"],
                  ["refrigerator", "Refrigerator"],
                  ["microwave", "Microwave"],
                  ["eatInClass", "Can eat in class"],
                ]}
                selected={Object.keys(foodAccess).filter(
                  (option) => foodAccess[option],
                )}
                onToggle={toggleFoodAccess}
              />
            </div>
            <section className="school-days-off">
              <h3>Days off</h3>
              <p>
                Add holidays or school breaks. School will not appear on these
                dates.
              </p>
              <div className="school-date-fields">
                <label>
                  From
                  <input
                    type="date"
                    value={daysOffStart}
                    onChange={(event) => setDaysOffStart(event.target.value)}
                  />
                </label>
                <label>
                  Through
                  <input
                    type="date"
                    min={daysOffStart}
                    value={daysOffEnd}
                    onChange={(event) => setDaysOffEnd(event.target.value)}
                  />
                </label>
              </div>
              <button type="button" onClick={addDaysOff}>
                Add days off
              </button>
              {excludedRanges.length > 0 && (
                <ul>
                  {excludedRanges.map((range) => (
                    <li key={`${range.startDate}-${range.endDate}`}>
                      {formatDate(range.startDate)}
                      {range.endDate !== range.startDate
                        ? ` – ${formatDate(range.endDate)}`
                        : ""}
                      <button
                        type="button"
                        aria-label={`Remove days off ${formatDate(range.startDate)} through ${formatDate(range.endDate)}`}
                        onClick={() =>
                          setExcludedRanges((ranges) =>
                            ranges.filter((item) => item !== range),
                          )
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={pauseSchool}
                  onChange={(event) => setPauseSchool(event.target.checked)}
                />
                <span>Pause school for a date range</span>
              </label>
              {pauseSchool && (
                <div className="school-date-fields">
                  <label>
                    Pause from
                    <input
                      type="date"
                      value={pausedFrom}
                      onChange={(event) => setPausedFrom(event.target.value)}
                    />
                  </label>
                  <label>
                    Resume after
                    <input
                      type="date"
                      min={pausedFrom}
                      value={pausedUntil}
                      onChange={(event) => setPausedUntil(event.target.value)}
                    />
                  </label>
                </div>
              )}
            </section>
            {schoolError && <p className="schedule-error">{schoolError}</p>}
          </div>
          <div className="schedule-form-footer">
            <button type="button" onClick={close}>
              Cancel
            </button>
            <button
              aria-busy={pending || undefined}
              className="primary"
              type="submit"
              disabled={!!pending}
              aria-busy={!!pending}
            >
              {pending ? "Saving…" : "Save school day"}
            </button>
          </div>
        </form>
      </Dialog>
      {discard && (
        <ConfirmDialog
          title="Discard changes?"
          body="Your unsaved school changes will be lost."
          confirmLabel="Discard changes"
          destructive
          onCancel={() => setDiscard(false)}
          onConfirm={() => setShowSchoolForm(false)}
        />
      )}
    </>
  );
}
