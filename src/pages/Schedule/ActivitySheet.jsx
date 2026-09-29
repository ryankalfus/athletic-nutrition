import { useRef } from "react";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";
import { Dialog } from "../../components/Dialog.jsx";
import { formatDate, formatTime } from "../../format.js";
import { timeToMinutes } from "../../domain/timing.js";
import { SegmentedControl } from "../../components/ui/SelectionControls.jsx";
import { TimeRange, WeekdayPicker } from "./ScheduleFields.jsx";
export function ActivitySheet({ model }) {
  const initialFocus = useRef(null);
  const { pending, run } = useAsyncAction();
  const {
    editingId,
    selectedKey,
    type,
    closeActivitySheet,
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
  return (
    <Dialog
      title={
        editingId ? `Edit ${formatDate(selectedKey)} ${type}` : `Add ${type}`
      }
      initialFocusRef={initialFocus}
      className="activity-sheet"
      onClose={closeActivitySheet}
    >
      <form
        className="schedule-form"
        onSubmit={(event) => {
          event.preventDefault();
          run("activity", () => saveEvent(event));
        }}
      >
        <div className="schedule-form-scroll">
          <fieldset>
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
          {editingScope === "date" ? (
            <p>Changing {formatDate(selectedKey)} only.</p>
          ) : (
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
                <label>
                  Activity date
                  <input
                    required
                    type="date"
                    value={selectedKey}
                    onChange={(event) => setSelectedKey(event.target.value)}
                  />
                </label>
              ) : (
                <div className="repeat-settings">
                  <WeekdayPicker
                    legend="Repeat on"
                    value={repeatWeekdays}
                    onToggle={toggleRepeatDay}
                  />
                  <label>
                    Until
                    <input
                      required
                      type="date"
                      min={selectedKey}
                      value={repeatEndDate}
                      onChange={(event) => setRepeatEndDate(event.target.value)}
                    />
                  </label>
                </div>
              )}
            </fieldset>
          )}
          <TimeRange
            className="time-fields"
            startLabel="Starts"
            endLabel="Ends"
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
              <input
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
          {formError && (
            <p className="schedule-error" role="alert">
              {formError}
            </p>
          )}
        </div>
        <div className="schedule-form-footer">
          <button type="button" onClick={closeActivitySheet}>
            Cancel
          </button>
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
