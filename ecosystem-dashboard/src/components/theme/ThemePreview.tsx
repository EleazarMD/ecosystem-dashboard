import React from 'react';
import { Box, Flex, Text, Button, VStack, HStack, Badge, Input } from '@chakra-ui/react';
import { ThemePreset } from '../../theme/types';

interface ThemePreviewProps {
    preset: ThemePreset;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({ preset }) => {
    // We manually apply styles here to simulate the theme without actually switching the global theme context
    // This allows for "previewing" before applying.

    const { colors, radii, typography, glassBlur } = preset;

    const cardStyle = {
        bg: colors.glassBackground,
        backdropFilter: `blur(${glassBlur})`,
        border: colors.glassBorder,
        borderRadius: radii.card,
        boxShadow: preset.shadows.card,
        p: 4,
    };

    return (
        <Box
            w="100%"
            h="300px"
            bg={colors.background}
            color={colors.text}
            borderRadius="lg"
            overflow="hidden"
            position="relative"
            fontFamily={typography.fontBody}
            border="1px solid"
            borderColor="whiteAlpha.200"
        >
            {/* Background Pattern/Image Simulation */}
            <Box
                position="absolute"
                top={0} left={0} right={0} bottom={0}
                bg={colors.backgroundSecondary}
                opacity={0.5}
                zIndex={0}
            />

            <Flex h="100%" position="relative" zIndex={1}>
                {/* Sidebar */}
                <Box w="60px" borderRight={`1px solid ${colors.border}`} py={4} display="flex" flexDirection="column" alignItems="center" gap={4}>
                    <Box w="32px" h="32px" borderRadius="full" bg={colors.primary} />
                    <Box w="24px" h="24px" borderRadius="md" bg={colors.secondary} opacity={0.5} />
                    <Box w="24px" h="24px" borderRadius="md" bg={colors.secondary} opacity={0.5} />
                    <Box w="24px" h="24px" borderRadius="md" bg={colors.secondary} opacity={0.5} />
                </Box>

                {/* Main Content */}
                <Box flex={1} p={4}>
                    {/* Header */}
                    <Flex justify="space-between" align="center" mb={6}>
                        <Text fontSize="lg" fontWeight="bold" fontFamily={typography.fontHeading}>Dashboard</Text>
                        <HStack>
                            <Box w="8px" h="8px" borderRadius="full" bg="green.400" />
                            <Text fontSize="xs" color={colors.textMuted}>Online</Text>
                        </HStack>
                    </Flex>

                    {/* Content Grid */}
                    <HStack align="stretch" spacing={4}>
                        {/* Card 1: Stats */}
                        <Box {...cardStyle} flex={1}>
                            <Text fontSize="xs" color={colors.textMuted} mb={1}>TOTAL REVENUE</Text>
                            <Text fontSize="2xl" fontWeight="bold" color={colors.text}>$45,231</Text>
                            <Badge
                                bg={colors.accent}
                                color={colors.textInverse}
                                borderRadius="full"
                                px={2}
                                fontSize="xs"
                                mt={2}
                            >
                                +20.1%
                            </Badge>
                        </Box>

                        {/* Card 2: Form */}
                        <Box {...cardStyle} flex={1}>
                            <VStack align="stretch" spacing={3}>
                                <Box>
                                    <Text fontSize="xs" mb={1}>Username</Text>
                                    <Box
                                        h="32px"
                                        border={`1px solid ${colors.border}`}
                                        borderRadius={radii.input}
                                        bg={colors.backgroundTertiary}
                                    />
                                </Box>
                                <Button
                                    size="sm"
                                    bg={colors.primary}
                                    color={colors.textInverse}
                                    _hover={{ bg: colors.primaryHover }}
                                    borderRadius={radii.button}
                                    h="32px"
                                >
                                    Update
                                </Button>
                            </VStack>
                        </Box>
                    </HStack>
                </Box>
            </Flex>
        </Box>
    );
};
