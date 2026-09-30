import { useState } from "react";
import { createProfile, renameProfile } from "../../store.js";
import { SettingsSheet } from "./SettingsSheet.jsx";
import { FieldError, Input } from "../../components/ui/FieldError.jsx";

// DATA-07 rename, and "Add athlete" on You and This device. One field.
// `onCreated` runs after a new athlete is created (Welcome opens setup).
export function AthleteNameSheet({ athlete, onClose, onCreated }) {
  const initial = athlete ? athlete.name : "";
  const [name, setName] = useState(initial);
  return (
    <SettingsSheet
      title={athlete ? "Rename" : "Add athlete"}
      savedToast={athlete ? "Saved." : null}
      dirty={name.trim() !== initial.trim()}
      onClose={onClose}
      onSave={async () => {
        if (!name.trim())
          return { message: "Enter a first name.", field: "name" };
        if (athlete) return renameProfile(athlete.id, name);
        const created = await createProfile(name.trim());
        if (created) onCreated?.();
        return created;
      }}
    >
      <label>
        First name
        <Input
          field="name"
          value={name}
          maxLength={80}
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <FieldError field="name" />
    </SettingsSheet>
  );
}
