import React from 'react';
import {
  Box, SimpleGrid, Text, Badge, Button, VStack, HStack,
  Card, CardBody, CardHeader, Heading, Icon,
  Spinner, Center
} from '@chakra-ui/react';
import { useRecipes, Recipe } from '@/hooks/useRecipes';
import { FiBook, FiCheck, FiPlay, FiTool, FiCpu } from 'react-icons/fi';

interface RecipesWorkflowTabProps {
  agentId: string;
  sessionId?: string;
}

export const RecipesWorkflowTab: React.FC<RecipesWorkflowTabProps> = ({ agentId, sessionId = 'default' }) => {
  const { recipes, activeRecipeId, activateRecipe, isLoading } = useRecipes(agentId);

  const cardBg = 'white';
  const activeBorderColor = 'blue.500';

  const handleActivate = async (recipe: Recipe) => {
    await activateRecipe(recipe.id, sessionId, agentId);
  };

  if (isLoading) {
    return (
      <Center p={10}>
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  return (
    <Box>
      <VStack align="stretch" spacing={6}>
        <Box>
          <Heading size="md" mb={2}>Workflow Recipes</Heading>
          <Text color="gray.500" fontSize="sm">
            Select a specialized workflow recipe to guide the agent's behavior, tools, and capabilities.
            Recipes override default settings for specific tasks.
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
          {recipes.map((recipe) => {
            const isActive = recipe.id === activeRecipeId;
            return (
              <Card
                key={recipe.id}
                bg={cardBg}
                borderWidth={isActive ? 2 : 1}
                borderColor={isActive ? activeBorderColor : 'whiteAlpha.100'}
                boxShadow={isActive ? "0 0 0 1px var(--chakra-colors-blue-400)" : "sm"}
                _hover={{ borderColor: isActive ? activeBorderColor : "whiteAlpha.300", transform: "translateY(-2px)" }}
                transition="all 0.2s"
              >
                <CardHeader pb={2}>
                  <HStack justify="space-between">
                    <Badge
                      colorScheme={
                        recipe.category === 'development' ? 'blue' :
                          recipe.category === 'research' ? 'purple' :
                            recipe.category === 'content' ? 'green' : 'gray'
                      }
                      variant="subtle"
                      px={2}
                      py={0.5}
                      borderRadius="full"
                    >
                      {recipe.category}
                    </Badge>
                    {isActive && (
                      <Badge colorScheme="blue" variant="solid" borderRadius="full" px={2}>
                        Active
                      </Badge>
                    )}
                  </HStack>
                  <Heading size="sm" mt={3} noOfLines={1}>{recipe.name}</Heading>
                </CardHeader>
                <CardBody pt={0}>
                  <Text fontSize="sm" color="gray.400" mb={4} noOfLines={3} minH="4.5em">
                    {recipe.description}
                  </Text>

                  <VStack align="stretch" spacing={3}>
                    {recipe.required_tools && recipe.required_tools.length > 0 && (
                      <HStack spacing={1} flexWrap="wrap" minH="24px">
                        <Icon as={FiTool} size={12} color="gray.500" mr={1} />
                        {recipe.required_tools.slice(0, 3).map(tool => (
                          <Badge key={tool} size="xs" variant="outline" colorScheme="gray" textTransform="lowercase">
                            {tool}
                          </Badge>
                        ))}
                        {recipe.required_tools.length > 3 && (
                          <Text fontSize="xs" color="gray.500">+{recipe.required_tools.length - 3}</Text>
                        )}
                      </HStack>
                    )}

                    <Button
                      size="sm"
                      width="100%"
                      colorScheme={isActive ? 'green' : 'blue'}
                      variant={isActive ? 'ghost' : 'solid'}
                      leftIcon={isActive ? <FiCheck /> : <FiPlay />}
                      onClick={() => handleActivate(recipe)}
                      isDisabled={isActive}
                    >
                      {isActive ? 'Active Recipe' : 'Activate'}
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      </VStack>
    </Box>
  );
};
