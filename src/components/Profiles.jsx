import { useState } from "react";
import { ConfirmDialog } from "./ui/ConfirmDialog.jsx";
import { downloadJson, exportBackup, startRecoveryProfile } from "../store.js";

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
