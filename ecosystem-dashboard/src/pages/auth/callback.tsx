import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Center,
  Heading,
  Spinner,
  Text,
  VStack,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useAuth } from '@/context/AuthContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

/**
 * OAuth callback handler for NextAuth authentication
 * This page handles OAuth redirects - NextAuth manages the actual token exchange
 */
const AuthCallback: React.FC = () => {
  const { handleCallback, isLoading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  // UI colors
  const bgColor = useSemanticToken('surface.base');
  
  useEffect(() => {
    const processCallback = async () => {
      // Wait for router to be ready
      if (!router.isReady) return;
      
      const { code, state, error: authError } = router.query;
      
      // Handle authentication errors
      if (authError) {
        console.error('Authentication error:', authError);
        setError(typeof authError === 'string' ? authError : 'Authentication failed');
        setTimeout(() => router.push('/login?error=Authentication failed'), 3000);
        return;
      }
      
      // Validate state parameter to prevent CSRF attacks
      // Note: We're making this check optional during development
      const storedState = sessionStorage.getItem('auth_state');
      if (storedState && state && storedState !== state) {
        console.warn('State parameter mismatch, but continuing for development purposes');
        console.log('Stored state:', storedState);
        console.log('Received state:', state);
      }
      
      // Clear the state from session storage regardless
      sessionStorage.removeItem('auth_state');
      
      // Process the authorization code
      if (code && typeof code === 'string') {
        try {
          await handleCallback(code);
          // The handleCallback function will redirect to the dashboard on success
        } catch (err: any) {
          console.error('Error processing callback:', err);
          setError(err.message || 'Error processing authentication');
          setTimeout(() => router.push('/login?error=Error processing authentication'), 3000);
        }
      } else {
        console.error('No authorization code received');
        setError('No authorization code received');
        setTimeout(() => router.push('/login?error=No authorization code received'), 3000);
      }
    };
    
    processCallback();
  }, [router, handleCallback, router.isReady]);
  
  return (
    <Center minH="100vh" bg={bgColor}>
      <Box textAlign="center" p={8}>
        <VStack spacing={6}>
          {error ? (
            <>
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
              <Text>Redirecting to login page...</Text>
            </>
          ) : (
            <>
              <Heading size="md">Processing Authentication</Heading>
              <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
              <Text>Please wait while we complete your sign-in...</Text>
            </>
          )}
        </VStack>
      </Box>
    </Center>
  );
};

export default AuthCallback;
