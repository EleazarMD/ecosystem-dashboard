/**
 * Admin Route Guard
 * 
 * Server-side protection for admin pages - blocks child accounts
 */

import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export interface AdminRouteGuardOptions {
  requireAdmin?: boolean; // Require admin role specifically
  allowedAccountTypes?: string[]; // Specific account types allowed
}

/**
 * Creates a getServerSideProps function that protects admin routes
 */
export function withAdminRouteGuard(
  options: AdminRouteGuardOptions = {}
): GetServerSideProps {
  return async (context: GetServerSidePropsContext) => {
    const session = await getServerSession(context.req, context.res, authOptions);

    if (!session?.user) {
      return {
        redirect: {
          destination: '/auth/signin',
          permanent: false,
        },
      };
    }

    const user = session.user as any;
    
    // Always block child accounts from admin pages
    if (user.accountType === 'child') {
      return {
        redirect: {
          destination: '/child/home',
          permanent: false,
        },
      };
    }

    // If specific admin role required
    if (options.requireAdmin && user.accountType !== 'admin') {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      };
    }

    // If specific account types required
    if (options.allowedAccountTypes && options.allowedAccountTypes.length > 0) {
      if (!options.allowedAccountTypes.includes(user.accountType)) {
        return {
          redirect: {
            destination: '/',
            permanent: false,
          },
        };
      }
    }

    return {
      props: {},
    };
  };
}

/**
 * Default admin route guard - blocks children, allows standard/parent/admin
 */
export const adminRouteGuard = withAdminRouteGuard();

/**
 * Strict admin route guard - only allows admin accounts
 */
export const strictAdminRouteGuard = withAdminRouteGuard({ requireAdmin: true });

/**
 * Family admin route guard - allows parent and admin accounts
 */
export const familyAdminRouteGuard = withAdminRouteGuard({
  allowedAccountTypes: ['admin', 'parent', 'standard'],
});
