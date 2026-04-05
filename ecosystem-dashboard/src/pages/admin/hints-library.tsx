/**
 * Admin: Hints Library Management
 * 
 * Platform admin page to manage contextual hints for child AI interactions
 * Hints are injected on-demand based on theme, age, subject, and learning context
 * Parents do NOT have access to this engineering work
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  FormHelperText,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  SimpleGrid,
  Alert,
  AlertIcon,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import { 
  FiSearch, 
  FiMoreVertical, 
  FiEdit2, 
  FiTrash2, 
  FiPlus, 
  FiRefreshCw,
  FiMessageCircle,
  FiHeart,
  FiShield,
  FiArrowRight,
  FiStar,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { withPlatformAdmin } from '@/lib/auth';

interface Hint {
  id: string;
  name: string;
  description: string | null;
  hint_type: string;
  content: string;
  target_audience: string;
  min_age: number | null;
  max_age: number | null;
  grade_level: string | null;
  theme: string | null;
  character_name: string | null;
  learning_style: string | null;
  educational_focus: string[];
  subject_area: string | null;
  difficulty_level: string;
  usage_count: number;
  effectiveness_score: number;
  tags: string[];
  is_active: boolean;
}

const HINT_TYPES = [
  { value: 'teaching', label: 'Teaching', icon: FiMessageCircle, color: 'blue' },
  { value: 'encouragement', label: 'Encouragement', icon: FiHeart, color: 'pink' },
  { value: 'celebration', label: 'Celebration', icon: FiStar, color: 'yellow' },
  { value: 'transition', label: 'Transition', icon: FiArrowRight, color: 'purple' },
  { value: 'safety', label: 'Safety', icon: FiShield, color: 'red' },
];

const THEMES = [
  { value: 'pusheen', label: 'Pusheen (Sofia)', emoji: '🐱' },
  { value: 'minecraft', label: 'Minecraft (Luca)', emoji: '⛏️' },
  { value: 'space', label: 'Space', emoji: '🚀' },
  { value: 'ocean', label: 'Ocean', emoji: '🌊' },
  { value: 'nature', label: 'Nature', emoji: '🌿' },
];

const SUBJECTS = [
  'general',
  'spanish',
  'math',
  'reading',
  'science',
  'art',
  'music',
  'social-studies',
];

const GRADE_LEVELS = [
  { value: '2nd', label: '2nd Grade (7yo - Luca)', age: 7 },
  { value: '3rd', label: '3rd Grade (8yo)', age: 8 },
  { value: '4th', label: '4th Grade (9yo - Sofia)', age: 9 },
  { value: '5th', label: '5th Grade (10yo)', age: 10 },
];

function HintsLibraryPage() {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  
  const [hints, setHints] = useState<Hint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [themeFilter, setThemeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [total, setTotal] = useState(0);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [selectedHint, setSelectedHint] = useState<Hint | null>(null);
  const [deleteHint, setDeleteHint] = useState<Hint | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hintType: 'teaching',
    content: '',
    targetAudience: 'child',
    minAge: 5,
    maxAge: 12,
    gradeLevel: '',
    theme: '',
    characterName: '',
    learningStyle: '',
    educationalFocus: [] as string[],
    subjectArea: 'general',
    difficultyLevel: 'beginner',
    tags: [] as string[],
  });

  const fetchHints = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (themeFilter) params.set('theme', themeFilter);
      if (typeFilter) params.set('hintType', typeFilter);
      if (subjectFilter) params.set('subjectArea', subjectFilter);
      
      const res = await fetch(`/api/admin/hints-library?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setHints(data.hints);
        setTotal(data.total);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch hints',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Failed to fetch hints:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch hints',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [search, themeFilter, typeFilter, subjectFilter, toast]);

  useEffect(() => {
    fetchHints();
  }, [fetchHints]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedHint(null);
    setFormData({
      name: '',
      description: '',
      hintType: 'teaching',
      content: '',
      targetAudience: 'child',
      minAge: 5,
      maxAge: 12,
      gradeLevel: '',
      theme: '',
      characterName: '',
      learningStyle: '',
      educationalFocus: [],
      subjectArea: 'general',
      difficultyLevel: 'beginner',
      tags: [],
    });
    onOpen();
  };

  const handleOpenEdit = (hint: Hint) => {
    setIsEditing(true);
    setSelectedHint(hint);
    setFormData({
      name: hint.name,
      description: hint.description || '',
      hintType: hint.hint_type,
      content: hint.content,
      targetAudience: hint.target_audience,
      minAge: hint.min_age || 5,
      maxAge: hint.max_age || 12,
      gradeLevel: hint.grade_level || '',
      theme: hint.theme || '',
      characterName: hint.character_name || '',
      learningStyle: hint.learning_style || '',
      educationalFocus: hint.educational_focus || [],
      subjectArea: hint.subject_area || 'general',
      difficultyLevel: hint.difficulty_level,
      tags: hint.tags || [],
    });
    onOpen();
  };

  const handleSave = async () => {
    try {
      const url = isEditing 
        ? `/api/admin/hints-library/${selectedHint?.id}`
        : '/api/admin/hints-library';
      
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: isEditing ? 'Hint Updated' : 'Hint Created',
          description: `${formData.name} has been ${isEditing ? 'updated' : 'created'}`,
          status: 'success',
          duration: 3000,
        });
        onClose();
        fetchHints();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save hint',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Failed to save hint:', error);
      toast({
        title: 'Error',
        description: 'Failed to save hint',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteHint) return;
    
    try {
      const res = await fetch(`/api/admin/hints-library/${deleteHint.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast({
          title: 'Hint Deleted',
          description: `${deleteHint.name} has been deleted`,
          status: 'success',
          duration: 3000,
        });
        onDeleteClose();
        setDeleteHint(null);
        fetchHints();
      } else {
        const data = await res.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete hint',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Failed to delete hint:', error);
    }
  };

  const getHintTypeInfo = (type: string) => {
    return HINT_TYPES.find(t => t.value === type) || HINT_TYPES[0];
  };

  const getThemeEmoji = (theme: string | null) => {
    const found = THEMES.find(t => t.value === theme);
    return found?.emoji || '📚';
  };

  // Calculate stats
  const pusheenHints = hints.filter(h => h.theme === 'pusheen').length;
  const minecraftHints = hints.filter(h => h.theme === 'minecraft').length;
  const avgEffectiveness = hints.length > 0 
    ? (hints.reduce((sum, h) => sum + h.effectiveness_score, 0) / hints.length * 100).toFixed(0)
    : 0;

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <Box>
              <Heading size="lg">Hints Library</Heading>
              <Text color={textSecondary}>
                Contextual hints injected on-demand based on user theme, age, and learning context
              </Text>
            </Box>
            <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={handleOpenCreate}>
              New Hint
            </Button>
          </HStack>

          {/* Stats */}
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Total Hints</StatLabel>
                <StatNumber>{total}</StatNumber>
                <StatHelpText>Active in library</StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>🐱 Pusheen Hints</StatLabel>
                <StatNumber>{pusheenHints}</StatNumber>
                <StatHelpText>For Sofia (4th grade)</StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>⛏️ Minecraft Hints</StatLabel>
                <StatNumber>{minecraftHints}</StatNumber>
                <StatHelpText>For Luca (2nd grade)</StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Avg Effectiveness</StatLabel>
                <StatNumber>{avgEffectiveness}%</StatNumber>
                <Progress value={Number(avgEffectiveness)} colorScheme="green" size="sm" mt={2} />
              </Stat>
            </GlassPanel>
          </SimpleGrid>

          {/* Info Alert */}
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Multi-Tenant Hint Injection</Text>
              <Text fontSize="sm">
                Hints are automatically injected into AI prompts based on the child's selected theme, 
                age, and current learning subject. This ensures age-appropriate and theme-consistent responses.
              </Text>
            </Box>
          </Alert>

          {/* Filters */}
          <GlassPanel variant="light" p={4}>
            <HStack spacing={4} wrap="wrap">
              <InputGroup maxW="250px">
                <InputLeftElement>
                  <FiSearch color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search hints..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>
              
              <Select 
                maxW="180px" 
                value={themeFilter} 
                onChange={(e) => setThemeFilter(e.target.value)}
              >
                <option value="">All Themes</option>
                {THEMES.map(theme => (
                  <option key={theme.value} value={theme.value}>
                    {theme.emoji} {theme.label}
                  </option>
                ))}
              </Select>
              
              <Select 
                maxW="180px" 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                {HINT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
              
              <Select 
                maxW="150px" 
                value={subjectFilter} 
                onChange={(e) => setSubjectFilter(e.target.value)}
              >
                <option value="">All Subjects</option>
                {SUBJECTS.map(subject => (
                  <option key={subject} value={subject}>
                    {subject.charAt(0).toUpperCase() + subject.slice(1)}
                  </option>
                ))}
              </Select>
              
              <IconButton
                aria-label="Refresh"
                icon={<FiRefreshCw />}
                onClick={fetchHints}
                isLoading={loading}
              />
            </HStack>
          </GlassPanel>

          {/* Hints Table */}
          <GlassPanel variant="light" p={0} overflow="hidden">
            {loading ? (
              <Box p={8} textAlign="center">
                <Spinner size="lg" />
              </Box>
            ) : (
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Hint</Th>
                    <Th>Type</Th>
                    <Th>Theme</Th>
                    <Th>Subject</Th>
                    <Th>Age Range</Th>
                    <Th>Effectiveness</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {hints.map((hint) => {
                    const typeInfo = getHintTypeInfo(hint.hint_type);
                    return (
                      <Tr key={hint.id}>
                        <Td maxW="300px">
                          <Text fontWeight="medium" noOfLines={1}>{hint.name}</Text>
                          <Text fontSize="xs" color={textSecondary} noOfLines={1}>
                            {hint.content.substring(0, 60)}...
                          </Text>
                        </Td>
                        <Td>
                          <Badge colorScheme={typeInfo.color}>
                            {typeInfo.label}
                          </Badge>
                        </Td>
                        <Td>
                          <Text>{getThemeEmoji(hint.theme)} {hint.theme || 'All'}</Text>
                        </Td>
                        <Td>
                          <Text fontSize="sm">{hint.subject_area || 'General'}</Text>
                        </Td>
                        <Td>
                          <Text fontSize="sm">
                            {hint.min_age || '?'} - {hint.max_age || '?'} yo
                          </Text>
                        </Td>
                        <Td>
                          <HStack>
                            <Progress 
                              value={hint.effectiveness_score * 100} 
                              colorScheme="green" 
                              size="sm" 
                              w="60px"
                            />
                            <Text fontSize="xs">{(hint.effectiveness_score * 100).toFixed(0)}%</Text>
                          </HStack>
                        </Td>
                        <Td>
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              icon={<FiMoreVertical />}
                              variant="ghost"
                              size="sm"
                            />
                            <MenuList>
                              <MenuItem icon={<FiEdit2 />} onClick={() => handleOpenEdit(hint)}>
                                Edit
                              </MenuItem>
                              <MenuItem 
                                icon={<FiTrash2 />} 
                                color="red.500"
                                onClick={() => {
                                  setDeleteHint(hint);
                                  onDeleteOpen();
                                }}
                              >
                                Delete
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </GlassPanel>
        </VStack>
      </Container>

      {/* Create/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {isEditing ? `Edit Hint: ${selectedHint?.name}` : 'Create New Hint'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Pusheen Encouragement - Try Again"
                  />
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Hint Type</FormLabel>
                  <Select
                    value={formData.hintType}
                    onChange={(e) => setFormData({ ...formData, hintType: e.target.value })}
                  >
                    {HINT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>
              
              <FormControl isRequired>
                <FormLabel>Content</FormLabel>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="The hint content that will be injected into the AI prompt..."
                  rows={3}
                />
                <FormHelperText>
                  Include emojis and character-appropriate language
                </FormHelperText>
              </FormControl>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Theme</FormLabel>
                  <Select
                    value={formData.theme}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                  >
                    <option value="">All Themes</option>
                    {THEMES.map(theme => (
                      <option key={theme.value} value={theme.value}>
                        {theme.emoji} {theme.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Subject Area</FormLabel>
                  <Select
                    value={formData.subjectArea}
                    onChange={(e) => setFormData({ ...formData, subjectArea: e.target.value })}
                  >
                    {SUBJECTS.map(subject => (
                      <option key={subject} value={subject}>
                        {subject.charAt(0).toUpperCase() + subject.slice(1)}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>
              
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <FormControl>
                  <FormLabel>Min Age</FormLabel>
                  <NumberInput
                    value={formData.minAge}
                    onChange={(_, val) => setFormData({ ...formData, minAge: val })}
                    min={5}
                    max={12}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Max Age</FormLabel>
                  <NumberInput
                    value={formData.maxAge}
                    onChange={(_, val) => setFormData({ ...formData, maxAge: val })}
                    min={5}
                    max={12}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Difficulty</FormLabel>
                  <Select
                    value={formData.difficultyLevel}
                    onChange={(e) => setFormData({ ...formData, difficultyLevel: e.target.value })}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                </FormControl>
              </SimpleGrid>
              
              <FormControl>
                <FormLabel>Description (Optional)</FormLabel>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of when to use this hint..."
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSave}>
              {isEditing ? 'Save Changes' : 'Create Hint'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Hint</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to delete <strong>{deleteHint?.name}</strong>?
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleDelete}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default withPlatformAdmin(HintsLibraryPage);
