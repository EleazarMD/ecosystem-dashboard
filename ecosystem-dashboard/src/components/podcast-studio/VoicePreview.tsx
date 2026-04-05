import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Badge,
  SimpleGrid,
  Tooltip,
  Icon,
  Spinner,
} from '@chakra-ui/react';
import { FiPlay, FiPause, FiVolume2 } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export const VOICE_CATALOG = [
  // Female Voices - Warm & Engaging
  { name: 'Mira', gender: 'Female', style: 'Warm & Professional', bestFor: 'Medical professionals, teachers', energy: 'Medium', age: 'Adult' },
  { name: 'Nova', gender: 'Female', style: 'Energetic & Friendly', bestFor: 'Casual listeners, children', energy: 'High', age: 'Young Adult' },
  { name: 'Luna', gender: 'Female', style: 'Calm & Soothing', bestFor: 'Meditation, storytelling', energy: 'Low', age: 'Adult' },
  { name: 'Iris', gender: 'Female', style: 'Clear & Articulate', bestFor: 'Education, technical content', energy: 'Medium', age: 'Adult' },
  { name: 'Aurora', gender: 'Female', style: 'Enthusiastic & Bright', bestFor: 'Children, entertainment', energy: 'High', age: 'Young Adult' },
  { name: 'Stella', gender: 'Female', style: 'Sophisticated & Elegant', bestFor: 'Academic, professional', energy: 'Medium', age: 'Mature' },
  { name: 'Crystal', gender: 'Female', style: 'Sweet & Gentle', bestFor: 'Children, bedtime stories', energy: 'Low', age: 'Young Adult' },
  { name: 'Dawn', gender: 'Female', style: 'Optimistic & Uplifting', bestFor: 'Motivational, wellness', energy: 'Medium-High', age: 'Adult' },

  // Male Voices - Authoritative & Engaging
  { name: 'Atlas', gender: 'Male', style: 'Deep & Authoritative', bestFor: 'PhD researchers, experts', energy: 'Medium', age: 'Adult' },
  { name: 'Echo', gender: 'Male', style: 'Thoughtful & Analytical', bestFor: 'Scientific discussions', energy: 'Medium', age: 'Adult' },
  { name: 'Sage', gender: 'Male', style: 'Wise & Measured', bestFor: 'Medical professionals, wisdom', energy: 'Low-Medium', age: 'Mature' },
  { name: 'Phoenix', gender: 'Male', style: 'Dynamic & Powerful', bestFor: 'Debate, motivation', energy: 'High', age: 'Adult' },
  { name: 'Orion', gender: 'Male', style: 'Confident & Clear', bestFor: 'News, professional content', energy: 'Medium', age: 'Adult' },
  { name: 'Zephyr', gender: 'Male', style: 'Smooth & Conversational', bestFor: 'Casual podcasts, interviews', energy: 'Medium', age: 'Adult' },
  { name: 'Cosmo', gender: 'Male', style: 'Curious & Engaging', bestFor: 'Science, exploration', energy: 'Medium-High', age: 'Young Adult' },
  { name: 'River', gender: 'Male', style: 'Calm & Flowing', bestFor: 'Meditation, storytelling', energy: 'Low', age: 'Adult' },

  // Neutral/Versatile Voices
  { name: 'Sky', gender: 'Neutral', style: 'Bright & Versatile', bestFor: 'Any audience, general use', energy: 'Medium', age: 'Young Adult' },
  { name: 'Ocean', gender: 'Neutral', style: 'Soothing & Rhythmic', bestFor: 'Relaxation, nature content', energy: 'Low', age: 'Adult' },
  { name: 'Ember', gender: 'Neutral', style: 'Warm & Inviting', bestFor: 'Storytelling, cozy content', energy: 'Medium', age: 'Adult' },
  { name: 'Frost', gender: 'Neutral', style: 'Cool & Professional', bestFor: 'Tech, business', energy: 'Medium', age: 'Adult' },
  { name: 'Storm', gender: 'Neutral', style: 'Bold & Dramatic', bestFor: 'News, dramatic readings', energy: 'High', age: 'Adult' },
  { name: 'Breeze', gender: 'Neutral', style: 'Light & Airy', bestFor: 'Children, casual content', energy: 'Medium-High', age: 'Young Adult' },
  { name: 'Shadow', gender: 'Neutral', style: 'Mysterious & Deep', bestFor: 'Mystery, storytelling', energy: 'Low-Medium', age: 'Adult' },
  { name: 'Cloud', gender: 'Neutral', style: 'Soft & Dreamy', bestFor: 'Meditation, fantasy', energy: 'Low', age: 'Young Adult' },
  { name: 'Rain', gender: 'Neutral', style: 'Gentle & Rhythmic', bestFor: 'Poetry, nature', energy: 'Low', age: 'Adult' },
  { name: 'Snow', gender: 'Neutral', style: 'Pure & Clear', bestFor: 'Education, clarity', energy: 'Medium', age: 'Adult' },
  { name: 'Thunder', gender: 'Neutral', style: 'Powerful & Commanding', bestFor: 'Leadership, authority', energy: 'High', age: 'Mature' },
  { name: 'Lightning', gender: 'Neutral', style: 'Quick & Energetic', bestFor: 'Sports, excitement', energy: 'Very High', age: 'Young Adult' },
  { name: 'Meadow', gender: 'Neutral', style: 'Peaceful & Natural', bestFor: 'Nature, wellness', energy: 'Low', age: 'Adult' },
];

const SAMPLE_TEXTS = {
  medical: "Acute myocardial infarction, commonly known as a heart attack, occurs when blood flow to the heart muscle is blocked.",
  casual: "Did you know that the human heart beats about 100,000 times a day? That's pretty amazing when you think about it!",
  children: "Imagine your heart is like a superhero pump that keeps you healthy and strong every single day!",
  technical: "The pathophysiology involves thrombotic occlusion of coronary arteries, leading to myocardial ischemia and potential necrosis.",
};

interface VoicePreviewProps {
  selectedVoice?: string;
  onVoiceSelect: (voiceName: string) => void;
  audienceType?: 'medical' | 'casual' | 'children' | 'technical';
}

export default function VoicePreview({ selectedVoice, onVoiceSelect, audienceType = 'casual' }: VoicePreviewProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null);

  const cardBg = useSemanticToken('surface.card');
  const borderColor = useSemanticToken('border.default');
  const selectedBg = useSemanticToken('surface.highlight');
  const selectedBorder = useSemanticToken('interactive.active');

  // Map friendly voice names to Gemini voice names
  const mapVoiceToGemini = (friendlyName: string): string => {
    const voiceMap: Record<string, string> = {
      // Female voices
      'Mira': 'pulcherrima',
      'Nova': 'aoede',
      'Luna': 'callirrhoe',
      'Iris': 'despina',
      'Aurora': 'laomedeia',
      'Stella': 'leda',
      'Crystal': 'enceladus',
      'Dawn': 'erinome',
      // Male voices
      'Atlas': 'achernar',
      'Echo': 'algenib',
      'Sage': 'schedar',
      'Phoenix': 'rasalgethi',
      'Orion': 'alnilam',
      'Zephyr': 'zephyr',
      'Cosmo': 'gacrux',
      'River': 'umbriel',
      // Neutral voices
      'Sky': 'algieba',
      'Ocean': 'autonoe',
      'Ember': 'charon',
      'Frost': 'iapetus',
      'Storm': 'fenrir',
      'Breeze': 'kore',
      'Shadow': 'achird',
      'Cloud': 'orus',
      'Rain': 'puck',
      'Snow': 'vindemiatrix',
      'Thunder': 'sadachbia',
      'Lightning': 'sadaltager',
      'Meadow': 'sulafat',
    };
    return voiceMap[friendlyName] || 'zephyr'; // Default to zephyr
  };

  const handlePlaySample = async (voiceName: string) => {
    setLoadingVoice(voiceName);

    try {
      // Map to Gemini voice name
      const geminiVoice = mapVoiceToGemini(voiceName);

      // Call actual TTS API
      const response = await fetch('/api/podcast-studio/voice-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: SAMPLE_TEXTS[audienceType],
          voiceName: geminiVoice,
          voiceProvider: 'gemini', // Use Gemini TTS
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || 'Failed to generate voice preview');
      }

      // Get audio blob from response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play audio
      const audio = new Audio(audioUrl);

      setLoadingVoice(null);
      setPlayingVoice(voiceName);

      audio.onended = () => {
        setPlayingVoice(null);
        URL.revokeObjectURL(audioUrl); // Clean up
      };

      audio.onerror = () => {
        setPlayingVoice(null);
        URL.revokeObjectURL(audioUrl);
        console.error('Audio playback error');
      };

      await audio.play();

    } catch (error) {
      console.error('Voice preview error:', error);
      setLoadingVoice(null);
      setPlayingVoice(null);

      // Show error to user
      alert(error instanceof Error ? error.message : 'Failed to generate voice preview');
    }
  };

  const getRecommendedVoices = () => {
    if (audienceType === 'medical') {
      return VOICE_CATALOG.filter(v =>
        v.bestFor.toLowerCase().includes('medical') ||
        v.bestFor.toLowerCase().includes('professional') ||
        v.style.toLowerCase().includes('professional') ||
        v.style.toLowerCase().includes('authoritative')
      );
    } else if (audienceType === 'children') {
      return VOICE_CATALOG.filter(v =>
        v.bestFor.toLowerCase().includes('children') ||
        v.energy === 'High' ||
        v.style.toLowerCase().includes('friendly')
      );
    } else if (audienceType === 'technical') {
      return VOICE_CATALOG.filter(v =>
        v.bestFor.toLowerCase().includes('technical') ||
        v.bestFor.toLowerCase().includes('academic') ||
        v.style.toLowerCase().includes('clear')
      );
    }
    return VOICE_CATALOG;
  };

  const recommendedVoices = getRecommendedVoices();
  const otherVoices = VOICE_CATALOG.filter(v => !recommendedVoices.includes(v));

  const VoiceCard = ({ voice }: { voice: typeof VOICE_CATALOG[0] }) => {
    const isSelected = selectedVoice === voice.name;
    const isPlaying = playingVoice === voice.name;
    const isLoading = loadingVoice === voice.name;

    return (
      <Box
        p={4}
        bg={isSelected ? selectedBg : cardBg}
        borderWidth="2px"
        borderColor={isSelected ? selectedBorder : borderColor}
        borderRadius="lg"
        cursor="pointer"
        transition="all 0.2s"
        _hover={{
          borderColor: 'purple.300',
          transform: 'translateY(-2px)',
          boxShadow: 'md',
        }}
        onClick={() => onVoiceSelect(voice.name)}
      >
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <VStack align="start" spacing={0}>
              <HStack>
                <Text fontWeight="bold">{voice.name}</Text>
                {isSelected && (
                  <Badge colorScheme="purple" fontSize="xs">Selected</Badge>
                )}
              </HStack>
              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{voice.gender}</Text>
            </VStack>
            <Tooltip label="Play sample">
              <IconButton
                aria-label={`Play ${voice.name} sample`}
                icon={isLoading ? <Spinner size="sm" /> : isPlaying ? <FiPause /> : <FiPlay />}
                size="sm"
                colorScheme={isPlaying ? 'green' : 'purple'}
                variant={isPlaying ? 'solid' : 'ghost'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isPlaying && !isLoading) {
                    handlePlaySample(voice.name);
                  }
                }}
              />
            </Tooltip>
          </HStack>

          <VStack align="stretch" spacing={1}>
            <Text fontSize="sm" fontWeight="medium">{voice.style}</Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{voice.bestFor}</Text>
          </VStack>

          <HStack spacing={2} flexWrap="wrap">
            <Badge colorScheme="blue" fontSize="xs">{voice.energy}</Badge>
            <Badge colorScheme="green" fontSize="xs">{voice.age}</Badge>
          </HStack>
        </VStack>
      </Box>
    );
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Sample Text Display */}
      <Box p={4} bg="purple.50" borderRadius="md" borderLeftWidth="4px" borderLeftColor="purple.400">
        <VStack align="start" spacing={2}>
          <HStack>
            <Icon as={FiVolume2} color="purple.500" />
            <Text fontWeight="bold" fontSize="sm">Sample Text</Text>
          </HStack>
          <Text fontSize="sm" fontStyle="italic">
            "{SAMPLE_TEXTS[audienceType]}"
          </Text>
          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
            Click the play button on any voice to hear this sample
          </Text>
        </VStack>
      </Box>

      {/* Recommended Voices */}
      {recommendedVoices.length > 0 && (
        <Box>
          <HStack mb={3}>
            <Text fontSize="lg" fontWeight="bold">
              ⭐ Recommended for Your Audience
            </Text>
            <Badge colorScheme="purple">{recommendedVoices.length} voices</Badge>
          </HStack>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
            {recommendedVoices.map((voice) => (
              <VoiceCard key={voice.name} voice={voice} />
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* All Other Voices */}
      {otherVoices.length > 0 && (
        <Box>
          <HStack mb={3}>
            <Text fontSize="lg" fontWeight="bold">
              All Voices
            </Text>
            <Badge colorScheme="gray">{otherVoices.length} voices</Badge>
          </HStack>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
            {otherVoices.map((voice) => (
              <VoiceCard key={voice.name} voice={voice} />
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Quick Reference Guide */}
      <Box p={4} bg={cardBg} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
        <Text fontSize="sm" fontWeight="bold" mb={2}>Voice Selection Guide</Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2} fontSize="xs">
          <Text>🏥 <strong>Medical:</strong> Sage, Atlas, Mira, Stella</Text>
          <Text>🎓 <strong>Academic:</strong> Echo, Iris, Orion, Frost</Text>
          <Text>👶 <strong>Children:</strong> Nova, Aurora, Breeze, Crystal</Text>
          <Text>💼 <strong>Professional:</strong> Mira, Atlas, Orion, Stella</Text>
          <Text>🎧 <strong>Casual:</strong> Zephyr, Nova, Sky, Ember</Text>
          <Text>📖 <strong>Storytelling:</strong> Luna, River, Shadow, Cloud</Text>
        </SimpleGrid>
      </Box>
    </VStack>
  );
}
