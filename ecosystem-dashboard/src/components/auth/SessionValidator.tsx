/**
 * SessionValidator Component
 * 
 * Detects when a user's session is missing required data (e.g., subscription info)
 * and prompts them to re-login to get a fresh session.
 */

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Box,
  useToast,
} from '@chakra-ui/react';

export function SessionValidator() {
  const { data: session, status } = useSession();
  const toast = useToast();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const user = session.user as any;
      
      // Check if session has subscription data
      const hasSubscriptionData = user.subscriptionTier !== undefined;
      
      if (!hasSubscriptionData) {
        console.warn('[SessionValidator] Session missing subscription data');
        
        // Show toast notification
        toast({
          title: 'Session Update Required',
          description: 'Please log out and log back in to update your session.',
          status: 'warning',
          duration: null, // Don't auto-dismiss
          isClosable: true,
          position: 'top',
          render: () => (
            <Box
              p={4}
              bg="orange.500"
              color="white"
              borderRadius="md"
              boxShadow="lg"
            >
              <Alert status="warning" variant="solid" borderRadius="md">
                <AlertIcon />
                <Box flex="1">
                  <AlertTitle>Session Update Required</AlertTitle>
                  <AlertDescription display="block">
                    Your session needs to be refreshed to access all features.
                    Please log out and log back in.
                  </AlertDescription>
                </Box>
                <Button
                  size="sm"
                  colorScheme="whiteAlpha"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  ml={3}
                >
                  Log Out Now
                </Button>
              </Alert>
            </Box>
          ),
        });
      }
    }
  }, [session, status, toast]);

  return null; // This component doesn't render anything
}
