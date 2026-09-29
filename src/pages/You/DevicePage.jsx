import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Shell } from "../../components/AppFrame.jsx";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.jsx";
import {
  deleteCurrentProfile,
  exportBackup,
  importBackupDocument,
  readBackupFile,
  selectProfile,
  useStore,
} from "../../store.js";
import {
  PERSIST_COPY,
  athleteLabel,
  athleteName,
  backupPreview,
  backupPreviewText,
  lastBackupText,
} from "../../domain/you.js";
import { AthleteNameSheet } from "./AthleteNameSheet.jsx";

// You › This device (6.14): athletes, backup, storage, then the danger zone.
export function DevicePage({ onNavigate }) {
  const state = useStore();
  const current = state.current;
  const name = athleteName(current);
  const athletes = Object.values(state.doc.profiles);
  const fileRef = useRef(null);
  const [includeAll, setIncludeAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restore, setRestore] = useState(null);
  const [restoreError, setRestoreError] = useState("");
  const [persist, setPersist] = useState("");
  const [naming, setNaming] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    // Reading the current state is allowed; persist() runs only on the button.
    navigator.storage
      ?.persisted?.()
      .then((kept) => kept && setPersist("granted"))
      .catch(() => {});
  }, []);

  const keepData = async () => {
    if (!navigator.storage?.persist) return setPersist("unsupported");
    try {
      setPersist((await navigator.storage.persist()) ? "granted" : "denied");
    } catch {
      setPersist("denied");
    }
  };

  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setRestoreError("");
    if (!file) return;
    try {
      const doc = await readBackupFile(file);
      setRestore({ doc, text: backupPreviewText(backupPreview(doc)) });
    } catch (error) {
      setRestoreError(error.message);
    }
  };

  return (
    <Shell onNavigate={onNavigate}>
      <div className="you-page device-page">
        <button
          type="button"
          className="text-button you-back"
          onClick={() => onNavigate("you")}
        >
          <ChevronLeft size={18} aria-hidden="true" /> You
        </button>
        <h1>This device</h1>
        <p className="muted">
          Nourally saves each athlete&apos;s plans in this browser. There is no
          account or cloud copy. Save a backup file now and then.
        </p>

        <section aria-labelledby="device-athletes">
          <h2 id="device-athletes">Athletes on this device</h2>
          <ul className="device-athletes">
            {athletes.map((athlete) => {
              const isCurrent = athlete.id === current.id;
              return (
                <li key={athlete.id}>
                  <span className="you-avatar" aria-hidden="true">
                    {athleteName(athlete).charAt(0).toUpperCase()}
                  </span>
                  <span className="device-athlete-name">
                    {athleteLabel(athlete)}
                    {isCurrent && <small> · Open now</small>}
                  </span>
                  <span className="device-athlete-actions">
                    {!isCurrent && (
                      <button
                        type="button"
                        className="text-button"
                        aria-label={`Open ${athleteLabel(athlete)}`}
                        onClick={() => selectProfile(athlete.id)}
                      >
                        Open
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-button"
                      aria-label={`Rename ${athleteLabel(athlete)}`}
                      onClick={() =>
                        setNaming({
                          id: athlete.id,
                          name: athleteName(athlete),
                        })
                      }
                    >
                      Rename
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="you-secondary"
            onClick={() => setNaming({ add: true })}
          >
            Add athlete
          </button>
        </section>

        <section aria-labelledby="device-backup">
          <h2 id="device-backup">Backup</h2>
          <p>{lastBackupText(current.data.profile.lastBackupAt)}</p>
          <label className="check-row">
            <input
              type="checkbox"
              checked={includeAll}
              onChange={(event) => setIncludeAll(event.target.checked)}
            />
            <span>Include all athletes on this device</span>
          </label>
          <div className="button-row">
            <button
              type="button"
              className="primary"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                await exportBackup({
                  scope: includeAll ? "all" : "current",
                  stamp: true,
                });
                setSaving(false);
              }}
            >
              Save a backup file
            </button>
            <button
              type="button"
              className="you-secondary"
              onClick={() => fileRef.current?.click()}
            >
              Restore from a backup file
            </button>
            <input
              ref={fileRef}
              className="sr-only"
              type="file"
              tabIndex={-1}
              aria-label="Backup file"
              accept="application/json,.json"
              onChange={chooseFile}
            />
          </div>
          {restoreError && (
            <p className="inline-error" role="alert">
              {restoreError}
            </p>
          )}
        </section>

        <section aria-labelledby="device-storage">
          <h2 id="device-storage">Storage</h2>
          <p className="muted">
            Some browsers, like Safari, can clear saved data after 7 days
            without a visit.
          </p>
          <button
            type="button"
            className="you-secondary"
            onClick={keepData}
            disabled={persist === "granted"}
          >
            Keep data on this device
          </button>
          {persist && <p role="status">{PERSIST_COPY[persist]}</p>}
        </section>

        <section className="danger-zone" aria-labelledby="device-delete">
          <h2 id="device-delete">Delete data</h2>
          <p className="muted">
            A backup file of {name}&apos;s data downloads first.
          </p>
          <button
            type="button"
            className="danger-button"
            onClick={() => setConfirmDelete(true)}
          >
            Delete {name}&apos;s data
          </button>
        </section>
      </div>

      {naming && (
        <AthleteNameSheet
          athlete={naming.add ? null : naming}
          onClose={() => setNaming(null)}
        />
      )}
      {restore && (
        <ConfirmDialog
          title="Add from this file?"
          body={restore.text}
          confirmLabel="Add from file"
          onCancel={() => setRestore(null)}
          onConfirm={async () => {
            if (await importBackupDocument(restore.doc)) setRestore(null);
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${name}'s data from this device?`}
          body={`Plans, food, and logs for ${name} are removed. Other athletes stay. You can't undo this. A backup file downloads first.`}
          confirmLabel="Delete data"
          destructive
          requireText="DELETE"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            if (await deleteCurrentProfile()) setConfirmDelete(false);
          }}
        />
      )}
    </Shell>
  );
}
