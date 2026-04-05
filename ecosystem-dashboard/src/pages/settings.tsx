import React from 'react';
import {
    Box,
    Heading,
    Text,
    VStack,
    HStack,
    Divider,
    Container,
    Icon,
    SimpleGrid,
} from '@chakra-ui/react';
import { FiUser, FiMoon, FiChevronRight } from 'react-icons/fi';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ThemeSelector } from '@/components/settings/ThemeSelector';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface SettingsCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    href: string;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ title, description, icon, href }) => {
    const textPrimary = useSemanticToken('text.primary');
    const textSecondary = useSemanticToken('text.secondary');

    return (
        <Link href={href} passHref legacyBehavior>
            <Box
                as="a"
                display="block"
                p={5}
                borderRadius="xl"
                border="1px solid"
                borderColor="gray.200"
                _dark={{ borderColor: 'gray.700' }}
                transition="all 0.2s"
                _hover={{
                    transform: 'translateY(-2px)',
                    shadow: 'md',
                    borderColor: 'blue.400',
                }}
                cursor="pointer"
            >
                <HStack justify="space-between">
                    <HStack spacing={4}>
                        <Box
                            p={3}
                            borderRadius="lg"
                            bg="blue.50"
                            _dark={{ bg: 'blue.900' }}
                        >
                            <Icon as={icon} boxSize={5} color="blue.500" />
                        </Box>
                        <VStack align="start" spacing={0}>
                            <Text fontWeight="semibold" color={textPrimary}>{title}</Text>
                            <Text fontSize="sm" color={textSecondary}>{description}</Text>
                        </VStack>
                    </HStack>
                    <Icon as={FiChevronRight} color={textSecondary} />
                </HStack>
            </Box>
        </Link>
    );
};

const SettingsPage = () => {
    const textSecondary = useSemanticToken('text.secondary');

    return (
        <DashboardLayout>
            <Container maxW="container.lg" py={8}>
                <VStack spacing={8} align="stretch">
                    <Box>
                        <Heading size="lg" mb={2}>Settings</Heading>
                        <Text color={textSecondary}>
                            Manage your dashboard preferences and configurations.
                        </Text>
                    </Box>

                    <Divider />

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <SettingsCard
                            title="Personal AI"
                            description="Manage AI personas, memory, and voice settings"
                            icon={FiUser}
                            href="/settings/personal-ai"
                        />
                    </SimpleGrid>

                    <Divider />

                    <Box>
                        <Heading size="md" mb={4}>Appearance</Heading>
                        <GlassPanel variant="light" p={6}>
                            <ThemeSelector />
                        </GlassPanel>
                    </Box>
                </VStack>
            </Container>
        </DashboardLayout>
    );
};

export default SettingsPage;
