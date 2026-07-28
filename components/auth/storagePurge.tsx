"use client";

/**
 * On every app load:
 *  1. Migrate any leftover localStorage values into session cookies
 *  2. Wipe localStorage + sessionStorage entirely
 *
 * Session state must live only in cookies (cleared on browser close / logout).
 */

import { useEffect } from "react";
import {
  clearBrowserStorage,
  getClientCookie,
  setClientCookie,
} from "@/lib/auth/clientCookies";

/** Keys that may still exist from older builds — copy into cookies, then wipe. */
const MIGRATE_TO_COOKIE = ["icrcs-locale"] as const;

export default function StoragePurge() {
  useEffect(() => {
    try {
      for (const key of MIGRATE_TO_COOKIE) {
        if (getClientCookie(key)) continue;
        const raw = window.localStorage.getItem(key);
        if (raw) setClientCookie(key, raw);
      }
    } catch {
      // ignore
    }
    clearBrowserStorage();
  }, []);
  return null;
}
