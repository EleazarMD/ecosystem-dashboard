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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { FiSave, FiDownload, FiTrash2, FiChevronDown, FiBookmark } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  PodcastPreset,
  loadAllPresets,
  saveCustomPreset,
  updateCustomPreset,
  deleteCustomPreset,
  incrementPresetUsage,
  DEFAULT_PRESETS,
} from '@/lib/podcast-presets';

interface PresetSelectorProps {
  currentConfig: PodcastPreset['config'];
  onLoadPreset: (preset: PodcastPreset) => void;
  activePresetId?: string | null;
  activePresetName?: string | null;
  onActivePresetChange?: (id: string | null, name: string | null) => void;
}

export default function PresetSelector({
  currentConfig,
  onLoadPreset,
  activePresetId: propsActivePresetId,
  activePresetName: propsActivePresetName,
  onActivePresetChange,
}: PresetSelectorProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isSaveOpen,
    onOpen: onSaveOpen,
    onClose: onSaveClose,
  } = useDisclosure();

  const [presets, setPresets] = useState<PodcastPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [newPresetIcon, setNewPresetIcon] = useState('🎙️');

  // Use props if provided, otherwise maintain internal state
  const [internalActivePresetId, setInternalActivePresetId] = useState<string | null>(null);
  const [internalActivePresetName, setInternalActivePresetName] = useState<string | null>(null);

  const activePresetId = propsActivePresetId !== undefined ? propsActivePresetId : internalActivePresetId;
  const activePresetName = propsActivePresetName !== undefined ? propsActivePresetName : internalActivePresetName;

  const setActivePreset = (id: string | null, name: string | null) => {
    if (onActivePresetChange) {
      onActivePresetChange(id, name);
    } else {
      setInternalActivePresetId(id);
      setInternalActivePresetName(name);
    }
  };

  const toast = useToast();
  const cardBg = useSemanticToken('surface.card');
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    const presets = await loadAllPresets();
    setPresets(presets);
  };

  const handleLoadPreset = async (preset: PodcastPreset) => {
    onLoadPreset(preset);

    // Track which preset is currently loaded (for update functionality)
    setActivePreset(preset.id, preset.name);

    onClose();

    // Increment usage count in database
    if (preset.id) {
      await incrementPresetUsage(preset.id);
    }

    toast({
      title: 'Preset loaded',
      description: `"${preset.name}" configuration applied`,
      status: 'success',
      duration: 2000,
    });
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your preset',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    const newPreset = {
      name: newPresetName,
      description: newPresetDescription || 'Custom configuration',
      icon: newPresetIcon,
      category: 'custom' as const,
      config: currentConfig,
    };

    const savedPreset = await saveCustomPreset(newPreset);

    if (savedPreset) {
      await loadPresets();
      onSaveClose();

      setNewPresetName('');
      setNewPresetDescription('');
      setNewPresetIcon('🎙️');

      toast({
        title: 'Preset saved',
        description: `"${savedPreset.name}" saved to database`,
        status: 'success',
        duration: 2000,
      });
    } else {
      toast({
        title: 'Save failed',
        description: 'Could not save preset to database',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleUpdatePreset = async () => {
    if (!activePresetId) {
      toast({
        title: 'No preset loaded',
        description: 'Load a custom preset first to update it',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    const updatedPreset = await updateCustomPreset(activePresetId, {
      config: currentConfig,
    });

    if (updatedPreset) {
      await loadPresets();

      toast({
        title: 'Preset updated',
        description: `"${activePresetName}" has been updated with current settings`,
        status: 'success',
        duration: 2000,
      });
    } else {
      toast({
        title: 'Update failed',
        description: 'Could not update preset',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    const success = await deleteCustomPreset(presetId);

    if (success) {
      // Clear active preset if we deleted it
      if (presetId === activePresetId) {
        setActivePreset(null, null);
      }

      await loadPresets();
      toast({
        title: 'Preset deleted',
        status: 'info',
        duration: 2000,
      });
    } else {
      toast({
        title: 'Delete failed',
        description: 'Could not delete preset',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const defaultPresets = presets.filter(p => p.category === 'default');
  const customPresets = presets.filter(p => p.category === 'custom');

  return (
    <>
      {/* Preset Buttons */}
      <VStack spacing={2} align="stretch">
        <HStack spacing={2} wrap="wrap">
          <Button
            size="sm"
            leftIcon={<FiBookmark />}
            onClick={onOpen}
            variant="outline"
            colorScheme="purple"
            fontSize="10px"
            px={3}
            py={2}
            h="auto"
          >
            Load
          </Button>
          <Button
            size="sm"
            leftIcon={<FiSave />}
            onClick={onSaveOpen}
            variant="outline"
            colorScheme="green"
            fontSize="10px"
            px={3}
            py={2}
            h="auto"
          >
            Save New
          </Button>
          {activePresetId && (
            <Button
              size="sm"
              leftIcon={<FiSave />}
              onClick={handleUpdatePreset}
              variant="solid"
              colorScheme="blue"
              fontSize="10px"
              px={3}
              py={2}
              h="auto"
              flex={1}
              minW="0"
            >
              <Text isTruncated>Update</Text>
            </Button>
          )}
        </HStack>
      </VStack>

      {/* Load Preset Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Text>🎯 Podcast Presets</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              {/* Default Presets */}
              <Box>
                <HStack justify="space-between" mb={3}>
                  <Text fontSize="13px" fontWeight="600" color={textColor}>
                    📚 Default Templates
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
                          <Badge colorScheme="purple" fontSize="9px">
                            {preset.config.participantCount} speakers
                          </Badge>
                        </HStack>
                        <Text fontSize="12px" fontWeight="600" color={textColor}>
                          {preset.name}
                        </Text>
                        <Text fontSize="10px" color={mutedColor} noOfLines={2}>
                          {preset.description}
                        </Text>
                        <HStack spacing={1} flexWrap="wrap">
                          <Badge fontSize="8px" colorScheme="blue">
                            {preset.config.tone}
                          </Badge>
                          <Badge fontSize="8px" colorScheme="green">
                            {preset.config.audience}
                          </Badge>
                          <Badge fontSize="8px" colorScheme="orange">
                            {preset.config.length}
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
                        ⭐ Your Custom Presets
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
                          borderColor={useSemanticToken('status.success')}
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
                          <Box
                            cursor="pointer"
                            onClick={() => handleLoadPreset(preset)}
                          >
                            <VStack align="start" spacing={2}>
                              <HStack justify="space-between" w="full" pr={6}>
                                <Text fontSize="24px">{preset.icon}</Text>
                                <Badge colorScheme="green" fontSize="9px">
                                  {preset.config.participantCount} speakers
                                </Badge>
                              </HStack>
                              <Text fontSize="12px" fontWeight="600" color={textColor}>
                                {preset.name}
                              </Text>
                              <Text fontSize="10px" color={mutedColor} noOfLines={2}>
                                {preset.description}
                              </Text>
                              <HStack spacing={1} flexWrap="wrap">
                                <Badge fontSize="8px" colorScheme="blue">
                                  {preset.config.tone}
                                </Badge>
                                <Badge fontSize="8px" colorScheme="green">
                                  {preset.config.audience}
                                </Badge>
                                <Badge fontSize="8px" colorScheme="orange">
                                  {preset.config.length}
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
          <ModalHeader>💾 Save Current Configuration</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel fontSize="12px">Preset Name</FormLabel>
                <Input
                  placeholder="e.g., My Medical Interview Format"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  size="sm"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="12px">Description</FormLabel>
                <Textarea
                  placeholder="Brief description of this preset..."
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
                    Choose an emoji to represent this preset
                  </Text>
                </HStack>
              </FormControl>

              <Box
                p={3}
                bg={useSemanticToken('surface.highlight')}
                borderRadius="md"
              >
                <Text fontSize="11px" color={textColor} fontWeight="500" mb={2}>
                  Current Configuration:
                </Text>
                <VStack align="start" spacing={1} fontSize="10px" color={mutedColor}>
                  <Text>• {currentConfig.participantCount} speakers</Text>
                  <Text>• Format: {currentConfig.podcastFormat}</Text>
                  <Text>• Tone: {currentConfig.tone}</Text>
                  <Text>• Audience: {currentConfig.audience}</Text>
                  <Text>• Length: {currentConfig.length}</Text>
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
                  Save Preset
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
