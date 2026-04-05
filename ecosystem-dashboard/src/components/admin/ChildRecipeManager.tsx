/**
 * Child Recipe Manager Component
 * 
 * Admin UI for managing GooseMind recipe assignments for children.
 * Parents can assign educational and character-based recipes.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  SimpleGrid,
  Badge,
  Button,
  IconButton,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Tooltip,
  Divider,
  Avatar,
  Tag,
  TagLabel,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiTrash2,
  FiStar,
  FiCalendar,
  FiBook,
  FiHeart,
  FiZap,
  FiRefreshCw,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface ChildRecipe {
  id: string;
  name: string;
  description: string;
  category: string;
  characterName?: string;
  characterEmoji?: string;
  characterPersonality?: string;
  isSeasonal: boolean;
  seasonStart?: string;
  seasonEnd?: string;
  educationalFocus: string[];
  minAge?: number;
  maxAge?: number;
}

interface RecipeAssignment {
  id: string;
  recipeId: string;
  isActive: boolean;
  isDefault: boolean;
  priority: number;
  validFrom?: string;
  validUntil?: string;
  timesUsed: number;
  lastUsedAt?: string;
  recipe?: ChildRecipe;
}

interface ChildRecipeManagerProps {
  childId: string;
  childName: string;
  childAge: number;
  onUpdate?: () => void;
}

export function ChildRecipeManager({
  childId,
  childName,
  childAge,
  onUpdate,
}: ChildRecipeManagerProps) {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [availableRecipes, setAvailableRecipes] = useState<ChildRecipe[]>([]);
  const [assignments, setAssignments] = useState<RecipeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<ChildRecipe | null>(null);
  const [assignAsDefault, setAssignAsDefault] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [childId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recipesRes, assignmentsRes] = await Promise.all([
        fetch(`/api/child/learning/recipes?type=available&age=${childAge}&includeSeasonal=true`),
        fetch(`/api/child/learning/recipes?type=assigned&childId=${childId}`),
      ]);

      if (recipesRes.ok) {
        const data = await recipesRes.json();
        setAvailableRecipes(data.recipes || []);
      }

      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      toast({ title: 'Failed to load recipes', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRecipe = async () => {
    if (!selectedRecipe) return;

    setAssigning(true);
    try {
      const res = await fetch('/api/child/learning/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          recipeId: selectedRecipe.id,
          isDefault: assignAsDefault,
          priority: assignAsDefault ? 100 : 50,
          reason: `Assigned by parent for ${childName}`,
        }),
      });

      if (res.ok) {
        toast({
          title: `${selectedRecipe.characterEmoji || '✨'} Recipe assigned!`,
          description: `${selectedRecipe.name} is now available for ${childName}`,
          status: 'success',
        });
        onClose();
        fetchData();
        onUpdate?.();
      } else {
        throw new Error('Failed to assign recipe');
      }
    } catch (error) {
      toast({ title: 'Failed to assign recipe', status: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (recipeId: string) => {
    try {
      const res = await fetch(
        `/api/child/learning/recipes?childId=${childId}&recipeId=${recipeId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        toast({ title: 'Recipe removed', status: 'info' });
        fetchData();
        onUpdate?.();
      }
    } catch (error) {
      toast({ title: 'Failed to remove recipe', status: 'error' });
    }
  };

  const handleSetDefault = async (assignment: RecipeAssignment) => {
    try {
      const res = await fetch('/api/child/learning/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          recipeId: assignment.recipeId,
          isDefault: true,
          priority: 100,
        }),
      });

      if (res.ok) {
        toast({ title: 'Default recipe updated', status: 'success' });
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Failed to update default', status: 'error' });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'child-education':
        return <FiBook />;
      case 'child-creativity':
        return <FiHeart />;
      case 'child-seasonal':
        return <FiCalendar />;
      default:
        return <FiZap />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'child-education':
        return 'blue';
      case 'child-creativity':
        return 'purple';
      case 'child-seasonal':
        return 'red';
      default:
        return 'gray';
    }
  };

  const isRecipeAssigned = (recipeId: string) => {
    return assignments.some(a => a.recipeId === recipeId && a.isActive);
  };

  const filteredRecipes = availableRecipes.filter(r => {
    if (categoryFilter === 'all') return true;
    return r.category === categoryFilter;
  });

  const assignedRecipes = assignments.filter(a => a.isActive);
  const defaultRecipe = assignedRecipes.find(a => a.isDefault);

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={2}>Loading recipes...</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Current Assignments */}
      <GlassPanel variant="light" p={5}>
        <HStack justify="space-between" mb={4}>
          <Heading size="md">
            🎭 {childName}'s GooseMind Characters
          </Heading>
          <HStack>
            <IconButton
              icon={<FiRefreshCw />}
              aria-label="Refresh"
              size="sm"
              variant="ghost"
              onClick={fetchData}
            />
            <Button
              leftIcon={<FiPlus />}
              colorScheme="blue"
              size="sm"
              onClick={onOpen}
            >
              Add Character
            </Button>
          </HStack>
        </HStack>

        {assignedRecipes.length === 0 ? (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Text>
              No characters assigned yet. Add a character to personalize {childName}'s GooseMind experience!
            </Text>
          </Alert>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {assignedRecipes.map((assignment) => (
              <Box
                key={assignment.id}
                p={4}
                borderRadius="lg"
                border="2px solid"
                borderColor={assignment.isDefault ? 'blue.400' : 'gray.200'}
                bg={assignment.isDefault ? 'blue.50' : 'white'}
                position="relative"
              >
                {assignment.isDefault && (
                  <Badge
                    position="absolute"
                    top={-2}
                    right={2}
                    colorScheme="blue"
                    variant="solid"
                  >
                    <HStack spacing={1}>
                      <FiStar size={10} />
                      <Text>Default</Text>
                    </HStack>
                  </Badge>
                )}

                <HStack spacing={3} mb={2}>
                  <Avatar
                    size="md"
                    name={assignment.recipe?.characterName}
                    bg="purple.100"
                  >
                    <Text fontSize="xl">
                      {assignment.recipe?.characterEmoji || '🤖'}
                    </Text>
                  </Avatar>
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="bold">
                      {assignment.recipe?.characterName || assignment.recipe?.name}
                    </Text>
                    <Badge colorScheme={getCategoryColor(assignment.recipe?.category || '')}>
                      {assignment.recipe?.category?.replace('child-', '')}
                    </Badge>
                  </VStack>
                </HStack>

                <Text fontSize="sm" color="gray.600" mb={2} noOfLines={2}>
                  {assignment.recipe?.description}
                </Text>

                {assignment.recipe?.educationalFocus && assignment.recipe.educationalFocus.length > 0 && (
                  <Wrap mb={2}>
                    {assignment.recipe.educationalFocus.map((focus) => (
                      <WrapItem key={focus}>
                        <Tag size="sm" colorScheme="green" variant="subtle">
                          <TagLabel>{focus}</TagLabel>
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                )}

                {assignment.recipe?.isSeasonal && (
                  <Badge colorScheme="orange" mb={2}>
                    🎄 Seasonal Character
                  </Badge>
                )}

                <HStack justify="space-between" mt={3}>
                  <Text fontSize="xs" color="gray.500">
                    Used {assignment.timesUsed} times
                  </Text>
                  <HStack>
                    {!assignment.isDefault && (
                      <Tooltip label="Set as default">
                        <IconButton
                          icon={<FiStar />}
                          aria-label="Set default"
                          size="xs"
                          variant="ghost"
                          onClick={() => handleSetDefault(assignment)}
                        />
                      </Tooltip>
                    )}
                    <Tooltip label="Remove">
                      <IconButton
                        icon={<FiTrash2 />}
                        aria-label="Remove"
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleRemoveAssignment(assignment.recipeId)}
                      />
                    </Tooltip>
                  </HStack>
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </GlassPanel>

      {/* Assignment Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Add Character for {childName}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Category Filter */}
              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="child-education">📚 Education</option>
                  <option value="child-creativity">🎨 Creativity</option>
                  <option value="child-seasonal">🎄 Seasonal</option>
                </Select>
              </FormControl>

              <Divider />

              {/* Recipe Grid */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} maxH="400px" overflowY="auto">
                {filteredRecipes.map((recipe) => {
                  const isAssigned = isRecipeAssigned(recipe.id);
                  const isSelected = selectedRecipe?.id === recipe.id;

                  return (
                    <Box
                      key={recipe.id}
                      p={3}
                      borderRadius="md"
                      border="2px solid"
                      borderColor={isSelected ? 'blue.500' : isAssigned ? 'green.200' : 'gray.200'}
                      bg={isSelected ? 'blue.50' : isAssigned ? 'green.50' : 'white'}
                      cursor={isAssigned ? 'not-allowed' : 'pointer'}
                      opacity={isAssigned ? 0.6 : 1}
                      onClick={() => !isAssigned && setSelectedRecipe(recipe)}
                      _hover={!isAssigned ? { borderColor: 'blue.300' } : undefined}
                    >
                      <HStack spacing={2} mb={1}>
                        <Text fontSize="xl">{recipe.characterEmoji || '🤖'}</Text>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold" fontSize="sm">
                            {recipe.characterName || recipe.name}
                          </Text>
                          <Badge size="sm" colorScheme={getCategoryColor(recipe.category)}>
                            {recipe.category.replace('child-', '')}
                          </Badge>
                        </VStack>
                        {isAssigned && (
                          <Badge colorScheme="green" ml="auto">
                            Assigned
                          </Badge>
                        )}
                      </HStack>
                      <Text fontSize="xs" color="gray.600" noOfLines={2}>
                        {recipe.description}
                      </Text>
                      {recipe.isSeasonal && (
                        <Badge colorScheme="orange" mt={1} size="sm">
                          🎄 Seasonal
                        </Badge>
                      )}
                    </Box>
                  );
                })}
              </SimpleGrid>

              {selectedRecipe && (
                <>
                  <Divider />
                  <Box p={3} bg="blue.50" borderRadius="md">
                    <Text fontWeight="bold" mb={2}>
                      Selected: {selectedRecipe.characterEmoji} {selectedRecipe.characterName || selectedRecipe.name}
                    </Text>
                    <Text fontSize="sm" color="gray.600" mb={3}>
                      {selectedRecipe.characterPersonality}
                    </Text>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb={0} fontSize="sm">
                        Set as default character
                      </FormLabel>
                      <Switch
                        isChecked={assignAsDefault}
                        onChange={(e) => setAssignAsDefault(e.target.checked)}
                        colorScheme="blue"
                      />
                    </FormControl>
                  </Box>
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleAssignRecipe}
              isLoading={assigning}
              isDisabled={!selectedRecipe}
            >
              Assign Character
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}

export default ChildRecipeManager;
