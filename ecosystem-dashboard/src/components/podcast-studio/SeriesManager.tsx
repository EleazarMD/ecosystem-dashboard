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
  Input,
  Textarea,
  FormControl,
  FormLabel,
  useToast,
  Select,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
} from '@chakra-ui/react';
import { FiFolder, FiPlus, FiMoreVertical, FiEdit2, FiTrash2, FiPlay } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PodcastSeries {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  status: 'active' | 'paused' | 'completed' | 'archived';
  total_episodes: number;
  total_seasons: number;
  default_config?: any;
  created_at: Date;
}

export default function SeriesManager() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [series, setSeries] = useState<PodcastSeries[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesDescription, setNewSeriesDescription] = useState('');
  const [newSeriesCategory, setNewSeriesCategory] = useState('educational');
  const [newSeriesTags, setNewSeriesTags] = useState('');

  const toast = useToast();
  const cardBg = useSemanticToken('surface.elevated');
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.default');

  useEffect(() => {
    loadSeries();
  }, []);

  const loadSeries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/podcast-studio/series');
      if (response.ok) {
        const data = await response.json();
        setSeries(data);
      }
    } catch (error) {
      console.error('Failed to load series:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSeries = async () => {
    if (!newSeriesName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a series name',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    try {
      const response = await fetch('/api/podcast-studio/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSeriesName,
          description: newSeriesDescription,
          category: newSeriesCategory,
          tags: newSeriesTags.split(',').map(t => t.trim()).filter(Boolean),
          status: 'active',
        }),
      });

      if (response.ok) {
        await loadSeries();
        onClose();
        
        // Reset form
        setNewSeriesName('');
        setNewSeriesDescription('');
        setNewSeriesCategory('educational');
        setNewSeriesTags('');

        toast({
          title: 'Series created',
          description: `"${newSeriesName}" is ready for episodes`,
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to create series:', error);
      toast({
        title: 'Creation failed',
        description: 'Could not create series',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'paused': return 'yellow';
      case 'completed': return 'blue';
      case 'archived': return 'gray';
      default: return 'gray';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'educational': return '📚';
      case 'news': return '📰';
      case 'interview': return '🎙️';
      case 'storytelling': return '📖';
      case 'technology': return '💻';
      default: return '🎧';
    }
  };

  return (
    <>
      {/* Series Grid */}
      <Box>
        <HStack justify="space-between" mb={4}>
          <HStack spacing={2}>
            <FiFolder />
            <Text fontSize="16px" fontWeight="600" color={textColor}>
              My Series
            </Text>
            <Badge colorScheme="purple">{series.length}</Badge>
          </HStack>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="green"
            size="sm"
            onClick={onOpen}
          >
            New Series
          </Button>
        </HStack>

        {series.length === 0 ? (
          <Box
            p={8}
            textAlign="center"
            bg={cardBg}
            borderRadius="lg"
            borderWidth="2px"
            borderStyle="dashed"
            borderColor={borderColor}
          >
            <Text fontSize="40px" mb={2}>📁</Text>
            <Text fontSize="14px" fontWeight="600" mb={2} color={textColor}>
              No series yet
            </Text>
            <Text fontSize="12px" color={mutedColor} mb={4}>
              Organize your podcasts into series for better management
            </Text>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="green"
              size="sm"
              onClick={onOpen}
            >
              Create Your First Series
            </Button>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {series.map((s) => (
              <Box
                key={s.id}
                p={4}
                bg={cardBg}
                borderRadius="lg"
                borderWidth="2px"
                borderColor={useSemanticToken('border.default')}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  borderColor: 'green.400',
                  bg: hoverBg,
                  transform: 'translateY(-2px)',
                  boxShadow: 'md',
                }}
              >
                <VStack align="start" spacing={3}>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="32px">
                      {getCategoryIcon(s.category || 'educational')}
                    </Text>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <MenuList fontSize="12px">
                        <MenuItem icon={<FiEdit2 />}>Edit Series</MenuItem>
                        <MenuItem icon={<FiPlay />}>Create Episode</MenuItem>
                        <MenuItem icon={<FiTrash2 />} color="red.500">
                          Delete Series
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>

                  <Box w="full">
                    <Text fontSize="14px" fontWeight="600" mb={1} color={textColor}>
                      {s.name}
                    </Text>
                    <Text fontSize="11px" color={mutedColor} noOfLines={2}>
                      {s.description || 'No description'}
                    </Text>
                  </Box>

                  <HStack spacing={2} flexWrap="wrap">
                    {s.tags?.map((tag) => (
                      <Badge key={tag} fontSize="9px" colorScheme="blue">
                        {tag}
                      </Badge>
                    ))}
                  </HStack>

                  <Divider />

                  <HStack justify="space-between" w="full" fontSize="11px">
                    <VStack align="start" spacing={0}>
                      <Text color={mutedColor}>Episodes</Text>
                      <Text fontWeight="600" color={textColor}>{s.total_episodes}</Text>
                    </VStack>
                    <VStack align="start" spacing={0}>
                      <Text color={mutedColor}>Seasons</Text>
                      <Text fontWeight="600" color={textColor}>{s.total_seasons || 'None'}</Text>
                    </VStack>
                    <Badge colorScheme={getStatusColor(s.status)} fontSize="10px">
                      {s.status}
                    </Badge>
                  </HStack>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>

      {/* Create Series Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>📁 Create New Series</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="12px">Series Name</FormLabel>
                <Input
                  placeholder="e.g., Medical AI Insights"
                  value={newSeriesName}
                  onChange={(e) => setNewSeriesName(e.target.value)}
                  size="sm"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="12px">Description</FormLabel>
                <Textarea
                  placeholder="Brief description of your podcast series..."
                  value={newSeriesDescription}
                  onChange={(e) => setNewSeriesDescription(e.target.value)}
                  size="sm"
                  rows={3}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="12px">Category</FormLabel>
                <Select
                  value={newSeriesCategory}
                  onChange={(e) => setNewSeriesCategory(e.target.value)}
                  size="sm"
                >
                  <option value="educational">📚 Educational</option>
                  <option value="news">📰 News</option>
                  <option value="interview">🎙️ Interview</option>
                  <option value="storytelling">📖 Storytelling</option>
                  <option value="technology">💻 Technology</option>
                  <option value="health">🏥 Health & Medicine</option>
                  <option value="business">💼 Business</option>
                  <option value="entertainment">🎬 Entertainment</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="12px">Tags (comma-separated)</FormLabel>
                <Input
                  placeholder="AI, healthcare, technology"
                  value={newSeriesTags}
                  onChange={(e) => setNewSeriesTags(e.target.value)}
                  size="sm"
                />
              </FormControl>

              <Box
                p={3}
                bg={cardBg}
                border="1px solid"
                borderColor="blue.500"
                borderRadius="md"
                fontSize="11px"
              >
                <Text fontWeight="600" mb={1}>💡 Series Benefits</Text>
                <Text color={mutedColor}>
                  • Group related episodes together<br />
                  • Set default presets for consistency<br />
                  • Track series progress and analytics<br />
                  • Organize by seasons (optional)
                </Text>
              </Box>

              <HStack justify="flex-end" spacing={2}>
                <Button size="sm" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  colorScheme="green"
                  leftIcon={<FiPlus />}
                  onClick={handleCreateSeries}
                >
                  Create Series
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
