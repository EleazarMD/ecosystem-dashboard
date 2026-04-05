/**
 * Creative Activity Button
 * 
 * A floating action button that launches creative activities from the chat.
 * Shows available activities in a popover menu.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  Tooltip,
} from '@chakra-ui/react';
import { FiImage, FiStar, FiClock } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { CreativeActivityPanel } from './CreativeActivityPanel';
import type { CreativeActivityTemplate } from '@/lib/platform/creative-activity-types';

const MotionBox = motion(Box);

interface CreativeActivityButtonProps {
  theme: 'minecraft' | 'pusheen' | 'space' | 'ocean';
  characterId?: string;
  variant?: 'icon' | 'button' | 'chip';
  onImageGenerated?: (imageUrl: string, imageId?: string) => void;
}

export function CreativeActivityButton({
  theme,
  characterId,
  variant = 'button',
  onImageGenerated,
}: CreativeActivityButtonProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activities, setActivities] = useState<CreativeActivityTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch activities on hover/focus
  const fetchActivities = async () => {
    if (activities.length > 0) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/child/creative-activity?theme=${theme}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageGenerated = (imageUrl: string, imageId?: string) => {
    onImageGenerated?.(imageUrl, imageId);
  };

  // Get theme-specific styling
  const getThemeColors = () => {
    switch (theme) {
      case 'minecraft':
        return { bg: 'green.500', hoverBg: 'green.600', icon: '⛏️' };
      case 'pusheen':
        return { bg: 'pink.400', hoverBg: 'pink.500', icon: '🐱' };
      case 'space':
        return { bg: 'purple.500', hoverBg: 'purple.600', icon: '🚀' };
      case 'ocean':
        return { bg: 'blue.400', hoverBg: 'blue.500', icon: '🐠' };
      default:
        return { bg: 'blue.500', hoverBg: 'blue.600', icon: '🎨' };
    }
  };

  const colors = getThemeColors();

  // Render based on variant
  const renderTrigger = () => {
    switch (variant) {
      case 'icon':
        return (
          <Tooltip label="Creative Activities" placement="top">
            <IconButton
              icon={<FiImage />}
              aria-label="Creative Activities"
              colorScheme={theme === 'pusheen' ? 'pink' : theme === 'minecraft' ? 'green' : 'blue'}
              size="lg"
              borderRadius="full"
              shadow="lg"
              onClick={onOpen}
              onMouseEnter={fetchActivities}
            />
          </Tooltip>
        );

      case 'chip':
        return (
          <MotionBox
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="sm"
              leftIcon={<Text>{colors.icon}</Text>}
              bg={colors.bg}
              color="white"
              _hover={{ bg: colors.hoverBg }}
              borderRadius="full"
              onClick={onOpen}
              onMouseEnter={fetchActivities}
            >
              Create Art
            </Button>
          </MotionBox>
        );

      default:
        return (
          <MotionBox
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              leftIcon={<FiImage />}
              bg={colors.bg}
              color="white"
              _hover={{ bg: colors.hoverBg }}
              size="md"
              borderRadius="lg"
              shadow="md"
              onClick={onOpen}
              onMouseEnter={fetchActivities}
            >
              {colors.icon} Creative Activities
            </Button>
          </MotionBox>
        );
    }
  };

  return (
    <>
      {renderTrigger()}

      {/* Full-screen modal for the activity panel */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent
          bg="transparent"
          shadow="none"
          maxW="650px"
          mx={4}
        >
          <ModalBody p={0}>
            <CreativeActivityPanel
              theme={theme}
              characterId={characterId}
              onClose={onClose}
              onImageGenerated={handleImageGenerated}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

/**
 * Quick Activity Chips
 * 
 * Shows a row of quick-access activity chips for the current theme.
 */
export function CreativeActivityChips({
  theme,
  characterId,
  onImageGenerated,
}: {
  theme: 'minecraft' | 'pusheen' | 'space' | 'ocean';
  characterId?: string;
  onImageGenerated?: (imageUrl: string, imageId?: string) => void;
}) {
  const [activities, setActivities] = useState<CreativeActivityTemplate[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
  }, [theme]);

  const fetchActivities = async () => {
    try {
      const res = await fetch(`/api/child/creative-activity?theme=${theme}`);
      if (res.ok) {
        const data = await res.json();
        setActivities((data.activities || []).slice(0, 3)); // Show max 3
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };

  const handleActivityClick = (activityId: string) => {
    setSelectedActivity(activityId);
    onOpen();
  };

  if (activities.length === 0) return null;

  return (
    <>
      <HStack spacing={2} flexWrap="wrap">
        <Text fontSize="sm" color="gray.500" fontWeight="medium">
          🎨 Create:
        </Text>
        {activities.map((activity) => (
          <MotionBox
            key={activity.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="xs"
              variant="outline"
              borderRadius="full"
              onClick={() => handleActivityClick(activity.id)}
              leftIcon={<Text fontSize="sm">{activity.emoji}</Text>}
              _hover={{
                bg: theme === 'pusheen' ? 'pink.50' : theme === 'minecraft' ? 'green.50' : 'blue.50',
                borderColor: theme === 'pusheen' ? 'pink.300' : theme === 'minecraft' ? 'green.300' : 'blue.300',
              }}
            >
              {activity.name}
            </Button>
          </MotionBox>
        ))}
      </HStack>

      {/* Activity Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent bg="transparent" shadow="none" maxW="650px" mx={4}>
          <ModalBody p={0}>
            <CreativeActivityPanel
              theme={theme}
              characterId={characterId}
              onClose={onClose}
              onImageGenerated={onImageGenerated}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

export default CreativeActivityButton;
