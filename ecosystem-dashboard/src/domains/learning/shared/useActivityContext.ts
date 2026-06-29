/**
 * useActivityContext — React hook that registers a context provider with the
 * Context Hub on mount and updates the focus frame whenever the state ref changes.
 *
 * Usage:
 *   const stateRef = useRef<MyState>({ ... });
 *   useActivityContext(KNOWN_ACTIVITY_IDS.LEARN_HUB, createLearnHubContextProvider(stateRef));
 *
 * The hook handles:
 * - Registering the provider with the Context Hub on mount
 * - Setting the focus to this activity on mount
 * - Unregistering on unmount
 */

import { useEffect, useRef, useMemo } from 'react';
import { getContextHub } from '@/domains/learning/shared/context-hub-service';
import type { ContextProvider } from '@/domains/learning/shared/context-hub';

export function useActivityContext(
  activityId: string,
  providerFactory: () => ContextProvider,
): void {
  const hub = useMemo(() => getContextHub(), []);
  const providerRef = useRef<ContextProvider | null>(null);

  useEffect(() => {
    const provider = providerFactory();
    providerRef.current = provider;
    hub.registerProvider(provider);
    hub.setFocus(activityId);

    return () => {
      hub.unregisterProvider(activityId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);
}
