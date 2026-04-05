import React from 'react';
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    VStack,
    HStack,
    Text,
    Icon,
    Badge,
    Box,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { FiZap, FiDatabase, FiSearch, FiCode, FiGlobe, FiCheck } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export type AIMode = 'quick' | 'context' | 'research' | 'code' | 'search';

interface PerplexicaModeSelectorProps {
    selectedMode: AIMode;
    onModeChange: (mode: AIMode) => void;
    compact?: boolean;
}

export function PerplexicaModeSelector({
    selectedMode,
    onModeChange,
    compact = false,
}: PerplexicaModeSelectorProps) {
    const menuBg = useSemanticToken('surface.elevated');
    const borderColor = useSemanticToken('border.subtle');
    const hoverBg = useSemanticToken('surface.hover');
    const activeColor = 'blue.500';
    const selectedBg = useSemanticToken('surface.highlight');
    const itemBg = useSemanticToken('surface.base');
    const textColor = useSemanticToken('text.primary');
    const secondaryTextColor = useSemanticToken('text.secondary');

    const modes = [
        {
            id: 'quick' as AIMode,
            label: 'Quick Chat',
            description: 'Fast, concise answers for simple questions',
            icon: FiZap,
            color: 'blue',
        },
        {
            id: 'context' as AIMode,
            label: 'Context Chat',
            description: 'AI with awareness of your current workspace',
            icon: FiDatabase,
            color: 'purple',
        },
        {
            id: 'search' as AIMode,
            label: 'Web Search',
            description: 'Search the web using Perplexica (Local)',
            icon: FiGlobe,
            color: 'teal',
            badge: 'NEW',
        },
        {
            id: 'code' as AIMode,
            label: 'Code Assistant',
            description: 'Expert help with coding and debugging',
            icon: FiCode,
            color: 'orange',
        },
        {
            id: 'research' as AIMode,
            label: 'Deep Research',
            description: 'Comprehensive analysis and report generation',
            icon: FiSearch,
            color: 'green',
        },
    ];

    const currentMode = modes.find((m) => m.id === selectedMode) || modes[0];

    return (
        <Menu placement="bottom-start" gutter={4}>
            <MenuButton
                as={Button}
                size={compact ? 'sm' : 'md'}
                variant="outline"
                rightIcon={<ChevronDownIcon />}
                leftIcon={<Icon as={currentMode.icon} color={`${currentMode.color}.500`} />}
                bg={useSemanticToken('surface.default')}
                borderColor={borderColor}
                _hover={{ bg: hoverBg, borderColor: useSemanticToken('border.default') }}
                _active={{ bg: hoverBg }}
                textAlign="left"
                minW={compact ? 'auto' : '200px'}
            >
                <Text as="span" fontWeight="500">
                    {currentMode.label}
                </Text>
            </MenuButton>
            <MenuList
                bg={menuBg}
                borderColor={borderColor}
                boxShadow="lg"
                p={2}
                borderRadius="lg"
                maxW="320px"
                zIndex={10}
            >
                <Text
                    px={3}
                    py={2}
                    fontSize="xs"
                    fontWeight="bold"
                    color={useSemanticToken('text.tertiary')}
                    textTransform="uppercase"
                    letterSpacing="wider"
                >
                    Select Mode
                </Text>
                {modes.map((mode) => {
                    const isSelected = selectedMode === mode.id;
                    return (
                        <MenuItem
                            key={mode.id}
                            onClick={() => onModeChange(mode.id)}
                            borderRadius="md"
                            mb={1}
                            bg={isSelected ? selectedBg : 'transparent'}
                            _hover={{ bg: isSelected ? selectedBg : hoverBg }}
                        >
                            <HStack spacing={3} align="start" w="full" py={1}>
                                <Box
                                    p={2}
                                    borderRadius="md"
                                    bg={isSelected ? 'transparent' : itemBg}
                                    color={isSelected ? activeColor : 'inherit'}
                                >
                                    <Icon as={mode.icon} boxSize={5} />
                                </Box>
                                <VStack align="start" spacing={0} flex={1}>
                                    <HStack>
                                        <Text fontWeight="600" color={isSelected ? activeColor : textColor}>
                                            {mode.label}
                                        </Text>
                                        {mode.badge && (
                                            <Badge colorScheme={mode.color} fontSize="2xs" variant="solid">
                                                {mode.badge}
                                            </Badge>
                                        )}
                                    </HStack>
                                    <Text fontSize="xs" color={secondaryTextColor} noOfLines={2}>
                                        {mode.description}
                                    </Text>
                                </VStack>
                                {isSelected && <Icon as={FiCheck} color={activeColor} boxSize={4} mt={1} />}
                            </HStack>
                        </MenuItem>
                    );
                })}
            </MenuList>
        </Menu>
    );
}
