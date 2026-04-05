/**
 * Sign Up Page — Premium Dark Design
 * 
 * Creates account → auto sign-in → launches onboarding wizard.
 * Matches the Hyperspace landing page aesthetic.
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
  FormErrorMessage,
  Link,
  Icon,
  Flex,
  IconButton,
  Badge,
  Divider,
  chakra,
  useDisclosure,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, ArrowLeft, Shield, CheckCircle } from 'lucide-react';
import { OnboardingWizardModal } from '@/components/onboarding';

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);

interface SignUpProps {
  csrfToken: string | undefined;
}

export default function SignUp({ csrfToken }: SignUpProps) {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Onboarding wizard
  const { isOpen: isOnboardOpen, onOpen: onOnboardOpen, onClose: onOnboardClose } = useDisclosure();
  
  const passwordsMatch = password === confirmPassword;
  const passwordLong = password.length >= 12;
  const passwordHasUpper = /[A-Z]/.test(password);
  const passwordHasNumber = /[0-9]/.test(password);
  const passwordValid = passwordLong && passwordHasUpper && passwordHasNumber;
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }
    
    if (!passwordValid) {
      setError('Password must be at least 12 characters with uppercase and number');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }
      
      setSuccess(true);
      
      // Auto sign-in then launch onboarding
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        // Launch onboarding wizard after successful sign-in
        onOnboardOpen();
      } else {
        // Fallback: redirect to dashboard
        router.push('/');
      }
      
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const PasswordCheck = ({ valid, label }: { valid: boolean; label: string }) => (
    <HStack spacing={2}>
      <Icon
        as={CheckCircle}
        boxSize={3.5}
        color={valid ? 'green.400' : 'gray.600'}
      />
      <Text fontSize="xs" color={valid ? 'green.400' : 'gray.600'}>
        {label}
      </Text>
    </HStack>
  );
  
  return (
    <>
      <Head>
        <title>Create Account | Hyperspace AI</title>
        <meta name="description" content="Create your Hyperspace AI Homelab account. Private AI, your hardware, your rules." />
      </Head>
      
      <Box minH="100vh" bg="#09090b" color="white" position="relative" overflow="hidden">
        {/* Background gradient orbs */}
        <Box position="absolute" inset={0} pointerEvents="none" zIndex={0}>
          <Box
            position="absolute"
            top="-30%"
            right="-20%"
            w="600px"
            h="600px"
            borderRadius="full"
            bg="radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)"
            filter="blur(80px)"
          />
          <Box
            position="absolute"
            bottom="-20%"
            left="-10%"
            w="500px"
            h="500px"
            borderRadius="full"
            bg="radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)"
            filter="blur(80px)"
          />
        </Box>

        {/* Nav */}
        <Flex
          position="relative"
          zIndex={10}
          h="64px"
          align="center"
          px={6}
        >
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
        <Container maxW="lg" position="relative" zIndex={1} pt={{ base: 4, md: 10 }} pb={16}>
          <MotionVStack
            spacing={8}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <VStack spacing={3} textAlign="center">
              <Badge
                bg="whiteAlpha.100"
                color="blue.300"
                borderRadius="full"
                px={4}
                py={1.5}
                fontSize="xs"
                fontWeight="600"
                letterSpacing="0.05em"
                textTransform="uppercase"
                borderWidth="1px"
                borderColor="whiteAlpha.100"
              >
                Free to Start
              </Badge>
              <Heading
                fontSize={{ base: '2xl', md: '3xl' }}
                fontWeight="700"
                letterSpacing="-0.03em"
              >
                Create your{' '}
                <chakra.span
                  bgGradient="linear(to-r, blue.400, purple.400)"
                  bgClip="text"
                >
                  AI Homelab
                </chakra.span>
              </Heading>
              <Text color="gray.500" fontSize="md">
                Set up your private AI infrastructure in under 5 minutes.
              </Text>
            </VStack>

            {/* Sign Up Card */}
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
                {error && (
                  <Alert status="error" borderRadius="lg" bg="red.900" borderColor="red.700" borderWidth="1px">
                    <AlertIcon color="red.300" />
                    <AlertDescription color="red.200" fontSize="sm">{error}</AlertDescription>
                  </Alert>
                )}
                
                {success && (
                  <Alert status="success" borderRadius="lg" bg="green.900" borderColor="green.700" borderWidth="1px">
                    <AlertIcon color="green.300" />
                    <AlertDescription color="green.200" fontSize="sm">
                      Account created! Setting up your workspace...
                    </AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleSignUp} style={{ width: '100%' }}>
                  <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
                  
                  <VStack spacing={5}>
                    <FormControl isRequired>
                      <FormLabel color="gray.400" fontSize="sm" fontWeight="500">Full Name</FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none" h="48px">
                          <Icon as={User} boxSize={4} color="gray.600" />
                        </InputLeftElement>
                        <Input
                          type="text"
                          placeholder="Your name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
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
                    
                    <FormControl isRequired isInvalid={password.length > 0 && !passwordValid}>
                      <FormLabel color="gray.400" fontSize="sm" fontWeight="500">Password</FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none" h="48px">
                          <Icon as={Lock} boxSize={4} color="gray.600" />
                        </InputLeftElement>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a strong password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
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
                      {password.length > 0 && (
                        <HStack spacing={4} mt={2}>
                          <PasswordCheck valid={passwordLong} label="12+ characters" />
                          <PasswordCheck valid={passwordHasUpper} label="Uppercase" />
                          <PasswordCheck valid={passwordHasNumber} label="Number" />
                        </HStack>
                      )}
                    </FormControl>
                    
                    <FormControl isRequired isInvalid={confirmPassword.length > 0 && !passwordsMatch}>
                      <FormLabel color="gray.400" fontSize="sm" fontWeight="500">Confirm Password</FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none" h="48px">
                          <Icon as={Lock} boxSize={4} color="gray.600" />
                        </InputLeftElement>
                        <Input
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
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
                            aria-label="Toggle confirm"
                            icon={<Icon as={showConfirm ? EyeOff : Eye} boxSize={4} />}
                            variant="ghost"
                            size="sm"
                            color="gray.500"
                            _hover={{ color: 'gray.300' }}
                            onClick={() => setShowConfirm(!showConfirm)}
                          />
                        </InputRightElement>
                      </InputGroup>
                      {confirmPassword.length > 0 && !passwordsMatch && (
                        <Text fontSize="xs" color="red.400" mt={1}>Passwords do not match</Text>
                      )}
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
                      loadingText="Creating account..."
                      isDisabled={!passwordValid || !passwordsMatch || success || !name || !email}
                      _hover={{
                        bg: 'gray.100',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 10px 30px -8px rgba(255,255,255,0.12)',
                      }}
                      _disabled={{
                        bg: 'gray.700',
                        color: 'gray.500',
                        cursor: 'not-allowed',
                        _hover: { bg: 'gray.700', transform: 'none', boxShadow: 'none' },
                      }}
                      transition="all 0.2s"
                    >
                      Create Account
                    </Button>
                  </VStack>
                </form>
                
                <Divider borderColor="whiteAlpha.100" />

                <HStack justify="center" w="full" fontSize="sm" spacing={1}>
                  <Text color="gray.600">Already have an account?</Text>
                  <Link
                    color="blue.400"
                    href="/auth/signin"
                    fontWeight="500"
                    _hover={{ color: 'blue.300', textDecoration: 'none' }}
                  >
                    Sign in
                  </Link>
                </HStack>
              </VStack>
            </Box>

            {/* Security Footer */}
            <HStack spacing={2} color="gray.600" fontSize="xs">
              <Icon as={Shield} boxSize={3.5} />
              <Text>
                Zero-tolerance security. Your data stays on your hardware. End-to-end encrypted.
              </Text>
            </HStack>

            <Text fontSize="xs" color="gray.700" textAlign="center">
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </MotionVStack>
        </Container>

        {/* Onboarding Wizard Modal — launches after successful signup */}
        <OnboardingWizardModal
          isOpen={isOnboardOpen}
          onClose={() => {
            onOnboardClose();
            router.push('/');
          }}
          onComplete={() => {
            onOnboardClose();
            router.push('/');
          }}
        />
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
