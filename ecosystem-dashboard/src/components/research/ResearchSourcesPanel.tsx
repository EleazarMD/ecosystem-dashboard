/**
 * Research Sources Panel — displays source quality scoring and citation verification.
 * Shows scored sources from the current report with quality badges and verification status.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Divider,
  Progress,
  Link,
  Spinner,
  Tooltip,
} from '@chakra-ui/react';
import { FiLink, FiExternalLink, FiCheckCircle, FiXCircle, FiClock, FiShield } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { scoreSources, getTierColor, getQualitySummary, type SourceScore } from '@/lib/research/source-quality';
import { verifyCitations, type VerificationReport } from '@/lib/research/citation-verifier';

interface ResearchSourcesPanelProps {
  sources?: { url: string; title: string }[];
  reportContent?: string;
  query?: string;
}

export default function ResearchSourcesPanel({ sources = [], reportContent = '', query = '' }: ResearchSourcesPanelProps) {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const surfaceBase = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');

  const [scored, setScored] = useState<SourceScore[]>(() => sources.length > 0 ? scoreSources(sources, query) : []);
  const [verification, setVerification] = useState<VerificationReport | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const summary = scored.length > 0 ? getQualitySummary(scored) : null;

  const handleVerify = useCallback(async () => {
    if (!reportContent) return;
    setIsVerifying(true);
    try {
      const report = await verifyCitations(reportContent, (progress) => {
        setVerification(structuredClone(progress));
      });
      setVerification(report);
    } catch (err) {
      console.error('[ResearchSourcesPanel] Verification failed:', err);
    } finally {
      setIsVerifying(false);
    }
  }, [reportContent]);

  const getVerificationIcon = (url: string) => {
    if (!verification) return null;
    const check = verification.checks.find(c => c.url === url);
    if (!check) return null;
    if (check.status === 'valid') return <FiCheckCircle color="green" size={12} />;
    if (check.status === 'broken') return <FiXCircle color="red" size={12} />;
    if (check.status === 'timeout') return <FiClock color="orange" size={12} />;
    return <Spinner size="xs" />;
  };

  return (
    <VStack spacing={3} align="stretch" p={3} h="full" overflowY="auto">
      {/* Header */}
      <HStack justify="space-between">
        <HStack spacing={2}>
          <FiLink />
          <Text fontSize="sm" fontWeight="700" color={textColor}>
            Sources & Citations
          </Text>
          {scored.length > 0 && (
            <Badge colorScheme="purple" fontSize="2xs">{scored.length}</Badge>
          )}
        </HStack>
        {reportContent && (
          <Button
            size="xs"
            colorScheme="blue"
            variant="outline"
            leftIcon={<FiShield size={12} />}
            onClick={handleVerify}
            isLoading={isVerifying}
            loadingText="Verifying"
          >
            Verify URLs
          </Button>
        )}
      </HStack>

      {/* Quality Summary */}
      {summary && (
        <Box p={2.5} bg={surfaceBase} borderRadius="md" border="1px solid" borderColor={borderColor}>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="xs" fontWeight="600" color={textColor}>Quality Score</Text>
            <Badge
              colorScheme={summary.averageScore >= 80 ? 'green' : summary.averageScore >= 60 ? 'blue' : 'yellow'}
              fontSize="xs"
            >
              {summary.averageScore}/100
            </Badge>
          </HStack>
          <Progress
            value={summary.averageScore}
            size="xs"
            colorScheme={summary.averageScore >= 80 ? 'green' : summary.averageScore >= 60 ? 'blue' : 'yellow'}
            borderRadius="full"
            mb={2}
          />
          <HStack spacing={2} fontSize="2xs" color={mutedColor} flexWrap="wrap">
            {summary.excellent > 0 && <Badge colorScheme="green" fontSize="2xs">{summary.excellent} Excellent</Badge>}
            {summary.good > 0 && <Badge colorScheme="blue" fontSize="2xs">{summary.good} Good</Badge>}
            {summary.fair > 0 && <Badge colorScheme="yellow" fontSize="2xs">{summary.fair} Fair</Badge>}
            {summary.low > 0 && <Badge colorScheme="gray" fontSize="2xs">{summary.low} Low</Badge>}
          </HStack>
          {summary.topBadges.length > 0 && (
            <HStack spacing={1} mt={1.5} flexWrap="wrap">
              {summary.topBadges.map(b => (
                <Badge key={b} colorScheme="purple" variant="subtle" fontSize="2xs">{b}</Badge>
              ))}
            </HStack>
          )}
        </Box>
      )}

      {/* Verification Summary */}
      {verification && (
        <Box p={2.5} bg={surfaceBase} borderRadius="md" border="1px solid" borderColor={borderColor}>
          <Text fontSize="xs" fontWeight="600" color={textColor} mb={1.5}>Citation Verification</Text>
          <HStack spacing={3} fontSize="2xs">
            <HStack spacing={1}>
              <FiCheckCircle color="green" size={12} />
              <Text color="green.400">{verification.valid} valid</Text>
            </HStack>
            <HStack spacing={1}>
              <FiXCircle color="red" size={12} />
              <Text color="red.400">{verification.broken} broken</Text>
            </HStack>
            <HStack spacing={1}>
              <FiClock color="orange" size={12} />
              <Text color="orange.400">{verification.timeout} timeout</Text>
            </HStack>
            {verification.pending > 0 && (
              <HStack spacing={1}>
                <Spinner size="xs" />
                <Text>{verification.pending} pending</Text>
              </HStack>
            )}
          </HStack>
        </Box>
      )}

      <Divider />

      {/* Source List */}
      {scored.length === 0 ? (
        <VStack spacing={2} py={6}>
          <FiLink size={24} color={mutedColor} />
          <Text fontSize="xs" color={mutedColor} textAlign="center">
            No sources available. Run a research query to see source quality analysis.
          </Text>
        </VStack>
      ) : (
        <VStack spacing={1.5} align="stretch">
          {scored.map((source, idx) => (
            <HStack
              key={idx}
              p={2}
              bg={surfaceBase}
              borderRadius="md"
              borderLeft="3px solid"
              borderColor={`${getTierColor(source.tier)}.500`}
              spacing={2}
              align="start"
            >
              <VStack align="stretch" spacing={0.5} flex={1} minW={0}>
                <HStack spacing={1}>
                  {getVerificationIcon(source.url)}
                  <Text fontSize="xs" fontWeight="600" color={textColor} noOfLines={1}>
                    {source.title}
                  </Text>
                </HStack>
                <Link href={source.url} isExternal fontSize="2xs" color="purple.400" noOfLines={1}>
                  {source.url} <FiExternalLink style={{ display: 'inline', verticalAlign: 'middle' }} size={10} />
                </Link>
                <HStack spacing={1.5} fontSize="2xs" color={mutedColor}>
                  <Tooltip label={`Authority: ${source.authorityScore}, Relevance: ${source.relevanceScore}`}>
                    <Badge colorScheme={getTierColor(source.tier)} fontSize="2xs">
                      {source.compositeScore}
                    </Badge>
                  </Tooltip>
                  {source.badges.slice(0, 2).map(b => (
                    <Badge key={b} variant="subtle" colorScheme="gray" fontSize="2xs">{b}</Badge>
                  ))}
                </HStack>
              </VStack>
            </HStack>
          ))}
        </VStack>
      )}
    </VStack>
  );
}
