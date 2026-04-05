/**
 * Reset Password Page
 * 
 * Allows users to set a new password using a reset token.
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Input,
  Button,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
  FormHelperText,
  useColorModeValue,
  Icon,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { FiLock, FiArrowLeft, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const bgGradient = useColorModeValue(
    'linear(to-br, blue.50, purple.50)',
    'linear(to-br, gray.900, blue.900)'
  );

  const isValidPassword = password.length >= 8;
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidPassword) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setUserEmail(data.email);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        <Head>
          <title>Reset Password | AI Homelab</title>
        </Head>
        <Box minH="100vh" bgGradient={bgGradient} py={20}>
          <Container maxW="md">
            <GlassPanel p={8}>
              <VStack spacing={6} textAlign="center">
                <Heading size="lg" color="red.500">Invalid Reset Link</Heading>
                <Text color="gray.500">
                  This password reset link is invalid or has expired.
                </Text>
                <Button
                  as={Link}
                  href="/auth/forgot-password"
                  colorScheme="blue"
                >
                  Request New Reset Link
                </Button>
              </VStack>
            </GlassPanel>
          </Container>
        </Box>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Reset Password | AI Homelab</title>
      </Head>

      <Box minH="100vh" bgGradient={bgGradient} py={20}>
        <Container maxW="md">
          <VStack spacing={8}>
            <VStack spacing={2} textAlign="center">
              <Heading size="xl">🔐 Reset Password</Heading>
              <Text color="gray.500">
                Enter your new password below
              </Text>
            </VStack>

            <GlassPanel p={8} w="full">
              {success ? (
                <VStack spacing={6} py={4}>
                  <Box
                    p={4}
                    borderRadius="full"
                    bg="green.100"
                    color="green.600"
                  >
                    <Icon as={FiCheck} boxSize={8} />
                  </Box>
                  <VStack spacing={2} textAlign="center">
                    <Heading size="md">Password Reset!</Heading>
                    <Text color="gray.500">
                      Your password has been successfully reset.
                      {userEmail && (
                        <> You can now sign in with <strong>{userEmail}</strong>.</>
                      )}
                    </Text>
                  </VStack>
                  <Button
                    colorScheme="blue"
                    as={Link}
                    href="/auth/signin"
                    size="lg"
                  >
                    Sign In Now
                  </Button>
                </VStack>
              ) : (
                <form onSubmit={handleSubmit}>
                  <VStack spacing={6}>
                    {error && (
                      <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        {error}
                      </Alert>
                    )}

                    <FormControl isRequired>
                      <FormLabel>New Password</FormLabel>
                      <InputGroup>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter new password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          size="lg"
                        />
                        <InputRightElement h="full">
                          <IconButton
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            icon={showPassword ? <FiEyeOff /> : <FiEye />}
                            variant="ghost"
                            onClick={() => setShowPassword(!showPassword)}
                          />
                        </InputRightElement>
                      </InputGroup>
                      <FormHelperText>
                        {password.length > 0 && (
                          <Text color={isValidPassword ? 'green.500' : 'red.500'}>
                            {isValidPassword ? '✓' : '✗'} At least 8 characters
                          </Text>
                        )}
                      </FormHelperText>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Confirm Password</FormLabel>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        size="lg"
                      />
                      <FormHelperText>
                        {confirmPassword.length > 0 && (
                          <Text color={passwordsMatch ? 'green.500' : 'red.500'}>
                            {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                          </Text>
                        )}
                      </FormHelperText>
                    </FormControl>

                    <Button
                      type="submit"
                      colorScheme="blue"
                      size="lg"
                      w="full"
                      isLoading={isLoading}
                      loadingText="Resetting..."
                      isDisabled={!isValidPassword || !passwordsMatch}
                    >
                      Reset Password
                    </Button>

                    <Button
                      variant="ghost"
                      leftIcon={<FiArrowLeft />}
                      as={Link}
                      href="/auth/signin"
                      w="full"
                    >
                      Back to Sign In
                    </Button>
                  </VStack>
                </form>
              )}
            </GlassPanel>
          </VStack>
        </Container>
      </Box>
    </>
  );
}
