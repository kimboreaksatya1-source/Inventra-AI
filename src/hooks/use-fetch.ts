"use client";

import { useCallback, useEffect, useState } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Lightweight data fetcher with auto-refresh control. */
export function useFetch<T>(url: string | null, opts: { deps?: any[] } = {}): FetchState<T> {
  const { deps = [] } = opts;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      setData(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json() as Promise<T>;
      })
      .then((json) => {
        if (active) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message || "Something went wrong");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [url, nonce, ...deps]);

  return { data, loading, error, refresh };
}

/** POST helper returning { data, error }. */
export async function postJSON<T>(
  url: string,
  body: unknown
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return { data: null, error: j?.error || `Request failed (${res.status})` };
    }
    const json = (await res.json()) as T;
    return { data: json, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || "Network error" };
  }
}
