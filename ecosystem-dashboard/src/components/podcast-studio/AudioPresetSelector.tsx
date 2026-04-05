import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  SimpleGrid,
  Badge,
  IconButton,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  useToast,
  Divider,
} from '@chakra-ui/react';
import { FiSave, FiTrash2, FiMic } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  AudioPreset,
  loadAllAudioPresets,
  saveCustomAudioPreset,
  deleteCustomAudioPreset,
  incrementAudioPresetUsage,
} from '@/lib/audio-presets';

interface AudioPresetSelectorProps {
  scriptSpeakers: Array<{ id: string; role: string }>;
  onLoadPreset: (preset: AudioPreset) => void;
}

export default function AudioPresetSelector({
  scriptSpeakers,
  onLoadPreset,
}: AudioPresetSelectorProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isSaveOpen,
    onOpen: onSaveOpen,
    onClose: onSaveClose,
  } = useDisclosure();

  const [presets, setPresets] = useState<AudioPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [newPresetIcon, setNewPresetIcon] = useState('🎵');

  const toast = useToast();
  const cardBg = useSemanticToken('surface.elevated');
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.default');

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    const audioPresets = await loadAllAudioPresets();
    setPresets(audioPresets);
  };

  const handleLoadPreset = async (preset: AudioPreset) => {
    onLoadPreset(preset);
    onClose();

    // Increment usage count
    if (preset.id) {
      await incrementAudioPresetUsage(preset.id);
    }

    toast({
      title: 'Voice preset loaded',
      description: `"${preset.name}" voice configuration applied`,
      status: 'success',
      duration: 2000,
    });
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your voice preset',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    // This would need to be passed from parent with current voice config
    const newPreset = {
      name: newPresetName,
      description: newPresetDescription || 'Custom voice configuration',
      icon: newPresetIcon,
      config: {
        ttsProvider: 'gemini',
        audioFormat: 'mp3',
        sampleRate: 44100,
        voiceProfiles: [], // Would be populated from current voice assignments
        postProcessing: {
          normalize: true,
          compression: true,
          backgroundMusic: false,
        },
      },
    };

    const savedPreset = await saveCustomAudioPreset(newPreset);

    if (savedPreset) {
      await loadPresets();
      onSaveClose();

      setNewPresetName('');
      setNewPresetDescription('');
      setNewPresetIcon('🎵');

      toast({
        title: 'Voice preset saved',
        description: `"${savedPreset.name}" saved to database`,
        status: 'success',
        duration: 2000,
      });
    } else {
      toast({
        title: 'Save failed',
        description: 'Could not save voice preset to database',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    const success = await deleteCustomAudioPreset(presetId);

    if (success) {
      await loadPresets();
      toast({
        title: 'Voice preset deleted',
        status: 'info',
        duration: 2000,
      });
    } else {
      toast({
        title: 'Delete failed',
        description: 'Could not delete voice preset',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const defaultPresets = presets.filter((p) => p.category === 'default');
  const customPresets = presets.filter((p) => p.category === 'custom');

  const getCompatibilityBadge = (preset: AudioPreset) => {
    const presetVoiceCount = preset.config.voiceProfiles.length;
    const scriptSpeakerCount = scriptSpeakers.length;

    if (presetVoiceCount === scriptSpeakerCount) {
      return <Badge colorScheme="green" fontSize="9px">Perfect Match</Badge>;
    } else if (presetVoiceCount < scriptSpeakerCount) {
      return <Badge colorScheme="yellow" fontSize="9px">Needs {scriptSpeakerCount - presetVoiceCount} more</Badge>;
    } else {
      return <Badge colorScheme="orange" fontSize="9px">{presetVoiceCount} voices</Badge>;
    }
  };

  return (
    <>
      {/* Preset Buttons */}
      <HStack spacing={2} mb={3}>
        <Button
          size="sm"
          leftIcon={<FiMic />}
          onClick={onOpen}
          variant="outline"
          colorScheme="purple"
          fontSize="11px"
        >
          Load Voice Preset
        </Button>
        <Button
          size="sm"
          leftIcon={<FiSave />}
          onClick={onSaveOpen}
          variant="outline"
          colorScheme="green"
          fontSize="11px"
        >
          Save Voice Config
        </Button>
      </HStack>

      {/* Load Preset Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Text>🎵 Voice & Audio Presets</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              {/* Info Banner */}
              <Box
                p={3}
                bg={cardBg}
                border="1px solid"
                borderColor="blue.500"
                borderRadius="md"
                fontSize="11px"
              >
                <Text fontWeight="600" mb={1}>
                  💡 Voice presets for {scriptSpeakers.length} speakers
                </Text>
                <Text color={mutedColor}>
                  Select a voice configuration that matches your podcast format
                </Text>
              </Box>

              {/* Default Presets */}
              <Box>
                <HStack justify="space-between" mb={3}>
                  <Text fontSize="13px" fontWeight="600" color={textColor}>
                    🎙️ Default Voice Configurations
                  </Text>
                  <Badge colorScheme="purple" fontSize="10px">
                    {defaultPresets.length} presets
                  </Badge>
                </HStack>
                <SimpleGrid columns={2} spacing={3}>
                  {defaultPresets.map((preset) => (
                    <Box
                      key={preset.id}
                      p={3}
                      bg={cardBg}
                      borderRadius="lg"
                      borderWidth="2px"
                      borderColor={useSemanticToken('border.default')}
                      cursor="pointer"
                      transition="all 0.2s"
                      _hover={{
                        borderColor: 'purple.400',
                        bg: hoverBg,
                        transform: 'translateY(-2px)',
                        boxShadow: 'md',
                      }}
                      onClick={() => handleLoadPreset(preset)}
                    >
                      <VStack align="start" spacing={2}>
                        <HStack justify="space-between" w="full">
                          <Text fontSize="24px">{preset.icon}</Text>
                          {getCompatibilityBadge(preset)}
                        </HStack>
                        <Text fontSize="12px" fontWeight="600" color={textColor}>
                          {preset.name}
                        </Text>
                        <Text fontSize="10px" color={mutedColor} noOfLines={2}>
                          {preset.description}
                        </Text>
                        <HStack spacing={1} flexWrap="wrap">
                          <Badge fontSize="8px" colorScheme="blue">
                            {preset.config.ttsProvider}
                          </Badge>
                          <Badge fontSize="8px" colorScheme="green">
                            {preset.config.audioFormat}
                          </Badge>
                          <Badge fontSize="8px" colorScheme="orange">
                            {preset.config.voiceProfiles.length} voices
                          </Badge>
                        </HStack>
                      </VStack>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>

              {customPresets.length > 0 && (
                <>
                  <Divider />
                  {/* Custom Presets */}
                  <Box>
                    <HStack justify="space-between" mb={3}>
                      <Text fontSize="13px" fontWeight="600" color={textColor}>
                        ⭐ Your Custom Voice Presets
                      </Text>
                      <Badge colorScheme="green" fontSize="10px">
                        {customPresets.length} saved
                      </Badge>
                    </HStack>
                    <SimpleGrid columns={2} spacing={3}>
                      {customPresets.map((preset) => (
                        <Box
                          key={preset.id}
                          p={3}
                          bg={cardBg}
                          borderRadius="lg"
                          borderWidth="2px"
                          borderColor="green.500"
                          position="relative"
                        >
                          <IconButton
                            aria-label="Delete preset"
                            icon={<FiTrash2 />}
                            size="xs"
                            colorScheme="red"
                            variant="ghost"
                            position="absolute"
                            top={2}
                            right={2}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePreset(preset.id);
                            }}
                          />
                          <Box cursor="pointer" onClick={() => handleLoadPreset(preset)}>
                            <VStack align="start" spacing={2}>
                              <HStack justify="space-between" w="full" pr={6}>
                                <Text fontSize="24px">{preset.icon}</Text>
                                {getCompatibilityBadge(preset)}
                              </HStack>
                              <Text fontSize="12px" fontWeight="600" color={textColor}>
                                {preset.name}
                              </Text>
                              <Text fontSize="10px" color={mutedColor} noOfLines={2}>
                                {preset.description}
                              </Text>
                              <HStack spacing={1} flexWrap="wrap">
                                <Badge fontSize="8px" colorScheme="blue">
                                  {preset.config.ttsProvider}
                                </Badge>
                                <Badge fontSize="8px" colorScheme="green">
                                  {preset.config.audioFormat}
                                </Badge>
                                <Badge fontSize="8px" colorScheme="orange">
                                  {preset.config.voiceProfiles.length} voices
                                </Badge>
                              </HStack>
                            </VStack>
                          </Box>
                        </Box>
                      ))}
                    </SimpleGrid>
                  </Box>
                </>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Save Preset Modal */}
      <Modal isOpen={isSaveOpen} onClose={onSaveClose} size="md">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>💾 Save Current Voice Configuration</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel fontSize="12px">Preset Name</FormLabel>
                <Input
                  placeholder="e.g., Professional Interview Voices"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  size="sm"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="12px">Description</FormLabel>
                <Textarea
                  placeholder="Brief description of this voice configuration..."
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  size="sm"
                  rows={3}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="12px">Icon (Emoji)</FormLabel>
                <HStack spacing={2}>
                  <Input
                    value={newPresetIcon}
                    onChange={(e) => setNewPresetIcon(e.target.value)}
                    size="sm"
                    maxW="80px"
                    textAlign="center"
                    fontSize="24px"
                  />
                  <Text fontSize="11px" color={mutedColor}>
                    Choose an emoji to represent this voice preset
                  </Text>
                </HStack>
              </FormControl>

              <Box
                p={3}
                bg={cardBg}
                border="1px solid"
                borderColor="blue.500"
                borderRadius="md"
              >
                <Text fontSize="11px" color={textColor} fontWeight="500" mb={2}>
                  Current Voice Configuration:
                </Text>
                <VStack align="start" spacing={1} fontSize="10px" color={mutedColor}>
                  <Text>• {scriptSpeakers.length} speakers configured</Text>
                  <Text>• Gemini 2.5 TTS</Text>
                  <Text>• MP3 format, 44.1kHz</Text>
                </VStack>
              </Box>

              <HStack justify="flex-end" spacing={2}>
                <Button size="sm" variant="ghost" onClick={onSaveClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  colorScheme="green"
                  leftIcon={<FiSave />}
                  onClick={handleSavePreset}
                >
                  Save Voice Preset
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
