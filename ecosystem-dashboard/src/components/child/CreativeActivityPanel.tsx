/**
 * Creative Activity Panel
 * 
 * UI component for guided creative activities that connect Chat to Art-Studio.
 * Displays activity options, guides through design choices, and shows generated images.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  SimpleGrid,
  Image,
  Spinner,
  Progress,
  Badge,
  IconButton,
  Collapse,
  useToast,
  Fade,
  ScaleFade,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck, FiImage, FiArrowLeft, FiStar, FiClock } from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import type {
  CreativeActivityTemplate,
  CreativeActivitySession,
  DesignStep,
  DesignOption,
} from '@/lib/platform/creative-activity-types';

const MotionBox = motion(Box);

interface CreativeActivityPanelProps {
  theme: 'minecraft' | 'pusheen' | 'space' | 'ocean';
  characterId?: string;
  onClose?: () => void;
  onImageGenerated?: (imageUrl: string, imageId?: string) => void;
}

type ActivityState = 'browsing' | 'active' | 'generating' | 'complete';

export function CreativeActivityPanel({
  theme,
  characterId,
  onClose,
  onImageGenerated,
}: CreativeActivityPanelProps) {
  const toast = useToast();
  
  // State
  const [activityState, setActivityState] = useState<ActivityState>('browsing');
  const [activities, setActivities] = useState<CreativeActivityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<CreativeActivitySession | null>(null);
  const [currentStep, setCurrentStep] = useState<DesignStep | null>(null);
  const [options, setOptions] = useState<DesignOption[]>([]);
  const [message, setMessage] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // Fetch available activities
  useEffect(() => {
    fetchActivities();
  }, [theme]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/child/creative-activity?theme=${theme}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      toast({
        title: 'Could not load activities',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Start an activity
  const startActivity = async (templateId: string) => {
    try {
      const res = await fetch('/api/child/creative-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, characterId }),
      });

      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setCurrentStep(data.currentStep);
        setOptions(data.options || []);
        setMessage(data.welcomeMessage);
        setActivityState('active');
      } else {
        throw new Error('Failed to start activity');
      }
    } catch (error) {
      console.error('Failed to start activity:', error);
      toast({
        title: 'Could not start activity',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Submit a design choice
  const submitChoice = async (choiceId?: string, customValue?: string) => {
    if (!session) return;

    try {
      const res = await fetch(`/api/child/creative-activity/${session.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choiceId, customValue }),
      });

      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setMessage(data.message);
        setCurrentStep(data.currentStep || null);
        setOptions(data.options || []);
        setIsComplete(data.isComplete);
        setSummary(data.summary || '');
        setCustomInput('');
      } else {
        throw new Error('Failed to submit choice');
      }
    } catch (error) {
      console.error('Failed to submit choice:', error);
      toast({
        title: 'Something went wrong',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Generate the image
  const generateImage = async () => {
    if (!session) return;

    setGenerating(true);
    setActivityState('generating');

    try {
      const res = await fetch('/api/child/creative-activity/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });

      const data = await res.json();

      if (data.blocked) {
        toast({
          title: data.message || "Let's try a different design!",
          status: 'warning',
          duration: 4000,
        });
        setActivityState('active');
        return;
      }

      if (data.success && data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setSession(data.session);
        setActivityState('complete');
        onImageGenerated?.(data.imageUrl, data.imageId);
        
        toast({
          title: '🎨 Your creation is ready!',
          status: 'success',
          duration: 4000,
        });
      } else {
        throw new Error(data.error || 'Image generation failed');
      }
    } catch (error: any) {
      console.error('Failed to generate image:', error);
      toast({
        title: 'Could not create image',
        description: 'Please try again',
        status: 'error',
        duration: 4000,
      });
      setActivityState('active');
    } finally {
      setGenerating(false);
    }
  };

  // Cancel activity
  const cancelActivity = async () => {
    if (session) {
      try {
        await fetch(`/api/child/creative-activity/${session.id}`, {
          method: 'DELETE',
        });
      } catch (e) {
        // Ignore errors on cancel
      }
    }
    
    setSession(null);
    setCurrentStep(null);
    setOptions([]);
    setMessage('');
    setIsComplete(false);
    setSummary('');
    setGeneratedImage(null);
    setActivityState('browsing');
  };

  // Calculate progress
  const getProgress = () => {
    if (!session) return 0;
    const total = session.template.designSteps.length;
    const current = session.currentStepIndex;
    return Math.round((current / total) * 100);
  };

  // Render activity browser
  const renderActivityBrowser = () => (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="xl" fontWeight="bold">
          {theme === 'minecraft' ? '⛏️' : '🐱'} Creative Activities
        </Text>
        {onClose && (
          <IconButton
            icon={<FiX />}
            aria-label="Close"
            size="sm"
            variant="ghost"
            onClick={onClose}
          />
        )}
      </HStack>

      <Text color="gray.600" fontSize="sm">
        Choose an activity and design something amazing!
      </Text>

      {loading ? (
        <Box textAlign="center" py={8}>
          <Spinner size="lg" color="blue.500" />
          <Text mt={2} color="gray.500">Loading activities...</Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {activities.map((activity) => (
            <MotionBox
              key={activity.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <GlassPanel
                variant="light"
                p={4}
                cursor="pointer"
                onClick={() => startActivity(activity.id)}
                _hover={{ borderColor: 'blue.300', shadow: 'md' }}
                transition="all 0.2s"
              >
                <HStack spacing={3} mb={2}>
                  <Text fontSize="2xl">{activity.emoji}</Text>
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="bold">{activity.name}</Text>
                    <HStack spacing={2}>
                      <Badge colorScheme={activity.difficulty === 'easy' ? 'green' : 'orange'} size="sm">
                        {activity.difficulty}
                      </Badge>
                      <HStack spacing={1} color="gray.500" fontSize="xs">
                        <FiClock size={12} />
                        <Text>{activity.estimatedMinutes} min</Text>
                      </HStack>
                    </HStack>
                  </VStack>
                </HStack>
                <Text fontSize="sm" color="gray.600" noOfLines={2}>
                  {activity.description}
                </Text>
              </GlassPanel>
            </MotionBox>
          ))}
        </SimpleGrid>
      )}
    </VStack>
  );

  // Render active activity
  const renderActiveActivity = () => (
    <VStack spacing={4} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <HStack spacing={2}>
          <IconButton
            icon={<FiArrowLeft />}
            aria-label="Back"
            size="sm"
            variant="ghost"
            onClick={cancelActivity}
          />
          <Text fontSize="lg" fontWeight="bold">
            {session?.template.emoji} {session?.template.name}
          </Text>
        </HStack>
        <Badge colorScheme="blue">
          Step {(session?.currentStepIndex || 0) + 1} of {session?.template.designSteps.length}
        </Badge>
      </HStack>

      {/* Progress */}
      <Progress
        value={getProgress()}
        size="sm"
        colorScheme="blue"
        borderRadius="full"
        hasStripe
        isAnimated
      />

      {/* Message from character */}
      <ScaleFade in={true} key={message}>
        <GlassPanel variant="light" p={4}>
          <HStack align="start" spacing={3}>
            <Text fontSize="2xl">
              {session?.characterId === 'pusheen' ? '🐱' : '⛏️'}
            </Text>
            <Box>
              <Text fontWeight="bold" mb={1}>{session?.characterName}</Text>
              <Text whiteSpace="pre-wrap">{message}</Text>
            </Box>
          </HStack>
        </GlassPanel>
      </ScaleFade>

      {/* Design choices or completion */}
      {isComplete ? (
        <VStack spacing={4}>
          {/* Summary */}
          <GlassPanel variant="light" p={4} w="full">
            <Text fontWeight="bold" mb={2}>📋 Your Design</Text>
            <VStack align="start" spacing={1}>
              {session?.designElements.map((el, idx) => (
                <HStack key={idx} spacing={2}>
                  <Text>{el.emoji || '•'}</Text>
                  <Text>{el.value}</Text>
                </HStack>
              ))}
            </VStack>
          </GlassPanel>

          {/* Generate button */}
          <Button
            colorScheme="green"
            size="lg"
            leftIcon={<FiImage />}
            onClick={generateImage}
            isLoading={generating}
            loadingText="Creating your image..."
            w="full"
          >
            ✨ Generate My {session?.template.name}!
          </Button>
        </VStack>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
          <AnimatePresence mode="wait">
            {options.map((option, idx) => (
              <MotionBox
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Button
                  variant="outline"
                  size="lg"
                  h="auto"
                  py={4}
                  px={4}
                  w="full"
                  onClick={() => submitChoice(option.id)}
                  _hover={{ bg: 'blue.50', borderColor: 'blue.400' }}
                >
                  <VStack spacing={1}>
                    <Text fontSize="2xl">{option.emoji}</Text>
                    <Text fontWeight="bold">{option.label}</Text>
                  </VStack>
                </Button>
              </MotionBox>
            ))}
          </AnimatePresence>
        </SimpleGrid>
      )}

      {/* Custom input option */}
      {currentStep?.allowCustom && !isComplete && (
        <HStack mt={2}>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Or type your own idea..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          />
          <Button
            colorScheme="blue"
            isDisabled={!customInput.trim()}
            onClick={() => submitChoice(undefined, customInput.trim())}
          >
            Use This
          </Button>
        </HStack>
      )}
    </VStack>
  );

  // Render generating state
  const renderGenerating = () => (
    <VStack spacing={6} py={8}>
      <Spinner size="xl" color="blue.500" thickness="4px" />
      <VStack spacing={2}>
        <Text fontSize="xl" fontWeight="bold">
          ✨ Creating your {session?.template.name}...
        </Text>
        <Text color="gray.500">
          This might take a minute. Your creation is being made just for you!
        </Text>
      </VStack>
      <Progress
        size="sm"
        isIndeterminate
        colorScheme="blue"
        w="80%"
        borderRadius="full"
      />
    </VStack>
  );

  // Render completed state
  const renderComplete = () => (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="xl" fontWeight="bold">
          🎉 Your {session?.template.name} is Ready!
        </Text>
        <IconButton
          icon={<FiX />}
          aria-label="Close"
          size="sm"
          variant="ghost"
          onClick={cancelActivity}
        />
      </HStack>

      {/* Generated image */}
      {generatedImage && (
        <Box
          borderRadius="xl"
          overflow="hidden"
          shadow="lg"
          position="relative"
        >
          <Image
            src={generatedImage}
            alt={`Your ${session?.template.name}`}
            w="full"
            maxH="400px"
            objectFit="contain"
            bg="gray.100"
          />
          <Badge
            position="absolute"
            top={2}
            right={2}
            colorScheme="green"
            fontSize="sm"
          >
            <HStack spacing={1}>
              <FiStar />
              <Text>Created by You!</Text>
            </HStack>
          </Badge>
        </Box>
      )}

      {/* Design summary */}
      <GlassPanel variant="light" p={4}>
        <Text fontWeight="bold" mb={2}>Your Design Choices:</Text>
        <SimpleGrid columns={2} spacing={2}>
          {session?.designElements.map((el, idx) => (
            <HStack key={idx} spacing={2}>
              <Text>{el.emoji || '•'}</Text>
              <Text fontSize="sm">{el.value}</Text>
            </HStack>
          ))}
        </SimpleGrid>
      </GlassPanel>

      {/* Actions */}
      <HStack spacing={3}>
        <Button
          flex={1}
          colorScheme="blue"
          onClick={cancelActivity}
        >
          Create Another
        </Button>
        <Button
          flex={1}
          variant="outline"
          onClick={onClose}
        >
          Done
        </Button>
      </HStack>
    </VStack>
  );

  return (
    <GlassPanel variant="light" p={5} maxW="600px" mx="auto">
      {activityState === 'browsing' && renderActivityBrowser()}
      {activityState === 'active' && renderActiveActivity()}
      {activityState === 'generating' && renderGenerating()}
      {activityState === 'complete' && renderComplete()}
    </GlassPanel>
  );
}

export default CreativeActivityPanel;
