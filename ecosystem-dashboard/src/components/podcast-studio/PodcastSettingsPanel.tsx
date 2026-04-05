import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Badge,
  Textarea,
  Switch,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { FiPlus, FiX, FiRefreshCw, FiSettings } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Voice {
  id: string;
  name: string;
  gender: string;
  accent: string;
}

const AVAILABLE_VOICES: Voice[] = [
  { id: 'mira', name: 'Mira', gender: 'Female', accent: 'American' },
  { id: 'atlas', name: 'Atlas', gender: 'Male', accent: 'British' },
  { id: 'nova', name: 'Nova', gender: 'Female', accent: 'Australian' },
  { id: 'sage', name: 'Sage', gender: 'Male', accent: 'American' },
];

interface VoiceCard {
  id: string;
  voiceId: string;
  name: string;
}

export default function PodcastSettingsPanel() {
  const [voiceCards, setVoiceCards] = useState<VoiceCard[]>([
    { id: '1', voiceId: 'mira', name: 'Speaker 1' },
    { id: '2', voiceId: 'atlas', name: 'Speaker 2' },
  ]);
  const [audience, setAudience] = useState('medical-professional');
  const [format, setFormat] = useState('deep-dive');
  const [duration, setDuration] = useState(15);
  const [introduction, setIntroduction] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);

  const addVoiceCard = () => {
    if (voiceCards.length >= 4) return; // Max 4 speakers
    const newId = String(voiceCards.length + 1);
    const defaultVoice = AVAILABLE_VOICES.find(v => !voiceCards.some(vc => vc.voiceId === v.id))?.id || 'nova';
    setVoiceCards(prev => [
      ...prev,
      { id: newId, voiceId: defaultVoice, name: `Speaker ${voiceCards.length + 1}` },
    ]);
  };

  const removeVoiceCard = (id: string) => {
    if (voiceCards.length <= 1) return; // Keep at least 1
    setVoiceCards(prev => prev.filter(vc => vc.id !== id));
  };

  const updateVoiceCard = (id: string, voiceId: string) => {
    setVoiceCards(prev =>
      prev.map(vc => (vc.id === id ? { ...vc, voiceId } : vc))
    );
  };

  const bgColor = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const cardBg = useSemanticToken('surface.elevated');
  const surfaceHover = useSemanticToken('surface.hover');

  return (
    <VStack spacing={0} align="stretch" h="full" overflowY="auto" bg={bgColor}>
      {/* Header */}
      <HStack justify="space-between" px={4} py={3}>
        <Text 
          fontSize="14px" 
          fontWeight="500" 
          color={textColor}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
        >
          Podcast Settings
        </Text>
      </HStack>

      {/* Voice Cards - Add/Remove individually */}
      <Box px={4} py={4}>
        <HStack justify="space-between" mb={3}>
          <Text 
            fontSize="13px" 
            fontWeight="500" 
            color={textColor}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
            🎙️ Voice Configuration
          </Text>
          <Text 
            fontSize="11px" 
            color={mutedColor}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
            {voiceCards.length} speaker{voiceCards.length !== 1 ? 's' : ''}
          </Text>
        </HStack>
        
        <VStack spacing={3} align="stretch">
          {voiceCards.map((card, index) => {
            const selectedVoice = AVAILABLE_VOICES.find(v => v.id === card.voiceId);
            return (
              <Box
                key={card.id}
                p={4}
                bg={cardBg}
                border="2px solid"
                borderColor="purple.500"
                borderRadius="2xl"
                boxShadow="lg"
                position="relative"
                overflow="hidden"
                transition="all 0.3s ease"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: '2xl',
                }}
              >
                <VStack align="stretch" spacing={3} position="relative" zIndex={1}>
                  <HStack justify="space-between">
                    <HStack spacing={2}>
                      <Box
                        w="8px"
                        h="8px"
                        borderRadius="full"
                        bg={`${selectedVoice?.gender === 'Female' ? 'pink' : 'blue'}.400`}
                      />
                      <Text 
                        fontSize="13px" 
                        fontWeight="600" 
                        color={textColor}
                        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                      >
                        {voiceCards.length === 1 ? '🎤 Host' : `🎙️ Speaker ${index + 1}`}
                      </Text>
                    </HStack>
                    {voiceCards.length > 1 && (
                      <IconButton
                        aria-label="Remove voice"
                        icon={<FiX />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => removeVoiceCard(card.id)}
                        borderRadius="full"
                        opacity={0.7}
                        _hover={{ opacity: 1, bg: 'red.50' }}
                      />
                    )}
                  </HStack>
                  
                  <Select
                    value={card.voiceId}
                    onChange={(e) => updateVoiceCard(card.id, e.target.value)}
                    size="sm"
                    fontSize="13px"
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                    borderRadius="xl"
                    bg={useSemanticToken('surface.elevated')}
                    border="none"
                    fontWeight="500"
                    _hover={{ bg: surfaceHover }}
                    _focus={{ 
                      boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.3)',
                      bg: useSemanticToken('surface.elevated'),
                    }}
                  >
                    {AVAILABLE_VOICES.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name}
                      </option>
                    ))}
                  </Select>
                  
                  {selectedVoice && (
                    <HStack spacing={2} flexWrap="wrap">
                      <Badge 
                        fontSize="10px" 
                        px={2.5}
                        py={0.5}
                        borderRadius="full"
                        colorScheme={selectedVoice.gender === 'Female' ? 'pink' : 'blue'}
                        fontWeight="600"
                      >
                        {selectedVoice.gender}
                      </Badge>
                      <Badge 
                        fontSize="10px" 
                        px={2.5}
                        py={0.5}
                        borderRadius="full"
                        colorScheme="purple"
                        fontWeight="600"
                      >
                        {selectedVoice.accent}
                      </Badge>
                    </HStack>
                  )}
                </VStack>
              </Box>
            );
          })}
          
          {/* Add Voice Button */}
          {voiceCards.length < 4 && (
            <Button
              leftIcon={<FiPlus />}
              size="md"
              variant="ghost"
              borderRadius="xl"
              border="2px dashed"
              borderColor={borderColor}
              color={textColor}
              onClick={addVoiceCard}
              fontSize="13px"
              fontWeight="500"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
              py={6}
              transition="all 0.2s ease"
              _hover={{ 
                bg: surfaceHover,
                borderColor: 'blue.500',
                color: 'blue.500',
                transform: 'scale(1.02)',
              }}
            >
              Add Another Speaker
            </Button>
          )}
        </VStack>
      </Box>

      {/* Target Audience */}
      <Box px={4} pb={4}>
        <FormControl>
          <FormLabel 
            fontSize="12px" 
            color={mutedColor}
            mb={1}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
            👥 Target Audience
          </FormLabel>
          <Select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            size="sm"
            fontSize="13px"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
          <option value="medical-professional">Medical Professional</option>
          <option value="general-public">General Public</option>
          <option value="students">Students</option>
          <option value="children">Children</option>
            <option value="technical">Technical Audience</option>
          </Select>
        </FormControl>
      </Box>

      {/* Audio Format */}
      <Box px={4} pb={4}>
        <FormControl>
          <FormLabel 
            fontSize="12px" 
            color={mutedColor}
            mb={1}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
            🎵 Audio Format
          </FormLabel>
          <Select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            size="sm"
            fontSize="13px"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
          <option value="deep-dive">Deep Dive (In-depth)</option>
          <option value="brief">The Brief (&lt;2 min)</option>
          <option value="critique">The Critique (Feedback)</option>
            <option value="debate">The Debate (Multiple views)</option>
          </Select>
        </FormControl>
      </Box>

      {/* Duration */}
      <Box px={4} pb={4}>
        <FormControl>
          <FormLabel 
            fontSize="12px" 
            color={mutedColor}
            mb={2}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
            ⏱️ Duration: {duration} minutes
          </FormLabel>
        <Slider
          value={duration}
          onChange={setDuration}
          min={5}
          max={60}
          step={5}
        >
          <SliderTrack bg={borderColor}>
            <SliderFilledTrack bg="blue.400" />
          </SliderTrack>
          <SliderThumb boxSize={4} />
        </Slider>
        <HStack justify="space-between" mt={1}>
          <Text 
            fontSize="11px" 
            color={mutedColor}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
            5 min
          </Text>
          <Text 
            fontSize="11px" 
            color={mutedColor}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          >
            60 min
          </Text>
        </HStack>
        </FormControl>
      </Box>


      {/* Introduction */}
      <Box px={4} pb={4}>
        <FormControl>
          <HStack justify="space-between" mb={2}>
            <FormLabel 
              fontSize="12px" 
              color={mutedColor} 
              mb={0}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              Introduction
            </FormLabel>
            <Switch
              size="sm"
              isChecked={autoGenerate}
              onChange={(e) => setAutoGenerate(e.target.checked)}
            />
          </HStack>
          <Textarea
            value={introduction}
            onChange={(e) => setIntroduction(e.target.value)}
            placeholder={
              autoGenerate
                ? 'Auto-generated based on sources...'
                : 'Enter custom introduction...'
            }
            size="sm"
            rows={3}
            isDisabled={autoGenerate}
            fontSize="13px"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
          />
        </FormControl>
      </Box>

      {/* Action Buttons */}
      <Box px={4} pt={4} pb={4}>
        <Button
          colorScheme="blue"
          w="full"
          size="md"
          fontSize="13px"
          fontWeight="500"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
        >
          Generate Script
        </Button>
      </Box>
    </VStack>
  );
}
