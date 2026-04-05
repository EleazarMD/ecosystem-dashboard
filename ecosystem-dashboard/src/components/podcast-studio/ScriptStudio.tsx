import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Badge,
  IconButton,
  useToast,
  Select,
  Spinner,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { FiRefreshCw, FiArrowRight, FiArrowLeft, FiMessageSquare, FiEdit, FiUsers } from 'react-icons/fi';
import { PodcastProject, ConversationTurn, AudienceProfile } from '../../pages/podcast-studio';
import AudienceConfigurator from './AudienceConfigurator';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ScriptStudioProps {
  project: PodcastProject;
  onUpdate: (project: PodcastProject) => void;
  onNext: () => void;
  onBack: () => void;
}

const CONVERSATION_MODES = [
  { id: 'analysis', name: '🔍 Analysis Mode', description: 'Deep dive into research findings' },
  { id: 'debate', name: '⚔️ Debate Mode', description: 'Multiple perspectives and discussion' },
  { id: 'teaching', name: '👨‍🏫 Teaching Mode', description: 'Educational Q&A format' },
  { id: 'interview', name: '🎤 Interview Mode', description: 'Structured conversation' },
  { id: 'storytelling', name: '📖 Storytelling Mode', description: 'Narrative approach' },
  { id: 'roundtable', name: '🎭 Roundtable Mode', description: 'Panel discussion' },
];

export default function ScriptStudio({ project, onUpdate, onNext, onBack }: ScriptStudioProps) {
  const [mode, setMode] = useState('analysis');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTurn, setEditingTurn] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const handleAudienceSave = (audienceProfile: AudienceProfile) => {
    onUpdate({ ...project, audienceProfile });
    onClose();
  };

  const handleGenerateScript = async () => {
    setIsGenerating(true);
    
    // Simulate script generation
    setTimeout(() => {
      const turns: ConversationTurn[] = [
        {
          id: 'turn-1',
          speaker: project.hosts[0]?.name || 'Host 1',
          content: `Welcome everyone! Today we're exploring some fascinating research about ${project.researchMaterials[0]?.title}. I'm really excited to dive into this!`,
          emotion: 'enthusiastic',
          duration: 8,
        },
        {
          id: 'turn-2',
          speaker: project.hosts[1]?.name || 'Host 2',
          content: `Thanks for having me! This research caught my attention because of the unique insights it provides. Let me start by summarizing the key findings...`,
          emotion: 'thoughtful',
          duration: 10,
        },
        {
          id: 'turn-3',
          speaker: project.hosts[0]?.name || 'Host 1',
          content: `That's a great overview! One thing that stood out to me was the methodology they used. Can you explain how they approached this?`,
          emotion: 'curious',
          duration: 7,
        },
      ];

      onUpdate({ ...project, script: turns });
      setIsGenerating(false);
      toast({ title: 'Script generated!', description: 'Review and edit as needed', status: 'success', duration: 3000 });
    }, 3000);
  };

  const totalDuration = project.script.reduce((sum, turn) => sum + (turn.duration || 0), 0);

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <VStack align="start" spacing={1}>
          <Text fontSize="2xl" fontWeight="bold">
            Conversation Script
          </Text>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            Generate and refine your podcast dialogue
          </Text>
        </VStack>
        {project.script.length > 0 && (
          <VStack align="end" spacing={0}>
            <Text fontSize="sm" fontWeight="medium">
              {project.script.length} turns
            </Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              ~{Math.ceil(totalDuration / 60)} min duration
            </Text>
          </VStack>
        )}
      </HStack>

      {/* Audience Configuration */}
      <Box p={5} bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
        <HStack justify="space-between" mb={4}>
          <VStack align="start" spacing={0}>
            <Text fontWeight="bold">Target Audience</Text>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              {project.audienceProfile 
                ? project.audienceProfile.name 
                : 'Configure audience for tailored content'}
            </Text>
          </VStack>
          <Button
            leftIcon={<FiUsers />}
            colorScheme={project.audienceProfile ? 'green' : 'purple'}
            variant={project.audienceProfile ? 'outline' : 'solid'}
            onClick={onOpen}
          >
            {project.audienceProfile ? 'Change Audience' : 'Configure Audience'}
          </Button>
        </HStack>
        
        {project.audienceProfile && (
          <HStack spacing={2} flexWrap="wrap">
            <Badge colorScheme="purple">{project.audienceProfile.language}</Badge>
            <Badge colorScheme="blue">{project.audienceProfile.terminology}</Badge>
            <Badge colorScheme="green">{project.audienceProfile.pace} pace</Badge>
            {project.audienceProfile.contentFilters.map((filter) => (
              <Badge key={filter} variant="outline" fontSize="xs">
                {filter}
              </Badge>
            ))}
          </HStack>
        )}
      </Box>

      {/* Conversation Mode */}
      <Box p={5} bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
        <VStack align="stretch" spacing={4}>
          <Text fontWeight="bold">Conversation Mode</Text>
          <Select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            size="lg"
          >
            {CONVERSATION_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} - {m.description}
              </option>
            ))}
          </Select>
          <Button
            leftIcon={<FiRefreshCw />}
            colorScheme="purple"
            onClick={handleGenerateScript}
            isLoading={isGenerating}
            loadingText="Generating Script..."
            size="lg"
          >
            {project.script.length === 0 ? 'Generate Script' : 'Regenerate Script'}
          </Button>
        </VStack>
      </Box>

      {/* Script Preview */}
      {project.script.length > 0 && (
        <VStack spacing={3} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="bold">
              Conversation Flow
            </Text>
            <Badge colorScheme="purple">{project.script.length} exchanges</Badge>
          </HStack>

          <VStack spacing={3} align="stretch">
            {project.script.map((turn, index) => {
              const host = project.hosts.find((h) => h.name === turn.speaker);
              const isEditing = editingTurn === turn.id;

              return (
                <Box
                  key={turn.id}
                  p={4}
                  bg={cardBg}
                  borderWidth="1px"
                  borderLeftWidth="4px"
                  borderColor={borderColor}
                  borderLeftColor="purple.400"
                  borderRadius="lg"
                >
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                      <HStack spacing={3}>
                        <Badge colorScheme="purple">#{index + 1}</Badge>
                        <Text fontWeight="bold">{turn.speaker}</Text>
                        <Badge variant="outline">{turn.emotion}</Badge>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                          ~{turn.duration}s
                        </Text>
                      </HStack>
                      <IconButton
                        aria-label="Edit turn"
                        icon={<FiEdit />}
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingTurn(isEditing ? null : turn.id)}
                      />
                    </HStack>

                    {isEditing ? (
                      <Textarea
                        value={turn.content}
                        onChange={(e) => {
                          const updated = project.script.map((t) =>
                            t.id === turn.id ? { ...t, content: e.target.value } : t
                          );
                          onUpdate({ ...project, script: updated });
                        }}
                        rows={4}
                      />
                    ) : (
                      <Text>{turn.content}</Text>
                    )}
                  </VStack>
                </Box>
              );
            })}
          </VStack>
        </VStack>
      )}

      {/* Empty State */}
      {project.script.length === 0 && !isGenerating && (
        <Box
          p={12}
          bg={cardBg}
          borderWidth="2px"
          borderColor={borderColor}
          borderRadius="xl"
          borderStyle="dashed"
          textAlign="center"
        >
          <VStack spacing={4}>
            <Icon as={FiMessageSquare} boxSize={12} color={useSemanticToken('text.tertiary')} />
            <VStack spacing={1}>
              <Text fontSize="lg" fontWeight="medium" color={useSemanticToken('text.secondary')}>
                No script generated yet
              </Text>
              <Text fontSize="sm" color={useSemanticToken('text.tertiary')}>
                Choose a conversation mode and generate your podcast script
              </Text>
            </VStack>
          </VStack>
        </Box>
      )}

      {/* Loading State */}
      {isGenerating && (
        <Box
          p={12}
          bg={cardBg}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="xl"
          textAlign="center"
        >
          <VStack spacing={4}>
            <Spinner size="xl" color="purple.500" thickness="4px" />
            <VStack spacing={1}>
              <Text fontSize="lg" fontWeight="medium">
                Generating conversation...
              </Text>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                Creating natural dialogue based on your research
              </Text>
            </VStack>
          </VStack>
        </Box>
      )}

      {/* Navigation */}
      <HStack justify="space-between">
        <Button
          leftIcon={<FiArrowLeft />}
          variant="ghost"
          onClick={onBack}
        >
          Back to Hosts
        </Button>
        <Button
          rightIcon={<FiArrowRight />}
          colorScheme="purple"
          size="lg"
          onClick={onNext}
          isDisabled={project.script.length === 0}
        >
          Generate Audio
        </Button>
      </HStack>

      {/* Audience Configuration Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Configure Target Audience</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <AudienceConfigurator
              currentProfile={project.audienceProfile}
              onSave={handleAudienceSave}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
