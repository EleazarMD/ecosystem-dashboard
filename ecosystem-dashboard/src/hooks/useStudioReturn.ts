/**
 * useStudioReturn — detects when a studio was launched from the Learning Path
 * and provides a callback to complete the path step.
 *
 * When a child clicks a step with customContentType 'writing' / 'read' / 'explore' / 'art',
 * ChildLearningPath navigates to the studio with query params:
 *   ?returnTo=learning-path&stepNumber=N&pathId=...&skillCode=...&prompt=...
 *
 * The studio uses this hook to:
 * 1. Detect the return context
 * 2. Show a "Path Step" banner with the prompt
 * 3. Call completeStep() when the child finishes their activity
 * 4. Navigate back to /child/learning-path
 */

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';

export interface StudioReturnContext {
  /** True when the studio was launched from the learning path */
  isFromPath: boolean;
  /** Path ID from the query */
  pathId: string;
  /** Step number to complete */
  stepNumber: number;
  /** Skill code for the step */
  skillCode: string;
  /** Custom prompt for the step */
  prompt: string;
  /** Complete the path step with a score and navigate back */
  completeStep: (score?: number) => Promise<void>;
  /** Navigate back to the learning path without completing */
  goBack: () => void;
}

export function useStudioReturn(): StudioReturnContext {
  const router = useRouter();

  const returnTo = typeof router.query.returnTo === 'string' ? router.query.returnTo : '';
  const isFromPath = returnTo === 'learning-path';

  const pathId = typeof router.query.pathId === 'string' ? router.query.pathId : '';
  const stepNumberStr = typeof router.query.stepNumber === 'string' ? router.query.stepNumber : '';
  const stepNumber = parseInt(stepNumberStr, 10) || 0;
  const skillCode = typeof router.query.skillCode === 'string' ? router.query.skillCode : '';
  const prompt = typeof router.query.prompt === 'string' ? router.query.prompt : '';

  const [completing, setCompleting] = useState(false);

  const completeStep = useCallback(
    async (score: number = 1.0) => {
      if (!pathId || !stepNumber) return;
      setCompleting(true);
      try {
        await fetch('/api/child/learning-path?action=complete-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pathId,
            stepNumber,
            score,
            timeSpentSeconds: 60,
          }),
        });
      } catch {
        // best-effort — still navigate back
      } finally {
        setCompleting(false);
        router.push('/child/learning-path');
      }
    },
    [pathId, stepNumber, router],
  );

  const goBack = useCallback(() => {
    router.push('/child/learning-path');
  }, [router]);

  return useMemo(
    () => ({
      isFromPath,
      pathId,
      stepNumber,
      skillCode,
      prompt,
      completeStep,
      goBack,
    }),
    [isFromPath, pathId, stepNumber, skillCode, prompt, completeStep, goBack],
  );
}
