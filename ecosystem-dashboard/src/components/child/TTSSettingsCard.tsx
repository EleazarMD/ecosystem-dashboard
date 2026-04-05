/**
 * TTS Settings Card for Kids Portal
 * 
 * Child-friendly interface for configuring text-to-speech preferences
 * Displayed in the child's settings or as a modal
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  FormControl,
  FormLabel,
  Badge,
  useToast,
  Spinner,
  SimpleGrid,
  Tooltip,
} from '@chakra-ui/react';
import { FiVolume2, FiPlay, FiCheck } from 'react-icons/fi';
import { SimpleGlassPanel } from '@/components/ui/SimpleGlassPanel';

interface TTSPreferences {
  voiceId: string;
  voiceName: string;
  voiceGender: string;
  speed: number;
  pitch: number;
  volume: number;
  autoReadChatResponses: boolean;
  autoReadBookPages: boolean;
  highlightWordsWhileReading: boolean;
  readingSpeedPreference: string;
}

interface Voice {
  id: string;
  name: string;
  gender: string;
  description: string;
  emoji: string;
}

const SPEED_LABELS: Record<string, { speed: number; label: string; emoji: string }> = {
  slow: { speed: 0.75, label: 'Slow', emoji: '🐢' },
  normal: { speed: 1.0, label: 'Normal', emoji: '🚶' },
  fast: { speed: 1.25, label: 'Fast', emoji: '🏃' },
};

export const TTSSettingsCard: React.FC<{
  onClose?: () => void;
  compact?: boolean;
}> = ({ onClose, compact = false }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<TTSPreferences | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [testPlaying, setTestPlaying] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/child/tts/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
        setVoices(data.availableVoices || []);
      }
    } catch (error) {
      console.error('Failed to load TTS preferences:', error);
      toast({ title: 'Could not load settings', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (updates: Partial<TTSPreferences>) => {
    if (!preferences) return;

    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);
    setSaving(true);

    try {
      const response = await fetch('/api/child/tts/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast({ title: 'Settings saved!', status: 'success', duration: 1500 });
      }
    } catch (error) {
      toast({ title: 'Could not save settings', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const testVoice = async () => {
    if (!preferences) return;
    
    setTestPlaying(true);
    try {
      const response = await fetch('/api/child/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Hi! I'm ${preferences.voiceName}. I'll read stories and help you learn!`,
          voiceId: preferences.voiceId,
          speed: preferences.speed,
          sourceType: 'test',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audio.volume = preferences.volume;
          audio.onended = () => setTestPlaying(false);
          audio.onerror = () => setTestPlaying(false);
          await audio.play();
        } else if (data.useBrowserTTS) {
          const utterance = new SpeechSynthesisUtterance(data.text);
          utterance.rate = data.speed;
          utterance.onend = () => setTestPlaying(false);
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      console.error('Test voice failed:', error);
      setTestPlaying(false);
    }
  };

  if (loading) {
    return (
      <SimpleGlassPanel variant="medium" p={6}>
        <VStack spacing={4}>
          <Spinner size="lg" color="purple.500" />
          <Text>Loading voice settings...</Text>
        </VStack>
      </SimpleGlassPanel>
    );
  }

  if (!preferences) {
    return (
      <SimpleGlassPanel variant="medium" p={6}>
        <Text>Could not load settings. Please try again.</Text>
      </SimpleGlassPanel>
    );
  }

  return (
    <SimpleGlassPanel variant="medium" p={compact ? 4 : 6}>
      <VStack spacing={compact ? 4 : 6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Box fontSize="2xl">🔊</Box>
            <Box>
              <Text fontSize="lg" fontWeight="bold">Read Aloud Settings</Text>
              {!compact && (
                <Text fontSize="sm" color="gray.500">
                  Choose how I read to you!
                </Text>
              )}
            </Box>
          </HStack>
          {saving && <Badge colorScheme="blue">Saving...</Badge>}
        </HStack>

        {/* Voice Selection */}
        <Box>
          <FormLabel fontSize="sm" fontWeight="medium">
            Choose a Voice
          </FormLabel>
          <SimpleGrid columns={compact ? 2 : 3} spacing={2}>
            {voices.map((voice) => (
              <Button
                key={voice.id}
                size="sm"
                variant={preferences.voiceId === voice.id ? 'solid' : 'outline'}
                colorScheme={preferences.voiceId === voice.id ? 'purple' : 'gray'}
                onClick={() => savePreferences({ 
                  voiceId: voice.id, 
                  voiceName: voice.name,
                  voiceGender: voice.gender,
                })}
                leftIcon={<Text>{voice.emoji}</Text>}
                justifyContent="flex-start"
              >
                {voice.name}
              </Button>
            ))}
          </SimpleGrid>
          
          {/* Test Voice Button */}
          <Button
            mt={3}
            size="sm"
            leftIcon={testPlaying ? <Spinner size="xs" /> : <FiPlay />}
            onClick={testVoice}
            isDisabled={testPlaying}
            variant="ghost"
            colorScheme="purple"
          >
            {testPlaying ? 'Playing...' : 'Test Voice'}
          </Button>
        </Box>

        {/* Reading Speed */}
        <Box>
          <FormLabel fontSize="sm" fontWeight="medium">
            Reading Speed
          </FormLabel>
          <HStack spacing={2}>
            {Object.entries(SPEED_LABELS).map(([key, { speed, label, emoji }]) => (
              <Button
                key={key}
                size="sm"
                flex={1}
                variant={preferences.readingSpeedPreference === key ? 'solid' : 'outline'}
                colorScheme={preferences.readingSpeedPreference === key ? 'blue' : 'gray'}
                onClick={() => savePreferences({ 
                  readingSpeedPreference: key,
                  speed: speed,
                })}
              >
                {emoji} {label}
              </Button>
            ))}
          </HStack>
        </Box>

        {/* Volume */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <FormLabel fontSize="sm" fontWeight="medium" mb={0}>
              Volume
            </FormLabel>
            <Badge colorScheme="green">{Math.round(preferences.volume * 100)}%</Badge>
          </HStack>
          <Slider
            value={preferences.volume}
            min={0.1}
            max={1}
            step={0.1}
            onChange={(val) => savePreferences({ volume: val })}
          >
            <SliderTrack bg="gray.200">
              <SliderFilledTrack bg="green.400" />
            </SliderTrack>
            <SliderThumb boxSize={6}>
              <Box color="green.500" as={FiVolume2} />
            </SliderThumb>
          </Slider>
        </Box>

        {/* Auto-read Options */}
        {!compact && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={3}>
              Automatic Reading
            </Text>
            <VStack spacing={3} align="stretch">
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel mb={0} fontSize="sm">
                  📖 Auto-read book pages
                </FormLabel>
                <Switch
                  colorScheme="purple"
                  isChecked={preferences.autoReadBookPages}
                  onChange={(e) => savePreferences({ autoReadBookPages: e.target.checked })}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel mb={0} fontSize="sm">
                  💬 Auto-read chat responses
                </FormLabel>
                <Switch
                  colorScheme="purple"
                  isChecked={preferences.autoReadChatResponses}
                  onChange={(e) => savePreferences({ autoReadChatResponses: e.target.checked })}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel mb={0} fontSize="sm">
                  ✨ Highlight words while reading
                </FormLabel>
                <Switch
                  colorScheme="purple"
                  isChecked={preferences.highlightWordsWhileReading}
                  onChange={(e) => savePreferences({ highlightWordsWhileReading: e.target.checked })}
                />
              </FormControl>
            </VStack>
          </Box>
        )}

        {/* Done Button */}
        {onClose && (
          <Button
            colorScheme="purple"
            leftIcon={<FiCheck />}
            onClick={onClose}
            size="lg"
            borderRadius="full"
          >
            Done!
          </Button>
        )}
      </VStack>
    </SimpleGlassPanel>
  );
};

export default TTSSettingsCard;
