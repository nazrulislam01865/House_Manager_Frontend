"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!path) {
      setData(undefined);
      setLoading(false);
      return;
    }
    const c = new AbortController();
    setLoading(true);
    setError("");
    api<T>(path, { signal: c.signal })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [path, tick]);
  return { data, error, loading, refresh };
}
