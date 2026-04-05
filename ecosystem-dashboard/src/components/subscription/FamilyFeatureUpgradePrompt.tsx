/**
 * Family Feature Upgrade Prompt
 * 
 * Shows upgrade options when user tries to access family management features
 * without the proper subscription tier
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Badge,
  List,
  ListItem,
  ListIcon,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import {
  FiUsers,
  FiShield,
  FiActivity,
  FiCheckCircle,
  FiLock,
  FiArrowRight,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import NextLink from 'next/link';

interface FamilyFeatureUpgradePromptProps {
  currentTier: string;
  currentChildCount?: number;
  maxChildCount?: number;
  onUpgrade?: () => void;
}

export default function FamilyFeatureUpgradePrompt({
  currentTier,
  currentChildCount = 0,
  maxChildCount = 0,
  onUpgrade,
}: FamilyFeatureUpgradePromptProps) {
  const bgSubtle = useSemanticToken('surface.subtle');
  const textSecondary = useSemanticToken('text.secondary');
  const accentColor = useSemanticToken('accent.default');

  const isAtLimit = currentChildCount >= maxChildCount && maxChildCount > 0;
  const hasNoAccess = maxChildCount === 0;

  return (
    <VStack spacing={6} align="stretch" py={8}>
      {/* Header */}
      <VStack spacing={2} textAlign="center">
        <Box position="relative" display="inline-block">
          <Icon as={FiUsers} boxSize={16} color="gray.300" />
          <Icon
            as={FiLock}
            boxSize={6}
            color="orange.500"
            position="absolute"
            bottom={-1}
            right={-1}
            bg="white"
            borderRadius="full"
            p={1}
          />
        </Box>
        <Text fontSize="2xl" fontWeight="bold">
          {hasNoAccess ? 'Unlock Family Management' : 'Upgrade Your Family Plan'}
        </Text>
        <Text color={textSecondary} maxW="md">
          {hasNoAccess
            ? 'Add child accounts with parental controls and activity monitoring'
            : `You've reached your limit of ${maxChildCount} child accounts. Upgrade to add more.`}
        </Text>
      </VStack>

      {/* Current Status */}
      {!hasNoAccess && (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="sm">Current Plan: {currentTier}</AlertTitle>
            <AlertDescription fontSize="sm">
              {currentChildCount} of {maxChildCount} child accounts used
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {/* Upgrade Options */}
      <VStack spacing={4} align="stretch">
        {/* Family Plan Option */}
        <GlassPanel variant="light" p={6}>
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <VStack align="start" spacing={0}>
                <HStack>
                  <Text fontSize="xl" fontWeight="bold">Family Plan</Text>
                  <Badge colorScheme="purple">Recommended</Badge>
                </HStack>
                <Text fontSize="sm" color={textSecondary}>
                  Complete family management solution
                </Text>
              </VStack>
              <VStack align="end" spacing={0}>
                <Text fontSize="2xl" fontWeight="bold" color={accentColor}>
                  $34.99
                </Text>
                <Text fontSize="xs" color={textSecondary}>per month</Text>
              </VStack>
            </HStack>

            <Divider />

            <List spacing={2}>
              <ListItem>
                <HStack>
                  <ListIcon as={FiCheckCircle} color="green.500" />
                  <Text fontSize="sm">Up to 5 child accounts</Text>
                </HStack>
              </ListItem>
              <ListItem>
                <HStack>
                  <ListIcon as={FiShield} color="green.500" />
                  <Text fontSize="sm">Advanced parental controls</Text>
                </HStack>
              </ListItem>
              <ListItem>
                <HStack>
                  <ListIcon as={FiActivity} color="green.500" />
                  <Text fontSize="sm">Real-time activity monitoring</Text>
                </HStack>
              </ListItem>
              <ListItem>
                <HStack>
                  <ListIcon as={FiCheckCircle} color="green.500" />
                  <Text fontSize="sm">Content filtering & approval workflows</Text>
                </HStack>
              </ListItem>
              <ListItem>
                <HStack>
                  <ListIcon as={FiCheckCircle} color="green.500" />
                  <Text fontSize="sm">All Pro features included</Text>
                </HStack>
              </ListItem>
            </List>

            <Button
              colorScheme="purple"
              size="lg"
              rightIcon={<FiArrowRight />}
              onClick={onUpgrade}
              as={NextLink}
              href="/settings/subscription?plan=family"
            >
              Upgrade to Family Plan
            </Button>
          </VStack>
        </GlassPanel>

        {/* Family Add-on Option (if on Basic/Pro) */}
        {currentTier !== 'free' && hasNoAccess && (
          <GlassPanel variant="light" p={6}>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <Text fontSize="lg" fontWeight="bold">Family Add-on</Text>
                  <Text fontSize="sm" color={textSecondary}>
                    Add to your current plan
                  </Text>
                </VStack>
                <VStack align="end" spacing={0}>
                  <Text fontSize="xl" fontWeight="bold" color={accentColor}>
                    $14.99
                  </Text>
                  <Text fontSize="xs" color={textSecondary}>per month</Text>
                </VStack>
              </HStack>

              <Divider />

              <List spacing={2}>
                <ListItem>
                  <HStack>
                    <ListIcon as={FiCheckCircle} color="blue.500" />
                    <Text fontSize="sm">Up to 3 child accounts</Text>
                  </HStack>
                </ListItem>
                <ListItem>
                  <HStack>
                    <ListIcon as={FiShield} color="blue.500" />
                    <Text fontSize="sm">Basic parental controls</Text>
                  </HStack>
                </ListItem>
                <ListItem>
                  <HStack>
                    <ListIcon as={FiActivity} color="blue.500" />
                    <Text fontSize="sm">Activity monitoring</Text>
                  </HStack>
                </ListItem>
              </List>

              <Button
                colorScheme="blue"
                variant="outline"
                size="md"
                rightIcon={<FiArrowRight />}
                as={NextLink}
                href="/settings/subscription?addon=family-addon"
              >
                Add Family Pack
              </Button>
            </VStack>
          </GlassPanel>
        )}

        {/* Extra Slots Option (if on Family plan and at limit) */}
        {currentTier === 'family' && isAtLimit && (
          <GlassPanel variant="light" p={6}>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <Text fontSize="lg" fontWeight="bold">Extra Child Slots</Text>
                  <Text fontSize="sm" color={textSecondary}>
                    Add 5 more child accounts
                  </Text>
                </VStack>
                <VStack align="end" spacing={0}>
                  <Text fontSize="xl" fontWeight="bold" color={accentColor}>
                    $4.99
                  </Text>
                  <Text fontSize="xs" color={textSecondary}>per month</Text>
                </VStack>
              </HStack>

              <Button
                colorScheme="blue"
                variant="outline"
                size="md"
                rightIcon={<FiArrowRight />}
                as={NextLink}
                href="/settings/subscription?addon=extra-child-slots"
              >
                Add Extra Slots
              </Button>
            </VStack>
          </GlassPanel>
        )}
      </VStack>

      {/* Help Text */}
      <Text fontSize="sm" color={textSecondary} textAlign="center">
        Need help choosing? <Button variant="link" size="sm" colorScheme="blue">Contact Support</Button>
      </Text>
    </VStack>
  );
}
