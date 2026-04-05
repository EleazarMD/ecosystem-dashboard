/**
 * Research Lab Page
 * 
 * Quick research queries and knowledge exploration
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Spinner,
} from '@chakra-ui/react';
import { Search, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export default function ResearchLab() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<string | null>(null);

  const bgPrimary = useSemanticToken('colors', 'bg.primary');
  const bgCard = useSemanticToken('colors', 'bg.card');
  const textPrimary = useSemanticToken('colors', 'text.primary');
  const textSecondary = useSemanticToken('colors', 'text.secondary');
  const accentColor = useSemanticToken('colors', 'accent.primary');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch('/api/nova/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          user_id: 'dashboard',
          conversation_id: `research-${Date.now()}`,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setResults(data.response || 'No results found.');
      }
    } catch (error) {
      console.error('Research query failed:', error);
      setResults('Failed to get results. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Box minH="100vh" bg={bgPrimary} p={6}>
      <VStack spacing={6} maxW="800px" mx="auto">
        <HStack w="100%" justify="space-between">
          <IconButton
            aria-label="Back"
            icon={<ArrowLeft />}
            variant="ghost"
            onClick={() => router.back()}
          />
          <Text fontSize="2xl" fontWeight="bold">Research Lab</Text>
          <Box w="40px" />
        </HStack>

        <InputGroup size="lg">
          <Input
            placeholder="Ask anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            bg={bgCard}
            border="none"
            borderRadius="full"
            _focus={{ boxShadow: `0 0 0 2px ${accentColor}` }}
          />
          <InputRightElement>
            <IconButton
              aria-label="Search"
              icon={isSearching ? <Spinner size="sm" /> : <Search />}
              variant="ghost"
              onClick={handleSearch}
              isDisabled={isSearching}
            />
          </InputRightElement>
        </InputGroup>

        {results && (
          <Box
            w="100%"
            p={6}
            bg={bgCard}
            borderRadius="xl"
          >
            <Text color={textPrimary} whiteSpace="pre-wrap">
              {results}
            </Text>
          </Box>
        )}

        {!results && (
          <VStack spacing={4} pt={8} color={textSecondary}>
            <Search size={48} />
            <Text>Ask Nova anything</Text>
            <Text fontSize="sm">Get quick answers, research topics, or explore ideas</Text>
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
