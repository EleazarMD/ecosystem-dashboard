/**
 * Sign Out Page
 * 
 * Handles user sign out and redirects to signin page
 */

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

export default function SignOut() {
  useEffect(() => {
    // Automatically sign out and redirect to signin page
    signOut({ callbackUrl: '/auth/signin' });
  }, []);

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.900"
    >
      <VStack spacing={4}>
        <Spinner size="xl" color="purple.500" />
        <Text color="gray.300" fontSize="lg">
          Signing out...
        </Text>
      </VStack>
    </Box>
  );
}
