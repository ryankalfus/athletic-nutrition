import { useRef, useState } from "react";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";
import { Dialog, DialogError } from "../../components/Dialog.jsx";
import { Button } from "../../components/ui/Button.jsx";
import {
  FieldError,
  FieldErrors,
  Input,
} from "../../components/ui/FieldError.jsx";
import {
  SegmentedControl,
  SwitchRow,
} from "../../components/ui/SelectionControls.jsx";
import { changeData } from "../../store.js";
import { uid } from "../../domain/storage.js";
import {
  importPreview,
  isCalendarLink,
  toScheduleEvent,
  webcalToHttps,
} from "../../domain/ics.js";
import { formatDate, formatTimeRange, plural } from "../../format.js";
import { fetchFeed } from "./calendarSync.js";

const TYPES = [
  ["practice", "Practice"],
  ["game", "Game"],
  ["other", "Other"],
];
const PLACES = [
  ["home", "Home"],
  ["away", "Away"],
];
const hostOf = (url) => {
  try {
    return new URL(webcalToHttps(url)).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

// P2-01 / P2-02 (ADD-08): import a team calendar from an .ics file or a
// subscription link. Step 1 picks the source; step 2 previews every upcoming
// event with a guessed type and Home/Away, and the athlete chooses which to
// add. Events already in the schedule (same UID, or same date, start and
// title) are listed but cannot be added again.
export function ImportSheet({ events, subscriptions = [], todayKey, onClose }) {
  const { pending, run } = useAsyncAction();
  const [mode, setMode] = useState("file");
  const [link, setLink] = useState("");
  const [keepUpdated, setKeepUpdated] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [choices, setChoices] = useState({});
  const [source, setSource] = useState(null);
  const fileRef = useRef(null);

  function showPreview(text, from) {
    let next;
    try {
      next = importPreview(text, events, { todayKey });
    } catch (problem) {
      setError({
        message: problem.message,
        field: from.kind === "link" ? "link" : "file",
      });
      return;
    }
    setError(null);
    setSource(from);
    setPreview(next);
    setChoices(
      Object.fromEntries(
        next.rows.map((row) => [
          row.key,
          {
            selected: !row.duplicate && !row.allDay,
            type: row.type,
            place: row.place,
          },
        ]),
      ),
    );
  }

  async function readFile(file) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setError({ message: "That file is too large.", field: "file" });
      return;
    }
    showPreview(await file.text(), { kind: "file", name: file.name });
  }

  async function readLink() {
    const url = link.trim();
    if (!isCalendarLink(url)) {
      setError({
        message: "Paste a link that starts with webcal:// or https://.",
        field: "link",
      });
      return;
    }
    if (
      subscriptions.some((sub) => webcalToHttps(sub.url) === webcalToHttps(url))
    ) {
      setError({
        message: "This calendar is already linked. Use Refresh instead.",
        field: "link",
      });
      return;
    }
    try {
      showPreview(await fetchFeed(url), { kind: "link", url });
    } catch (problem) {
      setError({ message: problem.message, field: "link" });
    }
  }

  const rows = preview?.rows || [];
  const chosen = rows.filter((row) => choices[row.key]?.selected);
  const duplicates = rows.filter((row) => row.duplicate).length;
  // UX-FLOW-05: a file or link with nothing new ends with Done, not a
  // disabled button.
  const nothingNew = rows.length > 0 && duplicates === rows.length;
  const allDay = rows.filter((row) => row.allDay && !row.duplicate).length;
  const name =
    preview?.calendarName ||
    (source?.kind === "link" ? hostOf(source.url) : "") ||
    "your team calendar";
  const choose = (key, change) =>
    setChoices((all) => ({ ...all, [key]: { ...all[key], ...change } }));

  async function save() {
    const subscribe = source?.kind === "link" && keepUpdated;
    const feedId = subscribe ? uid() : null;
    const now = new Date().toISOString();
    const picked = chosen.map((row) => ({ ...row, ...choices[row.key] }));
    const ok = await changeData(
      (data) => {
        // Checked again against the saved schedule: a second import (or
        // another tab) never adds the same event twice.
        const keys = new Set(
          (data.schedule || []).map((e) => e.source?.key).filter(Boolean),
        );
        const fresh = picked
          .filter((row) => !keys.has(row.key))
          .map((row) => toScheduleEvent(row, { id: uid(), feedId }));
        data.schedule = [...(data.schedule || []), ...fresh];
        if (subscribe)
          data.calendarSubscriptions = [
            ...(data.calendarSubscriptions || []),
            {
              id: feedId,
              url: source.url,
              name: preview.calendarName || hostOf(source.url),
              addedAt: now,
              refreshedAt: now,
              lastTriedAt: now,
              lastError: null,
              // Left out now, so a refresh does not add them back.
              skippedKeys: rows
                .filter((row) => !choices[row.key]?.selected)
                .map((row) => row.key),
            },
          ];
      },
      `Added ${chosen.length} ${plural(chosen.length, "event")} from ${name}.`,
    );
    if (ok) onClose();
  }

  return (
    <Dialog
      title="Import team calendar"
      className="import-sheet"
      onClose={onClose}
      dirty={Boolean(preview)}
      discardMessage="The events you picked won't be added."
    >
      {!preview ? (
        <form
          className="schedule-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (mode === "link") run("preview", readLink);
            else fileRef.current?.click();
          }}
        >
          <div className="schedule-form-scroll">
            <p>
              Add games and practices from TeamSnap, GameChanger, SportsEngine
              or any calendar that exports an .ics file.
            </p>
            <SegmentedControl
              label="Import from"
              options={[
                ["file", "File"],
                ["link", "Link"],
              ]}
              value={mode}
              onChange={(value) => {
                setMode(value);
                setError(null);
              }}
            />
            <FieldErrors error={error}>
              {mode === "file" ? (
                <>
                  <p className="muted field-hint">
                    In your team app, look for Export or Download calendar, then
                    choose the .ics file it saves.
                  </p>
                  {/* Opened by "Choose file", like the backup restore. */}
                  <Input
                    ref={fileRef}
                    field="file"
                    className="sr-only"
                    type="file"
                    tabIndex={-1}
                    aria-label="Calendar file (.ics)"
                    accept=".ics,text/calendar"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      run("preview", () => readFile(file));
                    }}
                  />
                  <FieldError field="file" />
                </>
              ) : (
                <>
                  <label>
                    Calendar link
                    <Input
                      field="link"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      placeholder="webcal://"
                      value={link}
                      onChange={(event) => setLink(event.target.value)}
                    />
                  </label>
                  <FieldError field="link" />
                  <p className="muted field-hint">
                    In your team app, look for Subscribe or Sync calendar and
                    copy the link.
                  </p>
                  <SwitchRow
                    checked={keepUpdated}
                    onChange={setKeepUpdated}
                    label="Keep this calendar updated"
                    hint="Changes from your team show up each time you open Nourally."
                  />
                </>
              )}
            </FieldErrors>
          </div>
          <DialogError />
          <div className="schedule-form-footer">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              type="submit"
              busy={pending === "preview"}
              busyLabel="Reading…"
            >
              {mode === "file" ? "Choose file" : "Preview"}
            </Button>
          </div>
        </form>
      ) : (
        <form
          className="schedule-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (chosen.length) run("save", save);
          }}
        >
          <div className="schedule-form-scroll">
            <div className="import-summary" role="status">
              <p>
                <strong>
                  {rows.length} upcoming {plural(rows.length, "event")}
                </strong>{" "}
                from {name}.
              </p>
              {nothingNew ? (
                <p>Everything in this calendar is already in your schedule.</p>
              ) : (
                duplicates > 0 && (
                  <p>
                    {duplicates} {duplicates === 1 ? "is" : "are"} already in
                    your schedule.
                  </p>
                )
              )}
              {allDay > 0 && (
                <p>
                  {allDay} all-day {plural(allDay, "event")}{" "}
                  {allDay === 1 ? "has" : "have"} no start time. Add{" "}
                  {allDay === 1 ? "it" : "them"} yourself if needed.
                </p>
              )}
              {preview.pastCount > 0 && (
                <p>
                  {preview.pastCount} past {plural(preview.pastCount, "event")}{" "}
                  not shown.
                </p>
              )}
            </div>
            {rows.length ? (
              <ul className="import-list" aria-label="Events to import">
                {rows.map((row) => {
                  const choice = choices[row.key] || {};
                  const locked = row.duplicate || row.allDay;
                  const when = row.allDay
                    ? `${formatDate(row.date)}, all day`
                    : `${formatDate(row.date)}, ${formatTimeRange(row.startTime, row.endTime)}`;
                  const named = `${row.title}, ${formatDate(row.date)}`;
                  return (
                    <li
                      key={row.key}
                      className={`import-row${locked ? " is-locked" : ""}`}
                    >
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={Boolean(choice.selected)}
                          disabled={locked}
                          onChange={(event) =>
                            choose(row.key, { selected: event.target.checked })
                          }
                        />
                        <span>
                          <strong>{row.title}</strong>
                          <small>{when}</small>
                          {row.duplicate && (
                            <small>Already in your schedule</small>
                          )}
                          {!row.duplicate && row.allDay && (
                            <small>No start time</small>
                          )}
                        </span>
                      </label>
                      {!locked && choice.selected && (
                        <div className="import-row-fields">
                          <label>
                            Type
                            <select
                              aria-label={`Type for ${named}`}
                              value={choice.type}
                              onChange={(event) =>
                                choose(row.key, { type: event.target.value })
                              }
                            >
                              {TYPES.map(([value, text]) => (
                                <option key={value} value={value}>
                                  {text}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Where
                            <select
                              aria-label={`Where for ${named}`}
                              value={choice.place}
                              onChange={(event) =>
                                choose(row.key, { place: event.target.value })
                              }
                            >
                              {PLACES.map(([value, text]) => (
                                <option key={value} value={value}>
                                  {text}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>There are no upcoming events in this calendar.</p>
            )}
          </div>
          <DialogError />
          <div className="schedule-form-footer">
            {nothingNew ? (
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setPreview(null);
                    setSource(null);
                  }}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={!chosen.length}
                  busy={pending === "save"}
                  busyLabel="Importing…"
                >
                  {chosen.length
                    ? `Import ${chosen.length} ${plural(chosen.length, "event")}`
                    : "Choose events"}
                </Button>
              </>
            )}
          </div>
        </form>
      )}
    </Dialog>
  );
}
