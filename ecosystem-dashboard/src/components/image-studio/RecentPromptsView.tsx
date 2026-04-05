/**
 * Recent Prompts View Component
 * 
 * Displays user's recent prompts for quick reuse
 */

import React from 'react';
import {
    Box,
    VStack,
    Text,
    HStack,
    IconButton,
    Center,
    Icon,
    Badge,
    Tooltip,
    useToast,
} from '@chakra-ui/react';
import {
    FiClock,
    FiCopy,
    FiTrash2,
    FiZap,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useImageStudio } from '@/contexts/ImageStudioContext';

export const RecentPromptsView: React.FC = () => {
    const { 
        recentPrompts,
        setActiveView,
    } = useImageStudio();
    
    const toast = useToast();
    const borderColor = useSemanticToken('border.subtle');
    const textSecondary = useSemanticToken('text.secondary');
    const bgHover = useSemanticToken('surface.hover');

    const handleCopyPrompt = (prompt: string) => {
        navigator.clipboard.writeText(prompt);
        toast({ title: 'Prompt copied to clipboard', status: 'success', duration: 2000 });
    };

    const handleUsePrompt = (prompt: string) => {
        // Copy to clipboard and switch to generate view
        navigator.clipboard.writeText(prompt);
        setActiveView('generate');
        toast({ title: 'Prompt copied! Paste it in the generator', status: 'info', duration: 3000 });
    };

    if (recentPrompts.length === 0) {
        return (
            <Center h="400px">
                <VStack spacing={4}>
                    <Icon as={FiClock} boxSize={16} color={textSecondary} />
                    <Text fontSize="lg" fontWeight="medium">No recent prompts</Text>
                    <Text color={textSecondary} textAlign="center">
                        Your generated prompts will appear here for quick reuse
                    </Text>
                </VStack>
            </Center>
        );
    }

    return (
        <Box p={4}>
            <HStack justify="space-between" mb={4}>
                <Text fontSize="lg" fontWeight="semibold">
                    Recent Prompts
                </Text>
                <Badge colorScheme="gray">{recentPrompts.length} prompts</Badge>
            </HStack>

            <VStack spacing={2} align="stretch">
                {recentPrompts.map((prompt, index) => (
                    <Box
                        key={index}
                        p={3}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={borderColor}
                        _hover={{ bg: bgHover }}
                        transition="background 0.2s"
                    >
                        <HStack justify="space-between" align="start">
                            <Text fontSize="sm" flex={1} noOfLines={3}>
                                {prompt}
                            </Text>
                            <HStack spacing={1} flexShrink={0}>
                                <Tooltip label="Use this prompt">
                                    <IconButton
                                        aria-label="Use prompt"
                                        icon={<FiZap />}
                                        size="sm"
                                        colorScheme="blue"
                                        variant="ghost"
                                        onClick={() => handleUsePrompt(prompt)}
                                    />
                                </Tooltip>
                                <Tooltip label="Copy prompt">
                                    <IconButton
                                        aria-label="Copy"
                                        icon={<FiCopy />}
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleCopyPrompt(prompt)}
                                    />
                                </Tooltip>
                            </HStack>
                        </HStack>
                    </Box>
                ))}
            </VStack>
        </Box>
    );
};
