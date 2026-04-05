/**
 * Interactive Memory List Component
 * 
 * Cohesive memory display that aligns with dashboard patterns.
 * Focuses on viewing, navigation, and status - not destructive operations.
 */

import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Card,
  CardBody,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Checkbox,
  Tooltip,
  Icon,
  Progress,
  Collapse,
  Tag,
  TagLabel,
  TagLeftIcon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Divider,
  Link,
  IconButton
} from '@chakra-ui/react';
import {
  FiSearch,
  FiEye,
  FiExternalLink,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiTag,
  FiFolder,
  FiTrendingUp,
  FiInfo
} from 'react-icons/fi';

interface Memory {
  id: string;
  title: string;
  content: string;
  tags: string[];
  context?: string;
  workspace: string;
  created_at: string;
  updated_at: string;
  health_score: number;
  conflicts?: string[];
}

interface InteractiveMemoryListProps {
  memories: Memory[];
  loading?: boolean;
  onMemorySelect?: (memory: Memory) => void;
  selectedWorkspace?: string;
}

export const InteractiveMemoryList: React.FC<InteractiveMemoryListProps> = ({
  memories,
  loading = false,
  onMemorySelect,
  selectedWorkspace
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null);
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const [detailMemory, setDetailMemory] = useState<Memory | null>(null);

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const expandedBg = useSemanticToken('surface.base');

  const filteredMemories = memories.filter(memory =>
    memory.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memory.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleMemoryToggle = (memoryId: string) => {
    const newSelected = new Set(selectedMemories);
    if (newSelected.has(memoryId)) {
      newSelected.delete(memoryId);
    } else {
      newSelected.add(memoryId);
    }
    setSelectedMemories(newSelected);
  };

  const handleViewDetails = (memory: Memory) => {
    setDetailMemory(memory);
    onDetailOpen();
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return FiCheckCircle;
    if (score >= 60) return FiAlertTriangle;
    return FiAlertTriangle;
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Search and Selection Controls */}
      <HStack spacing={4}>
        <InputGroup flex={1}>
          <InputLeftElement>
            <Icon as={FiSearch} color={useSemanticToken('text.tertiary')} />
          </InputLeftElement>
          <Input
            placeholder="Search memories by title, content, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>
        
        {selectedMemories.size > 0 && (
          <HStack spacing={2}>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              {selectedMemories.size} selected
            </Text>
            <Button size="sm" variant="outline" onClick={() => setSelectedMemories(new Set())}>
              Clear
            </Button>
            <Tooltip label="Navigate to AI Truth Engine for bulk operations">
              <Button size="sm" colorScheme="purple" variant="outline">
                🤖 Review in AI Truth Engine
              </Button>
            </Tooltip>
          </HStack>
        )}
      </HStack>

      {/* Memory Cards */}
      <VStack spacing={3} align="stretch">
        {filteredMemories.map((memory) => (
          <Card
            key={memory.id}
            bg={cardBg}
            borderColor={selectedMemories.has(memory.id) ? 'blue.300' : borderColor}
            borderWidth="1px"
            _hover={{ borderColor: 'blue.200', shadow: 'sm' }}
            transition="all 0.2s"
          >
            <CardBody p={4}>
              <HStack spacing={4} align="start">
                {/* Selection Checkbox */}
                <Checkbox
                  isChecked={selectedMemories.has(memory.id)}
                  onChange={() => handleMemoryToggle(memory.id)}
                  colorScheme="blue"
                  mt={1}
                />

                {/* Memory Content */}
                <VStack flex={1} align="start" spacing={2}>
                  {/* Title and Health */}
                  <HStack justify="space-between" w="full">
                    <HStack spacing={3}>
                      <Text fontWeight="semibold" fontSize="md">
                        {memory.title}
                      </Text>
                      <Tooltip label={`Health Score: ${memory.health_score}%`}>
                        <HStack spacing={1}>
                          <Icon
                            as={getHealthIcon(memory.health_score)}
                            color={`${getHealthColor(memory.health_score)}.500`}
                            boxSize={4}
                          />
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                            {memory.health_score}%
                          </Text>
                        </HStack>
                      </Tooltip>
                    </HStack>

                    {/* Quick Actions */}
                    <HStack spacing={1}>
                      <Tooltip label="View Details">
                        <IconButton
                          icon={<FiEye />}
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(memory)}
                        />
                      </Tooltip>
                      <Tooltip label="Open Workspace">
                        <IconButton
                          icon={<FiExternalLink />}
                          size="sm"
                          variant="ghost"
                          onClick={() => onMemorySelect?.(memory)}
                        />
                      </Tooltip>
                    </HStack>
                  </HStack>

                  {/* Tags and Metadata */}
                  <HStack spacing={2} wrap="wrap">
                    <HStack spacing={1}>
                      <Icon as={FiFolder} boxSize={3} color={useSemanticToken('text.tertiary')} />
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                        {memory.workspace.split('/').pop()}
                      </Text>
                    </HStack>
                    <HStack spacing={1}>
                      <Icon as={FiClock} boxSize={3} color={useSemanticToken('text.tertiary')} />
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                        {new Date(memory.updated_at).toLocaleDateString()}
                      </Text>
                    </HStack>
                    {memory.tags.slice(0, 3).map((tag) => (
                      <Tag key={tag} size="sm" colorScheme="blue" variant="subtle">
                        <TagLeftIcon as={FiTag} />
                        <TagLabel>{tag}</TagLabel>
                      </Tag>
                    ))}
                    {memory.tags.length > 3 && (
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                        +{memory.tags.length - 3} more
                      </Text>
                    )}
                  </HStack>

                  {/* Conflict Indicators */}
                  {memory.conflicts && memory.conflicts.length > 0 && (
                    <HStack spacing={2}>
                      <Icon as={FiAlertTriangle} color="orange.500" boxSize={4} />
                      <Text fontSize="sm" color="orange.600">
                        {memory.conflicts.length} potential conflict(s)
                      </Text>
                      <Link
                        fontSize="sm"
                        color="purple.500"
                        href="/ide-memory-approvals"
                        textDecoration="underline"
                      >
                        Review in AI Truth Engine →
                      </Link>
                    </HStack>
                  )}

                  {/* Expandable Content Preview */}
                  <Collapse in={expandedMemory === memory.id}>
                    <Box
                      p={3}
                      bg={expandedBg}
                      borderRadius="md"
                      mt={2}
                    >
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')} mb={2}>
                        Content Preview:
                      </Text>
                      <Text fontSize="sm" noOfLines={3}>
                        {memory.content}
                      </Text>
                      {memory.context && (
                        <>
                          <Text fontSize="sm" color={useSemanticToken('text.secondary')} mt={2} mb={1}>
                            Context:
                          </Text>
                          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                            {memory.context}
                          </Text>
                        </>
                      )}
                    </Box>
                  </Collapse>

                  {/* Expand/Collapse Toggle */}
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      setExpandedMemory(expandedMemory === memory.id ? null : memory.id)
                    }
                  >
                    {expandedMemory === memory.id ? 'Show Less' : 'Show More'}
                  </Button>
                </VStack>
              </HStack>
            </CardBody>
          </Card>
        ))}
      </VStack>

      {/* Memory Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <Text>{detailMemory?.title}</Text>
              <Badge colorScheme={getHealthColor(detailMemory?.health_score || 0)}>
                {detailMemory?.health_score}% Health
              </Badge>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {detailMemory && (
              <VStack spacing={4} align="stretch">
                {/* Metadata */}
                <HStack spacing={4} wrap="wrap">
                  <HStack spacing={1}>
                    <Icon as={FiFolder} color={useSemanticToken('text.secondary')} />
                    <Text fontSize="sm">{detailMemory.workspace.split('/').pop()}</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <Icon as={FiClock} color={useSemanticToken('text.secondary')} />
                    <Text fontSize="sm">
                      Updated {new Date(detailMemory.updated_at).toLocaleDateString()}
                    </Text>
                  </HStack>
                </HStack>

                <Divider />

                {/* Tags */}
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>
                    Tags:
                  </Text>
                  <HStack spacing={2} wrap="wrap">
                    {detailMemory.tags.map((tag) => (
                      <Tag key={tag} colorScheme="blue" variant="subtle">
                        <TagLeftIcon as={FiTag} />
                        <TagLabel>{tag}</TagLabel>
                      </Tag>
                    ))}
                  </HStack>
                </Box>

                <Divider />

                {/* Content */}
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>
                    Content:
                  </Text>
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {detailMemory.content}
                  </Text>
                </Box>

                {detailMemory.context && (
                  <>
                    <Divider />
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" mb={2}>
                        Context:
                      </Text>
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                        {detailMemory.context}
                      </Text>
                    </Box>
                  </>
                )}

                {/* Actions */}
                <Divider />
                <HStack spacing={3}>
                  <Button
                    leftIcon={<FiExternalLink />}
                    size="sm"
                    colorScheme="blue"
                    variant="outline"
                    onClick={() => onMemorySelect?.(detailMemory)}
                  >
                    Open Workspace
                  </Button>
                  <Button
                    leftIcon={<FiTrendingUp />}
                    size="sm"
                    colorScheme="purple"
                    variant="outline"
                    as={Link}
                    href="/ide-memory-approvals"
                  >
                    Review in AI Truth Engine
                  </Button>
                </HStack>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default InteractiveMemoryList;
