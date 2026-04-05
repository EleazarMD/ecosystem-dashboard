/**
 * GooseMind Recipes Panel
 * Manage Goose recipes and sub-recipes for automated workflows
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Spinner,
  Icon,
  Switch,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { FiZap, FiRefreshCw, FiPlay, FiCalendar, FiMail, FiTarget, FiClock, FiCheckCircle } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Use HTTPS via Tailscale
const GOOSE_MIND_API = 'https://rtx-workstation.tailb64e64.ts.net:8031';

interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  triggers: string[];
  enabled: boolean;
}

interface SubRecipe {
  id: string;
  name: string;
  description: string;
  category: string;
  preferred_agent: string;
}

export default function GooseMindRecipesPanel() {
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgSubtle = useSemanticToken('surface.subtle');
  const borderColor = useSemanticToken('border.subtle');
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [subRecipes, setSubRecipes] = useState<SubRecipe[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [skillsRes, subRecipesRes] = await Promise.all([
        fetch(`${GOOSE_MIND_API}/skills`),
        fetch(`${GOOSE_MIND_API}/sub-recipes`),
      ]);
      
      if (skillsRes.ok) {
        const skills = await skillsRes.json();
        // Transform skills to recipe format
        setRecipes(skills.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          category: s.category || 'general',
          triggers: s.triggers || [],
          enabled: true,
        })));
      }
      
      if (subRecipesRes.ok) {
        setSubRecipes(await subRecipesRes.json());
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
      toast({ title: 'Failed to load recipes', status: 'error', duration: 2000 });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      'calendar': FiCalendar,
      'email': FiMail,
      'planning': FiTarget,
      'scheduling': FiClock,
    };
    return icons[category] || FiZap;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'calendar': 'green',
      'email': 'blue',
      'planning': 'purple',
      'scheduling': 'orange',
    };
    return colors[category] || 'gray';
  };

  const triggerRecipe = async (recipeId: string) => {
    try {
      toast({ title: `Running ${recipeId}...`, status: 'info', duration: 1500 });
      // This would trigger the recipe execution
    } catch (error) {
      toast({ title: 'Failed to trigger recipe', status: 'error', duration: 2000 });
    }
  };

  if (loading) {
    return (
      <VStack py={8} spacing={3}>
        <Spinner size="md" color="purple.400" />
        <Text fontSize="sm" color={textSecondary}>Loading recipes...</Text>
      </VStack>
    );
  }

  return (
    <Box h="full" overflowY="auto" p={4}>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiZap} color="purple.400" boxSize={4} />
            <Text fontSize="sm" fontWeight="semibold" color={textPrimary}>
              Active Recipes
            </Text>
          </HStack>
          <Tooltip label="Refresh">
            <Button size="xs" variant="ghost" onClick={fetchData}>
              <FiRefreshCw />
            </Button>
          </Tooltip>
        </HStack>

        {/* Skills/Recipes */}
        <Accordion allowMultiple>
          {recipes.map((recipe) => (
            <AccordionItem key={recipe.id} border="none" mb={2}>
              <AccordionButton
                bg={bgSubtle}
                borderRadius="md"
                _hover={{ bg: 'whiteAlpha.200' }}
                px={3}
                py={2}
              >
                <HStack flex={1} spacing={2}>
                  <Icon as={getCategoryIcon(recipe.category)} color={`${getCategoryColor(recipe.category)}.400`} boxSize={4} />
                  <Text fontSize="sm" fontWeight="medium" color={textPrimary} noOfLines={1}>
                    {recipe.name}
                  </Text>
                </HStack>
                <HStack spacing={2}>
                  <Badge size="sm" colorScheme={getCategoryColor(recipe.category)}>
                    {recipe.category}
                  </Badge>
                  <AccordionIcon />
                </HStack>
              </AccordionButton>
              <AccordionPanel pb={2} px={3}>
                <VStack align="stretch" spacing={2}>
                  <Text fontSize="xs" color={textSecondary}>
                    {recipe.description}
                  </Text>
                  <HStack justify="space-between">
                    <HStack spacing={1}>
                      <Icon as={FiCheckCircle} color="green.400" boxSize={3} />
                      <Text fontSize="xs" color={textSecondary}>Enabled</Text>
                    </HStack>
                    <Button
                      size="xs"
                      leftIcon={<FiPlay />}
                      colorScheme="purple"
                      variant="ghost"
                      onClick={() => triggerRecipe(recipe.id)}
                    >
                      Run
                    </Button>
                  </HStack>
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Sub-Recipes Section */}
        {subRecipes.length > 0 && (
          <>
            <HStack pt={2}>
              <Icon as={FiTarget} color="orange.400" boxSize={4} />
              <Text fontSize="sm" fontWeight="semibold" color={textPrimary}>
                Sub-Recipes ({subRecipes.length})
              </Text>
            </HStack>
            
            <VStack align="stretch" spacing={2}>
              {subRecipes.slice(0, 5).map((sr) => (
                <HStack
                  key={sr.id}
                  p={2}
                  bg={bgSubtle}
                  borderRadius="md"
                  justify="space-between"
                >
                  <VStack align="start" spacing={0}>
                    <Text fontSize="xs" fontWeight="medium" color={textPrimary}>
                      {sr.name}
                    </Text>
                    <Text fontSize="xs" color={textSecondary} noOfLines={1}>
                      {sr.description}
                    </Text>
                  </VStack>
                  <Badge size="sm" colorScheme="orange" variant="outline">
                    {sr.category}
                  </Badge>
                </HStack>
              ))}
              {subRecipes.length > 5 && (
                <Text fontSize="xs" color={textSecondary} textAlign="center">
                  +{subRecipes.length - 5} more sub-recipes
                </Text>
              )}
            </VStack>
          </>
        )}
      </VStack>
    </Box>
  );
}
