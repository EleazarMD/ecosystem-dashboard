/**
 * withParent HOC
 * 
 * Protects routes that require the user to be a parent (have child accounts)
 * Also allows platform admins to access for oversight
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

interface ParentInfo {
  isParent: boolean;
  isPlatformAdmin: boolean;
  childCount: number;
}

export function withParent<P extends object>(
  WrappedComponent: React.ComponentType<P & { parentInfo: ParentInfo }>
) {
  return function WithParentComponent(props: P) {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [parentInfo, setParentInfo] = useState<ParentInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (status === 'loading') return;

      if (!session?.user) {
        router.replace('/auth/signin');
        return;
      }

      // Check if user is a parent or admin
      checkParentStatus();
    }, [session, status]);

    const checkParentStatus = async () => {
      try {
        const res = await fetch('/api/user/parent-status');
        const data = await res.json();

        if (res.ok) {
          if (!data.isParent && !data.isPlatformAdmin) {
            // Not a parent and not an admin - redirect to home
            router.replace('/');
            return;
          }
          setParentInfo(data);
        } else {
          router.replace('/');
        }
      } catch (error) {
        console.error('Failed to check parent status:', error);
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'loading' || loading) {
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

    if (!parentInfo) {
      return null;
    }

    return <WrappedComponent {...props} parentInfo={parentInfo} />;
  };
}

export default withParent;
