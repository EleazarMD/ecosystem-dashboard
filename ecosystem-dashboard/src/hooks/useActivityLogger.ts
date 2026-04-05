/**
 * Activity Logger Hook
 * 
 * Automatically logs child activities for parent monitoring
 */

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export function useActivityLogger() {
  const { data: session } = useSession();
  const router = useRouter();
  const lastPath = useRef<string>('');

  useEffect(() => {
    const user = session?.user as any;
    
    // Only log for child accounts
    if (!user || user.accountType !== 'child') {
      return;
    }

    // Don't log the same path twice in a row
    if (lastPath.current === router.asPath) {
      return;
    }

    lastPath.current = router.asPath;

    // Log page view
    const logPageView = async () => {
      try {
        await fetch('/api/activities/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityType: 'page_view',
            activityData: {
              path: router.asPath,
              pathname: router.pathname,
            },
          }),
        });
      } catch (error) {
        console.error('[ActivityLogger] Error logging page view:', error);
      }
    };

    logPageView();
  }, [session, router.asPath]);
}
