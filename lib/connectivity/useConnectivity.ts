"use client";

import { useEffect, useState } from "react";

export type ConnectivityState = {
  /** Browser reports network interface up (may still fail to reach the app backend). */
  online: boolean;
  /** Fired when online transitions false → true in this tab. */
  justReconnected: boolean;
};

export function useConnectivity(): ConnectivityState {
  const [online, setOnline] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const sync = () => setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    sync();

    const onOnline = () => {
      setOnline(true);
      setJustReconnected(true);
    };
    const onOffline = () => {
      setOnline(false);
      setJustReconnected(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!justReconnected) return;
    const t = window.setTimeout(() => setJustReconnected(false), 8000);
    return () => window.clearTimeout(t);
  }, [justReconnected]);

  return { online, justReconnected };
}
