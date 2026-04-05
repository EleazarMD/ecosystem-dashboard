import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  SimpleGrid,
  Badge,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  FormControl,
  FormLabel,
  Textarea,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagCloseButton,
  Divider,
  useToast,
} from '@chakra-ui/react';
import { FiUsers, FiGlobe, FiTrendingUp, FiVolume2, FiCheck } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface AudienceProfile {
  id: string;
  name: string;
  complexity: number; // 1-10 scale
  language: string;
  pace: 'slow' | 'normal' | 'fast';
  terminology: 'simple' | 'standard' | 'technical' | 'medical';
  ageGroup: 'children' | 'teens' | 'adults' | 'professionals';
  customInstructions?: string;
  contentFilters: string[];
}

const AUDIENCE_PRESETS = [
  {
    id: 'medical-professional',
    name: '👨‍⚕️ Medical Professionals',
    icon: '🏥',
    description: 'Physicians, researchers, medical students',
    color: 'red',
    profile: {
      complexity: 9,
      language: 'en-US',
      pace: 'normal',
      terminology: 'medical',
      ageGroup: 'professionals',
      contentFilters: [],
    },
  },
  {
    id: 'phd-researchers',
    name: '🎓 PhD Researchers',
    icon: '🔬',
    description: 'Academic researchers and scientists',
    color: 'purple',
    profile: {
      complexity: 9,
      language: 'en-US',
      pace: 'normal',
      terminology: 'technical',
      ageGroup: 'professionals',
      contentFilters: [],
    },
  },
  {
    id: 'medical-students',
    name: '📚 Medical Students',
    icon: '📖',
    description: 'Students learning medical concepts',
    color: 'blue',
    profile: {
      complexity: 7,
      language: 'en-US',
      pace: 'normal',
      terminology: 'technical',
      ageGroup: 'adults',
      contentFilters: [],
    },
  },
  {
    id: 'casual-listeners',
    name: '🎧 Casual Listeners',
    icon: '👥',
    description: 'General public, accessible content',
    color: 'green',
    profile: {
      complexity: 5,
      language: 'en-US',
      pace: 'normal',
      terminology: 'simple',
      ageGroup: 'adults',
      contentFilters: ['avoid-jargon'],
    },
  },
  {
    id: 'children',
    name: '👶 Children',
    icon: '🎈',
    description: 'Kid-friendly explanations',
    color: 'yellow',
    profile: {
      complexity: 3,
      language: 'en-US',
      pace: 'slow',
      terminology: 'simple',
      ageGroup: 'children',
      contentFilters: ['kid-friendly', 'no-medical-details', 'use-analogies'],
    },
  },
  {
    id: 'spanish-speakers',
    name: '🌎 Spanish Speakers',
    icon: '🇪🇸',
    description: 'Spanish language podcast',
    color: 'orange',
    profile: {
      complexity: 5,
      language: 'es-US',
      pace: 'normal',
      terminology: 'standard',
      ageGroup: 'adults',
      contentFilters: [],
    },
  },
];

const LANGUAGES = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'es-US', name: 'Spanish (US)', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', flag: '🇩🇪' },
  { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean', flag: '🇰🇷' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', flag: '🇧🇷' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'ar-EG', name: 'Arabic', flag: '🇪🇬' },
];

const MEDICAL_TERMINOLOGY_LEVELS = [
  {
    value: 'simple',
    label: 'Simple Language',
    description: 'Avoid medical jargon, use everyday terms',
    example: '"Heart attack" instead of "myocardial infarction"',
  },
  {
    value: 'standard',
    label: 'Standard Medical',
    description: 'Common medical terms with explanations',
    example: '"Myocardial infarction (heart attack)"',
  },
  {
    value: 'technical',
    label: 'Technical Medical',
    description: 'Medical terminology for students and researchers',
    example: '"Acute myocardial infarction with ST-segment elevation"',
  },
  {
    value: 'medical',
    label: 'Professional Medical',
    description: 'Full medical terminology for clinicians',
    example: '"STEMI with anterior wall involvement, elevated troponin"',
  },
];

interface AudienceConfiguratorProps {
  currentProfile?: AudienceProfile;
  onSave: (profile: AudienceProfile) => void;
}

export default function AudienceConfigurator({ currentProfile, onSave }: AudienceConfiguratorProps) {
  const [profile, setProfile] = useState<AudienceProfile>(
    currentProfile || {
      id: 'custom',
      name: 'Custom Audience',
      complexity: 5,
      language: 'en-US',
      pace: 'normal',
      terminology: 'standard',
      ageGroup: 'adults',
      contentFilters: [],
    }
  );

  const toast = useToast();
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');

  const handlePresetSelect = (preset: typeof AUDIENCE_PRESETS[0]) => {
    setProfile({
      id: preset.id,
      name: preset.name,
      complexity: preset.profile.complexity,
      language: preset.profile.language,
      pace: preset.profile.pace as 'slow' | 'normal' | 'fast',
      terminology: preset.profile.terminology as 'simple' | 'standard' | 'technical' | 'medical',
      ageGroup: preset.profile.ageGroup as 'children' | 'teens' | 'adults' | 'professionals',
      contentFilters: preset.profile.contentFilters,
      customInstructions: '',
    });
    toast({
      title: `${preset.name} selected`,
      description: 'Podcast will be optimized for this audience',
      status: 'success',
      duration: 2000,
    });
  };

  const addContentFilter = (filter: string) => {
    if (!profile.contentFilters.includes(filter)) {
      setProfile({
        ...profile,
        contentFilters: [...profile.contentFilters, filter],
      });
    }
  };

  const removeContentFilter = (filter: string) => {
    setProfile({
      ...profile,
      contentFilters: profile.contentFilters.filter((f) => f !== filter),
    });
  };

  const complexityLabels: Record<number, string> = {
    1: 'Very Simple',
    3: 'Simple',
    5: 'Moderate',
    7: 'Advanced',
    9: 'Expert',
    10: 'Highly Technical',
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Preset Audiences */}
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={4}>
          Quick Select Audience
        </Text>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
          {AUDIENCE_PRESETS.map((preset) => (
            <Box
              key={preset.id}
              p={4}
              bg={cardBg}
              borderWidth="2px"
              borderColor={profile.id === preset.id ? `${preset.color}.400` : borderColor}
              borderRadius="lg"
              cursor="pointer"
              transition="all 0.2s"
              _hover={{
                borderColor: `${preset.color}.400`,
                transform: 'translateY(-2px)',
                boxShadow: 'md',
              }}
              onClick={() => handlePresetSelect(preset)}
            >
              <VStack align="start" spacing={2}>
                <HStack>
                  <Text fontSize="2xl">{preset.icon}</Text>
                  <Badge colorScheme={preset.color} fontSize="xs">
                    {preset.id.split('-').join(' ')}
                  </Badge>
                </HStack>
                <Text fontWeight="medium" fontSize="sm">
                  {preset.description}
                </Text>
                {profile.id === preset.id && (
                  <HStack>
                    <Icon as={FiCheck} color="green.500" />
                    <Text fontSize="xs" color="green.500" fontWeight="bold">
                      Active
                    </Text>
                  </HStack>
                )}
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      <Divider />

      {/* Detailed Configuration */}
      <VStack spacing={6} align="stretch">
        <Text fontSize="lg" fontWeight="bold">
          Customize Audience Profile
        </Text>

        {/* Language Selection */}
        <FormControl>
          <FormLabel>
            <HStack>
              <Icon as={FiGlobe} />
              <Text>Language</Text>
            </HStack>
          </FormLabel>
          <Select
            value={profile.language}
            onChange={(e) => setProfile({ ...profile, language: e.target.value })}
            size="lg"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </Select>
          <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
            Gemini 2.5 supports 24+ languages with natural pronunciation
          </Text>
        </FormControl>

        {/* Medical Terminology Level */}
        <FormControl>
          <FormLabel>
            <HStack>
              <Icon as={FiTrendingUp} />
              <Text>Medical Terminology Level</Text>
            </HStack>
          </FormLabel>
          <VStack align="stretch" spacing={2}>
            {MEDICAL_TERMINOLOGY_LEVELS.map((level) => (
              <Box
                key={level.value}
                p={4}
                bg={profile.terminology === level.value ? 'purple.50' : cardBg}
                borderWidth="2px"
                borderColor={profile.terminology === level.value ? 'purple.400' : borderColor}
                borderRadius="md"
                cursor="pointer"
                onClick={() => setProfile({ ...profile, terminology: level.value as any })}
                _hover={{ bg: hoverBg }}
                transition="all 0.2s"
              >
                <VStack align="start" spacing={1}>
                  <HStack justify="space-between" width="full">
                    <Text fontWeight="bold" fontSize="sm">
                      {level.label}
                    </Text>
                    {profile.terminology === level.value && (
                      <Icon as={FiCheck} color="purple.500" />
                    )}
                  </HStack>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    {level.description}
                  </Text>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontStyle="italic">
                    Example: {level.example}
                  </Text>
                </VStack>
              </Box>
            ))}
          </VStack>
        </FormControl>

        {/* Complexity Level */}
        <FormControl>
          <FormLabel>
            Content Complexity: {complexityLabels[profile.complexity] || 'Custom'} ({profile.complexity}/10)
          </FormLabel>
          <Slider
            value={profile.complexity}
            onChange={(val) => setProfile({ ...profile, complexity: val })}
            min={1}
            max={10}
            step={1}
          >
            <SliderTrack>
              <SliderFilledTrack bg="purple.400" />
            </SliderTrack>
            <SliderThumb boxSize={6}>
              <Box color="purple.500" fontSize="xs" fontWeight="bold">
                {profile.complexity}
              </Box>
            </SliderThumb>
          </Slider>
          <HStack justify="space-between" mt={1}>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              Children-friendly
            </Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              Expert-level
            </Text>
          </HStack>
        </FormControl>

        {/* Speaking Pace */}
        <FormControl>
          <FormLabel>
            <HStack>
              <Icon as={FiVolume2} />
              <Text>Speaking Pace</Text>
            </HStack>
          </FormLabel>
          <HStack spacing={3}>
            {(['slow', 'normal', 'fast'] as const).map((pace) => (
              <Button
                key={pace}
                flex={1}
                variant={profile.pace === pace ? 'solid' : 'outline'}
                colorScheme={profile.pace === pace ? 'purple' : 'gray'}
                onClick={() => setProfile({ ...profile, pace })}
              >
                {pace.charAt(0).toUpperCase() + pace.slice(1)}
              </Button>
            ))}
          </HStack>
          <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
            {profile.pace === 'slow' && 'Ideal for children or language learners'}
            {profile.pace === 'normal' && 'Standard conversational pace'}
            {profile.pace === 'fast' && 'Quick-paced for professionals'}
          </Text>
        </FormControl>

        {/* Content Filters */}
        <FormControl>
          <FormLabel>Content Adaptations</FormLabel>
          <VStack align="stretch" spacing={2}>
            <Wrap>
              {profile.contentFilters.map((filter) => (
                <WrapItem key={filter}>
                  <Tag size="md" colorScheme="purple" borderRadius="full">
                    <TagLabel>{filter}</TagLabel>
                    <TagCloseButton onClick={() => removeContentFilter(filter)} />
                  </Tag>
                </WrapItem>
              ))}
            </Wrap>
            <Select
              placeholder="Add content adaptation..."
              onChange={(e) => {
                if (e.target.value) {
                  addContentFilter(e.target.value);
                  e.target.value = '';
                }
              }}
            >
              <option value="avoid-jargon">Avoid technical jargon</option>
              <option value="use-analogies">Use analogies and examples</option>
              <option value="define-terms">Define medical terms</option>
              <option value="kid-friendly">Kid-friendly language</option>
              <option value="no-medical-details">Omit graphic medical details</option>
              <option value="evidence-based">Emphasize evidence and citations</option>
              <option value="case-studies">Include clinical case studies</option>
              <option value="patient-perspective">Add patient perspective</option>
            </Select>
          </VStack>
        </FormControl>

        {/* Custom Instructions */}
        <FormControl>
          <FormLabel>Custom Instructions (Optional)</FormLabel>
          <Textarea
            placeholder="Any specific requirements for this audience? e.g., 'Focus on preventive care', 'Include dosage information', 'Emphasize practical applications'..."
            value={profile.customInstructions || ''}
            onChange={(e) => setProfile({ ...profile, customInstructions: e.target.value })}
            rows={4}
          />
        </FormControl>

        {/* Save Button */}
        <Button
          leftIcon={<FiCheck />}
          colorScheme="purple"
          size="lg"
          onClick={() => {
            onSave(profile);
            toast({
              title: 'Audience profile saved',
              description: 'Podcast will be adapted for this audience',
              status: 'success',
              duration: 3000,
            });
          }}
        >
          Apply Audience Profile
        </Button>
      </VStack>

      {/* Preview Summary */}
      <Box p={5} bg="purple.50" borderRadius="lg" borderLeftWidth="4px" borderLeftColor="purple.400">
        <VStack align="start" spacing={2}>
          <Text fontWeight="bold" color="purple.700">
            Audience Profile Summary
          </Text>
          <SimpleGrid columns={2} spacing={3} width="full">
            <Text fontSize="sm">
              <strong>Language:</strong> {LANGUAGES.find((l) => l.code === profile.language)?.name}
            </Text>
            <Text fontSize="sm">
              <strong>Complexity:</strong> {complexityLabels[profile.complexity]}
            </Text>
            <Text fontSize="sm">
              <strong>Terminology:</strong> {profile.terminology}
            </Text>
            <Text fontSize="sm">
              <strong>Pace:</strong> {profile.pace}
            </Text>
          </SimpleGrid>
          {profile.contentFilters.length > 0 && (
            <Text fontSize="sm">
              <strong>Adaptations:</strong> {profile.contentFilters.join(', ')}
            </Text>
          )}
        </VStack>
      </Box>
    </VStack>
  );
}
