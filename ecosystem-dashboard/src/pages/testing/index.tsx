import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  VStack,
  Link,
  Divider,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Select,
  Flex,
  Button,
  Code,
  useToast,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import TestCoverageChart, { ChartData } from '@/components/testing/TestCoverageChart';
import TestReportSummary, { JestReport } from '@/components/testing/TestReportSummary';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface TestRegistryEntry {
  testCategory: string;
  testPattern: string;
  typescriptStatus: string;
  pythonStatus: string;
  otherLanguagesStatus: string;
}

interface TestRegistryData {
  frontmatter: Record<string, any>;
  registry: TestRegistryEntry[];
  patternsMarkdown: string;
  implementationGuideMarkdown: string;
}

const TestingSuitePage: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [testOutput, setTestOutput] = useState('');
  const [testReport, setTestReport] = useState<JestReport | null>(null);
  const [selectedSuite, setSelectedSuite] = useState('ahis-server-ts');
  const toast = useToast();
  const outputBg = useSemanticToken('surface.base');
  const outputColor = useSemanticToken('text.primary');
  const implementedBg = useSemanticToken('status.successSubtle');
  const partialBg = useSemanticToken('status.warningSubtle');
  const missingBg = useSemanticToken('status.errorSubtle');
  const [registryData, setRegistryData] = useState<TestRegistryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRegistryData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/testing/registry');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setRegistryData(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRegistryData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="calc(100vh - 200px)">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error" mt={4}>
        <AlertIcon />
        Error loading Test Registry: {error}
      </Alert>
    );
  }

  if (!registryData) {
    return <Text>No test registry data found.</Text>;
  }

  const { frontmatter, registry, patternsMarkdown, implementationGuideMarkdown } = registryData;

  const processRegistryForChart = (registryEntries: TestRegistryEntry[]): ChartData => {
    const statuses = {
      implemented: '✅ Implemented',
      partial: '✅ Partial',
      missing: '❌ Missing',
    };

    let tsImplemented = 0;
    let tsPartial = 0;
    let tsMissing = 0;
    let pyImplemented = 0;
    let pyPartial = 0;
    let pyMissing = 0;

    registryEntries.forEach(entry => {
      // TypeScript
      if (entry.typescriptStatus.includes(statuses.implemented)) tsImplemented++;
      else if (entry.typescriptStatus.includes(statuses.partial)) tsPartial++;
      else if (entry.typescriptStatus.includes(statuses.missing)) tsMissing++;
      // Python
      if (entry.pythonStatus.includes(statuses.implemented)) pyImplemented++;
      else if (entry.pythonStatus.includes(statuses.partial)) pyPartial++;
      else if (entry.pythonStatus.includes(statuses.missing)) pyMissing++;
    });

    return {
      labels: ['TypeScript', 'Python'],
      datasets: [
        {
          label: 'Implemented',
          data: [tsImplemented, pyImplemented],
          backgroundColor: implementedBg,
        },
        {
          label: 'Partial',
          data: [tsPartial, pyPartial],
          backgroundColor: partialBg,
        },
        {
          label: 'Missing',
          data: [tsMissing, pyMissing],
          backgroundColor: missingBg,
        },
      ],
    };
  };

  const chartData = processRegistryForChart(registry);

  const handleRunTests = async () => {
    setIsTesting(true);
    setTestOutput('');
    setTestReport(null);

    try {
      const response = await fetch('/api/testing/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ suite: selectedSuite }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader.');
      }

      const decoder = new TextDecoder();
      let fullOutput = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setTestOutput((prev) => prev + chunk);
        fullOutput += chunk;
      }

      // Check for and parse the Jest report
      const reportStartIndex = fullOutput.indexOf('---JEST_REPORT_START---');
      const reportEndIndex = fullOutput.indexOf('---JEST_REPORT_END---');
      if (reportStartIndex !== -1 && reportEndIndex !== -1) {
        const reportJsonString = fullOutput.substring(reportStartIndex + '---JEST_REPORT_START---'.length, reportEndIndex);
        try {
          const reportJson = JSON.parse(reportJsonString);
          setTestReport(reportJson);
        } catch (e) {
          console.error('Failed to parse Jest report JSON:', e);
          toast({
            title: 'Report Parsing Error',
            description: 'Could not parse the test report from the server.',
            status: 'warning',
            isClosable: true,
          });
        }
      }
    } catch (error: any) {
      console.error('Test execution failed:', error);
      toast({
        title: 'Test Execution Failed',
        description: error.message,
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
      setTestOutput((prev) => prev + `\n--- ERROR: ${error.message} ---\n`);
    } finally {
      setIsTesting(false);
    }
  };

  const renderMarkdown = (markdownContent: string) => {
    if (typeof window !== 'undefined') { // Ensure DOMPurify runs only client-side
      const dirtyHtml = marked.parse(markdownContent) as string;
      return DOMPurify.sanitize(dirtyHtml);
    }
    return ''; // Or some server-side placeholder/raw markdown
  };

  return (
    <Box p={5}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg" mb={4}>{frontmatter?.title || 'AI Homelab Ecosystem Test Registry'}</Heading>
        <Text mb={6} fontSize="lg">{frontmatter?.description || 'Centralized overview of test coverage and standards.'}</Text>

        {/* Test Coverage Chart */}
        <Box mb={10}>
          <TestCoverageChart data={chartData} title="Core Test Pattern Coverage Status" />
        </Box>

        {/* Test Execution Section */}
        <Card>
          <CardHeader><Heading size='md'>Run Ecosystem Tests</Heading></CardHeader>
          <CardBody>
            <Flex direction={{ base: 'column', md: 'row' }} align="center" gap={4}>
              <Select 
                value={selectedSuite} 
                onChange={(e) => setSelectedSuite(e.target.value)}
                disabled={isTesting}
                maxW={{ md: '300px' }}
              >
                <option value="ahis-server-ts">AHIS Server (TypeScript)</option>
                {/* Add more options here as they become available in the API */}
              </Select>
              <Button 
                onClick={handleRunTests} 
                isLoading={isTesting}
                loadingText="Running..."
                colorScheme="purple"
                leftIcon={isTesting ? <Spinner size="sm" /> : undefined}
              >
                Run Tests
              </Button>
            </Flex>
            {testOutput && (
              <>
                {testReport && <TestReportSummary report={testReport} />}
                <Box
                  mt={6}
                  p={4}
                  bg={outputBg}
                  color={outputColor}
                  borderRadius="md"
                  maxH="400px"
                  overflowY="auto"
                  fontFamily="monospace"
                  whiteSpace="pre-wrap"
                >
                  <Code w="100%" bg="transparent">{testOutput}</Code>
                </Box>
              </>
            )}
          </CardBody>
        </Card>

        <Divider />

        <Card>
          <CardHeader>
            <Heading as="h2" size="lg">
              Core Test Requirements Matrix
            </Heading>
          </CardHeader>
          <CardBody>
            {registry.length > 0 ? (
              <TableContainer>
                <Table variant="striped">
                  <Thead>
                    <Tr>
                      <Th>Test Category</Th>
                      <Th>Test Pattern</Th>
                      <Th>TypeScript (ahis-server-ts)</Th>
                      <Th>Python (ahis-server)</Th>
                      <Th>Other Languages</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {registry.map((entry, index) => (
                      <Tr key={index}>
                        <Td fontWeight={entry.testPattern.trim() === '' ? 'bold' : 'normal'}>{entry.testCategory}</Td>
                        <Td>{entry.testPattern}</Td>
                        <Td>{entry.typescriptStatus}</Td>
                        <Td>{entry.pythonStatus}</Td>
                        <Td>{entry.otherLanguagesStatus}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            ) : (
              <Text>No registry entries found in the 'Core Test Requirements Matrix'. Check the API and markdown file.</Text>
            )}
          </CardBody>
        </Card>

        <Divider />

        <Heading as="h2" size="lg" mt={4}>
          Testing Documentation & Guides
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Card>
            <CardHeader><Heading size='md'>AHIS Testing Patterns</Heading></CardHeader>
            <CardBody>
              <Text mb={2}>Standardized testing patterns for AHIS components across different platforms and implementations.</Text>
              <Box 
                className="markdown-content" 
                dangerouslySetInnerHTML={{ __html: renderMarkdown(patternsMarkdown) }} 
                sx={{
                  '& h1': { fontSize: '2xl', fontWeight: 'bold', mt: 4, mb: 2 },
                  '& h2': { fontSize: 'xl', fontWeight: 'bold', mt: 3, mb: 1 },
                  '& h3': { fontSize: 'lg', fontWeight: 'bold', mt: 2, mb: 1 },
                  '& p': { mb: 2 },
                  '& ul, & ol': { ml: 6, mb: 2 },
                  '& li': { mb: 1 },
                  '& pre': { backgroundColor: 'gray.50', p: 3, borderRadius: 'md', overflowX: 'auto', mb:2 },
                  '& code': { fontFamily: 'monospace', backgroundColor: 'gray.100', px:1, py:0.5, borderRadius:'sm' },
                  '& a': { color: 'teal.500', textDecoration: 'underline' },
                }}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader><Heading size='md'>AHIS Test Implementation Guide</Heading></CardHeader>
            <CardBody>
              <Text mb={2}>Practical implementation guidelines for creating consistent tests across AHIS platform implementations.</Text>
              <Box 
                className="markdown-content" 
                dangerouslySetInnerHTML={{ __html: renderMarkdown(implementationGuideMarkdown) }} 
                sx={{
                  '& h1': { fontSize: '2xl', fontWeight: 'bold', mt: 4, mb: 2 },
                  '& h2': { fontSize: 'xl', fontWeight: 'bold', mt: 3, mb: 1 },
                  '& h3': { fontSize: 'lg', fontWeight: 'bold', mt: 2, mb: 1 },
                  '& p': { mb: 2 },
                  '& ul, & ol': { ml: 6, mb: 2 },
                  '& li': { mb: 1 },
                  '& pre': { backgroundColor: 'gray.50', p: 3, borderRadius: 'md', overflowX: 'auto', mb:2 },
                  '& code': { fontFamily: 'monospace', backgroundColor: 'gray.100', px:1, py:0.5, borderRadius:'sm' },
                  '& a': { color: 'teal.500', textDecoration: 'underline' },
                }}
              />
            </CardBody>
          </Card>
        </SimpleGrid>

      </VStack>
    </Box>
  );
};

export default TestingSuitePage;
