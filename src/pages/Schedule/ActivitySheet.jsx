import { useRef, useState } from "react";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";
import { Dialog, DialogCancel, DialogError } from "../../components/Dialog.jsx";
import { formatDate, formatTime } from "../../format.js";
import { timeToMinutes } from "../../domain/timing.js";
import { missingActivityField } from "../../domain/setup.js";
import { SegmentedControl } from "../../components/ui/SelectionControls.jsx";
import { TimeRange, WeekdayPicker } from "./ScheduleFields.jsx";
import {
  FieldError,
  FieldErrors,
  FormError,
  Input,
} from "../../components/ui/FieldError.jsx";
export function ActivitySheet({ model }) {
  const initialFocus = useRef(null);
  const { pending, run } = useAsyncAction();
  const {
    editingId,
    selectedKey,
    type,
    closeActivitySheet,
    activityDirty,
    saveEvent,
    setType,
    title,
    setTitle,
    activityPlaceholder,
    editingScope,
    repeatMode,
    setRepeatMode,
    setSelectedKey,
    repeatWeekdays,
    toggleRepeatDay,
    repeatEndDate,
    setRepeatEndDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    location,
    setLocation,
    travelMinutes,
    setTravelMinutes,
    intensity,
    setIntensity,
    notes,
    setNotes,
    formError,
  } = model;
  // The date field keeps its own draft: an emptied field must not clear the
  // page's selected day, and an empty date or time gets the app's own field
  // error instead of the browser's popup (A11Y-09).
  const [dateDraft, setDateDraft] = useState(selectedKey);
  const [missing, setMissing] = useState(null);
  return (
    <Dialog
      title={
        editingId
          ? `Edit ${new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(`${selectedKey}T12:00:00`))} ${type}`
          : `Add ${type}`
      }
      initialFocusRef={editingScope === "date" ? undefined : initialFocus}
      className="activity-sheet"
      onClose={closeActivitySheet}
      dirty={activityDirty}
      discardMessage="Your unsaved activity changes will be lost."
    >
      <form
        className="schedule-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const problem = missingActivityField({
            date: dateDraft,
            startTime,
            endTime,
            repeatMode,
            repeatEndDate,
            oneDate: editingScope === "date",
          });
          setMissing(problem);
          if (!problem) run("activity", () => saveEvent(event));
        }}
      >
        <div className="schedule-form-scroll">
          <FieldErrors error={missing || formError}>
            {/* One date of a repeating activity: say so first; its type
                belongs to the series, so it is not asked again. */}
            {editingScope === "date" && (
              <p className="info-callout">
                Changing {formatDate(selectedKey)} only.
              </p>
            )}
            <fieldset hidden={editingScope === "date"}>
              <legend>Type</legend>
              <SegmentedControl
                mode="pressed"
                label="Type"
                firstRef={initialFocus}
                options={[
                  ["practice", "Practice"],
                  ["game", "Game"],
                  ["workout", "Workout"],
                  ["other", "Other"],
                ]}
                value={type}
                onChange={setType}
              />
            </fieldset>
            <label>
              Name
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={activityPlaceholder}
              />
            </label>
            {editingScope === "date" ? null : (
              <fieldset>
                <legend>Date or days</legend>
                <SegmentedControl
                  mode="pressed"
                  label="Date or days"
                  options={[
                    ["once", "One day"],
                    ["weekly", "Every week"],
                  ]}
                  value={repeatMode}
                  onChange={setRepeatMode}
                />
                {repeatMode === "once" ? (
                  <>
                    <label>
                      Activity date
                      <Input
                        field="date"
                        required
                        type="date"
                        value={dateDraft}
                        onChange={(event) => {
                          setDateDraft(event.target.value);
                          if (event.target.value)
                            setSelectedKey(event.target.value);
                        }}
                      />
                    </label>
                    <FieldError field="date" />
                  </>
                ) : (
                  <div className="repeat-settings">
                    <WeekdayPicker
                      legend="Repeat on"
                      field="repeatDays"
                      value={repeatWeekdays}
                      onToggle={toggleRepeatDay}
                    />
                    <label>
                      Until
                      <Input
                        field="repeatEnd"
                        required
                        type="date"
                        min={selectedKey}
                        value={repeatEndDate}
                        onChange={(event) =>
                          setRepeatEndDate(event.target.value)
                        }
                      />
                    </label>
                    <FieldError field="repeatEnd" />
                  </div>
                )}
              </fieldset>
            )}
            <TimeRange
              className="time-fields"
              startLabel="Starts"
              endLabel="Ends"
              startField="startTime"
              endField="endTime"
              start={startTime}
              end={endTime}
              onStart={setStartTime}
              onEnd={setEndTime}
            />
            <fieldset>
              <legend>Where</legend>
              <SegmentedControl
                mode="pressed"
                label="Where"
                options={[
                  ["home", "Home"],
                  ["away", "Away"],
                ]}
                value={location}
                onChange={setLocation}
              />
            </fieldset>
            {location === "away" && (
              <label>
                Travel time (min)
                <Input
                  field="travel"
                  type="number"
                  min="0"
                  max="360"
                  step="5"
                  value={travelMinutes}
                  onChange={(event) => setTravelMinutes(event.target.value)}
                />
                <small>Minutes from home to the venue.</small>
                {Number(travelMinutes) > 0 &&
                  Number(travelMinutes) <= timeToMinutes(startTime) && (
                    <small>
                      Leave by{" "}
                      {formatTime(
                        `${String(Math.floor((timeToMinutes(startTime) - Number(travelMinutes)) / 60)).padStart(2, "0")}:${String((timeToMinutes(startTime) - Number(travelMinutes)) % 60).padStart(2, "0")}`,
                      )}
                    </small>
                  )}
              </label>
            )}
            <FieldError field="travel" />
            <details className="schedule-more-options">
              <summary>More options</summary>
              <fieldset>
                <legend>Activity level</legend>
                <SegmentedControl
                  mode="pressed"
                  label="Activity level"
                  options={[
                    ["low", "Easy"],
                    ["medium", "Normal"],
                    ["high", "Hard"],
                  ]}
                  value={intensity}
                  onChange={setIntensity}
                />
              </fieldset>
              <label>
                Notes (optional)
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={500}
                />
              </label>
            </details>
            <FormError />
          </FieldErrors>
        </div>
        <DialogError />
        <div className="schedule-form-footer">
          <DialogCancel />
          <button
            aria-busy={pending || undefined}
            className="primary"
            type="submit"
            disabled={!!pending}
            aria-busy={!!pending}
          >
            {pending ? "Saving…" : editingId ? "Save changes" : `Add ${type}`}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
