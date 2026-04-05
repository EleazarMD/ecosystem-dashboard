import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Divider,
  List,
  ListItem,
  ListIcon,
  Code,
  Alert,
  AlertIcon,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@chakra-ui/react';
import { FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface StageOutputViewerProps {
  stage: string;
  output: any;
  metadata?: any;
}

export default function StageOutputViewer({ stage, output, metadata }: StageOutputViewerProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const renderStageOutput = () => {
    switch (stage) {
      case 'producer':
        return <ProducerOutputView output={output} />;
      case 'writer':
        return <WriterOutputView output={output} />;
      case 'director':
        return <DirectorOutputView output={output} />;
      case 'voice-director':
        return <VoiceDirectorOutputView output={output} />;
      case 'editor':
        return <EditorOutputView output={output} />;
      default:
        return <GenericOutputView output={output} />;
    }
  };

  return (
    <VStack spacing={4} align="stretch" h="full" overflowY="auto">
      {renderStageOutput()}

      {/* Metadata Footer */}
      {metadata && (
        <Box
          p={3}
          bg={useSemanticToken('surface.sunken')}
          borderRadius="md"
          fontSize="xs"
        >
          <HStack spacing={4} color={useSemanticToken('text.secondary')}>
            {metadata.model && <Text>Model: {metadata.model}</Text>}
            {metadata.tokensUsed && <Text>Tokens: {metadata.tokensUsed}</Text>}
            {metadata.wordCount && <Text>Words: {metadata.wordCount}</Text>}
            {metadata.exchangeCount && <Text>Exchanges: {metadata.exchangeCount}</Text>}
          </HStack>
        </Box>
      )}
    </VStack>
  );
}

// ============================================================================
// PRODUCER OUTPUT VIEW
// ============================================================================

function ProducerOutputView({ output }: { output: any }) {
  return (
    <VStack spacing={4} align="stretch">
      <Heading size="md">🎬 Content Brief</Heading>

      {/* Core Narrative */}
      <Box>
        <Text fontWeight="600" fontSize="sm" mb={2}>
          Core Narrative
        </Text>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
          {output.coreNarrative}
        </Text>
      </Box>

      <Divider />

      {/* Narrative Angle */}
      <Box>
        <Text fontWeight="600" fontSize="sm" mb={2}>
          Narrative Angle
        </Text>
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          {output.narrativeAngle}
        </Alert>
      </Box>

      <Divider />

      {/* Key Themes */}
      <Box>
        <Text fontWeight="600" fontSize="sm" mb={2}>
          Key Themes
        </Text>
        <List spacing={2}>
          {output.keyThemes?.map((theme: string, index: number) => (
            <ListItem key={index} fontSize="sm">
              <HStack>
                <Badge colorScheme="purple">{index + 1}</Badge>
                <Text>{theme}</Text>
              </HStack>
            </ListItem>
          ))}
        </List>
        {output.themesPriority && (
          <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={2}>
            {output.themesPriority}
          </Text>
        )}
      </Box>

      <Divider />

      {/* Content Structure */}
      {output.contentStructure && (
        <Accordion allowToggle>
          <AccordionItem>
            <AccordionButton>
              <Box flex={1} textAlign="left">
                <Text fontWeight="600" fontSize="sm">
                  Content Structure
                </Text>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel>
              <VStack spacing={3} align="stretch">
                {Object.entries(output.contentStructure).map(([key, value]) => (
                  <Box key={key}>
                    <Text fontWeight="600" fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>
                      {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                    </Text>
                    <Text fontSize="sm">{value as string}</Text>
                  </Box>
                ))}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}

      {/* Target Audience */}
      {output.targetAudience && (
        <Box>
          <Text fontWeight="600" fontSize="sm" mb={2}>
            Target Audience
          </Text>
          <VStack spacing={2} align="stretch">
            {Object.entries(output.targetAudience).map(([key, value]) => (
              <HStack key={key} fontSize="sm">
                <Text fontWeight="500" minW="140px">
                  {key.replace(/([A-Z])/g, ' $1')}:
                </Text>
                <Text color={useSemanticToken('text.secondary')}>{value as string}</Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}

      {/* Tone and Pacing */}
      {output.toneAndPacing && (
        <Box>
          <Text fontWeight="600" fontSize="sm" mb={2}>
            Tone & Pacing Strategy
          </Text>
          <VStack spacing={2} align="stretch">
            {Object.entries(output.toneAndPacing).map(([key, value]) => (
              <Box key={key}>
                <Text fontSize="xs" fontWeight="600" color={useSemanticToken('text.secondary')}>
                  {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                </Text>
                <Text fontSize="sm">{value as string}</Text>
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      {/* Specific Content to Highlight */}
      {output.specificContentToHighlight && (
        <Box>
          <Text fontWeight="600" fontSize="sm" mb={2}>
            📌 Must-Include Content
          </Text>
          <List spacing={2}>
            {output.specificContentToHighlight.map((item: string, index: number) => (
              <ListItem key={index} fontSize="sm">
                <ListIcon as={FiCheckCircle} color="green.500" />
                {item}
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Potential Pitfalls */}
      {output.potentialPitfalls && output.potentialPitfalls.length > 0 && (
        <Box>
          <Text fontWeight="600" fontSize="sm" mb={2}>
            ⚠️ Potential Pitfalls
          </Text>
          <List spacing={2}>
            {output.potentialPitfalls.map((item: string, index: number) => (
              <ListItem key={index} fontSize="sm">
                <ListIcon as={FiAlertCircle} color="orange.500" />
                {item}
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </VStack>
  );
}

// ============================================================================
// WRITER OUTPUT VIEW
// ============================================================================

function WriterOutputView({ output }: { output: any }) {
  const script = Array.isArray(output) ? output : [];

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Heading size="md">✍️ Draft Script</Heading>
        <Badge colorScheme="blue">{script.length} exchanges</Badge>
      </HStack>

      <VStack spacing={3} align="stretch">
        {script.map((turn: any, index: number) => (
          <Box
            key={index}
            p={3}
            bg={useSemanticToken('surface.sunken')}
            borderRadius="md"
            borderLeft="3px solid"
            borderLeftColor={turn.speaker === 'Speaker 1' ? 'blue.400' : 'purple.400'}
          >
            <HStack mb={2}>
              <Badge colorScheme={turn.speaker === 'Speaker 1' ? 'blue' : 'purple'} fontSize="10px">
                {turn.speaker}
              </Badge>
              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                Turn {index + 1}
              </Text>
            </HStack>
            <Text fontSize="sm">{turn.content}</Text>
          </Box>
        ))}
      </VStack>
    </VStack>
  );
}

// ============================================================================
// DIRECTOR OUTPUT VIEW
// ============================================================================

function DirectorOutputView({ output }: { output: any }) {
  return (
    <VStack spacing={4} align="stretch">
      <Heading size="md">🎭 Creative Direction</Heading>

      {/* Overall Assessment */}
      {output.overallAssessment && (
        <Box>
          <HStack mb={3}>
            <Text fontWeight="600" fontSize="sm">
              Overall Assessment
            </Text>
            <Badge colorScheme={output.overallAssessment.rating >= 8 ? 'green' : 'yellow'} fontSize="lg">
              {output.overallAssessment.rating}/10
            </Badge>
          </HStack>

          <VStack spacing={2} align="stretch">
            {output.overallAssessment.strengths && (
              <Box>
                <Text fontSize="xs" fontWeight="600" color={useSemanticToken('status.success')} mb={1}>
                  ✓ STRENGTHS
                </Text>
                <List spacing={1}>
                  {output.overallAssessment.strengths.map((item: string, i: number) => (
                    <ListItem key={i} fontSize="sm">
                      <ListIcon as={FiCheckCircle} color="green.500" />
                      {item}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {output.overallAssessment.weaknesses && (
              <Box>
                <Text fontSize="xs" fontWeight="600" color={useSemanticToken('status.warning')} mb={1}>
                  ⚠ NEEDS IMPROVEMENT
                </Text>
                <List spacing={1}>
                  {output.overallAssessment.weaknesses.map((item: string, i: number) => (
                    <ListItem key={i} fontSize="sm">
                      <ListIcon as={FiAlertCircle} color="orange.500" />
                      {item}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </VStack>
        </Box>
      )}

      <Divider />

      {/* Revisions */}
      {output.revisions && output.revisions.length > 0 && (
        <Box>
          <Text fontWeight="600" fontSize="sm" mb={3}>
            📝 Suggested Revisions ({output.revisions.length})
          </Text>

          <VStack spacing={3} align="stretch">
            {output.revisions.map((revision: any, index: number) => (
              <Box
                key={index}
                p={3}
                bg={useSemanticToken('surface.highlight')}
                borderRadius="md"
              >
                <HStack mb={2}>
                  <Badge colorScheme="yellow">Line {revision.lineNumber}</Badge>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    {revision.reason}
                  </Text>
                </HStack>

                <VStack spacing={2} align="stretch" fontSize="sm">
                  <Box>
                    <Text fontSize="xs" color={useSemanticToken('status.error')} fontWeight="600" mb={1}>
                      CURRENT:
                    </Text>
                    <Text color={useSemanticToken('text.secondary')}>{revision.currentContent}</Text>
                  </Box>

                  <Box>
                    <Text fontSize="xs" color={useSemanticToken('status.success')} fontWeight="600" mb={1}>
                      SUGGESTED:
                    </Text>
                    <Text color={useSemanticToken('text.primary')} fontWeight="500">
                      {revision.suggestedContent}
                    </Text>
                  </Box>
                </VStack>
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      {/* Pacing Analysis */}
      {output.pacing && (
        <Accordion allowToggle>
          <AccordionItem>
            <AccordionButton>
              <Box flex={1} textAlign="left">
                <Text fontWeight="600" fontSize="sm">
                  Pacing Analysis
                </Text>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel>
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm">{output.pacing.analysis}</Text>

                {output.pacing.slowSections && output.pacing.slowSections.length > 0 && (
                  <Box>
                    <Text fontSize="xs" fontWeight="600" color={useSemanticToken('status.info')} mb={1}>
                      SLOW SECTIONS (need energy)
                    </Text>
                    <Text fontSize="sm">Lines: {output.pacing.slowSections.join(', ')}</Text>
                  </Box>
                )}

                {output.pacing.fastSections && output.pacing.fastSections.length > 0 && (
                  <Box>
                    <Text fontSize="xs" fontWeight="600" color={useSemanticToken('status.error')} mb={1}>
                      FAST SECTIONS (need breathing room)
                    </Text>
                    <Text fontSize="sm">Lines: {output.pacing.fastSections.join(', ')}</Text>
                  </Box>
                )}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}
    </VStack>
  );
}

// ============================================================================
// VOICE DIRECTOR OUTPUT VIEW
// ============================================================================

function VoiceDirectorOutputView({ output }: { output: any }) {
  const turns = output.turns || [];

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Heading size="md">🎤 Production Script</Heading>
        <Badge colorScheme="orange">
          {turns.filter((t: any) => t.productionNotes).length} turns with notes
        </Badge>
      </HStack>

      <VStack spacing={3} align="stretch">
        {turns.slice(0, 20).map((turn: any, index: number) => (
          <Box
            key={index}
            p={3}
            bg={useSemanticToken('surface.sunken')}
            borderRadius="md"
            borderLeft="3px solid"
            borderLeftColor={turn.productionNotes ? 'orange.400' : 'gray.300'}
          >
            <HStack mb={2}>
              <Badge colorScheme={turn.speaker === 'Speaker 1' ? 'blue' : 'purple'} fontSize="10px">
                {turn.speaker}
              </Badge>
              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                Turn {index + 1}
              </Text>
            </HStack>

            <Text fontSize="sm" mb={2}>
              {turn.content}
            </Text>

            {turn.productionNotes && (
              <Box
                p={2}
                bg={useSemanticToken('surface.highlight')}
                borderRadius="md"
                fontSize="xs"
              >
                <HStack spacing={3} flexWrap="wrap">
                  <Badge colorScheme="orange">{turn.productionNotes.tone}</Badge>
                  <Text>Pacing: {turn.productionNotes.pacing}</Text>
                  <Text>Energy: {turn.productionNotes.emotionalColor}</Text>
                  {turn.productionNotes.pauseAfter > 0 && (
                    <Text>Pause: {turn.productionNotes.pauseAfter}s</Text>
                  )}
                  {turn.productionNotes.emphasis && turn.productionNotes.emphasis.length > 0 && (
                    <Text>Emphasize: {turn.productionNotes.emphasis.join(', ')}</Text>
                  )}
                </HStack>
              </Box>
            )}
          </Box>
        ))}

        {turns.length > 20 && (
          <Text fontSize="sm" color={useSemanticToken('text.secondary')} textAlign="center">
            ... {turns.length - 20} more turns
          </Text>
        )}
      </VStack>
    </VStack>
  );
}

// ============================================================================
// EDITOR OUTPUT VIEW
// ============================================================================

function EditorOutputView({ output }: { output: any }) {
  return (
    <VStack spacing={4} align="stretch">
      <Heading size="md">📝 Quality Assurance Report</Heading>

      {/* Approval Status */}
      <Alert
        status={output.approved ? 'success' : 'warning'}
        variant="left-accent"
      >
        <AlertIcon />
        <VStack align="start" spacing={1}>
          <Text fontWeight="600">
            {output.approved ? '✅ APPROVED FOR PRODUCTION' : '⚠️ REVISIONS RECOMMENDED'}
          </Text>
          {output.notes && <Text fontSize="sm">{output.notes}</Text>}
        </VStack>
      </Alert>

      {/* Quality Metrics */}
      {output.qualityMetrics && (
        <Box>
          <Text fontWeight="600" fontSize="sm" mb={3}>
            Quality Metrics
          </Text>
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th>Metric</Th>
                <Th isNumeric>Score</Th>
              </Tr>
            </Thead>
            <Tbody>
              {Object.entries(output.qualityMetrics).map(([key, value]) => {
                const score = typeof value === 'number' ? value : 0;
                return (
                  <Tr key={key}>
                    <Td fontSize="sm">{key.replace(/([A-Z])/g, ' $1')}</Td>
                    <Td isNumeric>
                      <Badge
                        colorScheme={
                          score >= 8 ? 'green' : score >= 6 ? 'yellow' : 'red'
                        }
                      >
                        {score}/10
                      </Badge>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      )}

      <Divider />

      {/* Issues Found */}
      {output.issues && output.issues.length > 0 && (
        <Box>
          <Text fontWeight="600" fontSize="sm" mb={3}>
            Issues Found ({output.issues.length})
          </Text>

          <VStack spacing={2} align="stretch">
            {output.issues.map((issue: any, index: number) => (
              <Alert
                key={index}
                status={
                  issue.severity === 'critical'
                    ? 'error'
                    : issue.severity === 'major'
                      ? 'warning'
                      : 'info'
                }
                fontSize="sm"
              >
                <AlertIcon />
                <VStack align="start" spacing={1} flex={1}>
                  <HStack>
                    <Badge colorScheme={issue.severity === 'critical' ? 'red' : 'yellow'}>
                      {issue.severity}
                    </Badge>
                    <Badge>{issue.type}</Badge>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      Line {issue.lineNumber}
                    </Text>
                  </HStack>
                  <Text>{issue.description}</Text>
                  {issue.suggestedFix && (
                    <Text fontSize="xs" color={useSemanticToken('status.success')}>
                      Fix: {issue.suggestedFix}
                    </Text>
                  )}
                </VStack>
              </Alert>
            ))}
          </VStack>
        </Box>
      )}

      {output.issues && output.issues.length === 0 && (
        <Alert status="success">
          <AlertIcon />
          <Text>No issues found. Script is production-ready!</Text>
        </Alert>
      )}
    </VStack>
  );
}

// ============================================================================
// GENERIC OUTPUT VIEW (Fallback)
// ============================================================================

function GenericOutputView({ output }: { output: any }) {
  return (
    <Box>
      <Code fontSize="xs" whiteSpace="pre-wrap" p={4} borderRadius="md" display="block">
        {JSON.stringify(output, null, 2)}
      </Code>
    </Box>
  );
}
