/**
 * Research Report Viewer
 * Displays completed research reports in organized, formatted cards
 */

import React, { useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Badge,
  Divider,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Code,
} from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FiFileText, FiMic, FiBook, FiDollarSign, FiClock, FiCpu } from 'react-icons/fi';
import ResearchReportExportMenu from './ResearchReportExportMenu';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface SourceItem {
  title?: string;
  url?: string;
  snippet?: string;
}

interface ResearchReportViewerProps {
  report: string;
  question: string;
  sessionId?: string;
  sources?: SourceItem[];
  metadata?: {
    model?: string;
    cost?: number;
    inputTokens?: number;
    outputTokens?: number;
    duration?: number;
    completedAt?: string;
  };
}

interface ParsedReport {
  executiveSummary?: string;
  mainBody: string;
  podcastScript?: string;
  references?: string;
}

export default function ResearchReportViewer({
  report,
  question,
  sessionId,
  sources = [],
  metadata = {},
}: ResearchReportViewerProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const headingColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const statBg = useSemanticToken('surface.base');
  
  // Add markdown styling
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .markdown-content h1 { font-size: 1.875rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 1rem; }
      .markdown-content h2 { font-size: 1.5rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.875rem; }
      .markdown-content h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.75rem; }
      .markdown-content p { margin-bottom: 1rem; line-height: 1.625; }
      .markdown-content ul, .markdown-content ol { margin-bottom: 1rem; margin-left: 1.5rem; }
      .markdown-content li { margin-bottom: 0.5rem; }
      .markdown-content code { background-color: rgba(0,0,0,0.05); padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.875em; }
      .markdown-content pre { background-color: rgba(0,0,0,0.05); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1rem; }
      .markdown-content blockquote { border-left: 4px solid rgba(0,0,0,0.1); padding-left: 1rem; margin-left: 0; font-style: italic; }
      .markdown-content table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 1.5rem 0; 
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border-radius: 0.5rem;
        overflow: hidden;
      }
      .markdown-content th, .markdown-content td { 
        border: 1px solid rgba(0,0,0,0.1); 
        padding: 0.75rem 1rem; 
        text-align: left; 
        vertical-align: top;
      }
      .markdown-content th { 
        background-color: rgba(99, 102, 241, 0.1); 
        font-weight: 600; 
        color: rgba(99, 102, 241, 1);
        border-bottom: 2px solid rgba(99, 102, 241, 0.3);
      }
      .markdown-content tbody tr:nth-child(even) {
        background-color: rgba(0,0,0,0.02);
      }
      .markdown-content tbody tr:hover {
        background-color: rgba(99, 102, 241, 0.05);
      }
      .markdown-content a { color: #3182ce; text-decoration: underline; }
      .markdown-content strong {
        font-weight: 600;
        color: rgba(0,0,0,0.85);
      }
      /* Style paragraphs directly before tables (table captions) */
      .markdown-content p + table {
        margin-top: 0.5rem;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Preprocess report to clean up table formatting
  const cleanReport = useMemo(() => {
    if (!report) return '';
    
    // Remove <table> and </table> tags but keep the markdown content inside
    let cleaned = report.replace(/<table>\s*/gi, '\n').replace(/<\/table>/gi, '\n');
    
    // Remove <caption> tags and convert to bold text above table
    // Preserve any markdown bold markers (**) in the caption
    cleaned = cleaned.replace(/<caption>(.*?)<\/caption>\s*/gi, (_, caption) => {
      // Strip extra bold markers if they're wrapping the whole caption
      const trimmedCaption = caption.trim();
      return `\n**${trimmedCaption.replace(/^\*\*|\*\*$/g, '')}**\n\n`;
    });
    
    return cleaned;
  }, [report]);

  // Parse report into sections
  const parsedReport = useMemo((): ParsedReport => {
    if (!cleanReport) return { mainBody: '' };

    // Split by major section headers
    const executiveSummaryMatch = cleanReport.match(/# Executive Summary\s*([\s\S]*?)(?=\n#{1,2}\s|\n# Podcast|$)/i);
    const podcastMatch = cleanReport.match(/# Podcast.*?\s*([\s\S]*?)(?=\n#{1,2}\s[^P]|$)/i);
    const referencesMatch = cleanReport.match(/# References?\s*([\s\S]*?)$/i);

    let mainBody = cleanReport;
    
    // Remove executive summary from main body
    if (executiveSummaryMatch) {
      mainBody = mainBody.replace(executiveSummaryMatch[0], '').trim();
    }
    
    // Remove podcast section from main body
    if (podcastMatch) {
      mainBody = mainBody.replace(podcastMatch[0], '').trim();
    }
    
    // Remove references from main body
    if (referencesMatch) {
      mainBody = mainBody.replace(referencesMatch[0], '').trim();
    }

    return {
      executiveSummary: executiveSummaryMatch?.[1]?.trim(),
      mainBody: mainBody || cleanReport,
      podcastScript: podcastMatch?.[1]?.trim(),
      references: referencesMatch?.[1]?.trim(),
    };
  }, [cleanReport]);

  const formatCost = (cost?: number) => {
    if (!cost) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(cost);
  };

  const formatTokens = (tokens?: number) => {
    if (!tokens) return '0';
    return new Intl.NumberFormat('en-US').format(tokens);
  };

  return (
    <VStack align="stretch" spacing={6} w="full">
      {/* Research Question */}
      <Card bg={bgColor} borderColor="blue.500" borderWidth="2px" shadow="md">
        <CardHeader pb={2}>
          <HStack justify="space-between">
            <HStack>
              <FiFileText />
              <Heading size="sm" color={headingColor}>Research Question</Heading>
            </HStack>
            {sessionId && (
              <ResearchReportExportMenu
                sessionId={sessionId}
                sessionTitle={question}
                report={report}
                sources={sources}
              />
            )}
          </HStack>
        </CardHeader>
        <CardBody pt={2}>
          <Text fontSize="md" fontWeight="500">{question}</Text>
        </CardBody>
      </Card>

      {/* Metadata Stats */}
      {metadata && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          {metadata.cost !== undefined && (
            <Card bg={statBg} borderColor={borderColor} borderWidth="1px">
              <CardBody p={4}>
                <Stat size="sm">
                  <HStack spacing={2} mb={1}>
                    <FiDollarSign size={14} />
                    <StatLabel fontSize="xs">Cost</StatLabel>
                  </HStack>
                  <StatNumber fontSize="lg">{formatCost(metadata.cost)}</StatNumber>
                  <StatHelpText fontSize="xs" mb={0}>
                    {formatTokens(metadata.inputTokens)} in + {formatTokens(metadata.outputTokens)} out
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          )}
          
          {metadata.model && (
            <Card bg={statBg} borderColor={borderColor} borderWidth="1px">
              <CardBody p={4}>
                <Stat size="sm">
                  <HStack spacing={2} mb={1}>
                    <FiCpu size={14} />
                    <StatLabel fontSize="xs">Model</StatLabel>
                  </HStack>
                  <StatNumber fontSize="md">
                    <Code fontSize="sm">{metadata.model}</Code>
                  </StatNumber>
                </Stat>
              </CardBody>
            </Card>
          )}

          {metadata.duration && (
            <Card bg={statBg} borderColor={borderColor} borderWidth="1px">
              <CardBody p={4}>
                <Stat size="sm">
                  <HStack spacing={2} mb={1}>
                    <FiClock size={14} />
                    <StatLabel fontSize="xs">Duration</StatLabel>
                  </HStack>
                  <StatNumber fontSize="lg">{Math.round(metadata.duration)}m</StatNumber>
                </Stat>
              </CardBody>
            </Card>
          )}

          {metadata.completedAt && (
            <Card bg={statBg} borderColor={borderColor} borderWidth="1px">
              <CardBody p={4}>
                <Stat size="sm">
                  <StatLabel fontSize="xs">Completed</StatLabel>
                  <StatNumber fontSize="sm">
                    {new Date(metadata.completedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </StatNumber>
                </Stat>
              </CardBody>
            </Card>
          )}
        </SimpleGrid>
      )}

      {/* Executive Summary */}
      {parsedReport.executiveSummary && (
        <Card bg={bgColor} borderColor="purple.500" borderWidth="1px" shadow="md">
          <CardHeader>
            <HStack>
              <Badge colorScheme="purple" fontSize="sm">Executive Summary</Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <Box className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {parsedReport.executiveSummary}
              </ReactMarkdown>
            </Box>
          </CardBody>
        </Card>
      )}

      {/* Main Research Report */}
      <Card bg={bgColor} borderColor={borderColor} borderWidth="1px" shadow="sm">
        <CardHeader>
          <HStack>
            <FiBook />
            <Heading size="md" color={headingColor}>Research Report</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <Box className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {parsedReport.mainBody}
            </ReactMarkdown>
          </Box>
        </CardBody>
      </Card>

      {/* Podcast Script */}
      {parsedReport.podcastScript && (
        <Card bg={bgColor} borderColor="green.500" borderWidth="1px" shadow="md">
          <CardHeader>
            <HStack>
              <FiMic />
              <Heading size="md" color={headingColor}>Podcast Source Material</Heading>
              <Badge colorScheme="green" ml={2}>Ready for Audio</Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <Box className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {parsedReport.podcastScript}
              </ReactMarkdown>
            </Box>
          </CardBody>
        </Card>
      )}

      {/* References */}
      {parsedReport.references && (
        <Accordion allowToggle>
          <AccordionItem border="1px" borderColor={borderColor} borderRadius="md">
            <AccordionButton>
              <Box flex="1" textAlign="left">
                <HStack>
                  <FiBook />
                  <Text fontWeight="600">References & Citations</Text>
                  <Badge colorScheme="gray" fontSize="xs">
                    {parsedReport.references.split('\n').filter(l => l.trim()).length} sources
                  </Badge>
                </HStack>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <Box className="markdown-content" fontSize="sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {parsedReport.references}
                </ReactMarkdown>
              </Box>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}
    </VStack>
  );
}
