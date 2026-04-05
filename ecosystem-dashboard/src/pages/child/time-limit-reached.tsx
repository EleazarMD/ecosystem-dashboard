/**
 * Time Limit Reached Page
 * 
 * Shown to children when they exceed their daily usage limit
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Icon,
  Button,
  Progress,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiClock, FiLogOut } from 'react-icons/fi';
import { signOut } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface TimeLimitPageProps {
  todayMinutes: number;
  limitMinutes: number;
  childName: string;
}

export default function TimeLimitReached({ todayMinutes, limitMinutes, childName }: TimeLimitPageProps) {
  const [countdown, setCountdown] = useState(10);
  const bg = useSemanticToken('surface.base');
  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          signOut({ callbackUrl: '/login' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogoutNow = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <Box bg={bg} minH="100vh" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="md">
        <VStack
          spacing={6}
          bg={cardBg}
          p={8}
          borderRadius="2xl"
          boxShadow="xl"
          textAlign="center"
        >
          {/* Clock Icon */}
          <Box
            bg="orange.100"
            p={6}
            borderRadius="full"
            display="inline-flex"
          >
            <Icon as={FiClock} boxSize={16} color="orange.500" />
          </Box>

          {/* Heading */}
          <VStack spacing={2}>
            <Heading size="lg" color="orange.500">
              Time's Up for Today!
            </Heading>
            <Text fontSize="lg" fontWeight="medium">
              Hi {childName}! 👋
            </Text>
          </VStack>

          {/* Message */}
          <VStack spacing={3} w="full">
            <Text fontSize="md" color="gray.600">
              You've used <strong>{todayMinutes} minutes</strong> today.
            </Text>
            <Text fontSize="md" color="gray.600">
              Your daily limit is <strong>{limitMinutes} minutes</strong>.
            </Text>
            <Text fontSize="sm" color="gray.500" mt={2}>
              Come back tomorrow for more fun! 🌟
            </Text>
          </VStack>

          {/* Progress Bar */}
          <Box w="full">
            <Progress
              value={100}
              size="lg"
              colorScheme="orange"
              borderRadius="full"
              hasStripe
              isAnimated
            />
          </Box>

          {/* Auto-logout countdown */}
          <VStack spacing={2} w="full">
            <Text fontSize="sm" color="gray.500">
              Logging out in {countdown} seconds...
            </Text>
            <Button
              leftIcon={<FiLogOut />}
              colorScheme="orange"
              size="lg"
              w="full"
              onClick={handleLogoutNow}
            >
              Log Out Now
            </Button>
          </VStack>

          {/* Friendly message */}
          <Box
            bg="blue.50"
            p={4}
            borderRadius="lg"
            w="full"
          >
            <Text fontSize="sm" color="blue.700">
              💡 <strong>Tip:</strong> You can ask your parent if you need more time for homework or important activities!
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const user = session.user as any;

  // Only child accounts should see this page
  if (user.accountType !== 'child') {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  // Get usage data from API
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/usage/check`, {
      headers: {
        cookie: context.req.headers.cookie || '',
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      return {
        props: {
          todayMinutes: data.usage?.todayMinutes || 0,
          limitMinutes: data.usage?.limitMinutes || 0,
          childName: user.name?.split(' ')[0] || 'there',
        },
      };
    }
  } catch (error) {
    console.error('[TimeLimitPage] Error fetching usage:', error);
  }

  return {
    props: {
      todayMinutes: 0,
      limitMinutes: 0,
      childName: user.name?.split(' ')[0] || 'there',
    },
  };
};
