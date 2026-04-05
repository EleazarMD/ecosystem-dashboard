/**
 * Image Editing Upgrade Prompt
 * 
 * Shows upgrade options when user tries to access image editing features
 * without the proper subscription tier (Pro or higher)
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
  SimpleGrid,
} from '@chakra-ui/react';
import {
  FiEdit3,
  FiImage,
  FiZap,
  FiCheckCircle,
  FiLock,
  FiArrowRight,
  FiStar,
  FiLayers,
  FiRefreshCw,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import NextLink from 'next/link';
import { useRouter } from 'next/router';

interface ImageEditingUpgradePromptProps {
  currentTier?: string;
  onClose?: () => void;
}

export default function ImageEditingUpgradePrompt({
  currentTier = 'free',
  onClose,
}: ImageEditingUpgradePromptProps) {
  const router = useRouter();
  const bgSubtle = useSemanticToken('surface.subtle');
  const textSecondary = useSemanticToken('text.secondary');
  const accentColor = useSemanticToken('accent.default');

  const handleUpgrade = () => {
    router.push('/settings/upgrade?feature=image-editing');
  };

  return (
    <VStack spacing={6} align="stretch" py={4}>
      {/* Header */}
      <VStack spacing={3} textAlign="center">
        <Box position="relative" display="inline-block">
          <Icon as={FiEdit3} boxSize={16} color="purple.400" />
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
          Unlock AI Image Editing
        </Text>
        <Text color={textSecondary} maxW="md" fontSize="md">
          Transform your photos with AI-powered editing using HiDream E1.1 instruction-based technology
        </Text>
      </VStack>

      {/* Current Status */}
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle fontSize="sm">Current Plan: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</AlertTitle>
          <AlertDescription fontSize="sm">
            Image editing requires Pro subscription or higher
          </AlertDescription>
        </Box>
      </Alert>

      {/* Feature Highlights */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <GlassPanel p={4} textAlign="center">
          <Icon as={FiLayers} boxSize={8} color="purple.400" mb={2} />
          <Text fontWeight="semibold" fontSize="sm">Style Transfer</Text>
          <Text fontSize="xs" color={textSecondary}>
            Transform photos into paintings, sketches, or any art style
          </Text>
        </GlassPanel>
        <GlassPanel p={4} textAlign="center">
          <Icon as={FiRefreshCw} boxSize={8} color="blue.400" mb={2} />
          <Text fontWeight="semibold" fontSize="sm">Photo Enhancement</Text>
          <Text fontSize="xs" color={textSecondary}>
            Improve lighting, add details, or change the mood
          </Text>
        </GlassPanel>
        <GlassPanel p={4} textAlign="center">
          <Icon as={FiZap} boxSize={8} color="yellow.500" mb={2} />
          <Text fontWeight="semibold" fontSize="sm">Creative Effects</Text>
          <Text fontSize="xs" color={textSecondary}>
            Add artistic effects and creative transformations
          </Text>
        </GlassPanel>
      </SimpleGrid>

      {/* Upgrade Options */}
      <VStack spacing={4} align="stretch">
        {/* Pro Plan Option */}
        <GlassPanel p={6} borderWidth="2px" borderColor="purple.500">
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <VStack align="start" spacing={0}>
                <HStack>
                  <Text fontSize="xl" fontWeight="bold">Pro Plan</Text>
                  <Badge colorScheme="purple">Recommended</Badge>
                </HStack>
                <Text fontSize="sm" color={textSecondary}>
                  Full creative suite with image editing
                </Text>
              </VStack>
              <VStack align="end" spacing={0}>
                <Text fontSize="2xl" fontWeight="bold" color={accentColor}>
                  $19.99
                </Text>
                <Text fontSize="xs" color={textSecondary}>per month</Text>
              </VStack>
            </HStack>

            <Divider />

            <List spacing={2}>
              <ListItem>
                <HStack>
                  <ListIcon as={FiCheckCircle} color="green.500" />
                  <Text fontSize="sm"><strong>AI Image Editing</strong> with HiDream E1.1</Text>
                </HStack>
              </ListItem>
              <ListItem>
                <HStack>
                  <ListIcon as={FiCheckCircle} color="green.500" />
                  <Text fontSize="sm">Unlimited image generations</Text>
                </HStack>
              </ListItem>
              <ListItem>
                <HStack>
                  <ListIcon as={FiCheckCircle} color="green.500" />
                  <Text fontSize="sm">All HiDream models (Full, Dev, Fast)</Text>
                </HStack>
              </ListItem>
              <ListItem>
                <HStack>
                  <ListIcon as={FiStar} color="yellow.500" />
                  <Text fontSize="sm">Priority generation queue</Text>
                </HStack>
              </ListItem>
              <ListItem>
                <HStack>
                  <ListIcon as={FiCheckCircle} color="green.500" />
                  <Text fontSize="sm">50GB cloud storage</Text>
                </HStack>
              </ListItem>
            </List>

            <Button
              colorScheme="purple"
              size="lg"
              rightIcon={<FiArrowRight />}
              onClick={handleUpgrade}
            >
              Upgrade to Pro
            </Button>
          </VStack>
        </GlassPanel>

        {/* Premium Plan Option */}
        <GlassPanel p={6}>
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <VStack align="start" spacing={0}>
                <Text fontSize="lg" fontWeight="bold">Premium Plan</Text>
                <Text fontSize="sm" color={textSecondary}>
                  Everything in Pro plus family features
                </Text>
              </VStack>
              <VStack align="end" spacing={0}>
                <Text fontSize="xl" fontWeight="bold" color={accentColor}>
                  $34.99
                </Text>
                <Text fontSize="xs" color={textSecondary}>per month</Text>
              </VStack>
            </HStack>

            <Divider />

            <List spacing={2}>
              <ListItem>
                <HStack>
                  <ListIcon as={FiCheckCircle} color="blue.500" />
                  <Text fontSize="sm">All Pro features included</Text>
                </HStack>
              </ListItem>
              <ListItem>
                <HStack>
                  <ListIcon as={FiCheckCircle} color="blue.500" />
                  <Text fontSize="sm">Up to 5 family member accounts</Text>
                </HStack>
              </ListItem>
              <ListItem>
                <HStack>
                  <ListIcon as={FiCheckCircle} color="blue.500" />
                  <Text fontSize="sm">Advanced parental controls</Text>
                </HStack>
              </ListItem>
              <ListItem>
                <HStack>
                  <ListIcon as={FiCheckCircle} color="blue.500" />
                  <Text fontSize="sm">100GB cloud storage</Text>
                </HStack>
              </ListItem>
            </List>

            <Button
              colorScheme="blue"
              variant="outline"
              size="md"
              rightIcon={<FiArrowRight />}
              as={NextLink}
              href="/settings/upgrade?plan=premium"
            >
              View Premium Plan
            </Button>
          </VStack>
        </GlassPanel>
      </VStack>

      {/* Help Text */}
      <VStack spacing={2}>
        <Text fontSize="sm" color={textSecondary} textAlign="center">
          All plans include a 7-day free trial. Cancel anytime.
        </Text>
        <HStack justify="center" spacing={4}>
          <Button 
            variant="link" 
            size="sm" 
            colorScheme="blue"
            as={NextLink}
            href="/settings/upgrade"
          >
            Compare All Plans
          </Button>
          <Text color={textSecondary}>•</Text>
          <Button variant="link" size="sm" colorScheme="blue">
            Contact Support
          </Button>
        </HStack>
      </VStack>
    </VStack>
  );
}
