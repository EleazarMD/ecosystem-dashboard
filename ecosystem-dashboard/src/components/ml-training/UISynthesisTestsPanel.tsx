/**
 * UI Synthesis Tests Panel
 * Displays test results for the Clinical UI Synthesis Engine
 * Tests query routing, intent detection, and dashboard selection
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Progress,
  Divider,
  Icon,
  Spinner,
  Collapse,
  useDisclosure,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { SimpleGlassPanel } from '@/components/ui/SimpleGlassPanel';

// API endpoint for the clinical agent server
const CLINICAL_API_URL = process.env.NEXT_PUBLIC_CLINICAL_API_URL || 'http://100.89.13.6:8007';

interface TestResult {
  query: string;
  category: string;
  description: string;
  passed: boolean;
  expected_intent: string;
  actual_intent: string;
  expected_dashboard: string;
  actual_dashboard: string;
  missing_cards: string[];
  error?: string;
}

interface CategoryStats {
  passed: number;
  failed: number;
}

interface TestSuiteResults {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  pass_rate: number;
  categories: Record<string, CategoryStats>;
  failures: TestResult[];
  tests: TestResult[];
}

export const UISynthesisTestsPanel: React.FC = () => {
  const [results, setResults] = useState<TestSuiteResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const bgPrimary = useSemanticToken('surface.base');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');

  const runTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${CLINICAL_API_URL}/api/ui-synthesis/tests`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to run tests');
      console.error('UI Synthesis test error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run tests on mount
  useEffect(() => {
    runTests();
  }, [runTests]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const getPassRateColor = (rate: number) => {
    if (rate >= 95) return 'green';
    if (rate >= 80) return 'yellow';
    if (rate >= 60) return 'orange';
    return 'red';
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <VStack align="start" spacing={1}>
          <HStack>
            <Icon as={BeakerIcon} boxSize={6} color="purple.400" />
            <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
              UI Synthesis Test Suite
            </Text>
          </HStack>
          <Text fontSize="sm" color={textSecondary}>
            Validates query routing, intent detection, and dashboard selection
          </Text>
        </VStack>
        <Button
          leftIcon={<Icon as={ArrowPathIcon} boxSize={4} />}
          colorScheme="purple"
          size="sm"
          onClick={runTests}
          isLoading={loading}
          loadingText="Running..."
        >
          Run Tests
        </Button>
      </HStack>

      {/* Error State */}
      {error && (
        <SimpleGlassPanel variant="light" p={4} borderColor="red.500" borderWidth={1}>
          <HStack>
            <Icon as={XCircleIcon} boxSize={5} color="red.400" />
            <Text color="red.400">{error}</Text>
          </HStack>
          <Text fontSize="sm" color={textSecondary} mt={2}>
            Make sure the clinical agent server is running at {CLINICAL_API_URL}
          </Text>
        </SimpleGlassPanel>
      )}

      {/* Loading State */}
      {loading && !results && (
        <VStack py={8}>
          <Spinner size="xl" color="purple.400" thickness="4px" />
          <Text color={textSecondary}>Running UI synthesis tests...</Text>
        </VStack>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Summary Stats */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <SimpleGlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel color={textSecondary}>Total Tests</StatLabel>
                <StatNumber color={textPrimary}>{results.total}</StatNumber>
                <StatHelpText>Query patterns</StatHelpText>
              </Stat>
            </SimpleGlassPanel>

            <SimpleGlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel color={textSecondary}>Passed</StatLabel>
                <StatNumber color="green.400">{results.passed}</StatNumber>
                <StatHelpText>
                  <Icon as={CheckCircleIcon} boxSize={4} color="green.400" mr={1} />
                  Correct routing
                </StatHelpText>
              </Stat>
            </SimpleGlassPanel>

            <SimpleGlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel color={textSecondary}>Failed</StatLabel>
                <StatNumber color={results.failed > 0 ? 'red.400' : 'green.400'}>
                  {results.failed}
                </StatNumber>
                <StatHelpText>
                  {results.failed > 0 ? (
                    <>
                      <Icon as={XCircleIcon} boxSize={4} color="red.400" mr={1} />
                      Needs attention
                    </>
                  ) : (
                    'All passing!'
                  )}
                </StatHelpText>
              </Stat>
            </SimpleGlassPanel>

            <SimpleGlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel color={textSecondary}>Pass Rate</StatLabel>
                <StatNumber color={`${getPassRateColor(results.pass_rate)}.400`}>
                  {results.pass_rate.toFixed(1)}%
                </StatNumber>
                <Progress
                  value={results.pass_rate}
                  size="sm"
                  colorScheme={getPassRateColor(results.pass_rate)}
                  mt={2}
                  borderRadius="full"
                />
              </Stat>
            </SimpleGlassPanel>
          </SimpleGrid>

          {/* Category Breakdown */}
          <SimpleGlassPanel variant="light" p={4}>
            <Text fontWeight="bold" color={textPrimary} mb={4}>
              Test Categories
            </Text>
            <VStack spacing={2} align="stretch">
              {Object.entries(results.categories).map(([category, stats]) => {
                const isExpanded = expandedCategories.has(category);
                const categoryTests = results.tests.filter(t => t.category === category);
                const passRate = (stats.passed / (stats.passed + stats.failed)) * 100;

                return (
                  <Box key={category}>
                    <HStack
                      p={3}
                      bg={isExpanded ? 'whiteAlpha.100' : 'transparent'}
                      borderRadius="md"
                      cursor="pointer"
                      onClick={() => toggleCategory(category)}
                      _hover={{ bg: 'whiteAlpha.50' }}
                    >
                      <Icon
                        as={isExpanded ? ChevronUpIcon : ChevronDownIcon}
                        boxSize={4}
                        color={textSecondary}
                      />
                      <Text flex={1} fontWeight="medium" color={textPrimary}>
                        {category}
                      </Text>
                      <HStack spacing={2}>
                        <Badge colorScheme="green" variant="subtle">
                          {stats.passed} passed
                        </Badge>
                        {stats.failed > 0 && (
                          <Badge colorScheme="red" variant="subtle">
                            {stats.failed} failed
                          </Badge>
                        )}
                        <Progress
                          value={passRate}
                          size="sm"
                          w="60px"
                          colorScheme={getPassRateColor(passRate)}
                          borderRadius="full"
                        />
                      </HStack>
                    </HStack>

                    <Collapse in={isExpanded}>
                      <VStack spacing={1} pl={8} pr={4} py={2} align="stretch">
                        {categoryTests.map((test, idx) => (
                          <HStack
                            key={idx}
                            p={2}
                            bg={test.passed ? 'green.900' : 'red.900'}
                            bgOpacity={0.2}
                            borderRadius="md"
                            fontSize="sm"
                          >
                            <Icon
                              as={test.passed ? CheckCircleIcon : XCircleIcon}
                              boxSize={4}
                              color={test.passed ? 'green.400' : 'red.400'}
                            />
                            <VStack align="start" spacing={0} flex={1}>
                              <Text color={textPrimary}>{test.description}</Text>
                              <Text fontSize="xs" color={textSecondary} noOfLines={1}>
                                {test.query}
                              </Text>
                            </VStack>
                            <VStack align="end" spacing={0}>
                              <Badge size="sm" colorScheme="purple" variant="outline">
                                {test.actual_intent}
                              </Badge>
                              <Text fontSize="xs" color={textSecondary}>
                                → {test.actual_dashboard}
                              </Text>
                            </VStack>
                          </HStack>
                        ))}
                      </VStack>
                    </Collapse>
                  </Box>
                );
              })}
            </VStack>
          </SimpleGlassPanel>

          {/* Failures Detail */}
          {results.failures.length > 0 && (
            <SimpleGlassPanel variant="light" p={4} borderColor="red.500" borderWidth={1}>
              <Text fontWeight="bold" color="red.400" mb={4}>
                Failed Tests ({results.failures.length})
              </Text>
              <VStack spacing={3} align="stretch">
                {results.failures.map((failure, idx) => (
                  <Box key={idx} p={3} bg="red.900" bgOpacity={0.2} borderRadius="md">
                    <HStack mb={2}>
                      <Icon as={XCircleIcon} boxSize={5} color="red.400" />
                      <Text fontWeight="medium" color={textPrimary}>
                        {failure.description}
                      </Text>
                      <Badge colorScheme="gray">{failure.category}</Badge>
                    </HStack>
                    <Text fontSize="sm" color={textSecondary} mb={2}>
                      Query: "{failure.query}"
                    </Text>
                    <SimpleGrid columns={2} spacing={2} fontSize="sm">
                      <Box>
                        <Text color={textSecondary}>Expected:</Text>
                        <Text color="green.300">
                          intent={failure.expected_intent}, dashboard={failure.expected_dashboard}
                        </Text>
                      </Box>
                      <Box>
                        <Text color={textSecondary}>Actual:</Text>
                        <Text color="red.300">
                          intent={failure.actual_intent}, dashboard={failure.actual_dashboard}
                        </Text>
                      </Box>
                    </SimpleGrid>
                    {failure.missing_cards.length > 0 && (
                      <Text fontSize="xs" color="orange.300" mt={2}>
                        Missing cards: {failure.missing_cards.join(', ')}
                      </Text>
                    )}
                  </Box>
                ))}
              </VStack>
            </SimpleGlassPanel>
          )}

          {/* Last Updated */}
          <Text fontSize="xs" color={textSecondary} textAlign="right">
            Last run: {new Date(results.timestamp).toLocaleString()}
          </Text>
        </>
      )}
    </VStack>
  );
};

export default UISynthesisTestsPanel;
