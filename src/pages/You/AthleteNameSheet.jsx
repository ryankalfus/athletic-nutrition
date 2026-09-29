import { useState } from "react";
import { createProfile, renameProfile } from "../../store.js";
import { SettingsSheet } from "./SettingsSheet.jsx";

// DATA-07 rename, and "Add athlete" on You and This device. One field.
export function AthleteNameSheet({ athlete, onClose }) {
  const initial = athlete ? athlete.name : "";
  const [name, setName] = useState(initial);
  return (
    <SettingsSheet
      title={athlete ? "Rename" : "Add athlete"}
      savedToast={athlete ? "Saved." : null}
      dirty={name.trim() !== initial.trim()}
      onClose={onClose}
      onSave={async () => {
        if (!name.trim()) return "Enter a first name.";
        return athlete
          ? renameProfile(athlete.id, name)
          : createProfile(name.trim());
      }}
    >
      <label>
        First name
        <input
          value={name}
          maxLength={80}
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
    </SettingsSheet>
  );
}
