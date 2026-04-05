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
  IconButton,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Wrap,
  WrapItem,
  Tag,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { FiUser, FiPlus, FiTrash2, FiArrowRight, FiArrowLeft, FiMic, FiVolume2 } from 'react-icons/fi';
import { PodcastProject, PodcastHost } from '../../pages/podcast-studio';
import VoicePreview from './VoicePreview';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface HostStudioProps {
  project: PodcastProject;
  onUpdate: (project: PodcastProject) => void;
  onNext: () => void;
  onBack: () => void;
}

const VOICE_OPTIONS = [
  'Mira', 'Atlas', 'Nova', 'Echo', 'Sage', 'Phoenix',
  'Luna', 'Orion', 'Iris', 'Zephyr', 'Aurora', 'Cosmo',
  'Stella', 'River', 'Sky', 'Ocean', 'Ember', 'Frost',
  'Storm', 'Breeze', 'Crystal', 'Shadow', 'Dawn', 'Dusk',
  'Cloud', 'Rain', 'Snow', 'Thunder', 'Lightning', 'Meadow'
];

const HOST_ARCHETYPES = [
  {
    id: 'enthusiast',
    name: 'The Enthusiast',
    emoji: '🎉',
    description: 'High energy, asks lots of questions',
    defaultPrompt: 'Speak enthusiastically with warmth and curiosity',
    color: 'orange',
  },
  {
    id: 'skeptic',
    name: 'The Skeptic',
    emoji: '🤔',
    description: 'Challenges assumptions, analytical',
    defaultPrompt: 'Sound thoughtful and analytical, with a hint of skepticism',
    color: 'blue',
  },
  {
    id: 'teacher',
    name: 'The Teacher',
    emoji: '👨‍🏫',
    description: 'Explains clearly, uses analogies',
    defaultPrompt: 'Speak patiently with an educational, clear tone',
    color: 'green',
  },
  {
    id: 'expert',
    name: 'The Expert',
    emoji: '🎓',
    description: 'Deep knowledge, authoritative',
    defaultPrompt: 'Deliver with academic authority and confidence',
    color: 'purple',
  },
  {
    id: 'storyteller',
    name: 'The Storyteller',
    emoji: '📖',
    description: 'Narrative-driven, relatable',
    defaultPrompt: 'Speak in an engaging, storytelling manner',
    color: 'pink',
  },
  {
    id: 'moderator',
    name: 'The Moderator',
    emoji: '⚖️',
    description: 'Keeps on track, summarizes',
    defaultPrompt: 'Sound professional and balanced, keeping focus',
    color: 'gray',
  },
];

export default function HostStudio({ project, onUpdate, onNext, onBack }: HostStudioProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingHost, setEditingHost] = useState<PodcastHost | null>(null);
  const [hostForm, setHostForm] = useState({
    name: '',
    gender: 'male' as 'male' | 'female',
    voiceName: VOICE_OPTIONS[0],
    archetype: 'enthusiast' as any,
    expertise: '',
    energyLevel: 7,
  });
  const toast = useToast();

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const handleAddHost = () => {
    const archetype = HOST_ARCHETYPES.find((a) => a.id === hostForm.archetype)!;
    
    const newHost: PodcastHost = {
      id: editingHost?.id || `host-${Date.now()}`,
      name: hostForm.name,
      role: (editingHost as any)?.role || 'host',
      gender: hostForm.gender,
      voiceName: hostForm.voiceName,
      personality: {
        archetype: hostForm.archetype,
        expertise: hostForm.expertise.split(',').map((e) => e.trim()).filter(Boolean),
        communicationStyle: archetype.name,
        energyLevel: hostForm.energyLevel,
      },
      voiceStyle: {
        basePrompt: archetype.defaultPrompt,
        emotionalRange: ['thoughtful', 'excited', 'curious'],
      },
    };

    if (editingHost) {
      onUpdate({
        ...project,
        hosts: project.hosts.map((h) => (h.id === editingHost.id ? newHost : h)),
      });
      toast({ title: 'Host updated!', status: 'success', duration: 2000 });
    } else {
      onUpdate({
        ...project,
        hosts: [...project.hosts, newHost],
      });
      toast({ title: 'Host added!', status: 'success', duration: 2000 });
    }

    setEditingHost(null);
    setHostForm({
      name: '',
      gender: 'male',
      voiceName: VOICE_OPTIONS[0],
      archetype: 'enthusiast',
      expertise: '',
      energyLevel: 7,
    });
    onClose();
  };

  const handleEditHost = (host: PodcastHost) => {
    setEditingHost(host);
    const p = typeof host.personality === 'object' ? host.personality : null;
    setHostForm({
      name: host.name,
      gender: host.gender || 'male',
      voiceName: host.voiceName || host.voiceId || VOICE_OPTIONS[0],
      archetype: p?.archetype || 'enthusiast',
      expertise: p?.expertise?.join(', ') || '',
      energyLevel: p?.energyLevel || 7,
    });
    onOpen();
  };

  const handleRemoveHost = (id: string) => {
    onUpdate({
      ...project,
      hosts: project.hosts.filter((h) => h.id !== id),
    });
  };

  const handleNext = () => {
    if (project.hosts.length < 2) {
      toast({
        title: 'Add more hosts',
        description: 'You need at least 2 hosts for a conversation',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    onNext();
  };

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <VStack align="start" spacing={1}>
          <Text fontSize="2xl" fontWeight="bold">
            Configure Podcast Hosts
          </Text>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            Create 2-6 hosts with unique personalities and voices
          </Text>
        </VStack>
        <Badge colorScheme="purple" fontSize="md" px={3} py={1} borderRadius="full">
          {project.hosts.length} / 6 hosts
        </Badge>
      </HStack>

      {/* Quick Add Archetypes */}
      {project.hosts.length === 0 && (
        <Box>
          <Text fontSize="md" fontWeight="medium" mb={4}>
            Quick Start: Choose Host Archetypes
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {HOST_ARCHETYPES.map((archetype) => (
              <Box
                key={archetype.id}
                p={5}
                bg={cardBg}
                borderWidth="2px"
                borderColor={borderColor}
                borderRadius="xl"
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  borderColor: `${archetype.color}.400`,
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg',
                }}
                onClick={() => {
                  setHostForm({
                    ...hostForm,
                    archetype: archetype.id as any,
                    name: `Host ${project.hosts.length + 1}`,
                    voiceName: VOICE_OPTIONS[project.hosts.length % VOICE_OPTIONS.length],
                  });
                  onOpen();
                }}
              >
                <VStack spacing={3} align="start">
                  <HStack>
                    <Text fontSize="2xl">{archetype.emoji}</Text>
                    <Text fontWeight="bold">{archetype.name}</Text>
                  </HStack>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    {archetype.description}
                  </Text>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Current Hosts */}
      {project.hosts.length > 0 && (
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="bold">
              Your Podcast Hosts
            </Text>
            {project.hosts.length < 6 && (
              <Button
                leftIcon={<FiPlus />}
                size="sm"
                colorScheme="purple"
                onClick={onOpen}
              >
                Add Host
              </Button>
            )}
          </HStack>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {project.hosts.map((host) => {
              const hp = typeof host.personality === 'object' ? host.personality : null;
              const archetype = HOST_ARCHETYPES.find((a) => a.id === hp?.archetype) || HOST_ARCHETYPES[0];
              return (
                <Box
                  key={host.id}
                  p={5}
                  bg={cardBg}
                  borderWidth="1px"
                  borderColor={borderColor}
                  borderRadius="lg"
                >
                  <HStack justify="space-between" align="start" mb={3}>
                    <HStack spacing={3}>
                      <Box
                        bg={`${archetype.color}.100`}
                        p={2}
                        borderRadius="full"
                      >
                        <Icon as={FiMic} boxSize={5} color={`${archetype.color}.500`} />
                      </Box>
                      <VStack align="start" spacing={0}>
                        <HStack>
                          <Text fontWeight="bold" fontSize="lg">
                            {host.name}
                          </Text>
                          <Text fontSize="xs" color={host.gender === 'female' ? 'pink.500' : 'blue.500'}>
                            {host.gender === 'female' ? '♀️' : '♂️'}
                          </Text>
                        </HStack>
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                          {archetype.name}
                        </Text>
                      </VStack>
                    </HStack>
                    <HStack>
                      <IconButton
                        aria-label="Edit host"
                        icon={<FiUser />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditHost(host)}
                      />
                      <IconButton
                        aria-label="Remove host"
                        icon={<FiTrash2 />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleRemoveHost(host.id)}
                      />
                    </HStack>
                  </HStack>

                  <VStack align="stretch" spacing={2}>
                    <HStack>
                      <Badge colorScheme="blue">Voice: {host.voiceName || host.voiceId}</Badge>
                      <Badge colorScheme="purple">Energy: {hp?.energyLevel || 7}/10</Badge>
                    </HStack>
                    {hp?.expertise && hp.expertise.length > 0 && (
                      <Wrap>
                        {hp.expertise.map((exp) => (
                          <WrapItem key={exp}>
                            <Tag size="sm" colorScheme="gray">
                              {exp}
                            </Tag>
                          </WrapItem>
                        ))}
                      </Wrap>
                    )}
                  </VStack>
                </Box>
              );
            })}
          </SimpleGrid>
        </VStack>
      )}

      {/* Navigation */}
      <HStack justify="space-between">
        <Button
          leftIcon={<FiArrowLeft />}
          variant="ghost"
          onClick={onBack}
        >
          Back to Research
        </Button>
        <Button
          rightIcon={<FiArrowRight />}
          colorScheme="purple"
          size="lg"
          onClick={handleNext}
          isDisabled={project.hosts.length < 2}
        >
          Generate Script
        </Button>
      </HStack>

      {/* Add/Edit Host Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingHost ? 'Edit Host' : 'Add Host'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Tabs colorScheme="purple">
              <TabList>
                <Tab>
                  <HStack>
                    <Icon as={FiUser} />
                    <Text>Host Configuration</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack>
                    <Icon as={FiVolume2} />
                    <Text>Voice Preview & Selection</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels>
                {/* Configuration Tab */}
                <TabPanel>
                  <VStack spacing={5} align="stretch">
                    <FormControl>
                      <FormLabel>Host Name</FormLabel>
                      <Input
                        placeholder="e.g., Alex"
                        value={hostForm.name}
                        onChange={(e) => setHostForm({ ...hostForm, name: e.target.value })}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Gender</FormLabel>
                      <HStack spacing={4}>
                        <Button
                          size="sm"
                          variant={hostForm.gender === 'male' ? 'solid' : 'outline'}
                          colorScheme={hostForm.gender === 'male' ? 'blue' : 'gray'}
                          onClick={() => setHostForm({ ...hostForm, gender: 'male' })}
                          leftIcon={<Text>♂️</Text>}
                        >
                          Male
                        </Button>
                        <Button
                          size="sm"
                          variant={hostForm.gender === 'female' ? 'solid' : 'outline'}
                          colorScheme={hostForm.gender === 'female' ? 'pink' : 'gray'}
                          onClick={() => setHostForm({ ...hostForm, gender: 'female' })}
                          leftIcon={<Text>♀️</Text>}
                        >
                          Female
                        </Button>
                      </HStack>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                        Used to auto-match TTS voice gender during audio generation
                      </Text>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Personality Archetype</FormLabel>
                      <Select
                        value={hostForm.archetype}
                        onChange={(e) => setHostForm({ ...hostForm, archetype: e.target.value as any })}
                      >
                        {HOST_ARCHETYPES.map((archetype) => (
                          <option key={archetype.id} value={archetype.id}>
                            {archetype.emoji} {archetype.name}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Voice Selection</FormLabel>
                      <Select
                        value={hostForm.voiceName}
                        onChange={(e) => setHostForm({ ...hostForm, voiceName: e.target.value })}
                      >
                        {VOICE_OPTIONS.map((voice) => (
                          <option key={voice} value={voice}>
                            {voice}
                          </option>
                        ))}
                      </Select>
                      <Text fontSize="xs" color="blue.500" mt={1}>
                        💡 Switch to "Voice Preview" tab to hear samples and get recommendations
                      </Text>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Expertise (comma-separated)</FormLabel>
                      <Input
                        placeholder="e.g., climate science, data analysis"
                        value={hostForm.expertise}
                        onChange={(e) => setHostForm({ ...hostForm, expertise: e.target.value })}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Energy Level: {hostForm.energyLevel}/10</FormLabel>
                      <Slider
                        value={hostForm.energyLevel}
                        onChange={(val) => setHostForm({ ...hostForm, energyLevel: val })}
                        min={1}
                        max={10}
                        step={1}
                      >
                        <SliderTrack>
                          <SliderFilledTrack bg="purple.400" />
                        </SliderTrack>
                        <SliderThumb boxSize={6} />
                      </Slider>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                        1 = Calm & measured, 10 = Highly energetic
                      </Text>
                    </FormControl>

                    <Button
                      colorScheme="purple"
                      onClick={handleAddHost}
                      isDisabled={!hostForm.name}
                      size="lg"
                    >
                      {editingHost ? 'Update Host' : 'Add Host'}
                    </Button>
                  </VStack>
                </TabPanel>

                {/* Voice Preview Tab */}
                <TabPanel>
                  <VoicePreview
                    selectedVoice={hostForm.voiceName}
                    onVoiceSelect={(voiceName) => setHostForm({ ...hostForm, voiceName })}
                    audienceType={project.audienceProfile?.terminology === 'medical' ? 'medical' : 
                                 project.audienceProfile?.ageGroup === 'children' ? 'children' :
                                 project.audienceProfile?.terminology === 'technical' ? 'technical' : 'casual'}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
