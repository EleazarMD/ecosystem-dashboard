import React, { useState } from 'react';
import {
    VStack,
    HStack,
    Box,
    Text,
    Switch,
    FormControl,
    FormLabel,
    Input,
    Select,
    Divider,
    Icon,
    Badge,
    Tooltip,
    IconButton,
} from '@chakra-ui/react';
import {
    FiHome,
    FiEye,
    FiEyeOff,
    FiUser,
    FiLayout,
    FiInfo,
    FiZap,
    FiClock,
    FiBookOpen,
    FiStar,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface WorkspaceHomeSettingsProps {
    sectionVisibility: {
        quickActions: boolean;
        recentlyVisited: boolean;
        learn: boolean;
        templates: boolean;
    };
    onSectionVisibilityChange: (visibility: any) => void;
    userName: string;
    onUserNameChange: (name: string) => void;
    greetingStyle: 'formal' | 'casual' | 'none';
    onGreetingStyleChange: (style: 'formal' | 'casual' | 'none') => void;
}

export function WorkspaceHomeSettings({
    sectionVisibility,
    onSectionVisibilityChange,
    userName,
    onUserNameChange,
    greetingStyle,
    onGreetingStyleChange,
}: WorkspaceHomeSettingsProps) {
    const bgColor = useSemanticToken('surface.base');
    const textColor = useSemanticToken('text.primary');
    const mutedColor = useSemanticToken('text.secondary');
    const borderColor = useSemanticToken('border.default');
    const accentColor = useSemanticToken('interactive.primary');
    const sectionBg = useSemanticToken('surface.elevated');

    return (
        <VStack
            spacing={0}
            align="stretch"
            h="full"
            overflowY="auto"
            bg={bgColor}
            css={{
                '&::-webkit-scrollbar': {
                    width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                    background: borderColor,
                    borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                    background: useSemanticToken('border.strong'),
                },
            }}
        >
            {/* Header */}
            <Box
                px={3}
                py={2}
                borderBottom="1px solid"
                borderColor={borderColor}
                bg="transparent"
            >
                <HStack justify="space-between">
                    <HStack spacing={1.5}>
                        <Icon as={FiHome} color={accentColor} boxSize={3.5} />
                        <Text fontSize="sm" fontWeight="700" color={accentColor}>
                            Homepage Settings
                        </Text>
                    </HStack>
                    <Tooltip label="Customize your workspace homepage">
                        <IconButton
                            aria-label="Info"
                            icon={<FiInfo />}
                            size="xs"
                            variant="ghost"
                            color={mutedColor}
                        />
                    </Tooltip>
                </HStack>
            </Box>

            {/* Content */}
            <VStack spacing={3} px={2.5} py={3} align="stretch">
                {/* Personalization */}
                <Box
                    p={3}
                    bg={sectionBg}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={borderColor}
                >
                    <HStack mb={3} spacing={1.5}>
                        <Icon as={FiUser} boxSize={3.5} color="blue.500" />
                        <Text fontSize="xs" fontWeight="600" color={textColor}>
                            Personalization
                        </Text>
                    </HStack>
                    <VStack spacing={3} align="stretch">
                        <FormControl>
                            <FormLabel fontSize="xs" color={mutedColor} mb={1}>
                                Display Name
                            </FormLabel>
                            <Input
                                size="sm"
                                placeholder="Enter your name"
                                value={userName}
                                onChange={(e) => onUserNameChange(e.target.value)}
                                borderColor={borderColor}
                                _hover={{ borderColor: accentColor }}
                                _focus={{ borderColor: accentColor, boxShadow: 'none' }}
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="xs" color={mutedColor} mb={1}>
                                Greeting Style
                            </FormLabel>
                            <Select
                                size="sm"
                                value={greetingStyle}
                                onChange={(e) => onGreetingStyleChange(e.target.value as any)}
                                borderColor={borderColor}
                                _hover={{ borderColor: accentColor }}
                                _focus={{ borderColor: accentColor, boxShadow: 'none' }}
                            >
                                <option value="formal">Formal (Good morning, [Name])</option>
                                <option value="casual">Casual (Hey [Name]!)</option>
                                <option value="none">Simple (Welcome back)</option>
                            </Select>
                        </FormControl>
                    </VStack>
                </Box>

                <Divider />

                {/* Section Visibility */}
                <Box
                    p={3}
                    bg={sectionBg}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={borderColor}
                >
                    <HStack mb={3} spacing={1.5}>
                        <Icon as={FiLayout} boxSize={3.5} color="green.500" />
                        <Text fontSize="xs" fontWeight="600" color={textColor}>
                            Section Visibility
                        </Text>
                        <Badge colorScheme="green" fontSize="2xs" px={1.5} py={0}>
                            Show/Hide
                        </Badge>
                    </HStack>
                    <VStack spacing={2.5} align="stretch">
                        <HStack justify="space-between">
                            <HStack spacing={2}>
                                <Icon as={FiZap} boxSize={3.5} color={mutedColor} />
                                <Text fontSize="xs" color={textColor} fontWeight="500">
                                    Quick Actions
                                </Text>
                            </HStack>
                            <Switch
                                size="sm"
                                colorScheme="green"
                                isChecked={sectionVisibility.quickActions}
                                onChange={(e) =>
                                    onSectionVisibilityChange({
                                        ...sectionVisibility,
                                        quickActions: e.target.checked,
                                    })
                                }
                            />
                        </HStack>
                        <HStack justify="space-between">
                            <HStack spacing={2}>
                                <Icon as={FiClock} boxSize={3.5} color={mutedColor} />
                                <Text fontSize="xs" color={textColor} fontWeight="500">
                                    Recently Visited
                                </Text>
                            </HStack>
                            <Switch
                                size="sm"
                                colorScheme="green"
                                isChecked={sectionVisibility.recentlyVisited}
                                onChange={(e) =>
                                    onSectionVisibilityChange({
                                        ...sectionVisibility,
                                        recentlyVisited: e.target.checked,
                                    })
                                }
                            />
                        </HStack>
                        <HStack justify="space-between">
                            <HStack spacing={2}>
                                <Icon as={FiBookOpen} boxSize={3.5} color={mutedColor} />
                                <Text fontSize="xs" color={textColor} fontWeight="500">
                                    Learn Section
                                </Text>
                            </HStack>
                            <Switch
                                size="sm"
                                colorScheme="green"
                                isChecked={sectionVisibility.learn}
                                onChange={(e) =>
                                    onSectionVisibilityChange({
                                        ...sectionVisibility,
                                        learn: e.target.checked,
                                    })
                                }
                            />
                        </HStack>
                        <HStack justify="space-between">
                            <HStack spacing={2}>
                                <Icon as={FiStar} boxSize={3.5} color={mutedColor} />
                                <Text fontSize="xs" color={textColor} fontWeight="500">
                                    Featured Templates
                                </Text>
                            </HStack>
                            <Switch
                                size="sm"
                                colorScheme="green"
                                isChecked={sectionVisibility.templates}
                                onChange={(e) =>
                                    onSectionVisibilityChange({
                                        ...sectionVisibility,
                                        templates: e.target.checked,
                                    })
                                }
                            />
                        </HStack>
                    </VStack>
                </Box>

                {/* Info Box */}
                <Box
                    p={3}
                    bg={sectionBg}
                    borderRadius="md"
                    borderLeft="3px solid"
                    borderColor="blue.500"
                >
                    <VStack align="start" spacing={1}>
                        <HStack spacing={1.5}>
                            <Text fontSize="xs" fontWeight="600" color="blue.500">
                                💡 Homepage Tips
                            </Text>
                        </HStack>
                        <Text fontSize="xs" color={mutedColor}>
                            • Customize sections to match your workflow
                        </Text>
                        <Text fontSize="xs" color={mutedColor}>
                            • Quick Actions provide fast access to key tools
                        </Text>
                        <Text fontSize="xs" color={mutedColor}>
                            • Settings are saved automatically
                        </Text>
                    </VStack>
                </Box>
            </VStack>
        </VStack>
    );
}
