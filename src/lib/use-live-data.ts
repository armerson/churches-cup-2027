import { useEffect, useRef, useCallback } from "react";

export function useLiveData(onUpdate: () => void, intervalMs = 4000) {
  const hashRef = useRef("");

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      if (!res.ok) return;
      const { hash } = await res.json();
      if (hash !== hashRef.current) {
        hashRef.current = hash;
        onUpdate();
      }
    } catch {}
  }, [onUpdate]);

  useEffect(() => {
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [check, intervalMs]);
}
