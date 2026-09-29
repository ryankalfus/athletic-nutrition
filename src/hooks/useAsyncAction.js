import { useCallback, useRef, useState } from "react";

export function useAsyncAction() {
  const [pending, setPending] = useState(null);
  const pendingRef = useRef(false);
  const run = useCallback(async (key, action) => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(key);
    try {
      return await action();
    } finally {
      pendingRef.current = false;
      setPending(null);
    }
  }, []);
  return { pending, run };
}
