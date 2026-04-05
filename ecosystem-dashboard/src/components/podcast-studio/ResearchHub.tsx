import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Badge,
  Input,
  Textarea,
  SimpleGrid,
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  IconButton,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { FiFileText, FiPlus, FiTrash2, FiArrowRight, FiLink, FiDatabase, FiUpload } from 'react-icons/fi';
import ImportFromResearchLab from './ImportFromResearchLab';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ResearchMaterial {
  id: string;
  title: string;
  content: string;
  source: string;
  wordCount: number;
}

interface PodcastProject {
  id: string;
  title: string;
  researchMaterials: ResearchMaterial[];
}

interface ResearchHubProps {
  project: PodcastProject;
  onUpdate: (project: PodcastProject) => void;
  onNext: () => void;
}

export default function ResearchHub({ project, onUpdate, onNext }: ResearchHubProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [importType, setImportType] = useState<'upload' | 'research-lab' | 'knowledge-graph'>('upload');
  const [newMaterial, setNewMaterial] = useState({ title: '', content: '' });
  const toast = useToast();

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');

  const importOptions = [
    {
      id: 'upload',
      icon: FiUpload,
      title: 'Upload Documents',
      description: 'PDF, DOCX, TXT, or paste text',
      color: 'blue',
    },
    {
      id: 'research-lab',
      icon: FiLink,
      title: 'AI Research Lab',
      description: 'Import from your research sessions',
      color: 'purple',
    },
    {
      id: 'knowledge-graph',
      icon: FiDatabase,
      title: 'Knowledge Graph',
      description: 'Query semantic knowledge base',
      color: 'green',
    },
  ];

  const handleAddMaterial = () => {
    if (!newMaterial.title || !newMaterial.content) {
      toast({
        title: 'Missing information',
        description: 'Please provide both title and content',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    const material: ResearchMaterial = {
      id: `material-${Date.now()}`,
      title: newMaterial.title,
      content: newMaterial.content,
      source: importType,
      wordCount: newMaterial.content.split(/\s+/).length,
    };

    onUpdate({
      ...project,
      researchMaterials: [...project.researchMaterials, material],
    });

    setNewMaterial({ title: '', content: '' });
    onClose();
    
    toast({
      title: 'Material added!',
      status: 'success',
      duration: 2000,
    });
  };

  const handleRemoveMaterial = (id: string) => {
    onUpdate({
      ...project,
      researchMaterials: project.researchMaterials.filter((m) => m.id !== id),
    });
  };

  const handleNext = () => {
    if (project.researchMaterials.length === 0) {
      toast({
        title: 'Add research materials',
        description: 'Add at least one source to continue',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    onNext();
  };

  const totalWords = project.researchMaterials.reduce((sum, m) => sum + m.wordCount, 0);
  const estimatedDuration = Math.ceil(totalWords / 150); // ~150 words per minute

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <VStack align="start" spacing={1}>
          <Text fontSize="2xl" fontWeight="bold">
            Import Research Materials
          </Text>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            Add sources to create your podcast from
          </Text>
        </VStack>
        {project.researchMaterials.length > 0 && (
          <VStack align="end" spacing={0}>
            <Text fontSize="sm" fontWeight="medium">
              {totalWords.toLocaleString()} words
            </Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              ~{estimatedDuration} min podcast
            </Text>
          </VStack>
        )}
      </HStack>

      {/* Import Options */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        {importOptions.map((option) => (
          <Box
            key={option.id}
            p={6}
            bg={cardBg}
            borderWidth="2px"
            borderColor={borderColor}
            borderRadius="xl"
            cursor="pointer"
            transition="all 0.2s"
            _hover={{
              borderColor: `${option.color}.400`,
              transform: 'translateY(-2px)',
              boxShadow: 'lg',
            }}
            onClick={() => {
              setImportType(option.id as any);
              onOpen();
            }}
          >
            <VStack spacing={4} align="center">
              <Box
                bg={`${option.color}.100`}
                p={4}
                borderRadius="full"
              >
                <Icon as={option.icon} boxSize={8} color={`${option.color}.500`} />
              </Box>
              <VStack spacing={1} align="center">
                <Text fontWeight="bold" fontSize="lg">
                  {option.title}
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')} textAlign="center">
                  {option.description}
                </Text>
              </VStack>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>

      {/* Research Materials List */}
      {project.researchMaterials.length > 0 && (
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="bold">
              Added Materials ({project.researchMaterials.length})
            </Text>
            <Button
              leftIcon={<FiPlus />}
              size="sm"
              colorScheme="purple"
              variant="ghost"
              onClick={onOpen}
            >
              Add More
            </Button>
          </HStack>

          <VStack spacing={3} align="stretch">
            {project.researchMaterials.map((material) => (
              <Box
                key={material.id}
                p={4}
                bg={cardBg}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="lg"
                _hover={{ bg: hoverBg }}
                transition="all 0.2s"
              >
                <HStack justify="space-between" align="start">
                  <HStack spacing={3} flex={1}>
                    <Icon as={FiFileText} boxSize={5} color="blue.500" />
                    <VStack align="start" spacing={1} flex={1}>
                      <Text fontWeight="medium">{material.title}</Text>
                      <HStack spacing={4}>
                        <Badge colorScheme="blue" fontSize="xs">
                          {material.source}
                        </Badge>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                          {material.wordCount.toLocaleString()} words
                        </Text>
                      </HStack>
                    </VStack>
                  </HStack>
                  <IconButton
                    aria-label="Remove material"
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleRemoveMaterial(material.id)}
                  />
                </HStack>
              </Box>
            ))}
          </VStack>
        </VStack>
      )}

      {/* Empty State */}
      {project.researchMaterials.length === 0 && (
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
            <Icon as={FiFileText} boxSize={12} color={useSemanticToken('text.tertiary')} />
            <VStack spacing={1}>
              <Text fontSize="lg" fontWeight="medium" color={useSemanticToken('text.secondary')}>
                No research materials yet
              </Text>
              <Text fontSize="sm" color={useSemanticToken('text.tertiary')}>
                Add sources to start creating your podcast
              </Text>
            </VStack>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="purple"
              onClick={onOpen}
            >
              Add Research Material
            </Button>
          </VStack>
        </Box>
      )}

      {/* Next Button */}
      <HStack justify="flex-end">
        <Button
          rightIcon={<FiArrowRight />}
          colorScheme="purple"
          size="lg"
          onClick={handleNext}
          isDisabled={project.researchMaterials.length === 0}
        >
          Configure Hosts
        </Button>
      </HStack>

      {/* Add Material Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {importType === 'research-lab' ? 'Import from AI Research Lab' : 'Add Research Material'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {importType === 'research-lab' ? (
              <ImportFromResearchLab
                projectId={project.id}
                onImportComplete={() => {
                  onClose();
                  toast({
                    title: 'Materials added successfully',
                    description: 'Research imported from AI Research Lab',
                    status: 'success',
                    duration: 3000,
                  });
                }}
              />
            ) : (
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Title</FormLabel>
                  <Input
                    placeholder="e.g., Tokyo Weather Analysis"
                    value={newMaterial.title}
                    onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Content</FormLabel>
                  <Textarea
                    placeholder="Paste your research content here..."
                    rows={12}
                    value={newMaterial.content}
                    onChange={(e) => setNewMaterial({ ...newMaterial, content: e.target.value })}
                  />
                  {newMaterial.content && (
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                      {newMaterial.content.split(/\s+/).length} words
                    </Text>
                  )}
                </FormControl>

                <Button colorScheme="purple" onClick={handleAddMaterial}>
                  Add Material
                </Button>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
