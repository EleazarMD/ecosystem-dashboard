/**
 * UserTypeRedirect Component
 * 
 * Redirects users to their appropriate home page based on account type:
 * - Children -> /child/home
 * - Parents -> /family/home  
 * - Admins/Users -> /dashboard (or current page)
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Box, Spinner, VStack, Text } from '@chakra-ui/react';

interface UserTypeRedirectProps {
  children: React.ReactNode;
  redirectOnMatch?: boolean;
}

export function UserTypeRedirect({ children, redirectOnMatch = true }: UserTypeRedirectProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user || !redirectOnMatch) return;

    const user = session.user as any;
    const currentPath = router.pathname;

    // Child account - redirect to child home if on main pages
    if (user.accountType === 'child') {
      const childAllowedPaths = [
        '/child',
        '/workspace',
        '/openclaw',
        '/image-studio',
        '/calendar',
        '/email',
        '/settings',
      ];
      
      const isOnAllowedPath = childAllowedPaths.some(path => currentPath.startsWith(path));
      
      if (!isOnAllowedPath && currentPath !== '/auth/signin') {
        router.replace('/child/home');
        return;
      }
    }

    // Parent account (check via API or session data)
    // Parents can access everything, but we redirect from / to /family/home
    if (user.isParent && currentPath === '/') {
      // Optional: redirect parents to family home from root
      // router.replace('/family/home');
    }
  }, [session, status, router, redirectOnMatch]);

  if (status === 'loading') {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.500">Loading...</Text>
        </VStack>
      </Box>
    );
  }

  return <>{children}</>;
}

export default UserTypeRedirect;
