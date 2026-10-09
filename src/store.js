import { useSyncExternalStore } from "react";
import { showToast } from "./components/ui/Toast.jsx";
import { syncPlanPreparation } from "./domain/plans.js";
import { signedOutFlag } from "./session.js";
import {
  backupDocument,
  backupFilename,
  readBackupText,
} from "./domain/backup.js";
import {
  SCHEMA_VERSION,
  emptyData,
  migrateLegacy,
  uid,
  validateData,
  validateDocument,
} from "./domain/storage.js";

let db,
  snapshot = { loading: true },
  currentId,
  lastFailedWrite = null;
const listeners = new Set();
const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("nourally-v2")
    : null;
const emit = (next) => {
  snapshot = next;
  listeners.forEach((fn) => fn());
};
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const read = () =>
  new Promise((resolve, reject) => {
    const request = db
      .transaction("documents")
      .objectStore("documents")
      .get("app");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
function publish(doc) {
  doc = validateDocument(doc);
  if (!doc.profiles[currentId]) currentId = doc.defaultProfileId;
  sessionStorage.setItem("nourally-profile-id", currentId);
  emit({ loading: false, doc, current: doc.profiles[currentId], error: null });
}
export async function initializeStore() {
  try {
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("nourally-v2", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("documents");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error("Close older Nourally tabs and retry."));
    });
    let doc = await read();
    if (!doc) {
      // Migration and initial write share one transaction. Simultaneous first tabs cannot replace each other.
      doc = await new Promise((resolve, reject) => {
        const transaction = db.transaction("documents", "readwrite");
        const records = transaction.objectStore("documents");
        const request = records.get("app");
        let initial;
        request.onsuccess = () => {
          try {
            initial = request.result || migrateLegacy(localStorage);
            if (!request.result) records.put(initial, "app");
          } catch (error) {
            transaction.abort();
            reject(error);
          }
        };
        transaction.oncomplete = () => resolve(initial);
        transaction.onerror = () => reject(transaction.error);
      });
    }
    currentId =
      sessionStorage.getItem("nourally-profile-id") || doc.defaultProfileId;
    publish(doc);
  } catch (error) {
    emit({
      loading: false,
      error: `Your saved data was not changed. ${error.message}`,
    });
  }
}
export async function transaction(reducer) {
  const targetId = currentId;
  try {
    const doc = await new Promise((resolve, reject) => {
      const tx = db.transaction("documents", "readwrite");
      const records = tx.objectStore("documents");
      const request = records.get("app");
      let next;
      request.onsuccess = () => {
        try {
          if (request.result.version === 2) {
            records.put(structuredClone(request.result), "before-schema-v3");
            downloadJson(request.result, backupFilename("before-redesign"));
          }
          next = validateDocument(request.result);
          reducer(next, targetId);
          validateDocument(next);
          next.revision += 1;
          records.put(next, "app");
        } catch (error) {
          tx.abort();
          reject(error);
        }
      };
      tx.oncomplete = () => resolve(next);
      tx.onerror = () => reject(tx.error || new Error("Could not save."));
      tx.onabort = () => reject(tx.error || new Error("Save cancelled."));
    });
    publish(doc);
    channel?.postMessage(doc.revision);
    lastFailedWrite = null;
    return true;
  } catch (error) {
    lastFailedWrite = () => transaction(reducer);
    const reason = String(error.message || "Could not save").replace(
      /[.!?]+$/,
      "",
    );
    emit({
      ...snapshot,
      error: `Not saved: ${reason}. Save a backup file before closing this tab.`,
    });
    return false;
  }
}
export async function retryLastWrite() {
  return lastFailedWrite ? lastFailedWrite() : initializeStore();
}
export async function changeData(reducer, message = "Saved.", action) {
  let before;
  const profileId = currentId;
  const ok = await transaction((doc, id) => {
    before = structuredClone(doc.profiles[id].data);
    reducer(doc.profiles[id].data);
  });
  if (!ok) {
    lastFailedWrite = () => changeData(reducer, message, action);
    return false;
  }
  const revision = snapshot.doc.revision;
  if (message)
    showToast(
      message,
      async () => {
        if (currentId !== profileId || snapshot.doc.revision !== revision)
          return false;
        return transaction((doc) => {
          doc.profiles[profileId].data = before;
        });
      },
      action,
    );
  return true;
}
export const setField = (field, update, message) =>
  changeData((data) => {
    data[field] = typeof update === "function" ? update(data[field]) : update;
    if (field === "dayPlans")
      for (const date of Object.keys(data.dayPlans))
        syncPlanPreparation(data, date);
  }, message);
export function useSignedOut() {
  return useSyncExternalStore(signedOutFlag.subscribe, signedOutFlag.get);
}
export const setSignedOut = (value) => signedOutFlag.set(value);
export function useStore() {
  return useSyncExternalStore(subscribe, () => snapshot);
}
export function useField(field) {
  const state = useStore();
  return [
    state.current?.data[field],
    (update, message) => setField(field, update, message),
  ];
}
export async function createProfile(name, email = "") {
  const id = uid();
  const previousId = currentId;
  const ok = await transaction((doc) => {
    const data = emptyData();
    data.profile.name = name;
    // A named new athlete skips Welcome and starts setup at step 1 (6.1).
    data.setupStep = 1;
    data.lastUsedAt = new Date().toISOString();
    doc.profiles[id] = { id, name, email, data };
  });
  if (ok) {
    selectProfile(id);
    const revision = snapshot.doc.revision;
    showToast("Profile created.", async () => {
      if (snapshot.doc.revision !== revision) return false;
      const undone = await transaction((doc) => {
        delete doc.profiles[id];
      });
      if (undone && docHasProfile(previousId)) selectProfile(previousId);
      return undone;
    });
  }
  return ok;
}
function docHasProfile(id) {
  return Boolean(id && snapshot.doc?.profiles[id]);
}
export function selectProfile(id) {
  currentId = id;
  signedOutFlag.set(false);
  const url = new URL(window.location.href);
  url.searchParams.delete("signedOut");
  window.history.replaceState({}, "", url);
  publish(snapshot.doc);
}
export function downloadJson(value, filename = "nourally-backup.json") {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportBackup({ scope = "current", stamp = false } = {}) {
  let saved;
  try {
    saved = db ? await read() : null;
  } catch {
    /* Fall back to recoverable legacy data. */
  }
  if (!saved) {
    if (scope === "current") {
      emit({
        ...snapshot,
        error:
          "Could not read this athlete's data for backup. Try again before deleting it.",
      });
      return false;
    }
    try {
      saved = { raw: { ...localStorage } };
    } catch {
      saved = { error: "Browser storage is unavailable." };
    }
    downloadJson(saved, backupFilename("all-athletes"));
    return true;
  }
  const backup = backupDocument(saved, currentId, scope);
  const name =
    scope === "all"
      ? "all-athletes"
      : backup.profiles[currentId].data.profile.name ||
        backup.profiles[currentId].name;
  downloadJson(backup, backupFilename(name));
  if (stamp) {
    // You › This device shows "Last backup: Sep 12" (ADD-12).
    const at = new Date().toISOString();
    const ids = Object.keys(backup.profiles);
    await transaction((doc) => {
      for (const id of ids)
        if (doc.profiles[id]) doc.profiles[id].data.profile.lastBackupAt = at;
    });
  }
  return true;
}
export async function renameProfile(id, name) {
  const next = name.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!next) return false;
  return transaction((doc) => {
    const profile = doc.profiles[id];
    if (!profile) throw new Error("This athlete is no longer on this device");
    profile.name = next;
    profile.data.profile.name = next;
    delete profile.fromBackup;
  });
}
export async function startRecoveryProfile() {
  if (!db) return false;
  const id = uid();
  let raw = {};
  try {
    raw = { ...localStorage };
  } catch {
    /* Storage can be unavailable. */
  }
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("documents", "readwrite");
      const records = tx.objectStore("documents");
      const request = records.get("app");
      request.onsuccess = () => {
        if (request.result)
          records.put(request.result, `recovery-${Date.now()}`);
        records.put(
          {
            version: SCHEMA_VERSION,
            revision: 0,
            defaultProfileId: id,
            profiles: {
              [id]: { id, name: "Recovery profile", data: emptyData() },
            },
            legacyBackup: raw,
          },
          "app",
        );
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    currentId = id;
    publish(await read());
    channel?.postMessage("recovery");
    return true;
  } catch (error) {
    emit({ ...snapshot, error: error.message });
    return false;
  }
}
// DATA-04: read a file for the restore preview; throws a plain-language error.
export async function readBackupFile(file) {
  return readBackupText(await file.text(), {
    validate: validateDocument,
    schemaVersion: SCHEMA_VERSION,
  });
}
export async function importBackup(file) {
  return importBackupDocument(await readBackupFile(file));
}
export async function importBackupDocument(imported) {
  let importedIds = [];
  const ok = await transaction((doc) => {
    importedIds = [];
    for (const profile of Object.values(imported.profiles)) {
      const id = uid();
      importedIds.push(id);
      doc.profiles[id] = {
        ...profile,
        id,
        // DATA-07: the list shows "(from backup)" until the athlete is renamed.
        name: String(profile.name || "").replace(/ \(imported\)$/, ""),
        fromBackup: true,
        data: validateData(profile.data),
      };
    }
  });
  if (ok) {
    const revision = snapshot.doc.revision;
    showToast("Added from backup.", async () => {
      if (snapshot.doc.revision !== revision) return false;
      return transaction((doc) => {
        for (const id of importedIds) delete doc.profiles[id];
      });
    });
  }
  return ok;
}
export async function deleteCurrentProfile() {
  if (!(await exportBackup())) return false;
  // Sign out before the write publishes, so no render or reminder effect can
  // run for the next athlete while Welcome is showing.
  signedOutFlag.set(true);
  const ok = await transaction((doc, id) => {
    if (Object.keys(doc.profiles).length === 1) {
      const next = uid();
      doc.profiles[next] = { id: next, name: "New profile", data: emptyData() };
    }
    delete doc.profiles[id];
    doc.defaultProfileId = Object.keys(doc.profiles)[0];
  });
  if (ok) {
    window.location.hash = "/welcome";
    showToast("Profile deleted.");
  } else signedOutFlag.set(false);
  return ok;
}
channel &&
  (channel.onmessage = async () => {
    try {
      publish(await read());
    } catch (error) {
      emit({ ...snapshot, error: error.message });
    }
  });
if (typeof window !== "undefined") initializeStore();
