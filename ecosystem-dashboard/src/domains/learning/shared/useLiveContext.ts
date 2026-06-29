/**
 * useLiveContext — React hook that extends useActivityContext with live
 * frame-update pushing.  Whenever the provided stateRef changes, the hook
 * calls `hub.notifyFrameUpdate()` so the Context Hub and all subscribers
 * (panel header, TutorCompanion, etc.) stay in sync with the surface.
 *
 * Usage:
 *   const stateRef = useRef<WorkspaceStateSnapshot>({ pageTitle: 'My Page' });
 *   useLiveContext(KNOWN_ACTIVITY_IDS.WORKSPACE, createWorkspaceContextProvider, stateRef);
 *
 *   // Later, when state changes:
 *   stateRef.current = { pageTitle: 'New Page' };
 *   // The hook detects the ref mutation via a tick counter and pushes the update.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { getContextHub } from './context-hub-service';
import type { ContextProvider } from './context-hub';
import { useActivityContext } from './useActivityContext';

export function useLiveContext<T>(
  activityId: string,
  providerFactory: (stateRef: { current: T }) => ContextProvider,
  stateRef: { current: T },
): void {
  const hub = useMemo(() => getContextHub(), []);
  const [tick, setTick] = useState(0);
  const lastSnapshotRef = useRef<string>('');

  // Register the provider + set focus on mount.
  const factory = useCallback(() => providerFactory(stateRef), [stateRef]);
  useActivityContext(activityId, factory);

  // Watch the stateRef for changes by polling on a light interval.
  // This avoids requiring the host to call a notify function manually.
  useEffect(() => {
    const interval = setInterval(() => {
      // Simple change detection: compare JSON snapshot
      const snapshot = JSON.stringify(stateRef.current);
      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setTick((t) => t + 1);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [stateRef]);

  // Push update to Hub whenever tick changes.
  useEffect(() => {
    if (tick > 0) {
      hub.notifyFrameUpdate(activityId);
    }
  }, [tick, hub, activityId]);
}
