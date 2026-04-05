/**
 * AnalysisReportsHub
 * 
 * Dedicated space for all structured analytical outputs in the Analyzer tab:
 * - Vision Extractions (from email attachments)
 * - Research Topic Analysis (from report decomposition)
 * - Entity Extraction (people, orgs, dates)
 * - Atlas Analytics results
 * 
 * Design: Option A - Analysis Reports Hub
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  Collapse,
  Divider,
  Icon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Tooltip,
  useToast,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Code,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Progress,
} from '@chakra-ui/react';
import {
  FiChevronDown,
  FiChevronRight,
  FiImage,
  FiFileText,
  FiTarget,
  FiUsers,
  FiCalendar,
  FiDownload,
  FiCopy,
  FiExternalLink,
  FiRefreshCw,
  FiZap,
  FiDatabase,
  FiEye,
  FiBarChart2,
  FiGrid,
  FiList,
  FiPlus,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ============================================================
// Types
// ============================================================

export interface VisionExtraction {
  id: string;
  filename: string;
  contentType: string;
  extractedAt: string;
  model: string;
  isLocal: boolean;
  chartType?: string;
  title?: string;
  confidence?: number;
  rawText?: string;
  structuredData?: any;
  tableData?: { headers: string[]; rows: string[][] };
  summary?: string;
}

export interface EntityExtraction {
  type: 'person' | 'organization' | 'date' | 'amount' | 'topic' | 'location';
  value: string;
  context?: string;
  confidence?: number;
}

export interface TopicAnalysis {
  id: string;
  name: string;
  depth: 'shallow' | 'moderate' | 'deep';
  coverage: number;
  keyFindings: string[];
  suggestedFollowup?: string;
}

export interface GapAnalysis {
  topic: string;
  reason: string;
  suggestedQuery: string;
}

export interface AnalysisReportsHubProps {
  // Vision extractions from email attachments
  visionExtractions?: VisionExtraction[];
  isExtractingVision?: boolean;
  onExtractVision?: () => void;
  
  // Atlas analytics results
  atlasResults?: any;
  atlasLoading?: boolean;
  
  // Topic analysis from research report
  topicAnalysis?: TopicAnalysis[];
  gapAnalysis?: GapAnalysis[];
  isAnalyzingReport?: boolean;
  onAnalyzeReport?: () => void;
  
  // Entity extractions
  entityExtractions?: EntityExtraction[];
  
  // Actions
  onFollowUpResearch?: (query: string) => void;
  onExportData?: (type: 'csv' | 'json' | 'markdown', data: any) => void;
  onAddToResearch?: (content: string) => void;
  
  // Context
  hasReport?: boolean;
  hasEmailContext?: boolean;
  emailSubject?: string;
}

// ============================================================
// Collapsible Section Component
// ============================================================

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
  defaultExpanded?: boolean;
  action?: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  badge,
  badgeColor = 'purple',
  defaultExpanded = true,
  action,
  isEmpty = false,
  emptyMessage = 'No data available',
  children,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.base');

  return (
    <Box
      bg={cardBg}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      overflow="hidden"
    >
      <HStack
        px={4}
        py={3}
        cursor="pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        _hover={{ bg: 'whiteAlpha.50' }}
        transition="background 0.15s"
      >
        <Icon
          as={isExpanded ? FiChevronDown : FiChevronRight}
          boxSize={4}
          color={mutedColor}
        />
        <Icon as={icon} boxSize={4} color={`${badgeColor}.400`} />
        <Text fontSize="sm" fontWeight="600" color={textColor} flex={1}>
          {title}
        </Text>
        {badge !== undefined && (
          <Badge colorScheme={badgeColor} fontSize="2xs" borderRadius="full">
            {badge}
          </Badge>
        )}
        {action && (
          <Box onClick={(e) => e.stopPropagation()}>
            {action}
          </Box>
        )}
      </HStack>
      <Collapse in={isExpanded} animateOpacity>
        <Box px={4} pb={4} borderTop="1px solid" borderColor={borderColor}>
          {isEmpty ? (
            <Text fontSize="xs" color={mutedColor} py={4} textAlign="center">
              {emptyMessage}
            </Text>
          ) : (
            <Box pt={3}>{children}</Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

// ============================================================
// Vision Extraction Card
// ============================================================

interface VisionExtractionCardProps {
  extraction: VisionExtraction;
  onExport?: (type: 'csv' | 'json') => void;
  onAddToResearch?: () => void;
}

function VisionExtractionCard({ extraction, onExport, onAddToResearch }: VisionExtractionCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.elevated');

  return (
    <Box
      p={3}
      bg={cardBg}
      borderRadius="md"
      border="1px solid"
      borderColor={borderColor}
    >
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Icon as={FiImage} boxSize={4} color="blue.400" />
            <Text fontSize="xs" fontWeight="600" color={textColor} noOfLines={1}>
              {extraction.filename}
            </Text>
          </HStack>
          <HStack spacing={1}>
            <Badge
              colorScheme={extraction.isLocal ? 'green' : 'orange'}
              fontSize="2xs"
              variant="subtle"
            >
              {extraction.isLocal ? '🏠 Local' : '☁️ Cloud'}
            </Badge>
            {extraction.chartType && (
              <Badge colorScheme="purple" fontSize="2xs">
                {extraction.chartType}
              </Badge>
            )}
          </HStack>
        </HStack>

        {extraction.title && (
          <Text fontSize="xs" color={textColor} fontWeight="500">
            {extraction.title}
          </Text>
        )}

        {extraction.summary && (
          <Text fontSize="2xs" color={mutedColor} noOfLines={showDetails ? undefined : 2}>
            {extraction.summary}
          </Text>
        )}

        {/* Table preview */}
        {extraction.tableData && (
          <Box
            maxH={showDetails ? '300px' : '100px'}
            overflowY="auto"
            overflowX="auto"
            fontSize="2xs"
            border="1px solid"
            borderColor={borderColor}
            borderRadius="md"
          >
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  {extraction.tableData.headers.map((h, i) => (
                    <Th key={i} fontSize="2xs" py={1} px={2}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {extraction.tableData.rows.slice(0, showDetails ? undefined : 3).map((row, i) => (
                  <Tr key={i}>
                    {row.map((cell, j) => (
                      <Td key={j} fontSize="2xs" py={1} px={2}>{cell}</Td>
                    ))}
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {!showDetails && extraction.tableData.rows.length > 3 && (
              <Text fontSize="2xs" color={mutedColor} textAlign="center" py={1}>
                +{extraction.tableData.rows.length - 3} more rows
              </Text>
            )}
          </Box>
        )}

        {/* Actions */}
        <HStack spacing={2} pt={1}>
          <Button
            size="xs"
            variant="ghost"
            fontSize="2xs"
            leftIcon={<FiEye />}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Less' : 'More'}
          </Button>
          {onExport && (
            <>
              <Button
                size="xs"
                variant="ghost"
                fontSize="2xs"
                leftIcon={<FiDownload />}
                onClick={() => onExport('csv')}
              >
                CSV
              </Button>
              <Button
                size="xs"
                variant="ghost"
                fontSize="2xs"
                leftIcon={<FiDownload />}
                onClick={() => onExport('json')}
              >
                JSON
              </Button>
            </>
          )}
          {onAddToResearch && (
            <Button
              size="xs"
              variant="ghost"
              colorScheme="purple"
              fontSize="2xs"
              leftIcon={<FiPlus />}
              onClick={onAddToResearch}
            >
              Add to Research
            </Button>
          )}
        </HStack>

        {/* Metadata */}
        <HStack spacing={3} fontSize="2xs" color={mutedColor}>
          <Text>{extraction.model}</Text>
          {extraction.confidence && (
            <Text color="green.400">{(extraction.confidence * 100).toFixed(0)}% confidence</Text>
          )}
          <Text>{new Date(extraction.extractedAt).toLocaleTimeString()}</Text>
        </HStack>
      </VStack>
    </Box>
  );
}

// ============================================================
// Topic Analysis Card
// ============================================================

interface TopicCardProps {
  topic: TopicAnalysis;
  onFollowUp?: () => void;
}

function TopicCard({ topic, onFollowUp }: TopicCardProps) {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  const depthColor = topic.depth === 'deep' ? 'green' : topic.depth === 'moderate' ? 'yellow' : 'red';

  return (
    <Box
      p={3}
      borderRadius="md"
      border="1px solid"
      borderColor={borderColor}
    >
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between">
          <Text fontSize="xs" fontWeight="600" color={textColor}>
            {topic.name}
          </Text>
          <Badge colorScheme={depthColor} fontSize="2xs">
            {topic.depth}
          </Badge>
        </HStack>

        <Progress
          value={topic.coverage}
          size="xs"
          colorScheme={depthColor}
          borderRadius="full"
        />

        {topic.keyFindings.length > 0 && (
          <VStack align="stretch" spacing={1}>
            {topic.keyFindings.slice(0, 2).map((finding, i) => (
              <Text key={i} fontSize="2xs" color={mutedColor} noOfLines={1}>
                • {finding}
              </Text>
            ))}
          </VStack>
        )}

        {topic.suggestedFollowup && onFollowUp && (
          <Button
            size="xs"
            variant="ghost"
            colorScheme="purple"
            fontSize="2xs"
            leftIcon={<FiZap />}
            onClick={onFollowUp}
          >
            Research deeper
          </Button>
        )}
      </VStack>
    </Box>
  );
}

// ============================================================
// Entity Badge
// ============================================================

function EntityBadge({ entity }: { entity: EntityExtraction }) {
  const colorMap: Record<string, string> = {
    person: 'blue',
    organization: 'purple',
    date: 'green',
    amount: 'orange',
    topic: 'teal',
    location: 'pink',
  };

  const iconMap: Record<string, React.ElementType> = {
    person: FiUsers,
    organization: FiDatabase,
    date: FiCalendar,
    amount: FiBarChart2,
    topic: FiTarget,
    location: FiExternalLink,
  };

  return (
    <Tooltip label={entity.context || entity.type} placement="top">
      <Badge
        colorScheme={colorMap[entity.type] || 'gray'}
        fontSize="2xs"
        px={2}
        py={0.5}
        borderRadius="full"
        display="flex"
        alignItems="center"
        gap={1}
      >
        <Icon as={iconMap[entity.type] || FiTarget} boxSize={3} />
        {entity.value}
      </Badge>
    </Tooltip>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function AnalysisReportsHub({
  visionExtractions = [],
  isExtractingVision = false,
  onExtractVision,
  atlasResults,
  atlasLoading = false,
  topicAnalysis = [],
  gapAnalysis = [],
  isAnalyzingReport = false,
  onAnalyzeReport,
  entityExtractions = [],
  onFollowUpResearch,
  onExportData,
  onAddToResearch,
  hasReport = false,
  hasEmailContext = false,
  emailSubject,
}: AnalysisReportsHubProps) {
  const toast = useToast();
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.base');

  const handleCopyExtraction = useCallback((extraction: VisionExtraction) => {
    const content = extraction.summary || extraction.rawText || JSON.stringify(extraction.structuredData, null, 2);
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied to clipboard', status: 'success', duration: 1500, position: 'bottom-right' });
  }, [toast]);

  const handleExportExtraction = useCallback((extraction: VisionExtraction, type: 'csv' | 'json') => {
    if (type === 'json') {
      const blob = new Blob([JSON.stringify(extraction, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${extraction.filename.replace(/\.[^.]+$/, '')}_extraction.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (type === 'csv' && extraction.tableData) {
      const csv = [
        extraction.tableData.headers.join(','),
        ...extraction.tableData.rows.map(row => row.join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${extraction.filename.replace(/\.[^.]+$/, '')}_data.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast({ title: `Exported as ${type.toUpperCase()}`, status: 'success', duration: 1500, position: 'bottom-right' });
  }, [toast]);

  // Calculate summary stats
  const totalExtractions = visionExtractions.length;
  const totalTopics = topicAnalysis.length;
  const totalGaps = gapAnalysis.length;
  const totalEntities = entityExtractions.length;
  const deepTopics = topicAnalysis.filter(t => t.depth === 'deep').length;
  const shallowTopics = topicAnalysis.filter(t => t.depth === 'shallow').length;

  return (
    <Box h="full" overflowY="auto" px={4} py={4}>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <VStack align="stretch" spacing={1}>
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="700" color={textColor}>
              📊 Analysis Reports
            </Text>
            {hasEmailContext && emailSubject && (
              <Badge colorScheme="blue" fontSize="2xs" maxW="200px" noOfLines={1}>
                📧 {emailSubject}
              </Badge>
            )}
          </HStack>
          <Text fontSize="xs" color={mutedColor}>
            Structured analytical outputs from vision extraction, research decomposition, and entity analysis.
          </Text>
        </VStack>

        {/* Summary Stats */}
        <SimpleGrid columns={4} spacing={3}>
          <Box p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
            <Stat size="sm">
              <StatLabel fontSize="2xs">Extractions</StatLabel>
              <StatNumber fontSize="lg" color="blue.400">{totalExtractions}</StatNumber>
            </Stat>
          </Box>
          <Box p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
            <Stat size="sm">
              <StatLabel fontSize="2xs">Topics</StatLabel>
              <StatNumber fontSize="lg" color="purple.400">{totalTopics}</StatNumber>
            </Stat>
          </Box>
          <Box p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
            <Stat size="sm">
              <StatLabel fontSize="2xs">Gaps</StatLabel>
              <StatNumber fontSize="lg" color="orange.400">{totalGaps}</StatNumber>
            </Stat>
          </Box>
          <Box p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
            <Stat size="sm">
              <StatLabel fontSize="2xs">Entities</StatLabel>
              <StatNumber fontSize="lg" color="teal.400">{totalEntities}</StatNumber>
            </Stat>
          </Box>
        </SimpleGrid>

        {/* Vision Extractions Section */}
        <CollapsibleSection
          title="Vision Extractions"
          icon={FiImage}
          badge={totalExtractions > 0 ? totalExtractions : undefined}
          badgeColor="blue"
          isEmpty={totalExtractions === 0 && !isExtractingVision && !atlasLoading}
          emptyMessage={hasEmailContext ? "No image extractions yet. Analyze email attachments to extract data." : "No email context. Navigate from an email to analyze attachments."}
          action={
            onExtractVision && hasEmailContext && (
              <IconButton
                aria-label="Extract from images"
                icon={isExtractingVision ? <Spinner size="xs" /> : <FiRefreshCw />}
                size="xs"
                variant="ghost"
                colorScheme="blue"
                isDisabled={isExtractingVision}
                onClick={onExtractVision}
              />
            )
          }
        >
          <VStack spacing={3} align="stretch">
            {/* Atlas Results */}
            {atlasLoading && (
              <HStack spacing={3} p={3} bg="blue.900" borderRadius="md">
                <Spinner size="sm" color="blue.400" />
                <Text fontSize="xs" color={textColor}>Atlas is analyzing images...</Text>
              </HStack>
            )}

            {atlasResults && !atlasResults.error && (
              <Box p={3} bg="blue.900" borderRadius="md" border="1px solid" borderColor="blue.500">
                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <HStack spacing={2}>
                      <Text fontSize="xs" fontWeight="600" color={textColor}>📊 Atlas Analytics</Text>
                      <Badge colorScheme="green" fontSize="2xs">{atlasResults.images_analyzed} image(s)</Badge>
                    </HStack>
                    <Badge colorScheme="blue" fontSize="2xs" variant="subtle">
                      {atlasResults.model || 'Vision Model'}
                    </Badge>
                  </HStack>
                  {atlasResults.summary && (
                    <Text fontSize="xs" color={textColor}>{atlasResults.summary}</Text>
                  )}
                </VStack>
              </Box>
            )}

            {/* Individual extractions */}
            {visionExtractions.map((extraction) => (
              <VisionExtractionCard
                key={extraction.id}
                extraction={extraction}
                onExport={(type) => handleExportExtraction(extraction, type)}
                onAddToResearch={onAddToResearch ? () => onAddToResearch(extraction.summary || extraction.rawText || '') : undefined}
              />
            ))}
          </VStack>
        </CollapsibleSection>

        {/* Research Analysis Section */}
        <CollapsibleSection
          title="Research Analysis"
          icon={FiTarget}
          badge={totalTopics > 0 ? `${deepTopics}/${totalTopics}` : undefined}
          badgeColor="purple"
          isEmpty={totalTopics === 0 && !isAnalyzingReport}
          emptyMessage={hasReport ? "Click analyze to decompose the research report into topics." : "Complete a research query first to analyze the report."}
          action={
            onAnalyzeReport && hasReport && (
              <IconButton
                aria-label="Analyze report"
                icon={isAnalyzingReport ? <Spinner size="xs" /> : <FiZap />}
                size="xs"
                variant="ghost"
                colorScheme="purple"
                isDisabled={isAnalyzingReport}
                onClick={onAnalyzeReport}
              />
            )
          }
        >
          <VStack spacing={3} align="stretch">
            {isAnalyzingReport && (
              <HStack spacing={3} p={3} bg="purple.900" borderRadius="md">
                <Spinner size="sm" color="purple.400" />
                <Text fontSize="xs" color={textColor}>Analyzing report structure...</Text>
              </HStack>
            )}

            {/* Topics */}
            {topicAnalysis.length > 0 && (
              <Box>
                <Text fontSize="xs" fontWeight="600" color={textColor} mb={2}>
                  Topics ({deepTopics} deep, {shallowTopics} shallow)
                </Text>
                <SimpleGrid columns={2} spacing={2}>
                  {topicAnalysis.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      onFollowUp={onFollowUpResearch && topic.suggestedFollowup ? () => onFollowUpResearch(topic.suggestedFollowup!) : undefined}
                    />
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {/* Gaps */}
            {gapAnalysis.length > 0 && (
              <Box>
                <Text fontSize="xs" fontWeight="600" color="orange.400" mb={2}>
                  Knowledge Gaps ({gapAnalysis.length})
                </Text>
                <VStack spacing={2} align="stretch">
                  {gapAnalysis.map((gap, i) => (
                    <HStack
                      key={i}
                      p={2}
                      bg="orange.900"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="orange.600"
                      justify="space-between"
                    >
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontSize="xs" fontWeight="600" color={textColor}>{gap.topic}</Text>
                        <Text fontSize="2xs" color={mutedColor}>{gap.reason}</Text>
                      </VStack>
                      {onFollowUpResearch && (
                        <Button
                          size="xs"
                          colorScheme="orange"
                          variant="ghost"
                          fontSize="2xs"
                          onClick={() => onFollowUpResearch(gap.suggestedQuery)}
                        >
                          Research
                        </Button>
                      )}
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}
          </VStack>
        </CollapsibleSection>

        {/* Entity Extraction Section */}
        <CollapsibleSection
          title="Entity Extraction"
          icon={FiUsers}
          badge={totalEntities > 0 ? totalEntities : undefined}
          badgeColor="teal"
          defaultExpanded={false}
          isEmpty={totalEntities === 0}
          emptyMessage="No entities extracted yet. Entities are automatically extracted from email content and research reports."
        >
          <Box>
            <HStack spacing={2} flexWrap="wrap">
              {entityExtractions.map((entity, i) => (
                <EntityBadge key={i} entity={entity} />
              ))}
            </HStack>
          </Box>
        </CollapsibleSection>
      </VStack>
    </Box>
  );
}
