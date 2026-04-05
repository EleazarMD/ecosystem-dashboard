import React from 'react';
import { Select, FormControl, HStack, Text, IconButton, Tooltip, Box } from '@chakra-ui/react';
import { useRecipes } from '@/hooks/useRecipes';
import { FiX, FiBook } from 'react-icons/fi';

interface RecipeSelectorProps {
    agentId: string;
    sessionId: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    selectedRecipeId?: string | null;
    onRecipeSelect?: (recipeId: string | null) => void;
}

export const RecipeSelector: React.FC<RecipeSelectorProps> = ({
    agentId,
    sessionId,
    size = 'sm',
    showLabel = false,
    selectedRecipeId,
    onRecipeSelect
}) => {
    const { recipes, activeRecipeId: hookActiveRecipeId, activateRecipe, clearActiveRecipe, isLoading } = useRecipes(agentId);

    // Use controlled state if provided, otherwise use hook state
    const currentRecipeId = selectedRecipeId !== undefined ? selectedRecipeId : hookActiveRecipeId;

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const recipeId = e.target.value || null;

        if (onRecipeSelect) {
            onRecipeSelect(recipeId);
        }

        // Also trigger activation logic if needed, or let parent handle it
        if (recipeId) {
            await activateRecipe(recipeId, sessionId, agentId);
        } else {
            clearActiveRecipe();
        }
    };

    const handleClear = () => {
        if (onRecipeSelect) {
            onRecipeSelect(null);
        }
        clearActiveRecipe();
    };

    const activeRecipe = recipes.find(r => r.id === currentRecipeId);

    return (
        <Box width="100%">
            {showLabel && (
                <HStack mb={1} spacing={2}>
                    <FiBook size={12} />
                    <Text fontSize="xs" fontWeight="bold" color="gray.400">
                        Active Recipe
                    </Text>
                </HStack>
            )}
            <HStack spacing={1}>
                <Select
                    value={currentRecipeId || ''}
                    onChange={handleChange}
                    placeholder="Default (No Recipe)"
                    size={size}
                    isDisabled={isLoading}
                    bg="whiteAlpha.50"
                    borderColor="whiteAlpha.200"
                    _hover={{ borderColor: "whiteAlpha.300", bg: "whiteAlpha.100" }}
                    _focus={{ borderColor: "blue.400", boxShadow: "none" }}
                    fontSize="xs"
                    icon={<FiBook />}
                >
                    {recipes.map(recipe => (
                        <option key={recipe.id} value={recipe.id} style={{ color: 'black' }}>
                            {recipe.name}
                        </option>
                    ))}
                </Select>
                {currentRecipeId && (
                    <Tooltip label="Clear active recipe">
                        <IconButton
                            aria-label="Clear recipe"
                            icon={<FiX />}
                            size={size}
                            variant="ghost"
                            colorScheme="red"
                            onClick={handleClear}
                            minW={6}
                            h={6}
                        />
                    </Tooltip>
                )}
            </HStack>
            {activeRecipe && (
                <Text fontSize="xs" color="gray.500" mt={1} noOfLines={1}>
                    {activeRecipe.description}
                </Text>
            )}
        </Box>
    );
};
