/**
 * Child Art Studio Right Panel
 * 
 * Enhanced kid-friendly panel with agentic features:
 * - Art Helper AI assistant for creative ideas & prompt enhancement
 * - Style guide with recommendations
 * - Creative challenges & daily prompts
 * - Gallery of recent creations with favorites
 */

import React, { useState, useEffect } from 'react';
import { ChildTutorTab } from './ChildTutorTab';
import { KNOWN_ACTIVITY_IDS } from '@/domains/learning/shared/activity-registry';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  SimpleGrid,
  Image,
  Badge,
  Divider,
  Spinner,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { 
  FiDownload, 
  FiRefreshCw, 
  FiTarget,
  FiCopy,
} from 'react-icons/fi';
import { useChildTheme } from './ChildThemeProvider';
import { useKidsPCG } from '@/hooks/useKidsPCG';
import { getContextHub } from '@/domains/learning/shared/context-hub-service';
import type { ContextFrame } from '@/domains/learning/shared/context-hub';

interface ImageSettings {
  style: 'cartoon' | 'watercolor' | 'pixel' | 'storybook' | '3d';
  size: 'small' | 'medium' | 'large';
  safeMode: boolean;
}

interface GalleryImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
  favorite?: boolean;
}

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  difficulty: 'easy' | 'medium' | 'hard';
  completed: boolean;
}

const STYLE_OPTIONS = [
  { value: 'cartoon', label: '🎨 Cartoon', description: 'Fun and colorful!', tips: ['Use bright colors', 'Add big eyes', 'Make it silly!'] },
  { value: 'watercolor', label: '🖌️ Watercolor', description: 'Soft and dreamy', tips: ['Soft edges', 'Pastel colors', 'Nature themes'] },
  { value: 'pixel', label: '👾 Pixel Art', description: 'Retro game style', tips: ['Simple shapes', 'Bold colors', 'Game characters'] },
  { value: 'storybook', label: '📚 Storybook', description: 'Like a fairy tale', tips: ['Magical scenes', 'Warm colors', 'Fantasy creatures'] },
  { value: '3d', label: '🎮 3D Render', description: 'Modern and shiny', tips: ['Shiny surfaces', 'Cool lighting', 'Futuristic'] },
];

const SIZE_OPTIONS = [
  { value: 'small', label: 'Small', pixels: '256x256' },
  { value: 'medium', label: 'Medium', pixels: '512x512' },
  { value: 'large', label: 'Large', pixels: '1024x1024' },
];

const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: '1', title: 'Rainbow Dragon', description: 'Draw a dragon with rainbow scales!', emoji: '🐉', difficulty: 'easy', completed: false },
  { id: '2', title: 'Underwater Castle', description: 'Create a magical castle under the sea', emoji: '🏰', difficulty: 'medium', completed: false },
  { id: '3', title: 'Space Kitten', description: 'A cute kitten astronaut in space!', emoji: '🐱', difficulty: 'easy', completed: false },
  { id: '4', title: 'Enchanted Forest', description: 'A forest with glowing mushrooms', emoji: '🌲', difficulty: 'medium', completed: false },
  { id: '5', title: 'Robot Chef', description: 'A friendly robot cooking dinner', emoji: '🤖', difficulty: 'hard', completed: false },
];

interface ChildArtStudioPanelProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
}

export function ChildArtStudioPanel({ activeTab }: ChildArtStudioPanelProps) {
  const toast = useToast();
  const { colors } = useChildTheme();
  const { profile } = useKidsPCG();
  const childId = profile?.id || 'guest';
  const [artFrame, setArtFrame] = useState<ContextFrame | null>(null);

  useEffect(() => {
    const hub = getContextHub();
    const update = () => {
      const frame = hub.getFocusFrame();
      if (frame?.activityId === KNOWN_ACTIVITY_IDS.ART_STUDIO) {
        setArtFrame(frame);
      } else {
        setArtFrame(null);
      }
    };
    update();
    const unsub = hub.subscribe(update);
    return unsub;
  }, []);

  const artPayload = artFrame?.payload as {
    currentPrompt?: string;
    currentImageId?: string | null;
    imageCount?: number;
    hasUnsavedChanges?: boolean;
  } | undefined;

  // Image Settings state
  const [settings, setSettings] = useState<ImageSettings>({
    style: 'cartoon',
    size: 'medium',
    safeMode: true,
  });

  // Gallery state
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  // Challenge state
  const [challenges, setChallenges] = useState<DailyChallenge[]>(DAILY_CHALLENGES);
  const [artStats, setArtStats] = useState({ created: 0, favorites: 0, streak: 0 });

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`childArtStudioSettings-${childId}`);
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {}
    }
    // Load art stats
    const stats = localStorage.getItem(`childArtStats-${childId}`);
    if (stats) {
      try {
        setArtStats(JSON.parse(stats));
      } catch (e) {}
    }
    // Load challenges
    const savedChallenges = localStorage.getItem(`childArtChallenges-${childId}`);
    if (savedChallenges) {
      try {
        setChallenges(JSON.parse(savedChallenges));
      } catch (e) {}
    }
  }, [childId]);

  // Load gallery
  useEffect(() => {
    if (activeTab === 'gallery') {
      loadGallery();
    }
  }, [activeTab]);

  const loadGallery = async () => {
    setGalleryLoading(true);
    try {
      const res = await fetch('/api/child/art-gallery');
      if (res.ok) {
        const data = await res.json();
        setGallery(data.images || []);
      }
    } catch (e) {
      // Use mock data if API not available
      setGallery([]);
    } finally {
      setGalleryLoading(false);
    }
  };

  // Save settings
  const updateSettings = (key: keyof ImageSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(`childArtStudioSettings-${childId}`, JSON.stringify(newSettings));
  };

  // Copy prompt to clipboard
  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: '📋 Copied!',
      description: 'Paste this in the art studio!',
      status: 'success',
      duration: 2000,
    });
  };

  // Complete a challenge
  const completeChallenge = (id: string) => {
    const updated = challenges.map(c => 
      c.id === id ? { ...c, completed: true } : c
    );
    setChallenges(updated);
    localStorage.setItem(`childArtChallenges-${childId}`, JSON.stringify(updated));
    
    const newStats = { ...artStats, created: artStats.created + 1 };
    setArtStats(newStats);
    localStorage.setItem(`childArtStats-${childId}`, JSON.stringify(newStats));
    
    toast({
      title: '🎉 Challenge Complete!',
      description: 'Great job! Keep creating!',
      status: 'success',
      duration: 3000,
    });
  };

  // Render Image Settings tab - Enhanced with tips and challenges
  const renderImageSettings = () => {
    const currentStyle = STYLE_OPTIONS.find(s => s.value === settings.style);
    const liveStyle = artFrame?.entities?.style as string | undefined;
    const livePrompt = artPayload?.currentPrompt;

    return (
      <VStack spacing={4} align="stretch" p={4} overflowY="auto">
        {/* Creative Assistant Card */}
        <Box bg={`${colors.primary}15`} borderRadius="xl" p={4} border="2px solid" borderColor={colors.primary}>
          <HStack spacing={2} mb={2}>
            <Text fontSize="xl">✨</Text>
            <Text fontWeight="700" fontSize="sm" color={colors.text}>Creative Assistant</Text>
          </HStack>
          <Text fontSize="xs" color={colors.textMuted} mb={3}>
            {livePrompt
              ? `You are working on: ${livePrompt}`
              : 'Start a prompt in the Art Studio and I\'ll help you polish it!'}
            {liveStyle && ` (${liveStyle} style)`}
          </Text>
          <SimpleGrid columns={2} spacing={2}>
            <Button
              size="xs"
              colorScheme="purple"
              variant="outline"
              borderRadius="full"
              leftIcon={<Text fontSize="xs">📖</Text>}
              onClick={() => copyPrompt(livePrompt || 'Write a story about my latest artwork')}
            >
              Story Studio
            </Button>
            <Button
              size="xs"
              colorScheme="blue"
              variant="outline"
              borderRadius="full"
              leftIcon={<Text fontSize="xs">📝</Text>}
              onClick={() => copyPrompt(livePrompt || 'Help me write a poem about my picture')}
            >
              Journal
            </Button>
            <Button
              size="xs"
              colorScheme="green"
              variant="outline"
              borderRadius="full"
              leftIcon={<Text fontSize="xs">🎯</Text>}
              onClick={() => copyPrompt(livePrompt || 'Turn my art into a learning challenge')}
            >
              Learn Hub
            </Button>
            <Button
              size="xs"
              colorScheme="orange"
              variant="outline"
              borderRadius="full"
              leftIcon={<Text fontSize="xs">🚀</Text>}
              onClick={() => copyPrompt(livePrompt ? `${livePrompt} with more details and colors` : 'Surprise me with a cool art idea')}
            >
              Enhance prompt
            </Button>
          </SimpleGrid>
        </Box>

        <HStack justify="space-between">
          <HStack spacing={3}>
            <Text fontSize="2xl">🖼️</Text>
            <Box>
              <Text fontWeight="700" fontSize="sm" color={colors.text}>Style & Settings</Text>
              <Text fontSize="xs" color={colors.textMuted}>Customize your art!</Text>
            </Box>
          </HStack>
        </HStack>

        {/* Style Selection with Tips */}
        <Box>
          <Text fontSize="xs" fontWeight="700" color={colors.text} mb={2}>✨ Art Style</Text>
          <VStack spacing={2} align="stretch" maxH="180px" overflowY="auto">
            {STYLE_OPTIONS.map((style) => (
              <Box
                key={style.value}
                p={3}
                bg={settings.style === style.value ? `${colors.primary}15` : colors.backgroundTertiary}
                borderRadius="lg"
                border="2px solid"
                borderColor={settings.style === style.value ? colors.primary : colors.border}
                cursor="pointer"
                onClick={() => updateSettings('style', style.value)}
                _hover={{ bg: settings.style === style.value ? `${colors.primary}15` : `${colors.primary}08` }}
                transition="all 0.2s"
              >
                <HStack justify="space-between">
                  <Text fontWeight="600" fontSize="sm" color={colors.text}>{style.label}</Text>
                  {settings.style === style.value && <Badge colorScheme="blue" fontSize="2xs">✓</Badge>}
                </HStack>
                <Text fontSize="2xs" color={colors.textMuted}>{style.description}</Text>
              </Box>
            ))}
          </VStack>
        </Box>

        {/* Style Tips */}
        {currentStyle?.tips && (
          <Box bg={`${colors.primary}11`} borderRadius="lg" p={3}>
            <HStack mb={1.5} spacing={2}>
              <Text>💡</Text>
              <Text fontSize="xs" fontWeight="700" color={colors.text}>Tips for {currentStyle.label}</Text>
            </HStack>
            <VStack align="start" spacing={0.5}>
              {currentStyle.tips.map((tip, idx) => (
                <Text key={idx} fontSize="2xs" color={colors.textMuted}>• {tip}</Text>
              ))}
            </VStack>
          </Box>
        )}

        <Divider />

        {/* Daily Challenges */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <HStack spacing={2}>
              <Text>🎯</Text>
              <Text fontSize="xs" fontWeight="700" color={colors.text}>Daily Challenges</Text>
            </HStack>
            <Badge colorScheme="green" fontSize="2xs">
              {challenges.filter(c => c.completed).length}/{challenges.length}
            </Badge>
          </HStack>
          <VStack spacing={2} align="stretch" maxH="120px" overflowY="auto">
            {challenges.slice(0, 3).map((challenge) => (
              <HStack
                key={challenge.id}
                p={3}
                bg={challenge.completed ? `${colors.primary}11` : colors.backgroundTertiary}
                borderRadius="lg"
                border="1px solid"
                borderColor={colors.border}
                justify="space-between"
                opacity={challenge.completed ? 0.7 : 1}
                spacing={3}
              >
                <HStack spacing={2}>
                  <Text fontSize="lg">{challenge.emoji}</Text>
                  <Box>
                    <Text fontSize="xs" fontWeight="600" color={colors.text} textDecoration={challenge.completed ? 'line-through' : 'none'}>
                      {challenge.title}
                    </Text>
                    <HStack spacing={1}>
                      <Badge 
                        colorScheme={challenge.difficulty === 'easy' ? 'green' : challenge.difficulty === 'medium' ? 'yellow' : 'red'} 
                        fontSize="2xs"
                      >
                        {challenge.difficulty}
                      </Badge>
                    </HStack>
                  </Box>
                </HStack>
                {!challenge.completed ? (
                  <Tooltip label={challenge.description}>
                    <IconButton
                      icon={<FiTarget />}
                      aria-label="Try challenge"
                      size="xs"
                      colorScheme="blue"
                      variant="ghost"
                      onClick={() => {
                        copyPrompt(challenge.description);
                        completeChallenge(challenge.id);
                      }}
                    />
                  </Tooltip>
                ) : (
                  <Text color="green.500">✓</Text>
                )}
              </HStack>
            ))}
          </VStack>
        </Box>

        <Divider />

        {/* Size Selection */}
        <Box>
          <Text fontSize="xs" fontWeight="700" color={colors.text} mb={2}>📐 Picture Size</Text>
          <SimpleGrid columns={3} spacing={2}>
            {SIZE_OPTIONS.map((size) => (
              <Button
                key={size.value}
                size="xs"
                variant={settings.size === size.value ? 'solid' : 'outline'}
                colorScheme={settings.size === size.value ? 'blue' : 'gray'}
                onClick={() => updateSettings('size', size.value)}
                borderRadius="lg"
              >
                <VStack spacing={0}>
                  <Text fontSize="2xs">{size.label}</Text>
                </VStack>
              </Button>
            ))}
          </SimpleGrid>
        </Box>

        {/* Safe Mode */}
        <HStack justify="space-between" p={3} bg={`${colors.primary}11`} borderRadius="lg">
          <HStack spacing={2}>
            <Text>🛡️</Text>
            <Text fontSize="xs" fontWeight="600" color={colors.text}>Safe Mode</Text>
          </HStack>
          <Badge colorScheme="green" fontSize="2xs">Always On</Badge>
        </HStack>
      </VStack>
    );
  };

  // Render Gallery tab - Enhanced with stats and favorites
  const renderGallery = () => {
    const favoriteCount = gallery.filter(g => g.favorite).length;
    
    return (
      <VStack spacing={4} align="stretch" p={4} overflowY="auto">
        <HStack justify="space-between">
          <HStack spacing={3}>
            <Text fontSize="2xl">📸</Text>
            <Box>
              <Text fontWeight="700" fontSize="sm" color={colors.text}>My Gallery</Text>
              <Text fontSize="xs" color={colors.textMuted}>{gallery.length} creations</Text>
            </Box>
          </HStack>
          <IconButton
            icon={<FiRefreshCw />}
            aria-label="Refresh"
            size="xs"
            variant="ghost"
            onClick={loadGallery}
            isLoading={galleryLoading}
          />
        </HStack>

        {/* Stats Bar */}
        <HStack justify="space-around" p={3} bg={`${colors.primary}11`} borderRadius="lg">
          <VStack spacing={0}>
            <Text fontSize="lg" fontWeight="800" color={colors.primary}>{artStats.created}</Text>
            <Text fontSize="2xs" color={colors.textMuted}>Created</Text>
          </VStack>
          <Divider orientation="vertical" h="30px" />
          <VStack spacing={0}>
            <Text fontSize="lg" fontWeight="800" color={colors.primary}>{favoriteCount}</Text>
            <Text fontSize="2xs" color={colors.textMuted}>Favorites</Text>
          </VStack>
          <Divider orientation="vertical" h="30px" />
          <VStack spacing={0}>
            <Text fontSize="lg" fontWeight="800" color={colors.primary}>{artStats.streak}</Text>
            <Text fontSize="2xs" color={colors.textMuted}>Day Streak</Text>
          </VStack>
        </HStack>

        {galleryLoading ? (
          <Box textAlign="center" py={6}>
            <Spinner color={colors.primary} />
            <Text fontSize="sm" color={colors.textMuted} mt={2}>Loading...</Text>
          </Box>
        ) : gallery.length === 0 ? (
          <Box textAlign="center" py={6}>
            <Text fontSize="4xl" mb={2}>🎨</Text>
            <Text fontWeight="600" fontSize="sm" color={colors.text}>No art yet!</Text>
            <Text fontSize="xs" color={colors.textMuted}>Create something amazing!</Text>
            <Box p={3} bg={`${colors.primary}11`} borderRadius="lg" mt={3}>
              <Text fontSize="xs" color={colors.textMuted} textAlign="center">
                💬 Switch to the <strong>Chat</strong> tab to get ideas from your Art Helper!
              </Text>
            </Box>
          </Box>
        ) : (
          <SimpleGrid columns={2} spacing={2.5} maxH="280px" overflowY="auto">
            {gallery.map((img) => (
              <Box
                key={img.id}
                borderRadius="lg"
                overflow="hidden"
                bg={colors.backgroundTertiary}
                position="relative"
                cursor="pointer"
                transition="transform 0.2s"
                _hover={{ transform: 'scale(1.02)', '& .overlay': { opacity: 1 } }}
              >
                <Image
                  src={img.imageUrl}
                  alt={img.prompt}
                  w="full"
                  h="80px"
                  objectFit="cover"
                />
                {img.favorite && (
                  <Box position="absolute" top={1} right={1}>
                    <Text fontSize="sm">❤️</Text>
                  </Box>
                )}
                <Box
                  className="overlay"
                  position="absolute"
                  bottom={0}
                  left={0}
                  right={0}
                  bg="blackAlpha.800"
                  p={1}
                  opacity={0}
                  transition="opacity 0.2s"
                >
                  <Text fontSize="2xs" color="white" noOfLines={1}>
                    {img.prompt}
                  </Text>
                  <HStack spacing={1} mt={1}>
                    <IconButton
                      icon={<FiCopy />}
                      aria-label="Copy prompt"
                      size="xs"
                      variant="ghost"
                      color="white"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyPrompt(img.prompt);
                      }}
                    />
                    <IconButton
                      icon={<FiDownload />}
                      aria-label="Download"
                      size="xs"
                      variant="ghost"
                      color="white"
                      as="a"
                      href={img.imageUrl}
                      download
                    />
                  </HStack>
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        )}

        {/* Achievement hint */}
        {artStats.created >= 5 && (
          <Box p={3} bg={`${colors.primary}11`} borderRadius="lg">
            <HStack spacing={2}>
              <Text>🏆</Text>
              <Text fontSize="xs" color={colors.text} fontWeight="600">
                {artStats.created >= 10 ? 'Art Master!' : `${10 - artStats.created} more to Art Master badge!`}
              </Text>
            </HStack>
          </Box>
        )}

        {/* Tip */}
        <Box p={3} bg={`${colors.primary}11`} borderRadius="lg">
          <Text fontSize="2xs" color={colors.textMuted}>
            💡 Click on any image to copy its prompt and create similar art!
          </Text>
        </Box>
      </VStack>
    );
  };

  return (
    <Box p={0} h="full">

      {activeTab === 'chat' && (
        <Box h="full" display="flex" flexDirection="column">
          <ChildTutorTab
            defaultActivityId={KNOWN_ACTIVITY_IDS.ART_STUDIO}
            defaultTitle="Art Helper"
          />
        </Box>
      )}
      {activeTab === 'image-settings' && renderImageSettings()}
      {activeTab === 'gallery' && renderGallery()}
    </Box>
  );
}

export default ChildArtStudioPanel;
