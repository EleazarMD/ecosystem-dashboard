/**
 * useFilteredNavigation Hook
 * 
 * Filters navigation items based on user type, permissions, and subscription.
 * Uses the subscription-based navigation system from navigation-profiles.ts
 * 
 * - Children: Only see allowed services with themed icons
 * - Parents/Users: See navigation based on subscription tier + purchased features
 * - Admins: See subscription-based navigation (not legacy full nav)
 */

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import type { NavItem } from '@/components/layout/GlassSidebar';
import { HomeIcon } from '@heroicons/react/24/outline';
import { getChildTheme } from '@/lib/child-themes';
import { buildNavigationForUser } from '@/lib/navigation-profiles';
import { 
  UserFeatureAccess, 
  getDefaultFeatureAccess,
  SUBSCRIPTION_TIERS,
} from '@/lib/subscription-tiers';

// Parent-focused navigation paths
const PARENT_NAV_PATHS = [
  '/family',
  '/workspace',
  '/email',
  '/calendar',
  '/goose-mind',
  '/image-studio',
  '/settings',
];

// Child-allowed service paths (filtered by parental controls at API level)
const CHILD_NAV_PATHS = [
  '/workspace',
  '/goose-mind',
  '/image-studio',
  '/calendar',
  '/email',
  '/books', // Book Explorer
];

// Map regular paths to child-specific paths
const CHILD_PATH_MAP: Record<string, string> = {
  '/workspace': '/child/workspace',
  '/goose-mind': '/child/chat',
  '/image-studio': '/child/art-studio',
  '/email': '/child/email',
  '/dashboard': '/child/home',
  '/calendar': '/child/planner',
  '/books': '/child/book-explorer',
};

// Child-friendly labels
const CHILD_LABEL_MAP: Record<string, string> = {
  '/workspace': 'Writing',
  '/goose-mind': 'Chat',
  '/image-studio': 'Art Studio',
  '/email': 'Email Helper',
  '/calendar': 'My Planner',
  '/books': 'Book Explorer',
};

interface UseFilteredNavigationResult {
  navigationItems: NavItem[];
  userType: 'child' | 'parent' | 'admin' | 'user';
  homePath: string;
  showFullNav: boolean;
}

export function useFilteredNavigation(): UseFilteredNavigationResult {
  const { data: session } = useSession();
  
  return useMemo(() => {
    const user = session?.user as any;
    
    if (!user) {
      // No session - return minimal navigation with free tier
      const freeAccess = getDefaultFeatureAccess('anonymous', 'free');
      return {
        navigationItems: buildNavigationForUser(freeAccess, false),
        userType: 'user',
        homePath: '/dashboard',
        showFullNav: false,
      };
    }

    const accountType = user.accountType;
    const platformRole = user.platformRole;
    const isParent = user.isParent;
    const isPlatformAdmin = platformRole === 'platform-admin';

    // Child account - show limited navigation with child-specific paths and themed icons
    if (accountType === 'child') {
      // Get child's theme for themed icons
      const themeId = user.themeId || 'child-pusheen';
      const theme = getChildTheme(themeId);
      const serviceIcons = theme?.childExtras?.serviceIcons;
      
      // Map service paths to themed icon keys
      const CHILD_ICON_MAP: Record<string, string | undefined> = {
        '/child/home': serviceIcons?.home,
        '/child/workspace': serviceIcons?.writing,
        '/child/chat': serviceIcons?.chat,
        '/child/art-studio': serviceIcons?.art,
        '/child/email': serviceIcons?.email,
        '/child/planner': serviceIcons?.planner,
        '/child/book-explorer': serviceIcons?.books,
      };
      
      // Start with Home item for children
      const homeItem: NavItem = {
        label: 'Home',
        path: '/child/home',
        icon: HomeIcon,
        imageIcon: serviceIcons?.home,
      };

      // Build base navigation for child (use family tier to include all child-accessible features)
      // Children should have access to: workspace, chat, image-studio, email, calendar
      const childBaseAccess: UserFeatureAccess = {
        userId: user.id,
        subscriptionTier: 'family', // Use family tier to ensure all child features are available
        purchasedAddOns: [],
        adminGrantedFeatures: ['image-studio'], // Ensure Art Studio is always available for children
        adminRevokedFeatures: [],
        extraChildSlots: 0,
      };
      const baseNavItems = buildNavigationForUser(childBaseAccess, false);
      
      const childNavItems = baseNavItems.filter(item => {
        // Check if the item's path is in allowed paths
        if (CHILD_NAV_PATHS.includes(item.path)) return true;
        // Check children paths
        if (item.children) {
          return item.children.some(child => CHILD_NAV_PATHS.includes(child.path));
        }
        return false;
      }).map(item => {
        // Remap paths to child-specific routes
        const childPath = CHILD_PATH_MAP[item.path] || item.path;
        const childLabel = CHILD_LABEL_MAP[item.path] || item.label;
        const imageIcon = CHILD_ICON_MAP[childPath];
        
        // Filter and remap children as well
        if (item.children) {
          return {
            ...item,
            path: childPath,
            label: childLabel,
            imageIcon,
            children: item.children
              .filter(child => CHILD_NAV_PATHS.includes(child.path))
              .map(child => {
                const mappedPath = CHILD_PATH_MAP[child.path] || child.path;
                return {
                  ...child,
                  path: mappedPath,
                  label: CHILD_LABEL_MAP[child.path] || child.label,
                  imageIcon: CHILD_ICON_MAP[mappedPath],
                };
              }),
          };
        }
        return {
          ...item,
          path: childPath,
          label: childLabel,
          imageIcon,
        };
      });

      return {
        navigationItems: [homeItem, ...childNavItems],
        userType: 'child',
        homePath: '/child/home',
        showFullNav: false,
      };
    }

    // Build feature access from user session data
    const subscriptionTier = user.subscriptionTier || 'free';
    const featureAccess: UserFeatureAccess = {
      userId: user.id || 'unknown',
      subscriptionTier: isPlatformAdmin ? 'admin' : subscriptionTier,
      purchasedAddOns: user.purchasedAddOns || [],
      adminGrantedFeatures: user.grantedFeatures || [],
      adminRevokedFeatures: user.revokedFeatures || [],
      extraChildSlots: user.extraChildSlots || 0,
      customLimits: user.customLimits,
    };

    // Build navigation based on feature access
    const subscriptionNavItems = buildNavigationForUser(featureAccess, isPlatformAdmin);

    // Parent account - ensure Family is prominent
    if (isParent && !isPlatformAdmin) {
      return {
        navigationItems: subscriptionNavItems,
        userType: 'parent',
        homePath: '/family',
        showFullNav: false,
      };
    }

    // Platform admin - use subscription-based navigation with admin tier
    if (isPlatformAdmin) {
      return {
        navigationItems: subscriptionNavItems,
        userType: 'admin',
        homePath: '/dashboard',
        showFullNav: false,
      };
    }

    // Regular user - subscription-based navigation
    return {
      navigationItems: subscriptionNavItems,
      userType: 'user',
      homePath: '/dashboard',
      showFullNav: false,
    };
  }, [session]);
}

export default useFilteredNavigation;
