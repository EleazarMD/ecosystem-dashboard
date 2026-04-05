/**
 * Admin: Goose Recipes Management
 * 
 * Platform admin page to manage child-safe AI character recipes
 * Configure age-appropriate content, themes, and educational focus
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
  Switch,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Image,
  Tooltip,
  Alert,
  AlertIcon,
  Divider,
} from '@chakra-ui/react';
import { 
  FiSearch, 
  FiMoreVertical, 
  FiEdit2, 
  FiTrash2, 
  FiPlus, 
  FiRefreshCw,
  FiEye,
  FiCopy,
  FiBookOpen,
  FiUser,
  FiCalendar,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { withPlatformAdmin } from '@/lib/auth';

interface GooseRecipe {
  id: string;
  name: string;
  description: string | null;
  category: string;
  instructions: string;
  system_prompt: string | null;
  parameters: Record<string, any>;
  tags: string[];
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  target_audience: string;
  min_age: number | null;
  max_age: number | null;
  character_name: string | null;
  character_emoji: string | null;
  character_personality: string | null;
  is_seasonal: boolean;
  season_start: string | null;
  season_end: string | null;
  educational_focus: string[];
  theme: string | null;
  icon_path: string | null;
}

const GRADE_LEVELS = [
  { grade: 'K', age: 5, label: 'Kindergarten (5yo)' },
  { grade: '1st', age: 6, label: '1st Grade (6yo)' },
  { grade: '2nd', age: 7, label: '2nd Grade (7yo) - Luca' },
  { grade: '3rd', age: 8, label: '3rd Grade (8yo)' },
  { grade: '4th', age: 9, label: '4th Grade (9yo) - Sofia' },
  { grade: '5th', age: 10, label: '5th Grade (10yo)' },
  { grade: '6th', age: 11, label: '6th Grade (11yo)' },
];

const THEMES = [
  { value: 'pusheen', label: 'Pusheen', emoji: '🐱' },
  { value: 'minecraft', label: 'Minecraft', emoji: '⛏️' },
  { value: 'space', label: 'Space', emoji: '🚀' },
  { value: 'ocean', label: 'Ocean', emoji: '🌊' },
  { value: 'nature', label: 'Nature', emoji: '🌿' },
  { value: 'fantasy', label: 'Fantasy', emoji: '🧙' },
  { value: 'science', label: 'Science', emoji: '🔬' },
  { value: 'gaming', label: 'Gaming', emoji: '🎮' },
];

const EDUCATIONAL_FOCUSES = [
  'Reading',
  'Writing',
  'Math',
  'Science',
  'Art',
  'Music',
  'Social Skills',
  'Critical Thinking',
  'Creativity',
  'Language Learning',
  'History',
  'Geography',
];

function GooseRecipesPage() {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  
  const [recipes, setRecipes] = useState<GooseRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [themeFilter, setThemeFilter] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('child');
  const [total, setTotal] = useState(0);
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [selectedRecipe, setSelectedRecipe] = useState<GooseRecipe | null>(null);
  const [deleteRecipe, setDeleteRecipe] = useState<GooseRecipe | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'character',
    instructions: '',
    systemPrompt: '',
    parameters: { temperature: 0.7, max_tokens: 500 },
    tags: [] as string[],
    isPublic: false,
    targetAudience: 'child',
    minAge: 5,
    maxAge: 12,
    characterName: '',
    characterEmoji: '',
    characterPersonality: '',
    isSeasonal: false,
    seasonStart: '',
    seasonEnd: '',
    educationalFocus: [] as string[],
    theme: '',
    iconPath: '',
  });

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (themeFilter) params.set('theme', themeFilter);
      if (audienceFilter) params.set('targetAudience', audienceFilter);
      
      const res = await fetch(`/api/admin/goose-recipes?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setRecipes(data.recipes);
        setTotal(data.total);
        setAvailableThemes(data.themes || []);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch recipes',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch recipes',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [search, themeFilter, audienceFilter, toast]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedRecipe(null);
    setFormData({
      name: '',
      description: '',
      category: 'character',
      instructions: '',
      systemPrompt: '',
      parameters: { temperature: 0.7, max_tokens: 500 },
      tags: [],
      isPublic: false,
      targetAudience: 'child',
      minAge: 5,
      maxAge: 12,
      characterName: '',
      characterEmoji: '',
      characterPersonality: '',
      isSeasonal: false,
      seasonStart: '',
      seasonEnd: '',
      educationalFocus: [],
      theme: '',
      iconPath: '',
    });
    onOpen();
  };

  const handleOpenEdit = (recipe: GooseRecipe) => {
    setIsEditing(true);
    setSelectedRecipe(recipe);
    setFormData({
      name: recipe.name,
      description: recipe.description || '',
      category: recipe.category,
      instructions: recipe.instructions,
      systemPrompt: recipe.system_prompt || '',
      parameters: recipe.parameters || { temperature: 0.7, max_tokens: 500 },
      tags: recipe.tags || [],
      isPublic: recipe.is_public,
      targetAudience: recipe.target_audience,
      minAge: recipe.min_age || 5,
      maxAge: recipe.max_age || 12,
      characterName: recipe.character_name || '',
      characterEmoji: recipe.character_emoji || '',
      characterPersonality: recipe.character_personality || '',
      isSeasonal: recipe.is_seasonal,
      seasonStart: recipe.season_start || '',
      seasonEnd: recipe.season_end || '',
      educationalFocus: recipe.educational_focus || [],
      theme: recipe.theme || '',
      iconPath: recipe.icon_path || '',
    });
    onOpen();
  };

  const handleSave = async () => {
    try {
      const url = isEditing 
        ? `/api/admin/goose-recipes/${selectedRecipe?.id}`
        : '/api/admin/goose-recipes';
      
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: isEditing ? 'Recipe Updated' : 'Recipe Created',
          description: `${formData.name} has been ${isEditing ? 'updated' : 'created'}`,
          status: 'success',
          duration: 3000,
        });
        onClose();
        fetchRecipes();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save recipe',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Failed to save recipe:', error);
      toast({
        title: 'Error',
        description: 'Failed to save recipe',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteRecipe) return;
    
    try {
      const res = await fetch(`/api/admin/goose-recipes/${deleteRecipe.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast({
          title: 'Recipe Deleted',
          description: `${deleteRecipe.name} has been deleted`,
          status: 'success',
          duration: 3000,
        });
        onDeleteClose();
        setDeleteRecipe(null);
        fetchRecipes();
      } else {
        const data = await res.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete recipe',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete recipe',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const getGradeLabel = (minAge: number | null, maxAge: number | null) => {
    if (!minAge && !maxAge) return 'All ages';
    const grades = GRADE_LEVELS.filter(g => {
      if (minAge && maxAge) return g.age >= minAge && g.age <= maxAge;
      if (minAge) return g.age >= minAge;
      if (maxAge) return g.age <= maxAge;
      return true;
    });
    if (grades.length === 0) return `${minAge || '?'}-${maxAge || '?'} years`;
    if (grades.length === 1) return grades[0].label;
    return `${grades[0].grade} - ${grades[grades.length - 1].grade} Grade`;
  };

  const getThemeEmoji = (theme: string | null) => {
    const found = THEMES.find(t => t.value === theme);
    return found?.emoji || '📚';
  };

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <Box>
              <Heading size="lg">Goose Recipes Management</Heading>
              <Text color={textSecondary}>
                Configure age-appropriate AI characters and learning experiences for children
              </Text>
            </Box>
            <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={handleOpenCreate}>
              New Recipe
            </Button>
          </HStack>

          {/* Info Alert */}
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Platform Engineering Only</Text>
              <Text fontSize="sm">
                These recipes define AI character behaviors for child accounts. 
                Parents do not have access to modify these settings.
                Ensure content is appropriate for the target age group.
              </Text>
            </Box>
          </Alert>

          {/* Filters */}
          <GlassPanel variant="light" p={4}>
            <HStack spacing={4} wrap="wrap">
              <InputGroup maxW="300px">
                <InputLeftElement>
                  <FiSearch color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search recipes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>
              
              <Select 
                maxW="200px" 
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
                maxW="200px" 
                value={audienceFilter} 
                onChange={(e) => setAudienceFilter(e.target.value)}
              >
                <option value="">All Audiences</option>
                <option value="child">Child</option>
                <option value="all">General</option>
              </Select>
              
              <IconButton
                aria-label="Refresh"
                icon={<FiRefreshCw />}
                onClick={fetchRecipes}
                isLoading={loading}
              />
              
              <Text color={textSecondary} fontSize="sm">
                {total} recipes found
              </Text>
            </HStack>
          </GlassPanel>

          {/* Recipes Table */}
          <GlassPanel variant="light" p={0} overflow="hidden">
            {loading ? (
              <Box p={8} textAlign="center">
                <Spinner size="lg" />
              </Box>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Character</Th>
                    <Th>Theme</Th>
                    <Th>Age Range</Th>
                    <Th>Educational Focus</Th>
                    <Th>Usage</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {recipes.map((recipe) => (
                    <Tr key={recipe.id}>
                      <Td>
                        <HStack>
                          {recipe.icon_path ? (
                            <Image 
                              src={recipe.icon_path} 
                              alt={recipe.character_name || recipe.name}
                              boxSize="40px"
                              borderRadius="full"
                              objectFit="cover"
                            />
                          ) : (
                            <Box 
                              boxSize="40px" 
                              borderRadius="full" 
                              bg="gray.100" 
                              display="flex" 
                              alignItems="center" 
                              justifyContent="center"
                              fontSize="xl"
                            >
                              {recipe.character_emoji || '🤖'}
                            </Box>
                          )}
                          <Box>
                            <Text fontWeight="medium">{recipe.character_name || recipe.name}</Text>
                            <Text fontSize="xs" color={textSecondary}>{recipe.name}</Text>
                          </Box>
                        </HStack>
                      </Td>
                      <Td>
                        <Badge colorScheme={recipe.theme === 'pusheen' ? 'pink' : recipe.theme === 'minecraft' ? 'green' : 'blue'}>
                          {getThemeEmoji(recipe.theme)} {recipe.theme || 'General'}
                        </Badge>
                      </Td>
                      <Td>
                        <Text fontSize="sm">{getGradeLabel(recipe.min_age, recipe.max_age)}</Text>
                      </Td>
                      <Td>
                        <HStack wrap="wrap" gap={1}>
                          {(recipe.educational_focus || []).slice(0, 3).map((focus, i) => (
                            <Badge key={i} size="sm" variant="subtle" colorScheme="purple">
                              {focus}
                            </Badge>
                          ))}
                          {(recipe.educational_focus || []).length > 3 && (
                            <Badge size="sm" variant="subtle">
                              +{recipe.educational_focus.length - 3}
                            </Badge>
                          )}
                        </HStack>
                      </Td>
                      <Td>
                        <Text fontSize="sm">{recipe.usage_count} uses</Text>
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
                            <MenuItem icon={<FiEdit2 />} onClick={() => handleOpenEdit(recipe)}>
                              Edit Recipe
                            </MenuItem>
                            <MenuItem icon={<FiEye />} onClick={() => handleOpenEdit(recipe)}>
                              View Details
                            </MenuItem>
                            <MenuItem icon={<FiCopy />}>
                              Duplicate
                            </MenuItem>
                            <MenuItem 
                              icon={<FiTrash2 />} 
                              color="red.500"
                              onClick={() => {
                                setDeleteRecipe(recipe);
                                onDeleteOpen();
                              }}
                            >
                              Delete
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </GlassPanel>
        </VStack>
      </Container>

      {/* Create/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent maxH="90vh">
          <ModalHeader>
            {isEditing ? `Edit Recipe: ${selectedRecipe?.name}` : 'Create New Recipe'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs>
              <TabList>
                <Tab><FiUser /> &nbsp; Character</Tab>
                <Tab><FiBookOpen /> &nbsp; Instructions</Tab>
                <Tab><FiCalendar /> &nbsp; Targeting</Tab>
              </TabList>

              <TabPanels>
                {/* Character Tab */}
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>Recipe Name</FormLabel>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Pusheen - Sweet Explorer"
                        />
                      </FormControl>
                      
                      <FormControl>
                        <FormLabel>Character Name</FormLabel>
                        <Input
                          value={formData.characterName}
                          onChange={(e) => setFormData({ ...formData, characterName: e.target.value })}
                          placeholder="e.g., Pusheen"
                        />
                      </FormControl>
                      
                      <FormControl>
                        <FormLabel>Character Emoji</FormLabel>
                        <Input
                          value={formData.characterEmoji}
                          onChange={(e) => setFormData({ ...formData, characterEmoji: e.target.value })}
                          placeholder="e.g., 🐱"
                          maxW="100px"
                        />
                      </FormControl>
                      
                      <FormControl>
                        <FormLabel>Theme</FormLabel>
                        <Select
                          value={formData.theme}
                          onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                        >
                          <option value="">Select theme...</option>
                          {THEMES.map(theme => (
                            <option key={theme.value} value={theme.value}>
                              {theme.emoji} {theme.label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                    </SimpleGrid>
                    
                    <FormControl>
                      <FormLabel>Icon Path</FormLabel>
                      <Input
                        value={formData.iconPath}
                        onChange={(e) => setFormData({ ...formData, iconPath: e.target.value })}
                        placeholder="/themes/pusheen/Widgets/pusheen-cat-drawing.png"
                      />
                      <FormHelperText>Path to character avatar image</FormHelperText>
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Description</FormLabel>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description of this character recipe..."
                        rows={2}
                      />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Character Personality</FormLabel>
                      <Textarea
                        value={formData.characterPersonality}
                        onChange={(e) => setFormData({ ...formData, characterPersonality: e.target.value })}
                        placeholder="Describe the character's personality traits, speaking style, and mannerisms..."
                        rows={4}
                      />
                      <FormHelperText>
                        This defines how the AI character behaves and speaks
                      </FormHelperText>
                    </FormControl>
                  </VStack>
                </TabPanel>

                {/* Instructions Tab */}
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <Alert status="warning" borderRadius="md">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold">Age-Appropriate Content Guidelines</Text>
                        <Text fontSize="sm">
                          • <strong>2nd Grade (7yo - Luca):</strong> Simple sentences, basic vocabulary, lots of encouragement, visual descriptions
                          <br />
                          • <strong>4th Grade (9yo - Sofia):</strong> More complex ideas, can handle multi-step instructions, enjoys challenges
                        </Text>
                      </Box>
                    </Alert>
                    
                    <FormControl isRequired>
                      <FormLabel>Instructions (Prompt Template)</FormLabel>
                      <Textarea
                        value={formData.instructions}
                        onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                        placeholder="# Character Name - Title

You are [Character], a friendly [description]...

## Your Personality
- Trait 1
- Trait 2

## Teaching Approach
1. Step 1
2. Step 2

## Response Style
- Keep responses SHORT (2-4 sentences for younger kids)
- Use appropriate emojis
- Ask follow-up questions

## Safety Rules
- Never discuss inappropriate topics
- Redirect gently to safe topics"
                        rows={15}
                        fontFamily="mono"
                        fontSize="sm"
                      />
                      <FormHelperText>
                        Main prompt template that defines character behavior. Use markdown formatting.
                      </FormHelperText>
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>System Prompt (Optional Override)</FormLabel>
                      <Textarea
                        value={formData.systemPrompt}
                        onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                        placeholder="Optional system-level instructions..."
                        rows={4}
                        fontFamily="mono"
                        fontSize="sm"
                      />
                    </FormControl>
                    
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel>Temperature</FormLabel>
                        <NumberInput
                          value={formData.parameters.temperature}
                          onChange={(_, val) => setFormData({ 
                            ...formData, 
                            parameters: { ...formData.parameters, temperature: val } 
                          })}
                          min={0}
                          max={2}
                          step={0.1}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                        <FormHelperText>Lower = more focused, Higher = more creative</FormHelperText>
                      </FormControl>
                      
                      <FormControl>
                        <FormLabel>Max Tokens</FormLabel>
                        <NumberInput
                          value={formData.parameters.max_tokens}
                          onChange={(_, val) => setFormData({ 
                            ...formData, 
                            parameters: { ...formData.parameters, max_tokens: val } 
                          })}
                          min={50}
                          max={2000}
                          step={50}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                        <FormHelperText>Shorter for younger kids (200-300)</FormHelperText>
                      </FormControl>
                    </SimpleGrid>
                  </VStack>
                </TabPanel>

                {/* Targeting Tab */}
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel>Target Audience</FormLabel>
                        <Select
                          value={formData.targetAudience}
                          onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                        >
                          <option value="child">Child</option>
                          <option value="all">All Ages</option>
                        </Select>
                      </FormControl>
                      
                      <FormControl>
                        <FormLabel>Category</FormLabel>
                        <Select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                          <option value="character">Character</option>
                          <option value="educational">Educational</option>
                          <option value="creative">Creative</option>
                          <option value="game">Game</option>
                        </Select>
                      </FormControl>
                    </SimpleGrid>
                    
                    <Divider />
                    <Heading size="sm">Age Range</Heading>
                    
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel>Minimum Age</FormLabel>
                        <Select
                          value={formData.minAge}
                          onChange={(e) => setFormData({ ...formData, minAge: parseInt(e.target.value) })}
                        >
                          {GRADE_LEVELS.map(grade => (
                            <option key={grade.age} value={grade.age}>
                              {grade.label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <FormControl>
                        <FormLabel>Maximum Age</FormLabel>
                        <Select
                          value={formData.maxAge}
                          onChange={(e) => setFormData({ ...formData, maxAge: parseInt(e.target.value) })}
                        >
                          {GRADE_LEVELS.map(grade => (
                            <option key={grade.age} value={grade.age}>
                              {grade.label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                    </SimpleGrid>
                    
                    <Divider />
                    <Heading size="sm">Educational Focus</Heading>
                    
                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
                      {EDUCATIONAL_FOCUSES.map(focus => (
                        <FormControl key={focus} display="flex" alignItems="center">
                          <Switch
                            isChecked={formData.educationalFocus.includes(focus)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ 
                                  ...formData, 
                                  educationalFocus: [...formData.educationalFocus, focus] 
                                });
                              } else {
                                setFormData({ 
                                  ...formData, 
                                  educationalFocus: formData.educationalFocus.filter(f => f !== focus) 
                                });
                              }
                            }}
                            mr={2}
                          />
                          <FormLabel mb={0} fontSize="sm">{focus}</FormLabel>
                        </FormControl>
                      ))}
                    </SimpleGrid>
                    
                    <Divider />
                    <Heading size="sm">Seasonal Settings</Heading>
                    
                    <FormControl display="flex" alignItems="center">
                      <Switch
                        isChecked={formData.isSeasonal}
                        onChange={(e) => setFormData({ ...formData, isSeasonal: e.target.checked })}
                        mr={2}
                      />
                      <FormLabel mb={0}>Seasonal Character</FormLabel>
                    </FormControl>
                    
                    {formData.isSeasonal && (
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <FormControl>
                          <FormLabel>Season Start</FormLabel>
                          <Input
                            type="date"
                            value={formData.seasonStart}
                            onChange={(e) => setFormData({ ...formData, seasonStart: e.target.value })}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Season End</FormLabel>
                          <Input
                            type="date"
                            value={formData.seasonEnd}
                            onChange={(e) => setFormData({ ...formData, seasonEnd: e.target.value })}
                          />
                        </FormControl>
                      </SimpleGrid>
                    )}
                    
                    <Divider />
                    
                    <FormControl display="flex" alignItems="center">
                      <Switch
                        isChecked={formData.isPublic}
                        onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                        mr={2}
                      />
                      <FormLabel mb={0}>Public Recipe (visible to all tenants)</FormLabel>
                    </FormControl>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSave}>
              {isEditing ? 'Save Changes' : 'Create Recipe'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Recipe</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to delete <strong>{deleteRecipe?.name}</strong>?
              This action cannot be undone.
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

export default withPlatformAdmin(GooseRecipesPage);
