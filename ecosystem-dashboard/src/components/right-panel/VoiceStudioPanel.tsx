'use client';

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Avatar,
  Divider,
  IconButton,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Tooltip,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import {
  PlayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LinkIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';

interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  language: string;
  type: 'cloned' | 'designed' | 'preset';
  created_at: string;
  tags?: string[];
}

interface ServiceIntegration {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  voiceProfileId?: string;
}

interface VoiceStudioPanelProps {
  activeTab?: string;
  selectedProfile?: VoiceProfile | null;
  voiceProfiles?: VoiceProfile[];
  serviceIntegrations?: ServiceIntegration[];
}

export default function VoiceStudioPanel({ 
  activeTab: propActiveTab,
  selectedProfile: propSelectedProfile,
  voiceProfiles: propVoiceProfiles,
  serviceIntegrations: propServiceIntegrations,
}: VoiceStudioPanelProps) {
  const { activeTab: contextActiveTab, customData } = useRightPanel();
  // Use prop if provided, otherwise fall back to context
  const activeTab = propActiveTab || contextActiveTab;
  
  const { isOpen: isSettingsOpen, onToggle: onSettingsToggle } = useDisclosure({ defaultIsOpen: true });
  const { isOpen: isIntegrationsOpen, onToggle: onIntegrationsToggle } = useDisclosure({ defaultIsOpen: true });
  
  const [defaultVoice, setDefaultVoice] = useState<string>('');
  const [autoPreview, setAutoPreview] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState('English');
  const [defaultTemperature, setDefaultTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [outputFormat, setOutputFormat] = useState('wav');
  
  // Colors
  const bgColor = useSemanticToken('surface.base');
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const accentColor = useSemanticToken('interactive.primary');

  // Use props if provided, otherwise fall back to customData from context
  const selectedProfile: VoiceProfile | null = propSelectedProfile ?? customData?.selectedProfile ?? null;
  const voiceProfiles: VoiceProfile[] = propVoiceProfiles ?? customData?.voiceProfiles ?? [];
  const serviceIntegrations: ServiceIntegration[] = propServiceIntegrations ?? customData?.serviceIntegrations ?? [];

  // Voice Profiles Tab
  if (activeTab === 'voice-profiles') {
    return (
      <Box p={4} h="full" overflowY="auto">
        <VStack align="stretch" spacing={4}>
          {/* Selected Profile */}
          {selectedProfile ? (
            <Box bg={cardBg} p={4} borderRadius="lg" border="1px solid" borderColor={accentColor}>
              <HStack mb={3}>
                <Avatar size="md" name={selectedProfile.name} bg="purple.500" />
                <VStack align="start" spacing={0} flex={1}>
                  <Text fontWeight="bold" color={textPrimary}>{selectedProfile.name}</Text>
                  <HStack>
                    <Badge size="sm" colorScheme="purple">{selectedProfile.type}</Badge>
                    <Badge size="sm">{selectedProfile.language}</Badge>
                  </HStack>
                </VStack>
              </HStack>
              <Text fontSize="sm" color={textSecondary} mb={3}>
                {selectedProfile.description}
              </Text>
              <HStack>
                <Button size="sm" leftIcon={<PlayIcon className="w-3 h-3" />} colorScheme="purple" flex={1}>
                  Preview
                </Button>
                <Button size="sm" leftIcon={<LinkIcon className="w-3 h-3" />} variant="outline" flex={1}>
                  Use in Service
                </Button>
              </HStack>
            </Box>
          ) : (
            <Box bg={cardBg} p={3} borderRadius="lg">
              <Text fontSize="sm" color={textSecondary}>
                Click a voice card to select it
              </Text>
            </Box>
          )}

          <Divider />

          {/* Quick Access */}
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color={textPrimary} mb={2}>
              Recent Profiles
            </Text>
            <VStack align="stretch" spacing={2}>
              {voiceProfiles.slice(0, 5).map((profile) => (
                <HStack
                  key={profile.id}
                  p={2}
                  bg={selectedProfile?.id === profile.id ? cardBg : 'transparent'}
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: cardBg }}
                  onClick={() => customData?.onProfileSelect?.(profile)}
                >
                  <Avatar size="xs" name={profile.name} bg="purple.500" />
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontSize="sm" color={textPrimary}>{profile.name}</Text>
                    <Text fontSize="xs" color={textSecondary}>{profile.type}</Text>
                  </VStack>
                  {selectedProfile?.id === profile.id && (
                    <CheckCircleIcon className="w-4 h-4" style={{ color: accentColor }} />
                  )}
                </HStack>
              ))}
            </VStack>
          </Box>
        </VStack>
      </Box>
    );
  }

  // Voice Library Tab
  if (activeTab === 'voice-library') {
    return (
      <Box p={4} h="full" overflowY="auto">
        <VStack align="stretch" spacing={4}>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color={textPrimary} mb={2}>
              Library Statistics
            </Text>
            <Box bg={cardBg} p={3} borderRadius="lg">
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" color={textSecondary}>Total Profiles</Text>
                <Badge colorScheme="purple">{voiceProfiles.length}</Badge>
              </HStack>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" color={textSecondary}>Designed</Text>
                <Badge>{voiceProfiles.filter(p => p.type === 'designed').length}</Badge>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={textSecondary}>Cloned</Text>
                <Badge>{voiceProfiles.filter(p => p.type === 'cloned').length}</Badge>
              </HStack>
            </Box>
          </Box>

          <Divider />

          <Box>
            <Text fontSize="sm" fontWeight="semibold" color={textPrimary} mb={2}>
              All Profiles
            </Text>
            <VStack align="stretch" spacing={2}>
              {voiceProfiles.map((profile) => (
                <HStack
                  key={profile.id}
                  p={2}
                  bg={cardBg}
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ borderColor: accentColor }}
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <Avatar size="xs" name={profile.name} bg="purple.500" />
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontSize="sm" color={textPrimary}>{profile.name}</Text>
                    <HStack spacing={1}>
                      <Badge size="sm" colorScheme="purple">{profile.type}</Badge>
                      <Badge size="sm">{profile.language}</Badge>
                    </HStack>
                  </VStack>
                  <IconButton
                    aria-label="Preview"
                    icon={<PlayIcon className="w-3 h-3" />}
                    size="xs"
                    variant="ghost"
                  />
                </HStack>
              ))}
              {voiceProfiles.length === 0 && (
                <Text fontSize="sm" color={textSecondary} textAlign="center" py={4}>
                  No voice profiles yet
                </Text>
              )}
            </VStack>
          </Box>
        </VStack>
      </Box>
    );
  }

  // Voice Settings Tab
  if (activeTab === 'voice-settings') {
    return (
      <Box p={4} h="full" overflowY="auto">
        <VStack align="stretch" spacing={4}>
          {/* Generation Settings */}
          <Box>
            <HStack 
              justify="space-between" 
              cursor="pointer" 
              onClick={onSettingsToggle}
              mb={2}
            >
              <Text fontSize="sm" fontWeight="semibold" color={textPrimary}>
                Generation Defaults
              </Text>
              {isSettingsOpen ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </HStack>
            <Collapse in={isSettingsOpen}>
              <VStack align="stretch" spacing={3} bg={cardBg} p={3} borderRadius="lg">
                <FormControl>
                  <FormLabel fontSize="xs">Default Language</FormLabel>
                  <Select 
                    size="sm" 
                    value={defaultLanguage} 
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                  >
                    <option value="Auto">Auto Detect</option>
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Korean">Korean</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Italian">Italian</option>
                    <option value="Portuguese">Portuguese</option>
                    <option value="Russian">Russian</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <HStack justify="space-between">
                    <FormLabel fontSize="xs" mb={0}>Temperature</FormLabel>
                    <Badge size="sm" colorScheme="purple">{defaultTemperature.toFixed(2)}</Badge>
                  </HStack>
                  <Text fontSize="xs" color={textSecondary} mb={1}>Controls randomness (0 = deterministic, 2 = creative)</Text>
                  <Slider 
                    value={defaultTemperature} 
                    onChange={setDefaultTemperature} 
                    min={0} 
                    max={2} 
                    step={0.05}
                  >
                    <SliderTrack><SliderFilledTrack bg={accentColor} /></SliderTrack>
                    <SliderThumb />
                  </Slider>
                </FormControl>

                <FormControl>
                  <HStack justify="space-between">
                    <FormLabel fontSize="xs" mb={0}>Top P (Nucleus Sampling)</FormLabel>
                    <Badge size="sm" colorScheme="blue">{topP.toFixed(2)}</Badge>
                  </HStack>
                  <Text fontSize="xs" color={textSecondary} mb={1}>Probability mass for token selection</Text>
                  <Slider 
                    value={topP} 
                    onChange={setTopP} 
                    min={0.1} 
                    max={1} 
                    step={0.05}
                  >
                    <SliderTrack><SliderFilledTrack bg="blue.500" /></SliderTrack>
                    <SliderThumb />
                  </Slider>
                </FormControl>

                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel fontSize="xs" mb={0}>Auto-preview on generate</FormLabel>
                  <Switch 
                    size="sm" 
                    isChecked={autoPreview} 
                    onChange={(e) => setAutoPreview(e.target.checked)} 
                    colorScheme="purple"
                  />
                </FormControl>
              </VStack>
            </Collapse>
          </Box>

          <Divider />

          {/* Voice Modulation */}
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color={textPrimary} mb={2}>
              Voice Modulation
            </Text>
            <VStack align="stretch" spacing={3} bg={cardBg} p={3} borderRadius="lg">
              <FormControl>
                <HStack justify="space-between">
                  <FormLabel fontSize="xs" mb={0}>Speed</FormLabel>
                  <Badge size="sm" colorScheme="green">{speed.toFixed(2)}x</Badge>
                </HStack>
                <Text fontSize="xs" color={textSecondary} mb={1}>Playback speed multiplier</Text>
                <Slider 
                  value={speed} 
                  onChange={setSpeed} 
                  min={0.5} 
                  max={2.0} 
                  step={0.1}
                >
                  <SliderTrack><SliderFilledTrack bg="green.500" /></SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <FormControl>
                <HStack justify="space-between">
                  <FormLabel fontSize="xs" mb={0}>Pitch Shift</FormLabel>
                  <Badge size="sm" colorScheme="orange">{pitch > 0 ? '+' : ''}{pitch} semitones</Badge>
                </HStack>
                <Text fontSize="xs" color={textSecondary} mb={1}>Adjust voice pitch (-12 to +12)</Text>
                <Slider 
                  value={pitch} 
                  onChange={setPitch} 
                  min={-12} 
                  max={12} 
                  step={1}
                >
                  <SliderTrack><SliderFilledTrack bg="orange.500" /></SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>
            </VStack>
          </Box>

          <Divider />

          {/* Advanced Settings */}
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color={textPrimary} mb={2}>
              Advanced Settings
            </Text>
            <VStack align="stretch" spacing={3} bg={cardBg} p={3} borderRadius="lg">
              <FormControl>
                <HStack justify="space-between">
                  <FormLabel fontSize="xs" mb={0}>Max Tokens</FormLabel>
                  <Badge size="sm">{maxTokens}</Badge>
                </HStack>
                <Text fontSize="xs" color={textSecondary} mb={1}>Maximum audio tokens to generate</Text>
                <Slider 
                  value={maxTokens} 
                  onChange={setMaxTokens} 
                  min={512} 
                  max={8192} 
                  step={512}
                >
                  <SliderTrack><SliderFilledTrack bg={accentColor} /></SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs">Output Format</FormLabel>
                <Select 
                  size="sm" 
                  value={outputFormat} 
                  onChange={(e) => setOutputFormat(e.target.value)}
                >
                  <option value="wav">WAV (Lossless)</option>
                  <option value="mp3">MP3 (Compressed)</option>
                  <option value="ogg">OGG Vorbis</option>
                  <option value="flac">FLAC (Lossless)</option>
                </Select>
              </FormControl>
            </VStack>
          </Box>

          <Divider />

          {/* Service Integrations */}
          <Box>
            <HStack 
              justify="space-between" 
              cursor="pointer" 
              onClick={onIntegrationsToggle}
              mb={2}
            >
              <Text fontSize="sm" fontWeight="semibold" color={textPrimary}>
                Service Integrations
              </Text>
              {isIntegrationsOpen ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </HStack>
            <Collapse in={isIntegrationsOpen}>
              <VStack align="stretch" spacing={2}>
                {serviceIntegrations.map((service) => (
                  <HStack
                    key={service.id}
                    p={2}
                    bg={cardBg}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={borderColor}
                  >
                    <Text fontSize="lg">{service.icon}</Text>
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontSize="sm" color={textPrimary}>{service.name}</Text>
                      <Text fontSize="xs" color={textSecondary}>
                        {service.enabled ? 'Connected' : 'Not configured'}
                      </Text>
                    </VStack>
                    <Badge colorScheme={service.enabled ? 'green' : 'gray'} size="sm">
                      {service.enabled ? 'Active' : 'Off'}
                    </Badge>
                  </HStack>
                ))}
              </VStack>
            </Collapse>
          </Box>

          {/* Apply Settings Button */}
          <Button colorScheme="purple" size="sm" w="full">
            Apply Settings
          </Button>
        </VStack>
      </Box>
    );
  }

  // Export Tab
  if (activeTab === 'export') {
    return (
      <Box p={4} h="full" overflowY="auto">
        <VStack align="stretch" spacing={4}>
          <Box bg={cardBg} p={4} borderRadius="lg">
            <Text fontSize="sm" fontWeight="semibold" color={textPrimary} mb={3}>
              Export Options
            </Text>
            <VStack align="stretch" spacing={2}>
              <Button size="sm" variant="outline" justifyContent="flex-start">
                📦 Export All Profiles (JSON)
              </Button>
              <Button size="sm" variant="outline" justifyContent="flex-start">
                🎵 Export Selected Audio (WAV)
              </Button>
              <Button size="sm" variant="outline" justifyContent="flex-start">
                📋 Copy Profile Config
              </Button>
            </VStack>
          </Box>

          <Divider />

          <Box bg={cardBg} p={4} borderRadius="lg">
            <Text fontSize="sm" fontWeight="semibold" color={textPrimary} mb={3}>
              Import
            </Text>
            <VStack align="stretch" spacing={2}>
              <Button size="sm" variant="outline" justifyContent="flex-start">
                📥 Import Profiles (JSON)
              </Button>
              <Button size="sm" variant="outline" justifyContent="flex-start">
                🎤 Import Reference Audio
              </Button>
            </VStack>
          </Box>
        </VStack>
      </Box>
    );
  }

  // Default / AI Assistant Tab
  return (
    <Box p={4} h="full" overflowY="auto">
      <VStack align="stretch" spacing={4}>
        <Box bg={cardBg} p={4} borderRadius="lg">
          <Text fontSize="sm" fontWeight="semibold" color={textPrimary} mb={2}>
            Voice Studio Assistant
          </Text>
          <Text fontSize="sm" color={textSecondary}>
            Ask me anything about creating voice profiles, cloning voices, or integrating with other services.
          </Text>
        </Box>

        <Divider />

        <Box>
          <Text fontSize="sm" fontWeight="semibold" color={textPrimary} mb={2}>
            Quick Actions
          </Text>
          <VStack align="stretch" spacing={2}>
            <Button size="sm" variant="outline" justifyContent="flex-start">
              🎨 Create a professional narrator voice
            </Button>
            <Button size="sm" variant="outline" justifyContent="flex-start">
              🎤 Clone a voice from audio
            </Button>
            <Button size="sm" variant="outline" justifyContent="flex-start">
              🔗 Connect to Podcast Studio
            </Button>
            <Button size="sm" variant="outline" justifyContent="flex-start">
              📚 Browse preset voices
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
