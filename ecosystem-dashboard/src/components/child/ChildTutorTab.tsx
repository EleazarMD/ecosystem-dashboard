import React, { useState, useEffect } from 'react';
import { TutorCompanion } from '@/components/child/TutorCompanion';
import {
  activityRegistry,
  KNOWN_ACTIVITY_IDS,
  getPiCodeTransport,
  getContextHub,
  buildContextEnvelope,
} from '@/domains/learning/shared/activity-registry';

interface ChildTutorTabProps {
  defaultActivityId: string;
  defaultTitle: string;
}

export function ChildTutorTab({ defaultActivityId, defaultTitle }: ChildTutorTabProps) {
  const [contextEnvelope, setContextEnvelope] = useState<any>(null);
  
  useEffect(() => {
    const hub = getContextHub();
    const updateEnvelope = () => {
      const frame = hub.getFocusFrame();
      const activityId = frame?.activityId || defaultActivityId;
      const activity = activityRegistry.get(activityId);
      
      if (frame) {
        setContextEnvelope(buildContextEnvelope(frame, { toolRosterId: activity?.toolRoster?.id }));
      } else {
        setContextEnvelope(buildContextEnvelope({
          kind: 'dashboard',
          activityId: defaultActivityId,
          title: defaultTitle,
        }));
      }
    };
    
    updateEnvelope();
    const unsubscribe = hub.subscribe(() => {
      updateEnvelope();
    });
    
    return unsubscribe;
  }, [defaultActivityId, defaultTitle]);

  const frameActivityId = getContextHub().getFocusFrame()?.activityId || defaultActivityId;
  const activity = activityRegistry.get(frameActivityId);

  if (!contextEnvelope) return null;

  return (
    <TutorCompanion
      activityId={frameActivityId}
      transport={getPiCodeTransport()}
      contextEnvelope={contextEnvelope}
      persona={activity?.persona}
      roster={activity?.toolRoster}
      title={defaultTitle}
      compact={true}
      quickActions={activity?.quickActions}
      greeting={activity?.greeting}
    />
  );
}
