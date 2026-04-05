/**
 * NextAuth.js Configuration
 * 
 * Handles authentication for the AI Homelab Dashboard:
 * - Email/Password credentials
 * 
 * Integrates with existing users and tenant_memberships tables.
 */

import NextAuth, { NextAuthOptions, Session, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Trusted hostnames that may serve this dashboard.
 * Requests from any of these hosts will have NEXTAUTH_URL dynamically set
 * so CSRF tokens, callback URLs, and cookies all target the correct origin.
 */
const TRUSTED_HOSTS = new Set([
  'nexus.hyperspaceanalytics.com',
  'rtx-workstation.tailb64e64.ts.net',
  'localhost',
  '127.0.0.1',
]);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// Extend the built-in types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      platformRole?: string;
      accountType?: string;
      parentUserId?: string;
      isParent?: boolean;
      themeId?: string;
      subscriptionTier?: string;
      purchasedAddOns?: string[];
      grantedFeatures?: string[];
      revokedFeatures?: string[];
      extraChildSlots?: number;
      tenants: Array<{
        tenantId: string;
        tenantSlug: string;
        tenantName: string;
        roleId: string;
      }>;
      defaultTenantId?: string;
      settings?: Record<string, any>;
    };
  }

  interface User {
    id: string;
    platformRole?: string;
    accountType?: string;
    parentUserId?: string;
    isParent?: boolean;
    themeId?: string;
    subscriptionTier?: string;
    purchasedAddOns?: string[];
    grantedFeatures?: string[];
    revokedFeatures?: string[];
    extraChildSlots?: number;
    tenants?: Array<{
      tenantId: string;
      tenantSlug: string;
      tenantName: string;
      roleId: string;
    }>;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    platformRole?: string;
    accountType?: string;
    parentUserId?: string;
    isParent?: boolean;
    themeId?: string;
    subscriptionTier?: string;
    purchasedAddOns?: string[];
    grantedFeatures?: string[];
    revokedFeatures?: string[];
    extraChildSlots?: number;
    tenants?: Array<{
      tenantId: string;
      tenantSlug: string;
      tenantName: string;
      roleId: string;
    }>;
  }
}

/**
 * Get user with tenant memberships and subscription data from database
 * PRODUCTION-GRADE: Includes error handling, fallbacks, and auto-provisioning
 */
async function getUserWithTenantsById(userId: string) {
  try {
    // Get user first with account type and parent info
    const userResult = await pool.query(
      `SELECT id, email, name, avatar_url, platform_role, status, account_type, parent_user_id, settings, preferred_theme,
       (SELECT COUNT(*) FROM users WHERE parent_user_id = u.id AND account_type = 'child') as child_count
       FROM users u WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (userResult.rows.length === 0) return null;
    const user = userResult.rows[0];

    // Get tenants separately (with error handling)
    let tenants: Array<{
      tenantId: string;
      tenantSlug: string;
      tenantName: string;
      roleId: string;
    }> = [];
    
    try {
      const tenantsResult = await pool.query(
        `SELECT tm.tenant_id as "tenantId", t.slug as "tenantSlug", t.name as "tenantName", tm.role_id as "roleId"
         FROM tenant_memberships tm
         JOIN tenants t ON tm.tenant_id = t.id
         WHERE tm.user_id = $1 AND tm.status = 'active' AND t.status = 'active'`,
        [user.id]
      );
      tenants = tenantsResult.rows;
    } catch (error) {
      console.error('[Auth] Error fetching tenants for user:', user.id, error);
      // Continue without tenants rather than failing auth
    }

    // Get subscription/feature access data (with auto-provisioning)
    let subscription: {
      subscription_tier: string;
      purchased_addons: string[];
      admin_granted_features: string[];
      admin_revoked_features: string[];
      extra_child_slots: number;
    };
    
    try {
      const subscriptionResult = await pool.query(
        `SELECT subscription_tier, purchased_addons, admin_granted_features, admin_revoked_features, extra_child_slots
         FROM user_feature_access
         WHERE user_id = $1`,
        [user.id]
      );

      if (subscriptionResult.rows.length > 0) {
        const row = subscriptionResult.rows[0];
        subscription = {
          subscription_tier: row.subscription_tier,
          purchased_addons: row.purchased_addons || [],
          admin_granted_features: row.admin_granted_features || [],
          admin_revoked_features: row.admin_revoked_features || [],
          extra_child_slots: row.extra_child_slots || 0,
        };
      } else {
        // Auto-provision subscription record for users without one
        const defaultTier = user.platform_role === 'platform-admin' ? 'admin' : 'free';
        console.log(`[Auth] Auto-provisioning subscription for user ${user.id} with tier: ${defaultTier}`);
        
        try {
          await pool.query(
            `INSERT INTO user_feature_access (user_id, subscription_tier, purchased_addons, admin_granted_features, admin_revoked_features, extra_child_slots)
             VALUES ($1, $2, $3::text[], $4::text[], $5::text[], $6)
             ON CONFLICT (user_id) DO NOTHING`,
            [user.id, defaultTier, [], [], [], 0]
          );
        } catch (insertError) {
          console.error('[Auth] Error auto-provisioning subscription:', insertError);
        }
        
        subscription = {
          subscription_tier: defaultTier,
          purchased_addons: [],
          admin_granted_features: [],
          admin_revoked_features: [],
          extra_child_slots: 0,
        };
      }
    } catch (error) {
      console.error('[Auth] Error fetching subscription for user:', user.id, error);
      // Fallback to safe defaults
      subscription = {
        subscription_tier: user.platform_role === 'platform-admin' ? 'admin' : 'free',
        purchased_addons: [],
        admin_granted_features: [],
        admin_revoked_features: [],
        extra_child_slots: 0,
      };
    }

    // Extract themeId from preferred_theme column or settings JSONB (with null safety)
    const themeId = user.preferred_theme || user.settings?.themeId || null;

    // Parse child_count safely
    const childCount = user.child_count ? parseInt(user.child_count, 10) : 0;

    return {
      ...user,
      accountType: user.account_type || 'standard',
      parentUserId: user.parent_user_id || null,
      isParent: childCount > 0,
      themeId,
      subscriptionTier: subscription.subscription_tier || 'free',
      purchasedAddOns: Array.isArray(subscription.purchased_addons) ? subscription.purchased_addons : [],
      grantedFeatures: Array.isArray(subscription.admin_granted_features) ? subscription.admin_granted_features : [],
      revokedFeatures: Array.isArray(subscription.admin_revoked_features) ? subscription.admin_revoked_features : [],
      extraChildSlots: subscription.extra_child_slots || 0,
      tenants: Array.isArray(tenants) ? tenants : [],
      settings: user.settings || {}
    };
  } catch (error) {
    console.error('[Auth] Critical error in getUserWithTenantsById:', error);
    // Return null to fail authentication gracefully
    return null;
  }
}

async function getUserWithTenantsByEmail(email: string) {
  try {
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (userResult.rows.length === 0) return null;
    return getUserWithTenantsById(userResult.rows[0].id);
  } catch (error) {
    console.error('[Auth] Critical error in getUserWithTenantsByEmail:', error);
    return null;
  }
}

/**
 * Verify credentials for email/password login
 */
async function verifyCredentials(email: string, password: string) {
  const result = await pool.query(
    `SELECT id, email, name, password_hash, status FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) return null;

  const user = result.rows[0];
  
  if (user.status !== 'active') return null;
  if (!user.password_hash) return null;

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return null;

  // Update last login
  await pool.query(
    `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
    [user.id]
  );

  return user;
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password credentials
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await verifyCredentials(credentials.email, credentials.password);
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Credentials provider - user already verified in authorize()
      return true;
    },

    async jwt({ token, user, account }) {
      // On initial sign-in, add user data to token
      if (user) {
        token.id = user.id;
      }

      // Fetch fresh user data with tenants and subscription
      if (token.id) {
        try {
          const dbUser = await getUserWithTenantsById(token.id as string);
          if (dbUser) {
            token.id = dbUser.id;
            token.platformRole = dbUser.platform_role;
            token.accountType = dbUser.accountType;
            token.parentUserId = dbUser.parentUserId;
            token.isParent = dbUser.isParent;
            token.themeId = dbUser.themeId;
            token.subscriptionTier = dbUser.subscriptionTier;
            token.purchasedAddOns = dbUser.purchasedAddOns;
            token.grantedFeatures = dbUser.grantedFeatures;
            token.revokedFeatures = dbUser.revokedFeatures;
            token.extraChildSlots = dbUser.extraChildSlots;
            token.tenants = dbUser.tenants;
            token.settings = dbUser.settings;
          } else {
            // User not found - preserve existing token data or set safe defaults
            console.warn('[Auth] User not found in database:', token.id);
            if (!token.subscriptionTier) {
              token.subscriptionTier = 'free';
              token.purchasedAddOns = [];
              token.grantedFeatures = [];
              token.revokedFeatures = [];
              token.extraChildSlots = 0;
              token.tenants = [];
            }
          }
        } catch (error) {
          console.error('[Auth] Error in JWT callback:', error);
          // Preserve existing token data on error
          if (!token.subscriptionTier) {
            token.subscriptionTier = 'free';
            token.purchasedAddOns = [];
            token.grantedFeatures = [];
            token.revokedFeatures = [];
            token.extraChildSlots = 0;
            token.tenants = [];
          }
        }
      } else if (token.email) {
        try {
          const dbUser = await getUserWithTenantsByEmail(token.email as string);
          if (dbUser) {
            token.id = dbUser.id;
            token.platformRole = dbUser.platform_role;
            token.accountType = dbUser.accountType;
            token.parentUserId = dbUser.parentUserId;
            token.isParent = dbUser.isParent;
            token.themeId = dbUser.themeId;
            token.subscriptionTier = dbUser.subscriptionTier;
            token.purchasedAddOns = dbUser.purchasedAddOns;
            token.grantedFeatures = dbUser.grantedFeatures;
            token.revokedFeatures = dbUser.revokedFeatures;
            token.extraChildSlots = dbUser.extraChildSlots;
            token.tenants = dbUser.tenants;
            token.settings = dbUser.settings;
          } else if (!token.subscriptionTier) {
            token.subscriptionTier = 'free';
            token.purchasedAddOns = [];
            token.grantedFeatures = [];
            token.revokedFeatures = [];
            token.extraChildSlots = 0;
            token.tenants = [];
          }
        } catch (error) {
          console.error('[Auth] Error in JWT email fallback:', error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Add custom fields to session with safe fallbacks
      session.user.id = token.id;
      session.user.platformRole = token.platformRole;
      session.user.accountType = token.accountType || 'standard';
      session.user.parentUserId = token.parentUserId;
      session.user.isParent = token.isParent || false;
      session.user.themeId = token.themeId;
      
      // Subscription data with safe defaults
      session.user.subscriptionTier = token.subscriptionTier || 'free';
      session.user.purchasedAddOns = Array.isArray(token.purchasedAddOns) ? token.purchasedAddOns : [];
      session.user.grantedFeatures = Array.isArray(token.grantedFeatures) ? token.grantedFeatures : [];
      session.user.revokedFeatures = Array.isArray(token.revokedFeatures) ? token.revokedFeatures : [];
      session.user.extraChildSlots = token.extraChildSlots || 0;
      session.user.tenants = Array.isArray(token.tenants) ? token.tenants : [];
      session.user.settings = token.settings || {};
      
      // Set default tenant (first one or from preferences)
      if (session.user.tenants.length > 0) {
        session.user.defaultTenantId = session.user.tenants[0].tenantId;
      }

      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    newUser: '/auth/welcome',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET || 'your-development-secret-change-in-production',

  debug: process.env.NODE_ENV === 'development',
};

/**
 * Dynamic handler: override NEXTAUTH_URL per-request so auth works from any
 * trusted hostname (Cloudflare public domain, Tailscale, localhost).
 */
export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(':')[0];
  const proto = (req.headers['x-forwarded-proto'] || 'http').toString();
  const isSecure = proto === 'https';

  if (TRUSTED_HOSTS.has(host)) {
    const portSuffix = req.headers.host?.includes(':') ? `:${req.headers.host.split(':')[1]}` : '';
    process.env.NEXTAUTH_URL = `${proto}://${host}${portSuffix}`;
  }

  // Build per-request options so cookie prefixes match the protocol.
  // HTTPS (Cloudflare / Tailscale) → __Host- / __Secure- prefixed Secure cookies
  // HTTP  (localhost dev)           → plain next-auth.* non-secure cookies
  const opts: NextAuthOptions = {
    ...authOptions,
    useSecureCookies: isSecure,
    ...(isSecure
      ? {
          cookies: {
            sessionToken: {
              name: '__Secure-next-auth.session-token',
              options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: true },
            },
            callbackUrl: {
              name: '__Secure-next-auth.callback-url',
              options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: true },
            },
            csrfToken: {
              name: '__Host-next-auth.csrf-token',
              options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: true },
            },
          },
        }
      : {}),
  };

  return NextAuth(req, res, opts);
}
