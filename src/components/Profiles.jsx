import { useState } from "react";
import {
  createProfile,
  selectProfile,
  useStore,
  downloadJson,
  exportBackup,
  importBackup,
  deleteCurrentProfile,
  startRecoveryProfile,
} from "../store.js";

export function Recovery({ message }) {
  return (
    <main className="shell recovery">
      <h1>Your data needs attention</h1>
      <p role="alert">{message}</p>
      <p>
        Nothing has been cleared. Download a copy before making changes. If this
        is a newer backup, reopen it with the app version that created it.
      </p>
      <button
        onClick={() =>
          downloadJson(
            { raw: { ...localStorage } },
            "nourally-raw-recovery.json",
          )
        }
      >
        Download original device data
      </button>
      <button onClick={exportBackup}>Download database backup</button>
      <button onClick={() => window.location.reload()}>Retry opening</button>
      <button
        onClick={async () => {
          if (
            window.confirm(
              "Open an empty recovery profile? The original database will be kept under a recovery record, and a backup will download first. No legacy data is cleared.",
            )
          ) {
            await exportBackup();
            if (await startRecoveryProfile()) window.location.reload();
          }
        }}
      >
        Open a clean recovery profile
      </button>
    </main>
  );
}
export function LocalProfileEntry({ onComplete }) {
  const { doc } = useStore();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="shell">
      <div className="brand">↗ nourally</div>
      <h1>
        Your day.
        <br />
        <em>Your food plan.</em>
      </h1>
      <h2>Choose a device profile</h2>
      <p>
        Profiles keep separate plans on this browser. They are not
        password-protected accounts. Anyone using this browser can open them;
        there is no cloud sync.
      </p>
      <div className="profile-list">
        {Object.values(doc.profiles).map((p) => (
          <button
            key={p.id}
            onClick={() => {
              selectProfile(p.id);
              onComplete();
            }}
          >
            {p.data.profile.name || p.name || "My profile"} · Open
          </button>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          if (await createProfile(name.trim())) onComplete();
          setBusy(false);
        }}
      >
        <label>
          New profile name
          <input
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button className="primary" disabled={busy || !name.trim()}>
          Create separate profile
        </button>
      </form>
    </main>
  );
}
export function ProfileManager({ onSignOut }) {
  const state = useStore();
  const [status, setStatus] = useState("");
  return (
    <section className="shell profile-tools">
      <h2>Device profiles & data</h2>
      <p>
        Saved in this browser, not a secure account or cloud backup. Export
        regularly; clearing site data removes local profiles. Switching profiles
        does not erase another profile.
      </p>
      <label>
        Current device profile
        <select
          value={state.current.id}
          onChange={(e) => selectProfile(e.target.value)}
        >
          {Object.values(state.doc.profiles).map((p) => (
            <option key={p.id} value={p.id}>
              {p.data.profile.name || p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="button-row">
        <button onClick={onSignOut}>Close profile / choose another</button>
        <button onClick={exportBackup}>Export backup</button>
        <label className="file-button">
          Import backup
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              try {
                if (e.target.files[0]) {
                  const ok = await importBackup(e.target.files[0]);
                  setStatus(
                    ok
                      ? "Imported as separate profiles. Existing profiles were preserved."
                      : "Import was not saved.",
                  );
                }
              } catch (error) {
                setStatus(error.message);
              }
              e.target.value = "";
            }}
          />
        </label>
        <button
          className="danger-button"
          onClick={async () => {
            if (
              window.confirm(
                `Delete only ${state.current.name}? A backup download will start first. Other profiles will stay.`,
              )
            ) {
              await deleteCurrentProfile();
            }
          }}
        >
          Delete this profile
        </button>
      </div>
      <p role="status">{status}</p>
    </section>
  );
}
