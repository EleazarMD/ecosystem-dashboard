/**
 * Auth Module Exports
 * 
 * NOTE: Server-only exports (admin-route-guard) are NOT exported here
 * to avoid pulling pg/fs modules into client-side bundles.
 * Import directly from '@/lib/auth/admin-route-guard' in getServerSideProps.
 */

export { useAuth, useRequireAuth, useRequirePlatformAdmin } from './useAuth';
export { withAuth, AuthGuard, withPlatformAdmin, withTenantAdmin, withFamilyAdmin } from './withAuth';
