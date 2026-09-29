export function backupDocument(doc, currentId, scope = "current") {
  if (scope === "all") return { ...structuredClone(doc), scope: "all" };
  const profile = doc.profiles[currentId];
  if (!profile) throw new Error("This athlete's data is no longer available.");
  return {
    version: doc.version,
    revision: doc.revision,
    defaultProfileId: currentId,
    profiles: { [currentId]: structuredClone(profile) },
    scope: "current",
  };
}

export function backupFilename(name, date = new Date()) {
  const safeName =
    String(name || "athlete")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "athlete";
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `nourally-${safeName}-${day}.json`;
}

export const BACKUP_ERRORS = {
  notBackup: "This file isn't a Nourally backup.",
  newer:
    "This backup comes from a newer version of Nourally. Update the app, then try again.",
};

// DATA-04: parse and validate a backup file before anything is added.
// `validate` is storage.js validateDocument; the file itself is never changed.
/** @param {string} text @param {{validate: (doc: any) => any, schemaVersion: number}} options */
export function readBackupText(text, { validate, schemaVersion }) {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new Error(BACKUP_ERRORS.notBackup);
  }
  if (!doc || typeof doc !== "object" || Array.isArray(doc))
    throw new Error(BACKUP_ERRORS.notBackup);
  if (Number.isInteger(doc.version) && doc.version > schemaVersion)
    throw new Error(BACKUP_ERRORS.newer);
  try {
    return validate(doc);
  } catch {
    throw new Error(BACKUP_ERRORS.notBackup);
  }
}
