"use client";

import { useCallback, useEffect, useState } from "react";

export type ConnectivityState = {
  /** Browser reports network interface up (may still fail to reach the app backend). */
  online: boolean;
  /** Lightweight ping confirms the local API/proxy is reachable — not just navigator.onLine. */
  apiReachable: boolean;
  /** Fired when connectivity is restored in this tab (browser online + API ping ok). */
  justReconnected: boolean;
};

const API_PING_INTERVAL_MS = 45_000;
const API_PING_TIMEOUT_MS = 3_000;

async function pingApi(): Promise<boolean> {
  try {
    const res = await fetch("/api/proxy/v1/lookup/territories", {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(API_PING_TIMEOUT_MS),
    });
    // Any HTTP response means the proxy + backend answered (401/403 still = reachable).
    return res.status !== 502 && res.status !== 503;
  } catch {
    return false;
  }
}

export function useConnectivity(): ConnectivityState {
  const [online, setOnline] = useState(true);
  const [apiReachable, setApiReachable] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);

  const checkApi = useCallback(async () => {
    const ok = await pingApi();
    setApiReachable(ok);
    return ok;
  }, []);

  useEffect(() => {
    const sync = () => setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    sync();

    const onOnline = () => {
      setOnline(true);
      void checkApi().then((ok) => {
        if (ok) setJustReconnected(true);
      });
    };
    const onOffline = () => {
      setOnline(false);
      setApiReachable(false);
      setJustReconnected(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [checkApi]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const ok = await pingApi();
      if (!cancelled) setApiReachable(ok);
    };
    void run();
    const interval = window.setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) void run();
    }, API_PING_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!justReconnected) return;
    const t = window.setTimeout(() => setJustReconnected(false), 8000);
    return () => window.clearTimeout(t);
  }, [justReconnected]);

  const effectivelyOnline = online && apiReachable;

  return { online: effectivelyOnline, apiReachable, justReconnected };
}
