import React from 'react';
import {
    Box,
    VStack,
    Text,
    Switch,
    FormControl,
    FormLabel,
    Select,
    HStack,
    Icon,
    Divider,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
    GlobeAltIcon,
    BookOpenIcon,
    AcademicCapIcon,
    VideoCameraIcon,
    ChatBubbleLeftRightIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';

interface PerplexitySettingsPanelProps {
    focusMode: string;
    onFocusModeChange: (mode: string) => void;
    model: string;
    onModelChange: (model: string) => void;
}

export const PerplexitySettingsPanel: React.FC<PerplexitySettingsPanelProps> = ({
    focusMode,
    onFocusModeChange,
    model,
    onModelChange,
}) => {
    const bg = useSemanticToken('surface.elevated');
    const border = useSemanticToken('border.subtle');
    const textColor = useSemanticToken('text.primary');

    const focusModes = [
        { id: 'web', label: 'All (Web)', icon: GlobeAltIcon },
        { id: 'academic', label: 'Academic', icon: AcademicCapIcon },
        { id: 'writing', label: 'Writing', icon: PencilSquareIcon },
        { id: 'youtube', label: 'YouTube', icon: VideoCameraIcon },
        { id: 'reddit', label: 'Reddit', icon: ChatBubbleLeftRightIcon },
        { id: 'rag', label: 'Knowledge Base', icon: BookOpenIcon },
    ];

    return (
        <Box
            w="300px"
            bg={bg}
            borderLeft="1px solid"
            borderColor={border}
            p={4}
            h="100vh"
            position="fixed"
            right={0}
            top={0}
            zIndex={100}
        >
            <Text fontSize="lg" fontWeight="bold" mb={6} color={textColor}>
                Settings
            </Text>

            <VStack spacing={6} align="stretch">
                {/* Focus Mode */}
                <FormControl>
                    <FormLabel fontSize="sm" fontWeight="bold" color="gray.500">
                        Focus Mode
                    </FormLabel>
                    <VStack align="stretch" spacing={1}>
                        {focusModes.map((mode) => (
                            <HStack
                                key={mode.id}
                                p={2}
                                cursor="pointer"
                                borderRadius="md"
                                bg={focusMode === mode.id ? 'blue.50' : 'transparent'}
                                color={focusMode === mode.id ? 'blue.600' : 'gray.600'}
                                onClick={() => onFocusModeChange(mode.id)}
                                _hover={{ bg: 'gray.50' }}
                            >
                                <Icon as={mode.icon} w={4} h={4} />
                                <Text fontSize="sm">{mode.label}</Text>
                            </HStack>
                        ))}
                    </VStack>
                </FormControl>

                <Divider />

                {/* Model Selection */}
                <FormControl>
                    <FormLabel fontSize="sm" fontWeight="bold" color="gray.500">
                        AI Model
                    </FormLabel>
                    <Select
                        value={model}
                        onChange={(e) => onModelChange(e.target.value)}
                        size="sm"
                        borderRadius="md"
                    >
                        <option value="qwen/qwen2.5-coder-32b-instruct">Qwen 2.5 Coder 32B</option>
                        <option value="mistralai/mistral-7b-instruct-v0.3">Mistral 7B</option>
                    </Select>
                    <Text fontSize="xs" color="gray.400" mt={1}>
                        Currently running on RTX Workstation
                    </Text>
                </FormControl>

                <Divider />

                {/* Copilot Toggle */}
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel htmlFor="copilot" mb="0" fontSize="sm" fontWeight="bold" color="gray.500">
                        Pro Search (Copilot)
                    </FormLabel>
                    <Switch id="copilot" colorScheme="blue" defaultChecked />
                </FormControl>

            </VStack>
        </Box>
    );
};
