import React, { useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Tooltip,
  Icon,
  Collapse,
  IconButton,
} from '@chakra-ui/react';
import { FiFileText, FiHash, FiType, FiAlertTriangle, FiCheckCircle, FiChevronDown, FiChevronUp, FiDatabase, FiClock, FiDollarSign } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ResearchMaterial {
  id: string;
  title: string;
  type: 'article' | 'pdf' | 'note' | 'web';
  content: string;
  url?: string;
  author?: string;
  date?: string;
  source: string;
  wordCount: number;
  metadata?: any;
}

// LLM context window limits (input tokens)
const LLM_LIMITS: Record<string, { inputTokens: number; label: string; costPer1MInput: number }> = {
  'gemini-2.5-pro': { inputTokens: 1048576, label: 'Gemini 2.5 Pro', costPer1MInput: 1.25 },
  'gemini-2-5-pro': { inputTokens: 1048576, label: 'Gemini 2.5 Pro', costPer1MInput: 1.25 },
  'gemini-2.5-flash': { inputTokens: 1048576, label: 'Gemini 2.5 Flash', costPer1MInput: 0.15 },
  'gemini-2-5-flash': { inputTokens: 1048576, label: 'Gemini 2.5 Flash', costPer1MInput: 0.15 },
  'gemini-2.0-flash': { inputTokens: 1048576, label: 'Gemini 2.0 Flash', costPer1MInput: 0.10 },
  'qwen3-32b': { inputTokens: 32768, label: 'Qwen3 32B', costPer1MInput: 0 },
  'qwen3-8b': { inputTokens: 32768, label: 'Qwen3 8B', costPer1MInput: 0 },
  'llama-3.1-70b': { inputTokens: 131072, label: 'Llama 3.1 70B', costPer1MInput: 0 },
};

// Rough token estimation: ~4 chars per token for English, ~3 for mixed
function estimateTokens(text: string): number {
  if (!text) return 0;
  // Count non-ASCII chars (likely multilingual content)
  const nonAscii = (text.match(/[^\x00-\x7F]/g) || []).length;
  const ratio = nonAscii / text.length > 0.1 ? 3 : 4;
  return Math.ceil(text.length / ratio);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface SourceMetadataPanelProps {
  customData?: {
    researchMaterials?: ResearchMaterial[];
    selectedModel?: string;
    [key: string]: any;
  };
}

export default function SourceMetadataPanel({ customData }: SourceMetadataPanelProps) {
  const materials: ResearchMaterial[] = customData?.researchMaterials || [];
  const selectedModel = customData?.selectedModel || 'gemini-2-5-flash';
  const [expandedSources, setExpandedSources] = React.useState<Set<string>>(new Set());

  const bgColor = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.elevated');

  // Compute aggregate stats
  const stats = useMemo(() => {
    const perSource = materials.map(m => {
      const content = m.content || '';
      const charCount = content.length;
      const wordCount = m.wordCount || content.split(/\s+/).filter(Boolean).length;
      const lineCount = content.split('\n').length;
      const sentenceCount = (content.match(/[.!?]+\s/g) || []).length + 1;
      const tokenEstimate = estimateTokens(content);
      const paragraphCount = content.split(/\n\s*\n/).filter(s => s.trim()).length;
      // Detect language hints
      const spanishIndicators = ['¿', '¡', ' el ', ' la ', ' que ', ' por ', ' para ', ' con '];
      const spanishScore = spanishIndicators.filter(w => content.toLowerCase().includes(w)).length;
      const detectedLang = spanishScore >= 3 ? 'Spanish' : 'English';
      // Content quality signals
      const hasUrls = (content.match(/https?:\/\//g) || []).length;
      const hasCitations = (content.match(/\[\d+\]/g) || []).length;
      const hasMarkdownTables = (content.match(/\|.*\|/g) || []).length;

      return {
        id: m.id,
        title: m.title,
        type: m.type,
        source: m.source,
        author: m.author,
        date: m.date,
        charCount,
        wordCount,
        lineCount,
        sentenceCount,
        paragraphCount,
        tokenEstimate,
        detectedLang,
        hasUrls,
        hasCitations,
        hasMarkdownTables,
      };
    });

    const totalChars = perSource.reduce((s, m) => s + m.charCount, 0);
    const totalWords = perSource.reduce((s, m) => s + m.wordCount, 0);
    const totalTokens = perSource.reduce((s, m) => s + m.tokenEstimate, 0);
    const totalLines = perSource.reduce((s, m) => s + m.lineCount, 0);
    const totalSentences = perSource.reduce((s, m) => s + m.sentenceCount, 0);

    // Prompt overhead: system prompt + stage instructions (~2000 tokens)
    const promptOverhead = 2000;
    const totalWithOverhead = totalTokens + promptOverhead;

    // LLM limit check
    const llmInfo = LLM_LIMITS[selectedModel] || { inputTokens: 1048576, label: selectedModel, costPer1MInput: 0.15 };
    const usagePercent = Math.min((totalWithOverhead / llmInfo.inputTokens) * 100, 100);
    const isWithinLimit = totalWithOverhead < llmInfo.inputTokens;
    const remainingTokens = llmInfo.inputTokens - totalWithOverhead;

    // Cost estimate (5-stage pipeline = ~5x input)
    const estimatedCost = (totalTokens / 1_000_000) * llmInfo.costPer1MInput * 5;

    // Estimated reading time (250 wpm)
    const readingTimeMin = Math.ceil(totalWords / 250);

    // Avg word length (complexity signal)
    const avgWordLength = totalChars > 0 ? (totalChars / Math.max(totalWords, 1)).toFixed(1) : '0';

    return {
      perSource,
      totalChars,
      totalWords,
      totalTokens,
      totalLines,
      totalSentences,
      totalWithOverhead,
      promptOverhead,
      llmInfo,
      usagePercent,
      isWithinLimit,
      remainingTokens,
      estimatedCost,
      readingTimeMin,
      avgWordLength,
      sourceCount: materials.length,
    };
  }, [materials, selectedModel]);

  const toggleSource = (id: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (materials.length === 0) {
    return (
      <VStack spacing={4} align="stretch" h="full" p={4} bg={bgColor}>
        <HStack justify="space-between">
          <Text fontSize="14px" fontWeight="500" color={textColor}>Source Metadata</Text>
          <Badge colorScheme="gray" fontSize="11px">No Sources</Badge>
        </HStack>
        <Box p={6} textAlign="center">
          <Icon as={FiFileText} boxSize={8} color={mutedColor} mb={2} />
          <Text fontSize="13px" color={mutedColor}>
            Add and select sources to see metadata analysis
          </Text>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack spacing={0} align="stretch" h="full" overflowY="auto" bg={bgColor}>
      {/* Header */}
      <HStack justify="space-between" px={4} py={3}>
        <Text fontSize="14px" fontWeight="500" color={textColor}>Source Metadata</Text>
        <Badge colorScheme="teal" fontSize="11px">{stats.sourceCount} Source{stats.sourceCount !== 1 ? 's' : ''}</Badge>
      </HStack>

      {/* LLM Capacity Gauge */}
      <Box px={4} pb={3}>
        <Box
          p={4}
          bg={cardBg}
          border="2px solid"
          borderColor={stats.isWithinLimit ? 'green.400' : 'red.400'}
          borderRadius="xl"
          boxShadow="md"
        >
          <HStack justify="space-between" mb={2}>
            <HStack spacing={2}>
              <Icon as={stats.isWithinLimit ? FiCheckCircle : FiAlertTriangle} color={stats.isWithinLimit ? 'green.400' : 'red.400'} />
              <Text fontSize="12px" fontWeight="600" color={textColor}>
                LLM Context Usage
              </Text>
            </HStack>
            <Badge colorScheme={stats.isWithinLimit ? 'green' : 'red'} fontSize="10px">
              {stats.llmInfo.label}
            </Badge>
          </HStack>

          <Progress
            value={stats.usagePercent}
            size="sm"
            borderRadius="full"
            colorScheme={stats.usagePercent < 50 ? 'green' : stats.usagePercent < 80 ? 'yellow' : 'red'}
            mb={2}
          />

          <HStack justify="space-between">
            <Text fontSize="10px" color={mutedColor}>
              {formatNumber(stats.totalWithOverhead)} / {formatNumber(stats.llmInfo.inputTokens)} tokens
            </Text>
            <Text fontSize="10px" color={mutedColor}>
              {stats.usagePercent.toFixed(1)}% used
            </Text>
          </HStack>

          {stats.isWithinLimit && (
            <Text fontSize="10px" color="green.500" mt={1}>
              ✓ {formatNumber(stats.remainingTokens)} tokens remaining — fits comfortably
            </Text>
          )}
          {!stats.isWithinLimit && (
            <Text fontSize="10px" color="red.500" mt={1}>
              ✗ Exceeds context window — reduce sources or switch to a larger model
            </Text>
          )}
        </Box>
      </Box>

      {/* Aggregate Stats Grid */}
      <Box px={4} pb={3}>
        <Box p={3} bg={cardBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
          <Text fontSize="11px" fontWeight="600" color={textColor} mb={2}>📊 Aggregate Totals</Text>
          <SimpleGrid columns={3} spacing={2}>
            <Tooltip label="Total estimated tokens (source content only)">
              <Box textAlign="center" p={2} bg={bgColor} borderRadius="md">
                <Text fontSize="16px" fontWeight="700" color="cyan.400">{formatNumber(stats.totalTokens)}</Text>
                <Text fontSize="9px" color={mutedColor}>Tokens (est.)</Text>
              </Box>
            </Tooltip>
            <Tooltip label="Total characters across all sources">
              <Box textAlign="center" p={2} bg={bgColor} borderRadius="md">
                <Text fontSize="16px" fontWeight="700" color="purple.400">{formatNumber(stats.totalChars)}</Text>
                <Text fontSize="9px" color={mutedColor}>Characters</Text>
              </Box>
            </Tooltip>
            <Tooltip label="Total words across all sources">
              <Box textAlign="center" p={2} bg={bgColor} borderRadius="md">
                <Text fontSize="16px" fontWeight="700" color="blue.400">{formatNumber(stats.totalWords)}</Text>
                <Text fontSize="9px" color={mutedColor}>Words</Text>
              </Box>
            </Tooltip>
            <Tooltip label="Total sentences across all sources">
              <Box textAlign="center" p={2} bg={bgColor} borderRadius="md">
                <Text fontSize="14px" fontWeight="600" color={textColor}>{formatNumber(stats.totalSentences)}</Text>
                <Text fontSize="9px" color={mutedColor}>Sentences</Text>
              </Box>
            </Tooltip>
            <Tooltip label="Estimated reading time at 250 wpm">
              <Box textAlign="center" p={2} bg={bgColor} borderRadius="md">
                <Text fontSize="14px" fontWeight="600" color={textColor}>{stats.readingTimeMin} min</Text>
                <Text fontSize="9px" color={mutedColor}>Read Time</Text>
              </Box>
            </Tooltip>
            <Tooltip label="Estimated cost for 5-stage script generation pipeline">
              <Box textAlign="center" p={2} bg={bgColor} borderRadius="md">
                <Text fontSize="14px" fontWeight="600" color={stats.estimatedCost > 0 ? 'orange.400' : 'green.400'}>
                  {stats.estimatedCost > 0 ? `$${stats.estimatedCost.toFixed(3)}` : 'Free'}
                </Text>
                <Text fontSize="9px" color={mutedColor}>Est. Cost</Text>
              </Box>
            </Tooltip>
          </SimpleGrid>
        </Box>
      </Box>

      {/* Pipeline Info */}
      <Box px={4} pb={3}>
        <Box p={3} bg={cardBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
          <Text fontSize="11px" fontWeight="600" color={textColor} mb={2}>⚙️ Pipeline Overhead</Text>
          <VStack spacing={1} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="10px" color={mutedColor}>Source content tokens</Text>
              <Text fontSize="10px" color={textColor} fontWeight="500">{formatNumber(stats.totalTokens)}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="10px" color={mutedColor}>System prompt + instructions</Text>
              <Text fontSize="10px" color={textColor} fontWeight="500">~{formatNumber(stats.promptOverhead)}</Text>
            </HStack>
            <Divider my={1} />
            <HStack justify="space-between">
              <Text fontSize="10px" color={mutedColor} fontWeight="600">Total per stage</Text>
              <Text fontSize="10px" color="cyan.400" fontWeight="600">{formatNumber(stats.totalWithOverhead)}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="10px" color={mutedColor}>5-stage pipeline total</Text>
              <Text fontSize="10px" color={textColor} fontWeight="500">~{formatNumber(stats.totalWithOverhead * 5)}</Text>
            </HStack>
          </VStack>
        </Box>
      </Box>

      <Divider />

      {/* Per-Source Breakdown */}
      <Box px={4} py={3}>
        <Text fontSize="11px" fontWeight="600" color={textColor} mb={2}>📄 Per-Source Breakdown</Text>
        <VStack spacing={2} align="stretch">
          {stats.perSource.map((src) => {
            const isExpanded = expandedSources.has(src.id);
            const sourcePercent = stats.totalTokens > 0 ? ((src.tokenEstimate / stats.totalTokens) * 100).toFixed(1) : '0';
            return (
              <Box
                key={src.id}
                p={3}
                bg={cardBg}
                borderRadius="lg"
                border="1px solid"
                borderColor={borderColor}
                cursor="pointer"
                onClick={() => toggleSource(src.id)}
                _hover={{ borderColor: 'cyan.500' }}
                transition="all 0.2s"
              >
                <HStack justify="space-between" mb={1}>
                  <HStack spacing={2} flex={1} minW={0}>
                    <Badge
                      colorScheme={src.type === 'pdf' ? 'red' : src.type === 'web' ? 'blue' : src.type === 'article' ? 'green' : 'gray'}
                      fontSize="9px"
                      flexShrink={0}
                    >
                      {src.type}
                    </Badge>
                    <Text fontSize="11px" fontWeight="500" color={textColor} noOfLines={1}>
                      {src.title}
                    </Text>
                  </HStack>
                  <HStack spacing={1} flexShrink={0}>
                    <Text fontSize="10px" color={mutedColor}>{sourcePercent}%</Text>
                    <Icon as={isExpanded ? FiChevronUp : FiChevronDown} boxSize={3} color={mutedColor} />
                  </HStack>
                </HStack>

                <Progress
                  value={parseFloat(sourcePercent)}
                  size="xs"
                  borderRadius="full"
                  colorScheme="cyan"
                  mb={1}
                />

                <HStack spacing={3} flexWrap="wrap">
                  <Text fontSize="9px" color={mutedColor}>
                    {formatNumber(src.tokenEstimate)} tok
                  </Text>
                  <Text fontSize="9px" color={mutedColor}>
                    {formatNumber(src.charCount)} chr
                  </Text>
                  <Text fontSize="9px" color={mutedColor}>
                    {formatNumber(src.wordCount)} wrd
                  </Text>
                  <Text fontSize="9px" color={mutedColor}>
                    {src.detectedLang}
                  </Text>
                </HStack>

                <Collapse in={isExpanded} animateOpacity>
                  <Box mt={2} pt={2} borderTop="1px solid" borderColor={borderColor}>
                    <SimpleGrid columns={2} spacing={1}>
                      <HStack>
                        <Icon as={FiHash} boxSize={3} color={mutedColor} />
                        <Text fontSize="9px" color={mutedColor}>Lines: {formatNumber(src.lineCount)}</Text>
                      </HStack>
                      <HStack>
                        <Icon as={FiType} boxSize={3} color={mutedColor} />
                        <Text fontSize="9px" color={mutedColor}>Sentences: {formatNumber(src.sentenceCount)}</Text>
                      </HStack>
                      <HStack>
                        <Icon as={FiFileText} boxSize={3} color={mutedColor} />
                        <Text fontSize="9px" color={mutedColor}>Paragraphs: {src.paragraphCount}</Text>
                      </HStack>
                      <HStack>
                        <Icon as={FiDatabase} boxSize={3} color={mutedColor} />
                        <Text fontSize="9px" color={mutedColor}>Source: {src.source}</Text>
                      </HStack>
                    </SimpleGrid>
                    {(src.hasUrls > 0 || src.hasCitations > 0 || src.hasMarkdownTables > 0) && (
                      <Box mt={1}>
                        <Text fontSize="9px" fontWeight="500" color="orange.400" mb={1}>Content Signals:</Text>
                        <HStack spacing={2} flexWrap="wrap">
                          {src.hasUrls > 0 && (
                            <Badge colorScheme="orange" fontSize="8px">{src.hasUrls} URLs</Badge>
                          )}
                          {src.hasCitations > 0 && (
                            <Badge colorScheme="yellow" fontSize="8px">{src.hasCitations} Citations</Badge>
                          )}
                          {src.hasMarkdownTables > 0 && (
                            <Badge colorScheme="purple" fontSize="8px">{src.hasMarkdownTables} Table rows</Badge>
                          )}
                        </HStack>
                      </Box>
                    )}
                    {src.author && (
                      <Text fontSize="9px" color={mutedColor} mt={1}>Author: {src.author}</Text>
                    )}
                    {src.date && (
                      <Text fontSize="9px" color={mutedColor}>Date: {src.date}</Text>
                    )}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </VStack>
      </Box>

      {/* Model Comparison */}
      <Box px={4} pb={4}>
        <Box p={3} bg={cardBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
          <Text fontSize="11px" fontWeight="600" color={textColor} mb={2}>🧠 Model Fit Comparison</Text>
          <VStack spacing={1} align="stretch">
            {Object.entries(LLM_LIMITS).filter(([key]) => 
              !key.includes('2.5') || key === 'gemini-2-5-pro' || key === 'gemini-2-5-flash'
            ).filter(([key]) => 
              !key.includes('2.0')
            ).map(([modelId, info]) => {
              const usage = (stats.totalWithOverhead / info.inputTokens) * 100;
              const fits = usage < 100;
              const isSelected = modelId === selectedModel;
              return (
                <HStack key={modelId} justify="space-between" py={1} px={2} bg={isSelected ? 'whiteAlpha.100' : 'transparent'} borderRadius="md">
                  <HStack spacing={2}>
                    <Box w="6px" h="6px" borderRadius="full" bg={fits ? 'green.400' : 'red.400'} />
                    <Text fontSize="10px" color={isSelected ? 'cyan.400' : textColor} fontWeight={isSelected ? '600' : '400'}>
                      {info.label}
                    </Text>
                  </HStack>
                  <HStack spacing={2}>
                    <Text fontSize="9px" color={mutedColor}>{formatNumber(info.inputTokens)} ctx</Text>
                    <Badge colorScheme={fits ? 'green' : 'red'} fontSize="8px">
                      {usage.toFixed(1)}%
                    </Badge>
                  </HStack>
                </HStack>
              );
            })}
          </VStack>
        </Box>
      </Box>
    </VStack>
  );
}
