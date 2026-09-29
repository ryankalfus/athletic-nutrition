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
