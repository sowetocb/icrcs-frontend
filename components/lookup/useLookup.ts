"use client";

import { useEffect, useState } from "react";
import type { LookupItem } from "@/lib/api/lookup";

type State = { options: LookupItem[]; loading: boolean; error: boolean };

/**
 * Fetches a lookup list (with the module-level cache behind it) and tracks
 * loading/error. Re-runs when `deps` change — pass the parent id(s) for
 * cascading lookups. A failed/absent endpoint yields an empty list so callers
 * can fall back to static options.
 */
export function useLookup(
  loader: () => Promise<LookupItem[]>,
  deps: unknown[] = [],
): State {
  const [state, setState] = useState<State>({
    options: [],
    loading: false,
    error: false,
  });

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, loading: true, error: false }));
    loader()
      .then((options) => {
        if (alive) setState({ options, loading: false, error: false });
      })
      .catch(() => {
        if (alive) setState({ options: [], loading: false, error: true });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
