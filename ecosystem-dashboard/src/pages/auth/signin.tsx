/**
 * Sign In Page — Premium Dark Design
 * 
 * Matches the Hyperspace landing + signup aesthetic.
 * Dark-first, glassmorphic card, Lucide icons, Framer Motion entrance.
 */

import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import { signIn, getCsrfToken } from 'next-auth/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Button,
  Alert,
  AlertIcon,
  AlertDescription,
  FormControl,
  FormLabel,
  Link,
  Icon,
  Flex,
  IconButton,
  Divider,
  chakra,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, ArrowLeft, Shield } from 'lucide-react';

const MotionVStack = motion(VStack);

interface SignInProps {
  csrfToken: string | null;
}

export default function SignIn({ csrfToken }: SignInProps) {
  const router = useRouter();
  const { error, callbackUrl } = router.query;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const getErrorMessage = (err: string) => {
    switch (err) {
      case 'CredentialsSignin': return 'Invalid email or password';
      case 'OAuthSignin':
      case 'OAuthCallback': return 'Error signing in with OAuth provider';
      case 'OAuthAccountNotLinked': return 'This email is already associated with another account';
      case 'SessionRequired': return 'Please sign in to access this page';
      default: return 'An error occurred during sign in';
    }
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[SignIn] Form submitted - handler fired');
    console.log('[SignIn] Email:', email);
    console.log('[SignIn] Password length:', password.length);
    setIsLoading(true);
    setLocalError(null);

    try {
      const redirectUrl = (callbackUrl as string) || '/';
      console.log('[SignIn] Calling signIn with redirectUrl:', redirectUrl);
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: redirectUrl,
      });

      console.log('[SignIn] signIn result:', result);
      if (!result) {
        setLocalError('Authentication service is temporarily unavailable. Please try again.');
        setIsLoading(false);
      } else if (result.error) {
        setLocalError(result.error);
        setIsLoading(false);
      } else if (result.ok) {
        console.log('[SignIn] Sign-in successful, redirecting to:', result.url || redirectUrl);
        // Use window.location.href instead of router.push to ensure session cookie is sent
        window.location.href = result.url || redirectUrl;
      } else {
        setLocalError('Sign-in failed. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[SignIn] Exception during sign-in:', err);
      setLocalError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const displayError = localError || (typeof error === 'string' ? error : null);

  return (
    <>
      <Head>
        <title>Sign In | Hyperspace AI</title>
        <meta name="description" content="Sign in to your Hyperspace AI Homelab dashboard." />
      </Head>

      <Box minH="100vh" bg="#09090b" color="white" position="relative" overflow="hidden">
        {/* Background gradient orbs */}
        <Box position="absolute" inset={0} pointerEvents="none" zIndex={0}>
          <Box
            position="absolute"
            top="-25%"
            left="-15%"
            w="500px"
            h="500px"
            borderRadius="full"
            bg="radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)"
            filter="blur(80px)"
          />
          <Box
            position="absolute"
            bottom="-20%"
            right="-10%"
            w="500px"
            h="500px"
            borderRadius="full"
            bg="radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)"
            filter="blur(80px)"
          />
        </Box>

        {/* Nav */}
        <Flex position="relative" zIndex={10} h="64px" align="center" px={6}>
          <HStack
            spacing={2}
            cursor="pointer"
            onClick={() => router.push('/landing')}
            _hover={{ opacity: 0.8 }}
            transition="opacity 0.2s"
          >
            <Icon as={ArrowLeft} boxSize={4} color="gray.500" />
            <Box
              w="28px"
              h="28px"
              borderRadius="lg"
              bgGradient="linear(135deg, blue.400, purple.500)"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={Sparkles} boxSize={3.5} color="white" />
            </Box>
            <Text fontWeight="700" fontSize="md" letterSpacing="-0.02em">
              Hyperspace
            </Text>
          </HStack>
        </Flex>

        {/* Main Content */}
        <Container maxW="md" position="relative" zIndex={1} pt={{ base: 8, md: 16 }} pb={16}>
          <VStack
            spacing={8}
          >
            {/* Header */}
            <VStack spacing={2} textAlign="center">
              <Heading
                fontSize={{ base: '2xl', md: '3xl' }}
                fontWeight="700"
                letterSpacing="-0.03em"
              >
                Welcome back
              </Heading>
              <Text color="gray.500" fontSize="md">
                Sign in to your{' '}
                <chakra.span
                  bgGradient="linear(to-r, blue.400, purple.400)"
                  bgClip="text"
                  fontWeight="600"
                >
                  AI Homelab
                </chakra.span>
              </Text>
            </VStack>

            {/* Sign In Card */}
            <Box
              w="full"
              bg="rgba(255,255,255,0.03)"
              backdropFilter="blur(12px)"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="whiteAlpha.100"
              p={{ base: 6, md: 8 }}
              position="relative"
              overflow="hidden"
            >
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                h="1px"
                bgGradient="linear(to-r, transparent, blue.500, purple.500, transparent)"
              />

              <VStack spacing={6}>
                {displayError && (
                  <Alert status="error" borderRadius="lg" bg="red.900" borderColor="red.700" borderWidth="1px">
                    <AlertIcon color="red.300" />
                    <AlertDescription color="red.200" fontSize="sm">
                      {getErrorMessage(displayError)}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleCredentialsSignIn} style={{ width: '100%' }}>
                  <input name="csrfToken" type="hidden" defaultValue={csrfToken ?? undefined} />

                  <VStack spacing={5}>
                    <FormControl isRequired>
                      <FormLabel color="gray.400" fontSize="sm" fontWeight="500">Email</FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none" h="48px">
                          <Icon as={Mail} boxSize={4} color="gray.600" />
                        </InputLeftElement>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                          h="48px"
                          bg="whiteAlpha.50"
                          borderColor="whiteAlpha.100"
                          borderRadius="xl"
                          color="white"
                          fontSize="sm"
                          _placeholder={{ color: 'gray.600' }}
                          _hover={{ borderColor: 'whiteAlpha.200' }}
                          _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px rgba(59,130,246,0.5)' }}
                        />
                      </InputGroup>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel color="gray.400" fontSize="sm" fontWeight="500">Password</FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none" h="48px">
                          <Icon as={Lock} boxSize={4} color="gray.600" />
                        </InputLeftElement>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                          h="48px"
                          bg="whiteAlpha.50"
                          borderColor="whiteAlpha.100"
                          borderRadius="xl"
                          color="white"
                          fontSize="sm"
                          _placeholder={{ color: 'gray.600' }}
                          _hover={{ borderColor: 'whiteAlpha.200' }}
                          _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px rgba(59,130,246,0.5)' }}
                        />
                        <InputRightElement h="48px">
                          <IconButton
                            aria-label="Toggle password"
                            icon={<Icon as={showPassword ? EyeOff : Eye} boxSize={4} />}
                            variant="ghost"
                            size="sm"
                            color="gray.500"
                            _hover={{ color: 'gray.300' }}
                            onClick={() => setShowPassword(!showPassword)}
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>

                    <Button
                      type="submit"
                      w="full"
                      h="52px"
                      bg="white"
                      color="black"
                      fontWeight="600"
                      fontSize="md"
                      borderRadius="xl"
                      rightIcon={<Icon as={ArrowRight} boxSize={4} />}
                      isLoading={isLoading}
                      loadingText="Signing in..."
                      _hover={{
                        bg: 'gray.100',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 10px 30px -8px rgba(255,255,255,0.12)',
                      }}
                      transition="all 0.2s"
                    >
                      Sign In
                    </Button>
                  </VStack>
                </form>

                <Divider borderColor="whiteAlpha.100" />

                <HStack justify="space-between" w="full" fontSize="sm">
                  <Link
                    color="gray.500"
                    href="/auth/forgot-password"
                    _hover={{ color: 'gray.300', textDecoration: 'none' }}
                  >
                    Forgot password?
                  </Link>
                  <HStack spacing={1}>
                    <Text color="gray.600">No account?</Text>
                    <Link
                      color="blue.400"
                      href="/auth/signup"
                      fontWeight="500"
                      _hover={{ color: 'blue.300', textDecoration: 'none' }}
                    >
                      Sign up
                    </Link>
                  </HStack>
                </HStack>
              </VStack>
            </Box>

            {/* Security Footer */}
            <HStack spacing={2} color="gray.600" fontSize="xs">
              <Icon as={Shield} boxSize={3.5} />
              <Text>Secure encrypted authentication. Your data stays on your hardware.</Text>
            </HStack>
          </VStack>
        </Container>
      </Box>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const csrfToken = await getCsrfToken(context);

  return {
    props: {
      csrfToken: csrfToken ?? null,
    },
  };
};
