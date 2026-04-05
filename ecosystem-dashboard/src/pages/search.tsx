import React, { useState } from 'react';
import { Box, Container, VStack, Text, Icon, Button, Flex } from '@chakra-ui/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { SearchInputHero } from '@/components/search/SearchInputHero';
import { SearchResultsStream } from '@/components/search/SearchResultsStream';
import { useGooseSearch } from '@/hooks/useGooseSearch';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
    HomeIcon,
    MagnifyingGlassIcon,
    BookOpenIcon,
    PlusIcon
} from '@heroicons/react/24/outline';

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [focusMode, setFocusMode] = useState('webSearch');
    const [activeTab, setActiveTab] = useState('search');

    const { search, isLoading, results, error } = useGooseSearch();

    // Use dashboard theme
    const bgColor = useSemanticToken('surface.base');
    const sidebarBg = useSemanticToken('surface.default');
    const borderColor = useSemanticToken('border.subtle');
    const textColor = useSemanticToken('text.primary');
    const textSecondary = useSemanticToken('text.secondary');

    const handleSearch = async (newQuery: string) => {
        setQuery(newQuery);
        await search(newQuery, focusMode);
    };

    const hasResults = !!results || isLoading;

    const sidebarItems = [
        { id: 'home', label: 'Home', icon: HomeIcon },
        { id: 'search', label: 'Search', icon: MagnifyingGlassIcon },
        { id: 'library', label: 'Library', icon: BookOpenIcon },
    ];

    return (
        <DashboardLayout>
            <Flex minH="calc(100vh - 64px)">
                {/* Perplexica-style Sidebar (nested inside dashboard) */}
                <Box
                    w="60px"
                    bg={sidebarBg}
                    borderRight="1px solid"
                    borderColor={borderColor}
                    py={4}
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    gap={2}
                >
                    {/* New Thread Button */}
                    <Button
                        size="sm"
                        variant="solid"
                        bg="transparent"
                        color={textSecondary}
                        _hover={{ bg: useSemanticToken('surface.hover'), color: textColor }}
                        _active={{ bg: useSemanticToken('surface.hover') }}
                        borderRadius="md"
                        p={2}
                        mb={4}
                        minW="auto"
                        h="auto"
                    >
                        <PlusIcon width={20} />
                    </Button>

                    {/* Sidebar Items */}
                    {sidebarItems.map((item) => (
                        <Button
                            key={item.id}
                            size="sm"
                            variant="solid"
                            color={activeTab === item.id ? textColor : textSecondary}
                            bg={activeTab === item.id ? useSemanticToken('surface.hover') : 'transparent'}
                            _hover={{ bg: useSemanticToken('surface.hover'), color: textColor }}
                            _active={{ bg: useSemanticToken('surface.hover') }}
                            borderRadius="md"
                            p={2}
                            onClick={() => setActiveTab(item.id)}
                            minW="auto"
                            h="auto"
                        >
                            <Icon as={item.icon} w={5} h={5} />
                        </Button>
                    ))}
                </Box>

                {/* Main Content */}
                <Box flex={1} position="relative" bg={bgColor}>
                    <Container maxW="3xl" pt={hasResults ? 8 : "30vh"} pb={32} transition="all 0.5s ease">
                        <VStack spacing={8} align="stretch">

                            {/* Hero Section */}
                            {!hasResults && activeTab === 'search' && (
                                <Box textAlign="center" mb={8}>
                                    <Text fontSize="5xl" fontWeight="bold" color={textColor} mb={4}>
                                        Research begins here.
                                    </Text>
                                </Box>
                            )}

                            {/* Search Input */}
                            {!hasResults && activeTab === 'search' && (
                                <SearchInputHero
                                    onSearch={handleSearch}
                                    isCompact={false}
                                    mode={focusMode}
                                    onModeChange={setFocusMode}
                                />
                            )}

                            {/* Error Message */}
                            {error && (
                                <Box p={4} bg="red.900" color="red.200" borderRadius="md">
                                    Error: {error}
                                </Box>
                            )}

                            {/* Results Section */}
                            {hasResults && activeTab === 'search' && (
                                <>
                                    {/* User Query */}
                                    <Box>
                                        <Text fontSize="3xl" fontWeight="600" color={textColor}>
                                            {query}
                                        </Text>
                                    </Box>

                                    <SearchResultsStream
                                        isLoading={isLoading}
                                        results={results}
                                        mode={focusMode === 'knowledgeBase' ? 'rag' : 'web'}
                                    />
                                </>
                            )}

                            {/* Home Tab */}
                            {activeTab === 'home' && (
                                <Box textAlign="center" color={textSecondary} py={20}>
                                    <Text fontSize="xl">Welcome to Entropy AI</Text>
                                </Box>
                            )}

                            {/* Library Tab */}
                            {activeTab === 'library' && (
                                <Box textAlign="center" color={textSecondary} py={20}>
                                    <Text fontSize="xl">Your library is empty</Text>
                                </Box>
                            )}

                        </VStack>
                    </Container>

                    {/* Fixed Input at Bottom (when results exist) */}
                    {hasResults && activeTab === 'search' && (
                        <Box
                            position="fixed"
                            bottom={0}
                            left="calc(240px + 60px)"
                            right={0}
                            bg={bgColor}
                            borderTop="1px solid"
                            borderColor={borderColor}
                            py={4}
                            zIndex={100}
                        >
                            <Container maxW="3xl">
                                <SearchInputHero
                                    onSearch={handleSearch}
                                    isCompact={true}
                                    mode={focusMode}
                                    onModeChange={setFocusMode}
                                />
                            </Container>
                        </Box>
                    )}
                </Box>
            </Flex>
        </DashboardLayout>
    );
}
