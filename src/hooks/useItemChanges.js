import { useLayoutEffect, useRef, useState } from "react";
import { useStore } from "../store.js";

// A different record or an unrelated write leaves the current draft alone.
// Reload only after a cross-tab publication changes this record. Missing
// records keep the existing removed-item error path when the athlete saves.
export function useItemChanges(id, item, onReload) {
  const { externalRevision } = useStore();
  const serialized = JSON.stringify(item);
  const previous = useRef({ id, externalRevision });
  const reload = useRef(onReload);
  reload.current = onReload;
  const [state, setState] = useState({
    changed: false,
    version: 0,
    source: item,
  });
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { id, externalRevision };
    if (before.id !== id) {
      setState({ changed: false, version: 0, source: item });
    } else if (
      id &&
      item &&
      before.externalRevision !== externalRevision &&
      JSON.stringify(state.source) !== serialized
    ) {
      reload.current(item);
      setState((value) => ({
        changed: true,
        version: value.version + 1,
        source: item,
      }));
    }
  }, [id, serialized, externalRevision]);
  return state;
}
