/**
 * Forgot Password Page
 * 
 * Allows users to request a password reset email.
 */

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
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
  useColorModeValue,
  Icon,
} from '@chakra-ui/react';
import { FiMail, FiArrowLeft, FiCheck } from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const bgGradient = useColorModeValue(
    'linear(to-br, blue.50, purple.50)',
    'linear(to-br, gray.900, blue.900)'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Forgot Password | AI Homelab</title>
      </Head>

      <Box minH="100vh" bgGradient={bgGradient} py={20}>
        <Container maxW="md">
          <VStack spacing={8}>
            <VStack spacing={2} textAlign="center">
              <Heading size="xl">🔐 Forgot Password</Heading>
              <Text color="gray.500">
                Enter your email and we&apos;ll send you a reset link
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
                    <Heading size="md">Check your email</Heading>
                    <Text color="gray.500">
                      If an account exists for <strong>{email}</strong>, you&apos;ll
                      receive a password reset link shortly.
                    </Text>
                  </VStack>
                  <Text fontSize="sm" color="gray.400">
                    Didn&apos;t receive the email? Check your spam folder or try again.
                  </Text>
                  <Button
                    variant="ghost"
                    leftIcon={<FiArrowLeft />}
                    as={Link}
                    href="/auth/signin"
                  >
                    Back to Sign In
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
                      <FormLabel>Email Address</FormLabel>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        size="lg"
                        leftIcon={<FiMail />}
                      />
                    </FormControl>

                    <Button
                      type="submit"
                      colorScheme="blue"
                      size="lg"
                      w="full"
                      isLoading={isLoading}
                      loadingText="Sending..."
                    >
                      Send Reset Link
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
