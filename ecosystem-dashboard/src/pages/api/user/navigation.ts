/**
 * User Navigation API
 * 
 * Returns filtered navigation items based on user type and permissions
 * - Children: Only allowed services from parental controls
 * - Parents: Standard navigation + Family link
 * - Admins: Full navigation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// Service ID to navigation path mapping
const SERVICE_TO_PATH: Record<string, string> = {
  'workspace': '/workspace',
  'goosemind-chat': '/openclaw',
  'goosemind-voice': '/openclaw',
  'personal-ai': '/openclaw',
  'image-studio': '/image-studio',
  'calendar': '/calendar',
  'email-client': '/email',
  'email': '/email',
  'research-lab': '/ai-research',
  'podcast-studio': '/podcast-studio',
};

// Child-friendly service definitions - matches child dashboard API
const CHILD_SERVICES = [
  { id: 'personal-ai', label: 'AI Chat', path: '/openclaw', emoji: '🤖', description: 'Chat with your AI friend', color: 'purple' },
  { id: 'goosemind-voice', label: 'Voice Chat', path: '/openclaw?mode=voice', emoji: '🎙️', description: 'Talk to OpenClaw', color: 'blue' },
  { id: 'image-studio', label: 'Art Studio', path: '/image-studio', emoji: '🎨', description: 'Create amazing pictures', color: 'pink' },
  { id: 'workspace', label: 'My Workspace', path: '/workspace', emoji: '📝', description: 'Write and create', color: 'green' },
  { id: 'calendar', label: 'Calendar', path: '/calendar', emoji: '📅', description: 'See your schedule', color: 'orange' },
  { id: 'email-client', label: 'Email', path: '/email', emoji: '✉️', description: 'Check your messages', color: 'teal' },
];

// Parent-focused navigation
const PARENT_NAV_ITEMS = [
  { label: 'Family', path: '/family', icon: 'HeartIcon', domain: 'family' },
  { label: 'Workspace', path: '/workspace', icon: 'BookOpenIcon', domain: 'workspace' },
  { label: 'Email', path: '/email', icon: 'EnvelopeIcon', domain: 'productivity' },
  { label: 'Calendar', path: '/calendar', icon: 'CalendarIcon', domain: 'productivity' },
  { label: 'Personal AI', path: '/openclaw', icon: 'SparklesIcon', domain: 'personalAI' },
  { label: 'Image Studio', path: '/image-studio', icon: 'PhotoIcon', domain: 'creative' },
  { label: 'Settings', path: '/settings', icon: 'CogIcon', domain: 'settings' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user details
    const userResult = await pool.query(`
      SELECT 
        u.id,
        u.account_type,
        u.platform_role,
        u.parent_user_id,
        (SELECT COUNT(*) FROM users WHERE parent_user_id = u.id AND account_type = 'child') as child_count
      FROM users u
      WHERE u.id = $1
    `, [user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userResult.rows[0];
    const accountType = userData.account_type;
    const isParent = parseInt(userData.child_count) > 0;
    const isPlatformAdmin = userData.platform_role === 'platform-admin';

    // Child account - return filtered services
    if (accountType === 'child') {
      const controlsResult = await pool.query(`
        SELECT 
          allowed_services,
          blocked_services,
          is_active
        FROM parental_controls_config
        WHERE child_user_id = $1
      `, [user.id]);

      const controls = controlsResult.rows[0];
      const allowedServices = controls?.allowed_services || [];
      const blockedServices = controls?.blocked_services || [];

      // Filter child services based on parental controls
      const filteredServices = CHILD_SERVICES.filter(service => {
        if (blockedServices.includes(service.id)) return false;
        if (allowedServices.length > 0 && !allowedServices.includes(service.id)) return false;
        return true;
      });

      return res.status(200).json({
        userType: 'child',
        homePath: '/child',
        services: filteredServices,
        navigationItems: [], // Children use service cards, not nav items
        showFullNav: false,
        controlsActive: controls?.is_active ?? true,
      });
    }

    // Parent account - return parent-focused navigation
    if (isParent && !isPlatformAdmin) {
      return res.status(200).json({
        userType: 'parent',
        homePath: '/family',
        services: [],
        navigationItems: PARENT_NAV_ITEMS,
        showFullNav: false,
        childCount: parseInt(userData.child_count),
      });
    }

    // Platform admin or regular user - full navigation
    return res.status(200).json({
      userType: isPlatformAdmin ? 'admin' : 'user',
      homePath: '/dashboard',
      services: [],
      navigationItems: [], // Use default navigation config
      showFullNav: true,
      isParent,
      childCount: parseInt(userData.child_count),
    });

  } catch (error) {
    console.error('[User Navigation API] Error:', error);
    return res.status(500).json({ error: 'Failed to get navigation' });
  }
}
