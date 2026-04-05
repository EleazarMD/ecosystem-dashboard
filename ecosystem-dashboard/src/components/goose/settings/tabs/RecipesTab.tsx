/**
 * Recipes Tab Component
 * 
 * Manage and run Goose recipes/workflows
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box, VStack, HStack, Text, Button, IconButton,
  Badge, Icon, Spinner, useToast,
  Alert, AlertIcon, AlertDescription, Divider,
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalCloseButton, useDisclosure,
  Input, Textarea, FormControl, FormLabel, Select,
  Wrap, WrapItem, Tag, TagLabel, TagCloseButton,
} from '@chakra-ui/react';
import {
  FiBook, FiPlay, FiEdit, FiTrash2, FiPlus,
  FiStar, FiClock, FiTag,
} from 'react-icons/fi';

interface RecipesTabProps {
  agentId: string;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  instructions: string;
  systemPrompt: string | null;
  requiredTools: string[];
  parameters: Record<string, any>;
  tags: string[];
  isPublic: boolean;
  usageCount: number;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function RecipesTab({ agentId }: RecipesTabProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const mutedColor = useSemanticToken('text.secondary');
  const accentColor = 'blue.500';
  const cardBg = useSemanticToken('surface.base');

  // Load recipes
  useEffect(() => {
    loadRecipes();
  }, [agentId]);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/goose/recipes?agentId=${agentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load recipes');
      }
      
      const data = await response.json();
      setRecipes(data.recipes);
      setError(null);
    } catch (err) {
      console.error('Error loading recipes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleRunRecipe = async (recipe: Recipe) => {
    toast({
      title: 'Running Recipe',
      description: `Executing "${recipe.name}"...`,
      status: 'info',
      duration: 2000,
    });
    
    // TODO: Implement recipe execution via Goose API
    console.log('Running recipe:', recipe);
  };

  const handleCreateRecipe = () => {
    setSelectedRecipe(null);
    onOpen();
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    onOpen();
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/goose/recipes?id=${recipeId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete recipe');
      }
      
      toast({
        title: 'Recipe Deleted',
        status: 'success',
        duration: 2000,
      });
      
      loadRecipes();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete recipe',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'development':
        return 'blue';
      case 'documentation':
        return 'green';
      case 'analysis':
        return 'purple';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" color={accentColor} />
        <Text mt={4} color={mutedColor}>Loading recipes...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch" p={6}>
      {/* Header */}
      <HStack justify="space-between">
        <HStack>
          <Icon as={FiBook} boxSize={5} color={accentColor} />
          <Text fontSize="lg" fontWeight="semibold">
            Recipes & Workflows
          </Text>
          <Badge colorScheme="blue">{recipes.length} recipes</Badge>
        </HStack>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="blue"
          size="sm"
          onClick={handleCreateRecipe}
        >
          Create Recipe
        </Button>
      </HStack>

      <Text fontSize="sm" color={mutedColor}>
        Quick actions and reusable workflows for common tasks
      </Text>

      <Divider />

      {/* Recipes List */}
      {recipes.length === 0 ? (
        <Box
          p={8}
          textAlign="center"
          borderWidth="2px"
          borderStyle="dashed"
          borderColor={borderColor}
          borderRadius="md"
        >
          <Icon as={FiBook} boxSize={12} color={mutedColor} mb={4} />
          <Text fontSize="lg" fontWeight="semibold" mb={2}>
            No recipes yet
          </Text>
          <Text fontSize="sm" color={mutedColor} mb={4}>
            Create your first recipe to get started
          </Text>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            onClick={handleCreateRecipe}
          >
            Create Recipe
          </Button>
        </Box>
      ) : (
        <VStack spacing={3} align="stretch">
          {recipes.map(recipe => (
            <Box
              key={recipe.id}
              p={4}
              bg={cardBg}
              borderRadius="md"
              borderWidth="1px"
              borderColor={borderColor}
              transition="all 0.2s"
              _hover={{
                borderColor: accentColor,
                shadow: 'sm',
              }}
            >
              <HStack justify="space-between" align="start" mb={2}>
                <VStack align="start" spacing={1} flex={1}>
                  <HStack>
                    <Text fontWeight="semibold">{recipe.name}</Text>
                    <Badge colorScheme={getCategoryColor(recipe.category)} fontSize="xs">
                      {recipe.category}
                    </Badge>
                    {recipe.isFavorite && (
                      <Icon as={FiStar} color="yellow.500" boxSize={4} />
                    )}
                  </HStack>
                  
                  <Text fontSize="sm" color={mutedColor}>
                    {recipe.description}
                  </Text>
                  
                  {/* Tags */}
                  {recipe.tags.length > 0 && (
                    <Wrap spacing={1} mt={1}>
                      {recipe.tags.map(tag => (
                        <WrapItem key={tag}>
                          <Tag size="sm" variant="subtle" colorScheme="gray">
                            <TagLabel>{tag}</TagLabel>
                          </Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  )}
                  
                  {/* Required Tools */}
                  {recipe.requiredTools.length > 0 && (
                    <HStack spacing={2} mt={2} fontSize="xs" color={mutedColor}>
                      <Text>Requires:</Text>
                      {recipe.requiredTools.map(tool => (
                        <Badge key={tool} size="sm" variant="outline">
                          {tool}
                        </Badge>
                      ))}
                    </HStack>
                  )}
                  
                  {/* Usage Count */}
                  <HStack spacing={4} fontSize="xs" color={mutedColor} mt={1}>
                    <HStack>
                      <Icon as={FiClock} />
                      <Text>Used {recipe.usageCount} times</Text>
                    </HStack>
                  </HStack>
                </VStack>
                
                {/* Actions */}
                <HStack spacing={2}>
                  <Button
                    leftIcon={<FiPlay />}
                    colorScheme="blue"
                    size="sm"
                    onClick={() => handleRunRecipe(recipe)}
                  >
                    Run
                  </Button>
                  <IconButton
                    aria-label="Edit recipe"
                    icon={<FiEdit />}
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditRecipe(recipe)}
                  />
                  <IconButton
                    aria-label="Delete recipe"
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleDeleteRecipe(recipe.id)}
                  />
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}

      {/* Import Recipe Button */}
      <Button
        variant="outline"
        leftIcon={<FiPlus />}
        size="sm"
        onClick={() => {
          toast({
            title: 'Coming Soon',
            description: 'Recipe import functionality will be available soon',
            status: 'info',
            duration: 2000,
          });
        }}
      >
        Import Recipe
      </Button>

      {/* Info Box */}
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box fontSize="sm">
          <Text fontWeight="semibold" mb={1}>About Recipes</Text>
          <Text fontSize="xs" color={mutedColor}>
            Recipes are reusable workflows that combine instructions, tools, and parameters 
            to accomplish specific tasks. Create recipes for common operations to save time 
            and ensure consistency.
          </Text>
        </Box>
      </Alert>

      {/* Recipe Editor Modal */}
      <RecipeEditorModal
        isOpen={isOpen}
        onClose={onClose}
        recipe={selectedRecipe}
        onSave={loadRecipes}
      />
    </VStack>
  );
}

/**
 * Recipe Editor Modal Component
 */
interface RecipeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  onSave: () => void;
}

function RecipeEditorModal({ isOpen, onClose, recipe, onSave }: RecipeEditorModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'development',
    instructions: '',
    tags: [] as string[],
  });
  
  const toast = useToast();

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name,
        description: recipe.description,
        category: recipe.category,
        instructions: recipe.instructions,
        tags: recipe.tags,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'development',
        instructions: '',
        tags: [],
      });
    }
  }, [recipe]);

  const handleSave = async () => {
    try {
      const method = recipe ? 'PUT' : 'POST';
      const url = recipe ? `/api/goose/recipes?id=${recipe.id}` : '/api/goose/recipes';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save recipe');
      }
      
      toast({
        title: recipe ? 'Recipe Updated' : 'Recipe Created',
        status: 'success',
        duration: 2000,
      });
      
      onSave();
      onClose();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save recipe',
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{recipe ? 'Edit Recipe' : 'Create Recipe'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Name</FormLabel>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Code Review"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what this recipe does"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Category</FormLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="development">Development</option>
                <option value="documentation">Documentation</option>
                <option value="analysis">Analysis</option>
                <option value="other">Other</option>
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Instructions</FormLabel>
              <Textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Detailed instructions for the agent..."
                rows={8}
              />
            </FormControl>

            <HStack spacing={2}>
              <Button onClick={onClose}>Cancel</Button>
              <Button colorScheme="blue" onClick={handleSave}>
                {recipe ? 'Update' : 'Create'}
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
