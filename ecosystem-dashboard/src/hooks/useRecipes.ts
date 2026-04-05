import useSWR from 'swr';
import { useState, useCallback } from 'react';

export interface Recipe {
    id: string;
    name: string;
    description: string;
    category: string;
    instructions: string;
    required_tools: string[];
    parameters: Record<string, any>;
    is_sub_recipe: boolean;
    usage_count: number;
}

interface UseRecipesReturn {
    recipes: Recipe[];
    isLoading: boolean;
    error: any;
    activeRecipeId: string | null;
    activateRecipe: (recipeId: string, sessionId: string, agentId: string) => Promise<void>;
    clearActiveRecipe: () => void;
    refreshRecipes: () => Promise<void>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useRecipes(agentId?: string): UseRecipesReturn {
    const { data, error, isLoading, mutate } = useSWR<{ recipes: Recipe[] }>(
        agentId ? `/api/goose/recipes?agent_id=${agentId}` : '/api/goose/recipes',
        fetcher
    );

    const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);

    const activateRecipe = useCallback(async (recipeId: string, sessionId: string, agentId: string) => {
        try {
            const res = await fetch(`/api/goose/recipes/${recipeId}/activate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ session_id: sessionId, agent_id: agentId }),
            });

            if (!res.ok) {
                throw new Error('Failed to activate recipe');
            }

            setActiveRecipeId(recipeId);
            // Optimistically update usage count if needed, but for now just refresh list
            mutate();
        } catch (err) {
            console.error('Error activating recipe:', err);
            throw err;
        }
    }, [mutate]);

    const clearActiveRecipe = useCallback(() => {
        setActiveRecipeId(null);
    }, []);

    const refreshRecipes = useCallback(async () => {
        await mutate();
    }, [mutate]);

    return {
        recipes: data?.recipes || [],
        isLoading,
        error,
        activeRecipeId,
        activateRecipe,
        clearActiveRecipe,
        refreshRecipes,
    };
}
