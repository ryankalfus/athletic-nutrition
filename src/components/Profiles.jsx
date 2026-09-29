import { useState } from "react";
import { ConfirmDialog } from "./ui/ConfirmDialog.jsx";
import {
  createProfile,
  selectProfile,
  useStore,
  downloadJson,
  exportBackup,
  startRecoveryProfile,
} from "../store.js";

export function Recovery({ message }) {
  const [confirmRecovery, setConfirmRecovery] = useState(false);
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
      <button onClick={() => exportBackup({ scope: "all" })}>
        Download database backup
      </button>
      <button onClick={() => window.location.reload()}>Retry opening</button>
      <button onClick={() => setConfirmRecovery(true)}>
        Open a clean recovery profile
      </button>
      {confirmRecovery && (
        <ConfirmDialog
          title="Open a clean recovery profile?"
          body="The original data is kept under a recovery record. A backup downloads first."
          confirmLabel="Open profile"
          onCancel={() => setConfirmRecovery(false)}
          onConfirm={async () => {
            await exportBackup({ scope: "all" });
            if (await startRecoveryProfile()) window.location.reload();
          }}
        />
      )}
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
            Open {p.data.profile.name || p.name || "My profile"}
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
