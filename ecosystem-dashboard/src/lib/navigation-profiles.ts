/**
 * Navigation Profiles
 * 
 * Maps feature flags to navigation items.
 * Used to dynamically build navigation based on user's feature access.
 */

import {
  HomeIcon,
  ServerIcon,
  DocumentTextIcon,
  CpuChipIcon,
  BoltIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  CogIcon,
  UserGroupIcon,
  CommandLineIcon,
  ChartBarIcon,
  AcademicCapIcon,
  MicrophoneIcon,
  ChartPieIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  BeakerIcon,
  WrenchScrewdriverIcon,
  CubeTransparentIcon,
  CircleStackIcon,
  SparklesIcon,
  CalendarIcon,
  ShieldExclamationIcon,
  UsersIcon,
  Squares2X2Icon,
  HeartIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import type { NavItem } from '@/components/layout/GlassSidebar';
import type { FeatureFlag, UserFeatureAccess } from './subscription-tiers';
import { hasFeatureAccess } from './subscription-tiers';

// ═══════════════════════════════════════════════════════════════
// FEATURE TO NAVIGATION MAPPING
// ═══════════════════════════════════════════════════════════════

interface FeatureNavItem extends NavItem {
  requiredFeature: FeatureFlag;
  requirePlatformAdmin?: boolean;
  children?: FeatureNavItem[];
}

/**
 * Complete navigation structure with feature requirements.
 * Each item specifies which feature flag is required to see it.
 */
export const FEATURE_NAV_ITEMS: FeatureNavItem[] = [
  // ═══════════════════════════════════════════════════════════════
  // HOME / DASHBOARD (TOP OF LIST)
  // ═══════════════════════════════════════════════════════════════
  {
    label: 'Home',
    path: '/dashboard',
    icon: HomeIcon,
    domain: 'settings',
    requiredFeature: 'workspace', // Everyone with workspace access can see home
  },

  // ═══════════════════════════════════════════════════════════════
  // PRIMARY PRODUCTIVITY
  // ═══════════════════════════════════════════════════════════════
  {
    label: 'Workspace',
    path: '/workspace',
    icon: BookOpenIcon,
    domain: 'workspace',
    requiredFeature: 'workspace',
  },
  {
    label: 'Email',
    path: '/email',
    icon: EnvelopeIcon,
    domain: 'productivity',
    requiredFeature: 'email',
  },
  {
    label: 'AI Research',
    path: '/ai-research',
    icon: MagnifyingGlassIcon,
    domain: 'research',
    requiredFeature: 'ai-research',
  },
  {
    label: 'Personal AI',
    path: '#',
    icon: SparklesIcon,
    domain: 'personalAI',
    requiredFeature: 'chat',
    children: [
      {
        label: 'Chat',
        path: '/openclaw',
        icon: SparklesIcon,
        requiredFeature: 'chat',
      },
      {
        label: 'Personal Context',
        path: '/personal-context',
        icon: UserGroupIcon,
        badge: 'PIC',
        badgeColorScheme: 'purple',
        requiredFeature: 'personal-context',
      },
    ],
  },
  {
    label: 'Calendar',
    path: '/calendar',
    icon: CalendarIcon,
    domain: 'productivity',
    requiredFeature: 'calendar',
    isNew: true,
  },
  {
    label: 'Approvals',
    path: '/approvals',
    icon: ShieldExclamationIcon,
    domain: 'productivity',
    badge: 'AI',
    badgeColorScheme: 'purple',
    requiredFeature: 'approvals',
  },

  // ═══════════════════════════════════════════════════════════════
  // CREATIVE TOOLS
  // ═══════════════════════════════════════════════════════════════
  {
    label: 'Podcast Studio',
    path: '/podcast-studio',
    icon: MicrophoneIcon,
    domain: 'creative',
    requiredFeature: 'podcast-studio',
  },
  {
    label: 'Image Studio',
    path: '/image-studio',
    icon: PhotoIcon,
    domain: 'creative',
    requiredFeature: 'image-studio',
  },

  // ═══════════════════════════════════════════════════════════════
  // LEARNING
  // ═══════════════════════════════════════════════════════════════
  {
    label: 'Book Explorer',
    path: '/books',
    icon: BookOpenIcon,
    domain: 'learning',
    requiredFeature: 'books',
  },

  // ═══════════════════════════════════════════════════════════════
  // ML & AI TRAINING
  // ═══════════════════════════════════════════════════════════════
  {
    label: 'ML Training',
    path: '#',
    icon: BeakerIcon,
    domain: 'mlResearch',
    requiredFeature: 'ml-training',
    children: [
      {
        label: 'Training Hub',
        path: '/ml-training',
        icon: WrenchScrewdriverIcon,
        requiredFeature: 'ml-training',
      },
      {
        label: 'Pipeline Designer',
        path: '/ml-training?section=pipeline-designer',
        icon: CubeTransparentIcon,
        requiredFeature: 'ml-training',
      },
      {
        label: 'Model Registry',
        path: '/ml-training?section=model-registry',
        icon: CircleStackIcon,
        requiredFeature: 'ml-training',
      },
      {
        label: 'Experiments',
        path: '/ml-training?section=experiments',
        icon: BeakerIcon,
        requiredFeature: 'ml-training',
      },
    ],
  },
  {
    label: 'Agentic Workflows',
    path: '/agentic-workflows',
    icon: BoltIcon,
    domain: 'aiSystems',
    requiredFeature: 'agentic-workflows',
  },
  {
    label: 'Clinical Evidence',
    path: '/clinical-evidence',
    icon: AcademicCapIcon,
    domain: 'research',
    requiredFeature: 'clinical-evidence',
  },

  // ═══════════════════════════════════════════════════════════════
  // KNOWLEDGE & DATA
  // ═══════════════════════════════════════════════════════════════
  {
    label: 'Knowledge Base',
    path: '#',
    icon: BookOpenIcon,
    domain: 'knowledge',
    requiredFeature: 'knowledge-base',
    children: [
      {
        label: 'Knowledge Hub',
        path: '/knowledge',
        icon: BookOpenIcon,
        requiredFeature: 'knowledge-base',
      },
      {
        label: 'Graph View',
        path: '/knowledge?tab=graph',
        icon: ChartPieIcon,
        requiredFeature: 'knowledge-base',
      },
      {
        label: 'Documents',
        path: '/knowledge/documents',
        icon: DocumentTextIcon,
        requiredFeature: 'knowledge-base',
      },
      {
        label: 'IDE Memory',
        path: '/ide-memory',
        icon: CpuChipIcon,
        requiredFeature: 'ide-memory',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // SYSTEM INFRASTRUCTURE
  // ═══════════════════════════════════════════════════════════════
  {
    label: 'AI Gateway',
    path: '/infrastructure/ai-gateway',
    icon: CpuChipIcon,
    domain: 'infrastructure',
    requiredFeature: 'ai-gateway',
  },
  {
    label: 'AI Inferencing',
    path: '/ai-inferencing',
    icon: BoltIcon,
    domain: 'infrastructure',
    requiredFeature: 'ai-inferencing',
  },
  {
    label: 'Infrastructure',
    path: '#',
    icon: ServerIcon,
    domain: 'infrastructure',
    requiredFeature: 'infrastructure',
    children: [
      {
        label: 'AHIS',
        path: '/infrastructure/ahis',
        icon: ServerIcon,
        requiredFeature: 'infrastructure',
      },
      {
        label: 'Agent Registry',
        path: '/agent-registry',
        icon: UserGroupIcon,
        requiredFeature: 'agent-registry',
      },
      {
        label: 'Port Registry',
        path: '/infrastructure/ports',
        icon: CommandLineIcon,
        requiredFeature: 'infrastructure',
      },
      {
        label: 'Kubernetes',
        path: '/infrastructure/kubernetes',
        icon: ServerIcon,
        requiredFeature: 'infrastructure',
      },
      {
        label: 'Agentic Control',
        path: '/agentic-control',
        icon: Cog6ToothIcon,
        requiredFeature: 'infrastructure',
      },
      {
        label: 'Agent Control',
        path: '/openclaw-control',
        icon: BoltIcon,
        badge: 'Live',
        badgeColorScheme: 'green',
        requiredFeature: 'infrastructure',
      },
    ],
  },
  {
    label: 'Monitoring',
    path: '/monitoring',
    icon: ChartBarIcon,
    domain: 'infrastructure',
    requiredFeature: 'monitoring',
  },

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS & ADMIN
  // ═══════════════════════════════════════════════════════════════
  {
    label: 'Admin',
    path: '#',
    icon: ShieldCheckIcon,
    domain: 'admin',
    requiredFeature: 'admin-panel',
    requirePlatformAdmin: true,
    children: [
      {
        label: 'Admin Home',
        path: '/admin',
        icon: ShieldCheckIcon,
        requiredFeature: 'admin-panel',
      },
      {
        label: 'Users',
        path: '/admin/users',
        icon: UsersIcon,
        requiredFeature: 'user-management',
      },
      {
        label: 'Books',
        path: '/admin/books',
        icon: BookOpenIcon,
        requiredFeature: 'admin-panel',
      },
      {
        label: 'Workspaces',
        path: '/admin/tenants',
        icon: Squares2X2Icon,
        requiredFeature: 'admin-panel',
      },
      {
        label: 'Platform Config',
        path: '/infrastructure/platform',
        icon: CogIcon,
        requiredFeature: 'platform-config',
      },
    ],
  },
  {
    label: 'Family',
    path: '/family',
    icon: HeartIcon,
    domain: 'settings',
    requiredFeature: 'family-management',
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: CogIcon,
    domain: 'settings',
    requiredFeature: 'settings',
  },
  {
    label: 'System Backup',
    path: '/system-backup',
    icon: ServerIcon,
    domain: 'settings',
    requiredFeature: 'system-backup',
  },
];

// ═══════════════════════════════════════════════════════════════
// NAVIGATION BUILDER
// ═══════════════════════════════════════════════════════════════

/**
 * Filter navigation items based on user's feature access
 */
export function buildNavigationForUser(
  access: UserFeatureAccess,
  isPlatformAdmin: boolean = false
): NavItem[] {
  const filterItem = (item: FeatureNavItem): NavItem | null => {
    // Check platform admin requirement
    if (item.requirePlatformAdmin && !isPlatformAdmin) {
      return null;
    }

    // Check feature access
    if (!hasFeatureAccess(access, item.requiredFeature)) {
      return null;
    }

    // Process children if any
    if (item.children && item.children.length > 0) {
      const filteredChildren = item.children
        .map(child => filterItem(child))
        .filter((child): child is NavItem => child !== null);

      // If no children passed the filter, don't show the parent
      if (filteredChildren.length === 0) {
        return null;
      }

      // Return item without requiredFeature and requirePlatformAdmin (internal only)
      const { requiredFeature, requirePlatformAdmin, children, ...navItem } = item;
      return {
        ...navItem,
        children: filteredChildren,
      };
    }

    // Return item without requiredFeature and requirePlatformAdmin (internal only)
    const { requiredFeature, requirePlatformAdmin, ...navItem } = item;
    return navItem;
  };

  return FEATURE_NAV_ITEMS
    .map(item => filterItem(item))
    .filter((item): item is NavItem => item !== null);
}

/**
 * Get navigation items that would be unlocked by upgrading to a tier
 */
export function getUpgradePreview(
  currentAccess: UserFeatureAccess,
  targetTier: string
): NavItem[] {
  // This would show what new nav items they'd get
  // Implementation depends on how you want to show upgrade benefits
  return [];
}

/**
 * Get navigation items that would be unlocked by purchasing an add-on
 */
export function getAddOnPreview(
  currentAccess: UserFeatureAccess,
  addOnId: string
): NavItem[] {
  // This would show what new nav items they'd get from an add-on
  return [];
}
