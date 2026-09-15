import { useSyncExternalStore } from "react";
import {
  emptyData,
  migrateLegacy,
  uid,
  validateData,
  validateDocument,
} from "./domain/storage.js";

let db,
  snapshot = { loading: true },
  currentId;
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
  validateDocument(doc);
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
    return true;
  } catch (error) {
    emit({
      ...snapshot,
      error: `Not saved: ${error.message}. Export a backup before closing this tab.`,
    });
    return false;
  }
}
export const changeData = (reducer) =>
  transaction((doc, id) => {
    reducer(doc.profiles[id].data);
  });
export const setField = (field, update) =>
  changeData((data) => {
    data[field] = typeof update === "function" ? update(data[field]) : update;
  });
export function useStore() {
  return useSyncExternalStore(subscribe, () => snapshot);
}
export function useField(field) {
  const state = useStore();
  return [state.current?.data[field], (update) => setField(field, update)];
}
export async function createProfile(name, email = "") {
  const id = uid();
  const ok = await transaction((doc) => {
    const data = emptyData();
    data.profile.name = name;
    doc.profiles[id] = { id, name, email, data };
  });
  if (ok) selectProfile(id);
  return ok;
}
export function selectProfile(id) {
  currentId = id;
  sessionStorage.removeItem("nourally-signed-out");
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
export async function exportBackup() {
  let saved;
  try {
    saved = db ? await read() : null;
  } catch {
    /* Fall back to recoverable legacy data. */
  }
  if (!saved) {
    try {
      saved = { raw: { ...localStorage } };
    } catch {
      saved = { error: "Browser storage is unavailable." };
    }
  }
  downloadJson(saved);
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
            version: 2,
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
export async function importBackup(file) {
  const imported = validateDocument(JSON.parse(await file.text()));
  return transaction((doc) => {
    for (const profile of Object.values(imported.profiles)) {
      const id = uid();
      doc.profiles[id] = {
        ...profile,
        id,
        name: `${profile.name} (imported)`,
        data: validateData(profile.data),
      };
    }
  });
}
export async function deleteCurrentProfile() {
  await exportBackup();
  return transaction((doc, id) => {
    if (Object.keys(doc.profiles).length === 1) {
      const next = uid();
      doc.profiles[next] = { id: next, name: "New profile", data: emptyData() };
    }
    delete doc.profiles[id];
    doc.defaultProfileId = Object.keys(doc.profiles)[0];
  });
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
