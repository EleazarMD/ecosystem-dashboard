import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Link,
} from '@chakra-ui/react';
import {
  DocumentArrowDownIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  BookOpenIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { SimpleGlassPanel } from '../ui/SimpleGlassPanel';
import ReactMarkdown from 'react-markdown';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Citation {
  id: number;
  title: string;
  authors: string[];
  journal?: string;
  publisher?: string;
  year: number;
  volume?: string;
  pages?: string;
  doi?: string;
  url: string;
  type: 'peer-reviewed' | 'report' | 'article';
  impactFactor?: number;
}

interface IntermediateStep {
  type: 'reasoning' | 'web_search' | 'code_interpreter';
  phase: string;
  query?: string;
  sourcesFound?: number;
  summary: string;
  timestamp: string;
}

interface ResearchReportViewerProps {
  sessionId: string;
  question: string;
  executiveSummary: string;
  fullReport: string;
  citations: Citation[];
  intermediateSteps: IntermediateStep[];
  metadata: {
    model: string;
    totalSources: number;
    peerReviewedSources: number;
    processingTime: string;
    tokensUsed: {
      input: number;
      output: number;
    };
    estimatedCost: number;
  };
  onClose: () => void;
}

const ResearchReportViewer: React.FC<ResearchReportViewerProps> = ({
  sessionId,
  question,
  executiveSummary,
  fullReport,
  citations,
  intermediateSteps,
  metadata,
  onClose,
}) => {
  const [selectedTab, setSelectedTab] = useState(0);

  const isDark = false;
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  const handleExport = (format: 'pdf' | 'markdown' | 'latex' | 'bibtex') => {
    // In production, this would generate the appropriate format
    console.log(`Exporting as ${format}`);

    if (format === 'markdown') {
      const blob = new Blob([fullReport], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-report-${sessionId}.md`;
      a.click();
    } else if (format === 'bibtex') {
      const bibtex = citations.map(c => `@article{${c.authors[0].split(',')[0]}${c.year},
  title={${c.title}},
  author={${c.authors.join(' and ')}},
  journal={${c.journal || c.publisher}},
  year={${c.year}},
  ${c.volume ? `volume={${c.volume}},` : ''}
  ${c.pages ? `pages={${c.pages}},` : ''}
  ${c.doi ? `doi={${c.doi}}` : ''}
}`).join('\n\n');

      const blob = new Blob([bibtex], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `citations-${sessionId}.bib`;
      a.click();
    }
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Box>
      {/* Header */}
      <SimpleGlassPanel variant="medium">
        <VStack align="stretch" spacing={4} p={6}>
          <HStack justify="space-between">
            <Box flex={1}>
              <Heading size="md" color={textColor} mb={2}>
                Research Report
              </Heading>
              <Text color={mutedColor} fontSize="sm" noOfLines={2}>
                {question}
              </Text>
            </Box>

            <HStack>
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={<ChevronDownIcon width={16} height={16} />}
                  colorScheme="blue"
                  size="sm"
                >
                  Export
                </MenuButton>
                <MenuList>
                  <MenuItem
                    icon={<DocumentTextIcon width={16} height={16} />}
                    onClick={() => handleExport('markdown')}
                  >
                    Markdown (.md)
                  </MenuItem>
                  <MenuItem
                    icon={<DocumentArrowDownIcon width={16} height={16} />}
                    onClick={() => handleExport('pdf')}
                  >
                    PDF (.pdf)
                  </MenuItem>
                  <MenuItem onClick={() => handleExport('latex')}>
                    LaTeX (.tex)
                  </MenuItem>
                  <MenuItem onClick={() => handleExport('bibtex')}>
                    BibTeX (.bib)
                  </MenuItem>
                </MenuList>
              </Menu>

              <Button size="sm" variant="ghost" onClick={onClose}>
                Close
              </Button>
            </HStack>
          </HStack>

          {/* Metadata */}
          <HStack spacing={6} fontSize="sm" color={mutedColor} flexWrap="wrap">
            <HStack>
              <ClockIcon width={16} height={16} />
              <Text>{metadata.processingTime}</Text>
            </HStack>
            <Text>•</Text>
            <Text>{metadata.totalSources} sources</Text>
            <Text>•</Text>
            <Text>{metadata.peerReviewedSources} peer-reviewed</Text>
            <Text>•</Text>
            <Badge colorScheme="green">
              Model: {metadata.model.includes('o3') ? 'o3' : 'o4-mini'}
            </Badge>
            <Text>•</Text>
            <Text fontWeight="semibold">Cost: ${metadata.estimatedCost.toFixed(2)}</Text>
          </HStack>
        </VStack>
      </SimpleGlassPanel>

      {/* Content Tabs */}
      <Box mt={6}>
        <Tabs
          variant="enclosed"
          colorScheme="blue"
          index={selectedTab}
          onChange={setSelectedTab}
        >
          <TabList>
            <Tab>Executive Summary</Tab>
            <Tab>Full Report</Tab>
            <Tab>Citations ({citations.length})</Tab>
            <Tab>Research Timeline</Tab>
          </TabList>

          <TabPanels>
            {/* Executive Summary */}
            <TabPanel p={0} pt={4}>
              <SimpleGlassPanel variant="light">
                <Box p={6} className="markdown-content">
                  <ReactMarkdown>{executiveSummary}</ReactMarkdown>
                </Box>
              </SimpleGlassPanel>
            </TabPanel>

            {/* Full Report */}
            <TabPanel p={0} pt={4}>
              <SimpleGlassPanel variant="light">
                <Box p={6} className="markdown-content" maxW="900px" mx="auto">
                  <ReactMarkdown>{fullReport}</ReactMarkdown>
                </Box>
              </SimpleGlassPanel>
            </TabPanel>

            {/* Citations */}
            <TabPanel p={0} pt={4}>
              <SimpleGlassPanel variant="light">
                <VStack align="stretch" spacing={4} p={6}>
                  {citations.map((citation) => (
                    <Box
                      key={citation.id}
                      p={4}
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="md"
                      bg={isDark ? 'gray.900' : 'white'}
                    >
                      <VStack align="stretch" spacing={2}>
                        <HStack justify="space-between" align="start">
                          <Box flex={1}>
                            <HStack mb={1}>
                              <Badge colorScheme="blue" fontSize="xs">
                                [{citation.id}]
                              </Badge>
                              {citation.type === 'peer-reviewed' && (
                                <Badge colorScheme="green" fontSize="xs">
                                  Peer-Reviewed
                                </Badge>
                              )}
                              {citation.impactFactor && (
                                <Badge colorScheme="purple" fontSize="xs">
                                  IF: {citation.impactFactor}
                                </Badge>
                              )}
                            </HStack>
                            <Text fontWeight="semibold" color={textColor} fontSize="md">
                              {citation.title}
                            </Text>
                            <Text fontSize="sm" color={mutedColor} mt={1}>
                              {citation.authors.join(', ')}
                            </Text>
                            <Text fontSize="sm" color={mutedColor}>
                              {citation.journal || citation.publisher} ({citation.year})
                              {citation.volume && `, ${citation.volume}`}
                              {citation.pages && `, pp. ${citation.pages}`}
                            </Text>
                          </Box>
                        </HStack>

                        {(citation.doi || citation.url) && (
                          <HStack spacing={3} pt={2}>
                            {citation.doi && (
                              <Link
                                href={`https://doi.org/${citation.doi}`}
                                isExternal
                                fontSize="sm"
                                color="blue.500"
                              >
                                DOI: {citation.doi}
                              </Link>
                            )}
                            {citation.url && !citation.doi && (
                              <Link
                                href={citation.url}
                                isExternal
                                fontSize="sm"
                                color="blue.500"
                              >
                                View Source
                              </Link>
                            )}
                          </HStack>
                        )}
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              </SimpleGlassPanel>
            </TabPanel>

            {/* Research Timeline */}
            <TabPanel p={0} pt={4}>
              <SimpleGlassPanel variant="light">
                <VStack align="stretch" spacing={0} p={6}>
                  {intermediateSteps.map((step, index) => (
                    <Box key={index}>
                      <HStack spacing={4} align="start">
                        <Box
                          w="40px"
                          h="40px"
                          borderRadius="full"
                          bg={
                            step.type === 'reasoning'
                              ? 'purple.500'
                              : step.type === 'web_search'
                                ? 'blue.500'
                                : 'orange.500'
                          }
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          color="whiteAlpha.900"
                          fontSize="xs"
                          fontWeight="bold"
                          flexShrink={0}
                        >
                          {index + 1}
                        </Box>

                        <Box flex={1} pb={6}>
                          <HStack mb={1}>
                            <Text fontWeight="semibold" color={textColor}>
                              {step.phase}
                            </Text>
                            <Badge
                              colorScheme={
                                step.type === 'reasoning'
                                  ? 'purple'
                                  : step.type === 'web_search'
                                    ? 'blue'
                                    : 'orange'
                              }
                              fontSize="xs"
                            >
                              {step.type.replace('_', ' ')}
                            </Badge>
                          </HStack>

                          <Text fontSize="sm" color={mutedColor} mb={1}>
                            {step.summary}
                          </Text>

                          {step.query && (
                            <Text fontSize="xs" color={mutedColor} fontStyle="italic">
                              Query: "{step.query}"
                            </Text>
                          )}

                          {step.sourcesFound && (
                            <Text fontSize="xs" color={mutedColor}>
                              Sources found: {step.sourcesFound}
                            </Text>
                          )}

                          <Text fontSize="xs" color={mutedColor} mt={1}>
                            {formatTimestamp(step.timestamp)}
                          </Text>
                        </Box>
                      </HStack>

                      {index < intermediateSteps.length - 1 && (
                        <Box
                          w="2px"
                          h="20px"
                          bg={borderColor}
                          ml="19px"
                          mb={2}
                        />
                      )}
                    </Box>
                  ))}
                </VStack>
              </SimpleGlassPanel>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <style jsx global>{`
        .markdown-content {
          line-height: 1.8;
        }
        .markdown-content h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .markdown-content h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 1.2em;
          margin-bottom: 0.5em;
        }
        .markdown-content h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        .markdown-content p {
          margin-bottom: 1em;
        }
        .markdown-content ul, .markdown-content ol {
          margin-left: 1.5em;
          margin-bottom: 1em;
        }
        .markdown-content li {
          margin-bottom: 0.5em;
        }
        .markdown-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        .markdown-content th, .markdown-content td {
          border: 1px solid #e2e8f0;
          padding: 0.75em;
          text-align: left;
        }
        .markdown-content th {
          background-color: #f7fafc;
          font-weight: 600;
        }
      `}</style>
    </Box>
  );
};

export default ResearchReportViewer;
