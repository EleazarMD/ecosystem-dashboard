/**
 * Voice Selector Component - Reusable voice selection for all homelab services
 * 
 * Provides a dropdown or grid of available Qwen3 voice profiles with preview capability
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  HStack,
  VStack,
  Text,
  Select,
  IconButton,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuGroup,
  MenuDivider,
  Spinner,
  Tooltip,
  Avatar,
} from '@chakra-ui/react';
import { PlayIcon, StopIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useQwenTTS, VoiceProfile, VOICE_CATEGORIES, SERVICE_VOICE_DEFAULTS } from '@/hooks/useQwenTTS';

interface VoiceSelectorProps {
  value: string;
  onChange: (voiceId: string) => void;
  service?: string; // Optional service context for recommendations
  showPreview?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'select' | 'menu' | 'compact';
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  value,
  onChange,
  service,
  showPreview = true,
  size = 'md',
  variant = 'select',
}) => {
  const {
    voices,
    loadVoices,
    playProfilePreview,
    stop,
    isSpeaking,
    isLoading,
    currentVoice,
    getVoiceForService,
  } = useQwenTTS();

  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile | null>(null);

  useEffect(() => {
    loadVoices();
  }, [loadVoices]);

  useEffect(() => {
    if (voices.length > 0 && value) {
      const voice = voices.find(v => v.voice_id === value);
      setSelectedVoice(voice || null);
    }
  }, [voices, value]);

  // Set default voice based on service if no value provided
  useEffect(() => {
    if (!value && service && voices.length > 0) {
      const defaultVoice = getVoiceForService(service);
      onChange(defaultVoice);
    }
  }, [value, service, voices, getVoiceForService, onChange]);

  const handlePreview = async (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking && currentVoice === voiceId) {
      stop();
    } else {
      await playProfilePreview(voiceId);
    }
  };

  const handleChange = (voiceId: string) => {
    onChange(voiceId);
    const voice = voices.find(v => v.voice_id === voiceId);
    setSelectedVoice(voice || null);
  };

  // Compact variant - just a small button with voice name
  if (variant === 'compact') {
    return (
      <Menu>
        <MenuButton
          as={Button}
          size={size}
          rightIcon={<ChevronDownIcon className="w-4 h-4" />}
          variant="outline"
        >
          <HStack spacing={2}>
            <Avatar size="xs" name={selectedVoice?.name || 'Voice'} />
            <Text fontSize="sm">{selectedVoice?.name || 'Select Voice'}</Text>
          </HStack>
        </MenuButton>
        <MenuList maxH="400px" overflowY="auto">
          {Object.entries(VOICE_CATEGORIES).map(([category, voiceIds]) => (
            <React.Fragment key={category}>
              <MenuGroup title={category}>
                {voiceIds.map(voiceId => {
                  const voice = voices.find(v => v.voice_id === voiceId);
                  if (!voice) return null;
                  return (
                    <MenuItem
                      key={voiceId}
                      onClick={() => handleChange(voiceId)}
                      bg={value === voiceId ? 'purple.50' : undefined}
                    >
                      <HStack justify="space-between" w="full">
                        <HStack>
                          <Avatar size="xs" name={voice.name} bg={voice.gender === 'female' ? 'pink.400' : 'blue.400'} />
                          <VStack align="start" spacing={0}>
                            <Text fontSize="sm">{voice.name}</Text>
                            <Text fontSize="xs" color="gray.500">{voice.accent}</Text>
                          </VStack>
                        </HStack>
                        {showPreview && voice.has_profile && (
                          <IconButton
                            aria-label="Preview"
                            icon={
                              isLoading && currentVoice === voiceId ? (
                                <Spinner size="xs" />
                              ) : isSpeaking && currentVoice === voiceId ? (
                                <StopIcon className="w-3 h-3" />
                              ) : (
                                <PlayIcon className="w-3 h-3" />
                              )
                            }
                            size="xs"
                            variant="ghost"
                            onClick={(e) => handlePreview(voiceId, e)}
                          />
                        )}
                      </HStack>
                    </MenuItem>
                  );
                })}
              </MenuGroup>
              <MenuDivider />
            </React.Fragment>
          ))}
        </MenuList>
      </Menu>
    );
  }

  // Menu variant - dropdown with categories
  if (variant === 'menu') {
    return (
      <Menu>
        <MenuButton
          as={Button}
          size={size}
          rightIcon={<ChevronDownIcon className="w-4 h-4" />}
          w="full"
        >
          <HStack spacing={2} justify="start">
            {selectedVoice && (
              <>
                <Avatar size="xs" name={selectedVoice.name} bg={selectedVoice.gender === 'female' ? 'pink.400' : 'blue.400'} />
                <Text>{selectedVoice.name}</Text>
                <Badge size="sm" colorScheme="purple">QWEN3</Badge>
              </>
            )}
            {!selectedVoice && <Text>Select a voice...</Text>}
          </HStack>
        </MenuButton>
        <MenuList maxH="400px" overflowY="auto">
          {service && (
            <>
              <MenuGroup title="Recommended">
                {(() => {
                  const recommendedId = getVoiceForService(service);
                  const voice = voices.find(v => v.voice_id === recommendedId);
                  if (!voice) return null;
                  return (
                    <MenuItem onClick={() => handleChange(recommendedId)}>
                      <HStack justify="space-between" w="full">
                        <HStack>
                          <Avatar size="xs" name={voice.name} bg={voice.gender === 'female' ? 'pink.400' : 'blue.400'} />
                          <Text>{voice.name}</Text>
                          <Badge size="sm" colorScheme="green">Best for {service}</Badge>
                        </HStack>
                      </HStack>
                    </MenuItem>
                  );
                })()}
              </MenuGroup>
              <MenuDivider />
            </>
          )}
          {Object.entries(VOICE_CATEGORIES).map(([category, voiceIds]) => (
            <React.Fragment key={category}>
              <MenuGroup title={category}>
                {voiceIds.map(voiceId => {
                  const voice = voices.find(v => v.voice_id === voiceId);
                  if (!voice) return null;
                  return (
                    <MenuItem
                      key={voiceId}
                      onClick={() => handleChange(voiceId)}
                      bg={value === voiceId ? 'purple.50' : undefined}
                    >
                      <HStack justify="space-between" w="full">
                        <HStack>
                          <Avatar size="xs" name={voice.name} bg={voice.gender === 'female' ? 'pink.400' : 'blue.400'} />
                          <Text>{voice.name}</Text>
                        </HStack>
                        {showPreview && voice.has_profile && (
                          <IconButton
                            aria-label="Preview"
                            icon={
                              isSpeaking && currentVoice === voiceId ? (
                                <StopIcon className="w-3 h-3" />
                              ) : (
                                <PlayIcon className="w-3 h-3" />
                              )
                            }
                            size="xs"
                            variant="ghost"
                            onClick={(e) => handlePreview(voiceId, e)}
                          />
                        )}
                      </HStack>
                    </MenuItem>
                  );
                })}
              </MenuGroup>
              <MenuDivider />
            </React.Fragment>
          ))}
        </MenuList>
      </Menu>
    );
  }

  // Default select variant
  return (
    <HStack spacing={2}>
      <Select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        size={size}
        flex={1}
      >
        <option value="">Select a voice...</option>
        {voices.filter(v => v.has_profile).map(voice => (
          <option key={voice.voice_id} value={voice.voice_id}>
            {voice.name} ({voice.accent})
          </option>
        ))}
      </Select>
      {showPreview && value && (
        <Tooltip label={isSpeaking && currentVoice === value ? 'Stop' : 'Preview voice'}>
          <IconButton
            aria-label="Preview voice"
            icon={
              isLoading && currentVoice === value ? (
                <Spinner size="sm" />
              ) : isSpeaking && currentVoice === value ? (
                <StopIcon className="w-4 h-4" />
              ) : (
                <PlayIcon className="w-4 h-4" />
              )
            }
            size={size}
            colorScheme="purple"
            variant="outline"
            onClick={(e) => handlePreview(value, e)}
            isDisabled={isLoading}
          />
        </Tooltip>
      )}
    </HStack>
  );
};

export default VoiceSelector;
