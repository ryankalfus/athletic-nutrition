import { useRef } from "react";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";
import { Dialog } from "../../components/Dialog.jsx";
import { formatDate, formatTime } from "../../format.js";
import { timeToMinutes } from "../../domain/timing.js";
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
            <div className="activity-type-options">
              {[
                ["practice", "Practice"],
                ["game", "Game"],
                ["workout", "Workout"],
                ["other", "Other"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  ref={value === "practice" ? initialFocus : undefined}
                  type="button"
                  aria-pressed={type === value}
                  className={type === value ? "selected" : ""}
                  onClick={() => setType(value)}
                >
                  {label}
                </button>
              ))}
            </div>
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
              <div className="intensity-options">
                <button
                  type="button"
                  aria-pressed={repeatMode === "once"}
                  className={repeatMode === "once" ? "selected" : ""}
                  onClick={() => setRepeatMode("once")}
                >
                  One day
                </button>
                <button
                  type="button"
                  aria-pressed={repeatMode === "weekly"}
                  className={repeatMode === "weekly" ? "selected" : ""}
                  onClick={() => setRepeatMode("weekly")}
                >
                  Every week
                </button>
              </div>
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
                  <fieldset>
                    <legend>Repeat on</legend>
                    <div className="school-weekdays">
                      {[
                        ["S", 0],
                        ["M", 1],
                        ["T", 2],
                        ["W", 3],
                        ["T", 4],
                        ["F", 5],
                        ["S", 6],
                      ].map(([label, day]) => (
                        <button
                          type="button"
                          key={day}
                          aria-label={
                            [
                              "Sunday",
                              "Monday",
                              "Tuesday",
                              "Wednesday",
                              "Thursday",
                              "Friday",
                              "Saturday",
                            ][day]
                          }
                          aria-pressed={repeatWeekdays.includes(day)}
                          className={
                            repeatWeekdays.includes(day) ? "selected" : ""
                          }
                          onClick={() => toggleRepeatDay(day)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
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
          <div className="time-fields">
            <label>
              Starts
              <input
                required
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </label>
            <label>
              Ends
              <input
                required
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </label>
          </div>
          <fieldset>
            <legend>Where</legend>
            <div className="intensity-options">
              <button
                type="button"
                aria-pressed={location === "home"}
                className={location === "home" ? "selected" : ""}
                onClick={() => setLocation("home")}
              >
                Home
              </button>
              <button
                type="button"
                aria-pressed={location === "away"}
                className={location === "away" ? "selected" : ""}
                onClick={() => setLocation("away")}
              >
                Away
              </button>
            </div>
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
              <div className="intensity-options">
                {[
                  ["low", "Easy"],
                  ["medium", "Normal"],
                  ["high", "Hard"],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={intensity === value}
                    className={intensity === value ? "selected" : ""}
                    onClick={() => setIntensity(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
