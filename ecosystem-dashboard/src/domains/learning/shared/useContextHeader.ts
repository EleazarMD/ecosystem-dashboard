/**
 * useContextHeader — React hook that subscribes to Context Hub focus changes
 * and returns contextual info for rendering a dynamic panel header.
 *
 * Exposes:
 * - frameTitle: the current focus frame's title (or null)
 * - activityName: the registered activity's display name
 * - personaName: the active persona's name (or null)
 * - toolCount: number of tools on the active roster (0 if none)
 * - activityId: the current focus activity id (or null)
 */

import { useState, useEffect } from 'react';
import { getContextHub } from './context-hub-service';
import { activityRegistry } from './activity-types';
import type { ContextFrame } from './context-hub';

export interface ContextHeaderInfo {
  frameTitle: string | null;
  activityName: string | null;
  personaName: string | null;
  toolCount: number;
  activityId: string | null;
}

export function useContextHeader(): ContextHeaderInfo {
  const [info, setInfo] = useState<ContextHeaderInfo>({
    frameTitle: null,
    activityName: null,
    personaName: null,
    toolCount: 0,
    activityId: null,
  });

  useEffect(() => {
    const hub = getContextHub();

    const update = (frame?: ContextFrame | null) => {
      const currentFrame = frame ?? hub.getFocusFrame();
      const activityId = hub.getFocusActivityId();
      const activity = activityId ? activityRegistry.get(activityId as any) : undefined;

      setInfo({
        frameTitle: currentFrame?.title ?? null,
        activityName: activity?.name ?? null,
        personaName: activity?.persona?.name ?? null,
        toolCount: activity?.toolRoster?.tools.length ?? 0,
        activityId,
      });
    };

    update();
    const unsub = hub.subscribe((frame) => update(frame));
    return unsub;
  }, []);

  return info;
}
