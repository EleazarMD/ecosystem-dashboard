/**
 * Child Art Studio Right Panel
 * 
 * Enhanced kid-friendly panel with agentic features:
 * - Art Helper AI assistant for creative ideas & prompt enhancement
 * - Style guide with recommendations
 * - Creative challenges & daily prompts
 * - Gallery of recent creations with favorites
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  IconButton,
  Select,
  FormControl,
  FormLabel,
  Divider,
  Spinner,
  SimpleGrid,
  Image,
  Badge,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  Tooltip,
  Progress,
  Collapse,
  useToast,
  InputGroup,
  InputRightElement,
} from '@chakra-ui/react';
import { 
  FiSend, 
  FiImage, 
  FiDownload, 
  FiTrash2, 
  FiRefreshCw, 
  FiZap, 
  FiStar, 
  FiHeart,
  FiAward,
  FiTarget,
  FiCopy,
} from 'react-icons/fi';
import { useChildTheme } from './ChildThemeProvider';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'prompt' | 'tip';
}

interface ImageSettings {
  style: 'cartoon' | 'realistic' | 'anime' | 'watercolor' | 'pixel';
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

const ART_HELPER_ACTIONS = [
  { emoji: '💡', text: 'Give me an idea!', action: 'idea' },
  { emoji: '✨', text: 'Improve my prompt', action: 'enhance' },
  { emoji: '🎨', text: 'Color suggestions', action: 'colors' },
  { emoji: '🐾', text: 'Animal ideas', action: 'animals' },
  { emoji: '🏰', text: 'Fantasy themes', action: 'fantasy' },
  { emoji: '🚀', text: 'Space & Sci-Fi', action: 'scifi' },
];

// Style-specific prompt guidance for LLM augmentation
const STYLE_AUGMENTATION_TIPS: Record<string, string[]> = {
  cartoon: [
    'Bold outlines and vibrant colors work best!',
    'Try adding big expressive eyes',
    'Exaggerated features make it fun',
  ],
  watercolor: [
    'Soft, dreamy backgrounds look beautiful',
    'Pastel colors blend nicely',
    'Nature themes work great',
  ],
  pixel: [
    'Simple shapes and bold colors',
    'Think retro video game style',
    'Characters with blocky features',
  ],
  storybook: [
    'Magical, whimsical scenes',
    'Warm golden lighting',
    'Fairy tale creatures and settings',
  ],
  '3d': [
    'Shiny, smooth surfaces',
    'Modern lighting effects',
    'Pixar-like quality characters',
  ],
};

const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: '1', title: 'Rainbow Dragon', description: 'Draw a dragon with rainbow scales!', emoji: '🐉', difficulty: 'easy', completed: false },
  { id: '2', title: 'Underwater Castle', description: 'Create a magical castle under the sea', emoji: '🏰', difficulty: 'medium', completed: false },
  { id: '3', title: 'Space Kitten', description: 'A cute kitten astronaut in space!', emoji: '🐱', difficulty: 'easy', completed: false },
  { id: '4', title: 'Enchanted Forest', description: 'A forest with glowing mushrooms', emoji: '🌲', difficulty: 'medium', completed: false },
  { id: '5', title: 'Robot Chef', description: 'A friendly robot cooking dinner', emoji: '🤖', difficulty: 'hard', completed: false },
];

// Style-specific prompt enhancers
const PROMPT_ENHANCERS: Record<string, string[]> = {
  cartoon: [
    'with big sparkly eyes ✨',
    'super colorful and fun 🌈',
    'with a happy smile 😊',
    'bold and vibrant colors 🎨',
  ],
  watercolor: [
    'soft dreamy colors 🌸',
    'gentle pastel tones 💜',
    'flowing artistic style 🖌️',
    'beautiful sunset glow 🌅',
  ],
  pixel: [
    'retro game style 👾',
    '8-bit adventure 🎮',
    'blocky and colorful 🟦',
    'nostalgic pixel look 📺',
  ],
  storybook: [
    'magical fairy tale ✨',
    'enchanted and whimsical 🧚',
    'warm golden lighting 🌟',
    'once upon a time 📖',
  ],
  '3d': [
    'shiny and smooth 💎',
    'Pixar-style quality 🎬',
    'modern 3D look 🎮',
    'glowing lighting effects ✨',
  ],
};

interface ChildArtStudioPanelProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
}

export function ChildArtStudioPanel({ activeTab }: ChildArtStudioPanelProps) {
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { childExtras, themeId } = useChildTheme();

  // Art Helper state
  const [messages, setMessages] = useState<AIMessage[]>([
    { role: 'assistant', content: "Hi! 🎨 I'm your Art Helper! Tell me what you want to draw and I'll help you make it amazing! What kind of picture would you like to create?", type: 'text' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState('');

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
    const saved = localStorage.getItem('childArtStudioSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {}
    }
    // Load art stats
    const stats = localStorage.getItem('childArtStats');
    if (stats) {
      try {
        setArtStats(JSON.parse(stats));
      } catch (e) {}
    }
    // Load challenges
    const savedChallenges = localStorage.getItem('childArtChallenges');
    if (savedChallenges) {
      try {
        setChallenges(JSON.parse(savedChallenges));
      } catch (e) {}
    }
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    localStorage.setItem('childArtStudioSettings', JSON.stringify(newSettings));
  };

  // Handle action button click
  const handleAction = async (action: string) => {
    setLoading(true);
    
    const currentStyleInfo = STYLE_OPTIONS.find(s => s.value === settings.style);
    const styleTips = STYLE_AUGMENTATION_TIPS[settings.style] || STYLE_AUGMENTATION_TIPS.cartoon;
    
    const actionPrompts: Record<string, string> = {
      'idea': `Give me a fun and creative idea for a ${currentStyleInfo?.label || 'cartoon'} style picture!`,
      'enhance': input ? `Make this prompt better for ${currentStyleInfo?.label || 'cartoon'} style: "${input}"` : 'Help me think of something cool to draw!',
      'colors': `What colors would look amazing for ${currentStyleInfo?.label || 'cartoon'} style art?`,
      'animals': `Give me a cute animal idea that would look great in ${currentStyleInfo?.label || 'cartoon'} style!`,
      'fantasy': `Give me a magical fantasy idea perfect for ${currentStyleInfo?.label || 'cartoon'} style!`,
      'scifi': `Give me a cool space or robot idea for ${currentStyleInfo?.label || 'cartoon'} style!`,
    };

    const prompt = actionPrompts[action] || 'Give me an art idea!';
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);

    try {
      const res = await fetch('/api/child/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          context: `You are a friendly Art Helper for kids in their Art Studio! Help them create amazing artwork.

CURRENT ART STYLE: ${currentStyleInfo?.label || 'Cartoon'} (${currentStyleInfo?.description || 'Fun and colorful'})
STYLE TIPS: ${styleTips.join(', ')}

Your role:
- Help kids come up with creative ideas that work well with their chosen style
- Be encouraging and use simple, fun language with emojis!
- Give specific, visual descriptions they can type as prompts
- Keep responses short (2-3 sentences) and exciting!
- When enhancing prompts, add vivid details: colors, textures, lighting, mood, background
- Make sure ideas are cute, friendly, and age-appropriate (NOT scary)

For ${currentStyleInfo?.label || 'Cartoon'} style, focus on: ${styleTips[0]}`,
          service: 'art-assistant',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const response = data.response;
        setMessages(prev => [...prev, { role: 'assistant', content: response, type: action === 'enhance' ? 'prompt' : 'text' }]);
        
        // If enhancing, set the enhanced prompt
        if (action === 'enhance' && response) {
          setEnhancedPrompt(response);
        }
      } else {
        throw new Error('API error');
      }
    } catch (error) {
      const fallbackResponses: Record<string, string[]> = {
        'idea': [
          "How about a friendly dragon having a tea party with unicorns? 🐉🦄",
          "Try drawing a superhero cat saving the day! 🐱💪",
          "What about a magical treehouse in the clouds? 🌳☁️",
        ],
        'enhance': [
          "Add some sparkles, a rainbow background, and make it super colorful! ✨🌈",
          "Try adding cute animal friends and magical effects! 🐾✨",
        ],
        'colors': [
          "Purple, pink, and gold look amazing together! 💜💗✨",
          "Try ocean colors: turquoise, coral, and sandy yellow! 🌊🐚",
        ],
        'animals': [
          "A fluffy bunny with butterfly wings! 🐰🦋",
          "A baby dragon learning to fly! 🐉💨",
        ],
        'fantasy': [
          "A magical castle floating in the sky with rainbow bridges! 🏰🌈",
          "An enchanted forest with glowing mushrooms and fairies! 🌲✨",
        ],
        'scifi': [
          "A friendly robot exploring a candy planet! 🤖🍭",
          "A spaceship shaped like a pizza! 🚀🍕",
        ],
      };
      const responses = fallbackResponses[action] || fallbackResponses['idea'];
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: responses[Math.floor(Math.random() * responses.length)],
        type: action === 'enhance' ? 'prompt' : 'text'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Handle AI chat
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    const currentStyleInfo = STYLE_OPTIONS.find(s => s.value === settings.style);
    const styleTips = STYLE_AUGMENTATION_TIPS[settings.style] || STYLE_AUGMENTATION_TIPS.cartoon;

    try {
      const res = await fetch('/api/child/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: `You are a friendly Art Helper for kids in their Art Studio! Help them create amazing artwork.

CURRENT ART STYLE: ${currentStyleInfo?.label || 'Cartoon'} (${currentStyleInfo?.description || 'Fun and colorful'})
STYLE TIPS: ${styleTips.join(', ')}

Your role:
- Help kids come up with creative ideas that work well with their chosen ${currentStyleInfo?.label || 'Cartoon'} style
- Be encouraging and use simple, fun language with emojis!
- Give specific, visual descriptions they can type as prompts
- Keep responses short (2-3 sentences) and exciting!
- When they describe what they want, suggest how to make it even better
- Add vivid details: colors, textures, lighting, mood, background
- Make sure ideas are cute, friendly, and age-appropriate (NOT scary)

Remember: Their prompt will be automatically enhanced by AI when they create art, so help them describe the main idea clearly!`,
          service: 'art-assistant',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        throw new Error('API error');
      }
    } catch (error) {
      const fallbackResponses = [
        "Ooh, great idea! 🌟 Try adding some sparkles or a rainbow background to make it magical!",
        "I love it! 🎨 What if you added a cute animal friend to your picture?",
        "That sounds amazing! ✨ Try using bright colors like purple, blue, and gold!",
        "So creative! 🦋 You could add some flowers or butterflies around it!",
      ];
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
      }]);
    } finally {
      setLoading(false);
    }
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
    localStorage.setItem('childArtChallenges', JSON.stringify(updated));
    
    const newStats = { ...artStats, created: artStats.created + 1 };
    setArtStats(newStats);
    localStorage.setItem('childArtStats', JSON.stringify(newStats));
    
    toast({
      title: '🎉 Challenge Complete!',
      description: 'Great job! Keep creating!',
      status: 'success',
      duration: 3000,
    });
  };

  // Add random style-specific enhancer to prompt
  const addEnhancer = () => {
    const styleEnhancers = PROMPT_ENHANCERS[settings.style] || PROMPT_ENHANCERS.cartoon;
    const enhancer = styleEnhancers[Math.floor(Math.random() * styleEnhancers.length)];
    setInput(prev => prev ? `${prev} ${enhancer}` : enhancer);
  };

  // Render Art Helper tab - Enhanced with agentic features
  const renderArtHelper = () => {
    // Get themed character avatar
    const characterAvatar = childExtras?.avatar?.default;
    const isImageAvatar = characterAvatar && characterAvatar.startsWith('/');
    
    return (
    <VStack spacing={3} align="stretch" h="full">
      {/* Header with themed character */}
      <HStack justify="space-between">
        <HStack spacing={2}>
          {isImageAvatar ? (
            <Image 
              src={characterAvatar} 
              alt="Art Helper" 
              boxSize="40px"
              objectFit="contain"
            />
          ) : (
            <Text fontSize="2xl">{characterAvatar || '🎨'}</Text>
          )}
          <Box>
            <Text fontWeight="bold" fontSize="sm">Art Helper</Text>
            <Text fontSize="xs" color="gray.500">Your creative buddy!</Text>
          </Box>
        </HStack>
        <Badge colorScheme="pink" fontSize="2xs">
          🖼️ {artStats.created} created
        </Badge>
      </HStack>

      {/* Quick Action Buttons */}
      <Box bg="pink.50" borderRadius="lg" p={2}>
        <Text fontSize="2xs" fontWeight="bold" color="pink.600" mb={2}>✨ Quick Actions</Text>
        <SimpleGrid columns={3} spacing={1}>
          {ART_HELPER_ACTIONS.map((action, idx) => (
            <Button
              key={idx}
              size="xs"
              variant="ghost"
              colorScheme="pink"
              fontSize="2xs"
              onClick={() => handleAction(action.action)}
              isDisabled={loading}
              h="auto"
              py={1.5}
              flexDirection="column"
            >
              <Text fontSize="lg">{action.emoji}</Text>
              <Text fontSize="2xs" noOfLines={1}>{action.text}</Text>
            </Button>
          ))}
        </SimpleGrid>
      </Box>

      {/* Messages */}
      <Box 
        flex={1} 
        overflowY="auto" 
        bg="gray.50" 
        borderRadius="lg" 
        p={2}
        maxH="200px"
      >
        <VStack spacing={2} align="stretch">
          {messages.map((msg, idx) => (
            <Box key={idx}>
              <Box
                alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                bg={msg.role === 'user' ? 'pink.500' : 'white'}
                color={msg.role === 'user' ? 'white' : 'gray.800'}
                px={3}
                py={2}
                borderRadius="lg"
                maxW="95%"
                boxShadow="sm"
                fontSize="sm"
                ml={msg.role === 'user' ? 'auto' : 0}
              >
                {msg.content}
              </Box>
              {/* Copy button for prompts */}
              {msg.role === 'assistant' && msg.type === 'prompt' && (
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="pink"
                  leftIcon={<FiCopy />}
                  mt={1}
                  onClick={() => copyPrompt(msg.content)}
                >
                  Copy to use
                </Button>
              )}
            </Box>
          ))}
          {loading && (
            <HStack bg="white" px={3} py={2} borderRadius="lg" alignSelf="flex-start">
              <Spinner size="xs" color="pink.500" />
              <Text fontSize="sm" color="gray.500">Creating magic...</Text>
            </HStack>
          )}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input with enhancer */}
      <VStack spacing={2}>
        <HStack w="full">
          <InputGroup size="sm" flex={1}>
            <Input
              placeholder="Describe what you want to draw..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              borderRadius="full"
              focusBorderColor="pink.400"
              pr="40px"
            />
            <InputRightElement>
              <Tooltip label="Add magic words! ✨">
                <IconButton
                  icon={<FiZap />}
                  aria-label="Enhance"
                  size="xs"
                  variant="ghost"
                  colorScheme="pink"
                  onClick={addEnhancer}
                  borderRadius="full"
                />
              </Tooltip>
            </InputRightElement>
          </InputGroup>
          <IconButton
            icon={<FiSend />}
            aria-label="Send"
            size="sm"
            colorScheme="pink"
            borderRadius="full"
            onClick={handleSend}
            isLoading={loading}
          />
        </HStack>
        <Text fontSize="2xs" color="gray.400" textAlign="center">
          💡 Tip: Click ⚡ to add magical words to your prompt!
        </Text>
      </VStack>
    </VStack>
  );
  };

  // Render Image Settings tab - Enhanced with tips and challenges
  const renderImageSettings = () => {
    const currentStyle = STYLE_OPTIONS.find(s => s.value === settings.style);
    
    return (
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between">
          <HStack>
            <Text fontSize="2xl">🖼️</Text>
            <Box>
              <Text fontWeight="bold" fontSize="sm">Style & Settings</Text>
              <Text fontSize="xs" color="gray.500">Customize your art!</Text>
            </Box>
          </HStack>
        </HStack>

        {/* Style Selection with Tips */}
        <Box>
          <Text fontSize="xs" fontWeight="bold" mb={2}>✨ Art Style</Text>
          <VStack spacing={1} align="stretch" maxH="180px" overflowY="auto">
            {STYLE_OPTIONS.map((style) => (
              <Box
                key={style.value}
                p={2}
                bg={settings.style === style.value ? 'pink.100' : 'gray.50'}
                borderRadius="md"
                border="2px solid"
                borderColor={settings.style === style.value ? 'pink.400' : 'transparent'}
                cursor="pointer"
                onClick={() => updateSettings('style', style.value)}
                _hover={{ bg: settings.style === style.value ? 'pink.100' : 'gray.100' }}
                transition="all 0.2s"
              >
                <HStack justify="space-between">
                  <Text fontWeight="medium" fontSize="sm">{style.label}</Text>
                  {settings.style === style.value && <Badge colorScheme="pink" fontSize="2xs">✓</Badge>}
                </HStack>
                <Text fontSize="2xs" color="gray.500">{style.description}</Text>
              </Box>
            ))}
          </VStack>
        </Box>

        {/* Style Tips */}
        {currentStyle?.tips && (
          <Box bg="yellow.50" borderRadius="lg" p={2}>
            <HStack mb={1}>
              <Text>💡</Text>
              <Text fontSize="xs" fontWeight="bold" color="yellow.700">Tips for {currentStyle.label}</Text>
            </HStack>
            <VStack align="start" spacing={0}>
              {currentStyle.tips.map((tip, idx) => (
                <Text key={idx} fontSize="2xs" color="yellow.800">• {tip}</Text>
              ))}
            </VStack>
          </Box>
        )}

        <Divider />

        {/* Daily Challenges */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <HStack>
              <Text>🎯</Text>
              <Text fontSize="xs" fontWeight="bold">Daily Challenges</Text>
            </HStack>
            <Badge colorScheme="green" fontSize="2xs">
              {challenges.filter(c => c.completed).length}/{challenges.length}
            </Badge>
          </HStack>
          <VStack spacing={1} align="stretch" maxH="120px" overflowY="auto">
            {challenges.slice(0, 3).map((challenge) => (
              <HStack
                key={challenge.id}
                p={2}
                bg={challenge.completed ? 'green.50' : 'gray.50'}
                borderRadius="md"
                justify="space-between"
                opacity={challenge.completed ? 0.7 : 1}
              >
                <HStack spacing={2}>
                  <Text fontSize="lg">{challenge.emoji}</Text>
                  <Box>
                    <Text fontSize="xs" fontWeight="medium" textDecoration={challenge.completed ? 'line-through' : 'none'}>
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
                      colorScheme="pink"
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
          <Text fontSize="xs" fontWeight="bold" mb={2}>📐 Picture Size</Text>
          <SimpleGrid columns={3} spacing={1}>
            {SIZE_OPTIONS.map((size) => (
              <Button
                key={size.value}
                size="xs"
                variant={settings.size === size.value ? 'solid' : 'outline'}
                colorScheme={settings.size === size.value ? 'pink' : 'gray'}
                onClick={() => updateSettings('size', size.value)}
              >
                <VStack spacing={0}>
                  <Text fontSize="2xs">{size.label}</Text>
                </VStack>
              </Button>
            ))}
          </SimpleGrid>
        </Box>

        {/* Safe Mode */}
        <HStack justify="space-between" p={2} bg="green.50" borderRadius="md">
          <HStack>
            <Text>🛡️</Text>
            <Text fontSize="xs" fontWeight="medium">Safe Mode</Text>
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
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between">
          <HStack>
            <Text fontSize="2xl">📸</Text>
            <Box>
              <Text fontWeight="bold" fontSize="sm">My Gallery</Text>
              <Text fontSize="xs" color="gray.500">{gallery.length} creations</Text>
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
        <HStack justify="space-around" p={2} bg="pink.50" borderRadius="lg">
          <VStack spacing={0}>
            <Text fontSize="lg" fontWeight="bold" color="pink.600">{artStats.created}</Text>
            <Text fontSize="2xs" color="gray.500">Created</Text>
          </VStack>
          <Divider orientation="vertical" h="30px" />
          <VStack spacing={0}>
            <Text fontSize="lg" fontWeight="bold" color="red.500">{favoriteCount}</Text>
            <Text fontSize="2xs" color="gray.500">Favorites</Text>
          </VStack>
          <Divider orientation="vertical" h="30px" />
          <VStack spacing={0}>
            <Text fontSize="lg" fontWeight="bold" color="orange.500">{artStats.streak}</Text>
            <Text fontSize="2xs" color="gray.500">Day Streak</Text>
          </VStack>
        </HStack>

        {galleryLoading ? (
          <Box textAlign="center" py={6}>
            <Spinner color="pink.500" />
            <Text fontSize="sm" color="gray.500" mt={2}>Loading...</Text>
          </Box>
        ) : gallery.length === 0 ? (
          <Box textAlign="center" py={6}>
            <Text fontSize="4xl" mb={2}>🎨</Text>
            <Text fontWeight="medium" fontSize="sm">No art yet!</Text>
            <Text fontSize="xs" color="gray.500">Create something amazing!</Text>
            <Button
              size="sm"
              colorScheme="pink"
              mt={3}
              leftIcon={<FiZap />}
              onClick={() => handleAction('idea')}
            >
              Get an idea!
            </Button>
          </Box>
        ) : (
          <SimpleGrid columns={2} spacing={2} maxH="280px" overflowY="auto">
            {gallery.map((img) => (
              <Box
                key={img.id}
                borderRadius="lg"
                overflow="hidden"
                bg="gray.100"
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
          <Box p={2} bg="yellow.50" borderRadius="lg">
            <HStack>
              <Text>🏆</Text>
              <Text fontSize="xs" color="yellow.700" fontWeight="medium">
                {artStats.created >= 10 ? 'Art Master!' : `${10 - artStats.created} more to Art Master badge!`}
              </Text>
            </HStack>
          </Box>
        )}

        {/* Tip */}
        <Box p={2} bg="blue.50" borderRadius="lg">
          <Text fontSize="2xs" color="blue.700">
            💡 Click on any image to copy its prompt and create similar art!
          </Text>
        </Box>
      </VStack>
    );
  };

  return (
    <Box p={3} h="full">
      {activeTab === 'art-agent' && renderArtHelper()}
      {activeTab === 'image-settings' && renderImageSettings()}
      {activeTab === 'gallery' && renderGallery()}
    </Box>
  );
}

export default ChildArtStudioPanel;
