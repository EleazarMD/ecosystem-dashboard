/**
 * GooseMind Knowledge Base Panel
 * Right panel component for browsing KB entries
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    VStack,
    HStack,
    Heading,
    Text,
    Badge,
    Button,
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
    Spinner,
    Icon,
} from '@chakra-ui/react';
import { FiDatabase, FiRefreshCw, FiMail, FiCalendar, FiFileText } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Use HTTPS via Tailscale
const GOOSE_MIND_API = 'https://rtx-workstation.tailb64e64.ts.net:8031';

interface KBEntry {
    kb_key: string;
    category: string;
    raw_summary: string;
    version_date: string;
    source_type: string;
}

export default function GooseMindKnowledgePanel() {
    const textSecondary = useSemanticToken('text.secondary');
    const bgSubtle = useSemanticToken('bg.subtle');

    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<KBEntry[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${GOOSE_MIND_API}/kb?limit=20`);
            if (response.ok) setEntries(await response.json());
        } catch (error) {
            console.error('Error fetching KB:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getSourceIcon = (sourceType: string) => {
        if (sourceType === 'email') return FiMail;
        if (sourceType === 'calendar') return FiCalendar;
        return FiFileText;
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            'org_update': 'purple',
            'personal': 'blue',
            'project': 'green',
            'reference': 'orange',
        };
        return colors[category] || 'gray';
    };

    if (loading) {
        return (
            <VStack py={8}><Spinner /><Text fontSize="sm">Loading KB...</Text></VStack>
        );
    }

    return (
        <VStack spacing={4} align="stretch" p={4}>
            <HStack justify="space-between">
                <HStack>
                    <Icon as={FiDatabase} color="purple.400" />
                    <Heading size="sm">Knowledge Base</Heading>
                </HStack>
                <Button size="xs" leftIcon={<FiRefreshCw />} variant="ghost" onClick={fetchData}>
                    Refresh
                </Button>
            </HStack>

            <Text fontSize="xs" color={textSecondary}>
                {entries.length} entries in your personal KB
            </Text>

            {entries.length === 0 ? (
                <Box p={4} bg={bgSubtle} borderRadius="md" textAlign="center">
                    <Text fontSize="sm" color={textSecondary}>No KB entries yet</Text>
                    <Text fontSize="xs" color={textSecondary}>Process emails to populate your knowledge base</Text>
                </Box>
            ) : (
                <Accordion allowMultiple>
                    {entries.map((entry) => (
                        <AccordionItem key={entry.kb_key} border="none" mb={2}>
                            <AccordionButton
                                bg={bgSubtle}
                                borderRadius="md"
                                _hover={{ bg: 'whiteAlpha.200' }}
                                px={3}
                                py={2}
                            >
                                <HStack flex={1} spacing={2}>
                                    <Icon as={getSourceIcon(entry.source_type)} color="blue.400" boxSize={3} />
                                    <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                                        {entry.kb_key.split(':')[1] || entry.kb_key}
                                    </Text>
                                    <Badge size="sm" colorScheme={getCategoryColor(entry.category)}>
                                        {entry.category}
                                    </Badge>
                                </HStack>
                                <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel pb={2} px={3}>
                                <VStack align="stretch" spacing={2}>
                                    <Text fontSize="xs" color={textSecondary}>
                                        {entry.raw_summary}
                                    </Text>
                                    <HStack fontSize="xs" color={textSecondary}>
                                        <Text>Updated: {new Date(entry.version_date).toLocaleDateString()}</Text>
                                        <Text>•</Text>
                                        <Text>Source: {entry.source_type}</Text>
                                    </HStack>
                                </VStack>
                            </AccordionPanel>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </VStack>
    );
}
