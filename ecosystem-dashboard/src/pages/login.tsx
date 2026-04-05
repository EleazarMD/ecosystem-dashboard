import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  Icon,
  Input,
  FormControl,
  FormLabel,
  useColorModeValue,
} from '@chakra-ui/react';
import { ShieldCheckIcon, SparklesIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

/**
 * Login page component for Hyperspace Personal AI
 * Handles authentication with email and password via NextAuth
 */
const Login: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { error } = router.query;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // UI colors
  const bgColor = useSemanticToken('surface.base');
  const boxBgColor = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      const redirectUrl = '/';
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        callbackUrl: redirectUrl,
      });

      if (!result) {
        setLoginError('Authentication service is temporarily unavailable. Please try again.');
      } else if (result.error) {
        setLoginError('Invalid email or password');
      } else if (result.ok) {
        // Use window.location.href instead of router.push to ensure session cookie is sent
        window.location.href = result.url || redirectUrl;
      } else {
        setLoginError('Sign-in failed. Please try again.');
      }
    } catch (err) {
      setLoginError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg={bgColor}>
      <Flex
        minH="100vh"
        align="center"
        justify="center"
        p={4}
      >
        <Container maxW="md">
          <VStack spacing={8}>
            {/* Back to Landing */}
            <Button
              variant="ghost"
              leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
              onClick={() => router.push('/landing')}
              alignSelf="flex-start"
              size="sm"
            >
              Back to Home
            </Button>

            {/* Logo/Icon */}
            <Box
              p={4}
              borderRadius="2xl"
              bg={useColorModeValue('blue.50', 'blue.900')}
            >
              <Icon as={SparklesIcon} boxSize={12} color="blue.500" />
            </Box>
            
            <VStack spacing={2} textAlign="center">
              <Heading
                fontSize="3xl"
                bgGradient="linear(to-r, blue.400, purple.500)"
                bgClip="text"
              >
                Welcome Back
              </Heading>
              <Text fontSize="lg" color={textColor}>
                Sign in to Hyperspace Personal AI
              </Text>
            </VStack>
            
            <Box
              w="full"
              bg={boxBgColor}
              borderRadius="xl"
              borderWidth="1px"
              borderColor={borderColor}
              p={8}
              boxShadow="lg"
            >
              <form onSubmit={handleLogin}>
                <VStack spacing={6}>
                  {(error || loginError) && (
                    <Alert status="error" borderRadius="md">
                      <AlertIcon />
                      {loginError || (typeof error === 'string' ? error : 'Authentication failed. Please try again.')}
                    </Alert>
                  )}
                  
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      size="lg"
                      autoComplete="email"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      size="lg"
                      autoComplete="current-password"
                    />
                  </FormControl>
                  
                  <Button
                    type="submit"
                    colorScheme="blue"
                    size="lg"
                    w="full"
                    isLoading={isLoading}
                    loadingText="Signing in..."
                  >
                    Sign In
                  </Button>
                  
                  <HStack spacing={2} color={textColor} fontSize="sm" pt={2}>
                    <Icon as={ShieldCheckIcon} boxSize={4} />
                    <Text>Secure encrypted authentication</Text>
                  </HStack>
                </VStack>
              </form>
            </Box>

            <Text fontSize="xs" color={textColor} textAlign="center">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Text>
          </VStack>
        </Container>
      </Flex>
    </Box>
  );
};

export default Login;
